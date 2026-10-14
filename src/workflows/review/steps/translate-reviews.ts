import { StepResponse, createStep } from '@medusajs/workflows-sdk';
import { MedusaError } from '@medusajs/framework/utils';
import { REVIEW_MODULE } from '../../../modules/review';
import type ProductReviewService from '../../../modules/review/service';
import type { TranslateReviewsWorkflowInput } from '../../../modules/review/types';
import { isReviewTranslationCurrent } from '../../../review-translations';

export const translateReviewsStepId = 'translate-reviews-step';

/** Translates the reviews and returns their `translations` updates; nothing is stored until those are applied. */
export const translateReviewsStep = createStep(
  translateReviewsStepId,
  async ({ ids, only_outdated }: TranslateReviewsWorkflowInput, { container }) => {
    const reviewService = container.resolve<ProductReviewService>(REVIEW_MODULE);
    const translationOptions = reviewService.translationOptions;

    if (!translationOptions) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Review translations are not configured');
    }

    const reviews = await reviewService.listReviews({ id: ids }, { select: ['id', 'title', 'content', 'translations'] });
    const reviewsToTranslate = only_outdated
      ? reviews.filter(
          review => !translationOptions.targetLanguages.every(language => isReviewTranslationCurrent(review, language))
        )
      : reviews;

    const reviewUpdates = await Promise.all(
      reviewsToTranslate.map(async review => ({
        id: review.id,
        translations: {
          ...review.translations,
          ...(await reviewService.translateReview(review)),
        },
      }))
    );

    return new StepResponse(reviewUpdates);
  }
);
