import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';
import { REVIEW_MODULE } from '../../../modules/review';
import type ProductReviewService from '../../../modules/review/service';

/** Whether review translations are configured, so the admin only offers them when they work. */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { translationOptions } = req.scope.resolve<ProductReviewService>(REVIEW_MODULE);

  res.status(200).json({
    enabled: !!translationOptions,
    source_language: translationOptions?.sourceLanguage ?? null,
    target_languages: translationOptions?.targetLanguages ?? [],
  });
};
