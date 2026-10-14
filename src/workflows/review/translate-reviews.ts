import { transform, when } from '@medusajs/framework/workflows-sdk';
import { type WorkflowData, WorkflowResponse, createWorkflow } from '@medusajs/workflows-sdk';
import type { TranslateReviewsWorkflowInput } from '../../modules/review/types';
import { translateReviewsStep } from './steps/translate-reviews';
import { updateReviewsWorkflow } from './update-reviews';

/**
 * Machine-translates the reviews' title and content into the `translations` option's target languages and
 * stores them in the review's `translations[language]`. With `only_outdated`, reviews whose translations already
 * match their current text are skipped.
 */
export const translateReviewsWorkflow = createWorkflow(
  'translate-reviews-workflow',
  (input: WorkflowData<TranslateReviewsWorkflowInput>) => {
    const reviewUpdates = translateReviewsStep(input);

    const reviews = when(
      'save-review-translations',
      { reviewUpdates },
      ({ reviewUpdates }) => !!reviewUpdates.length
    ).then(() =>
      updateReviewsWorkflow.runAsStep({
        input: transform({ reviewUpdates }, ({ reviewUpdates }) => ({ reviews: reviewUpdates })),
      })
    );

    return new WorkflowResponse(transform({ reviews }, ({ reviews }) => reviews ?? []));
  }
);
