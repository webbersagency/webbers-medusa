import { InjectManager, MedusaContext, MedusaService } from '@medusajs/framework/utils';
import { Context } from '@medusajs/framework/types';
import type { EntityManager } from '@medusajs/framework/mikro-orm/postgresql';
import { ProductReviewStatsModel, ReviewImageModel, ReviewModel, ReviewResponseModel } from './models';
import { ProductReviewStats } from './types';
import { z } from '@medusajs/framework/zod';
import { ReviewTranslation, TranslatableReview } from '../../review-translations';

const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

interface CalculatedProductReviewStats {
  product_id: string;
  review_count: number;
  average_rating: number;
  rating_count_1: number;
  rating_count_2: number;
  rating_count_3: number;
  rating_count_4: number;
  rating_count_5: number;
}

export const moduleOptionsSchema = z
  .object({
    defaultReviewStatus: z.enum(['pending', 'approved', 'flagged']).default('approved'),
    enableReviewImages: z.boolean().default(true),
    translations: z
      .object({
        apiKey: z.string().optional(),
        sourceLanguage: z.string(),
        targetLanguages: z.array(z.string()).min(1),
      })
      .optional(),
  })
  .default({
    defaultReviewStatus: 'approved',
    enableReviewImages: true,
  });

export type ModuleOptions = z.infer<typeof moduleOptionsSchema>;

export type ReviewTranslationOptions = {
  apiKey: string;
  sourceLanguage: string;
  targetLanguages: string[];
};

type GoogleTranslateResponse = {
  data?: { translations: { translatedText: string }[] };
  error?: { message: string };
};

class ReviewService extends MedusaService({
  Review: ReviewModel,
  ReviewImage: ReviewImageModel,
  ReviewResponse: ReviewResponseModel,
  ProductReviewStats: ProductReviewStatsModel,
}) {
  public readonly defaultReviewStatus: string;
  public readonly enableReviewImages: boolean;
  /** `null` unless the `translations` option is set with an `apiKey`. */
  public readonly translationOptions: ReviewTranslationOptions | null;

  constructor(container, options: ModuleOptions) {
    super(container, options);

    const { defaultReviewStatus, enableReviewImages, translations } = moduleOptionsSchema.parse(options);

    this.defaultReviewStatus = defaultReviewStatus;
    this.enableReviewImages = enableReviewImages;
    this.translationOptions = translations?.apiKey ? { ...translations, apiKey: translations.apiKey } : null;
  }

  private async translateTexts(texts: string[], targetLanguage: string): Promise<string[]> {
    if (!this.translationOptions) {
      throw new Error('Review translations are not configured');
    }
    if (!texts.length) {
      return [];
    }

    const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${this.translationOptions.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        source: this.translationOptions.sourceLanguage,
        target: targetLanguage,
        format: 'text',
      }),
    });
    const { data, error } = (await response.json()) as GoogleTranslateResponse;

    if (!response.ok || !data) {
      throw new Error(`Google Translate request failed with status ${response.status}: ${error?.message ?? ''}`);
    }

    return data.translations.map(translation => translation.translatedText);
  }

  /** Translates the review's title and content into every configured target language, keyed by language. */
  async translateReview(review: TranslatableReview): Promise<Record<string, ReviewTranslation>> {
    const sourceTitle = review.title ?? null;
    const sourceContent = review.content ?? null;
    const textsToTranslate = [sourceTitle, sourceContent].filter((text): text is string => !!text?.trim());

    const translateText = (text: string | null, translatedTexts: string[]) =>
      text?.trim() ? (translatedTexts[textsToTranslate.indexOf(text)] ?? null) : text;

    const translations = await Promise.all(
      (this.translationOptions?.targetLanguages ?? []).map(async language => {
        const translatedTexts = await this.translateTexts(textsToTranslate, language);
        const translation: ReviewTranslation = {
          title: translateText(sourceTitle, translatedTexts),
          content: translateText(sourceContent, translatedTexts),
          source_title: sourceTitle,
          source_content: sourceContent,
        };
        return [language, translation] as const;
      })
    );

    return Object.fromEntries(translations);
  }

  async refreshProductReviewStats(productIds: string[], sharedContext?: Context): Promise<ProductReviewStats[]> {
    const foundStats = await this.listProductReviewStats({ product_id: productIds }, {});

    const calculatedStats = await this.calculateProductReviewStats(
      foundStats.map(s => s.product_id),
      sharedContext
    );

    // A product absent from the aggregate has no approved reviews left — its row must reset, not keep old values.
    const toUpdate = foundStats.map(s => ({
      ...s,
      average_rating: null,
      review_count: 0,
      rating_count_1: 0,
      rating_count_2: 0,
      rating_count_3: 0,
      rating_count_4: 0,
      rating_count_5: 0,
      ...calculatedStats.find(c => c.product_id === s.product_id),
    }));

    return await this.updateProductReviewStats(toUpdate);
  }
  calculateProductReviewStats(productIds: string[], sharedContext?: Context): Promise<CalculatedProductReviewStats[]>;
  @InjectManager()
  async calculateProductReviewStats(
    productIds: string[],
    @MedusaContext() sharedContext: Context<EntityManager> & { manager: EntityManager }
  ): Promise<CalculatedProductReviewStats[]> {
    if (!productIds || productIds.length === 0) {
      // return empty result or skip query
      return [];
    }

    const SQL = `
      SELECT
        rpp.product_id,
        COUNT(r.id) AS review_count,
        CAST(AVG(r.rating) AS DECIMAL(10, 2)) AS average_rating,
        SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) AS rating_count_1,
        SUM(CASE WHEN r.rating = 2 THEN 1 ELSE 0 END) AS rating_count_2,
        SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END) AS rating_count_3,
        SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END) AS rating_count_4,
        SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) AS rating_count_5
      FROM review r
             JOIN (
               SELECT DISTINCT review_id, product_id
               FROM review_review_product_product
               WHERE deleted_at IS NULL
             ) rpp
                  ON r.id = rpp.review_id
      WHERE rpp.product_id IN (${productIds.map(id => `'${id}'`).join(', ')})
        AND r.status = 'approved'
        AND r.deleted_at IS NULL
      GROUP BY rpp.product_id
    `;

    const productReviewStats = await sharedContext.manager.execute<
      {
        product_id: string;
        review_count: number;
        average_rating: string;
        rating_count_1: number;
        rating_count_2: number;
        rating_count_3: number;
        rating_count_4: number;
        rating_count_5: number;
      }[]
    >(SQL);

    return productReviewStats.map(s => ({
      ...s,
      average_rating: parseFloat(s.average_rating),
    }));
  }
}

export default ReviewService;
