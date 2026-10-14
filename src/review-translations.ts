// Review translations live in the review's `translations` column, keyed by language: `translations[language]`.
// Pure helpers only (no imports) so they can be shared by both the server build and the admin (vite) build.

/** The `source_*` fields hold the text that was translated, so an edited review shows up as outdated. */
export type ReviewTranslation = {
  title: string | null;
  content: string | null;
  source_title: string | null;
  source_content: string | null;
};

export type TranslatableReview = {
  title?: string | null;
  content?: string | null;
  translations?: Record<string, unknown> | null;
};

export const getReviewTranslation = (review: TranslatableReview, language: string) =>
  review.translations?.[language] as ReviewTranslation | undefined;

export const isReviewTranslationCurrent = (review: TranslatableReview, language: string) => {
  const translation = getReviewTranslation(review, language);
  return (
    !!translation &&
    translation.source_title === (review.title ?? null) &&
    translation.source_content === (review.content ?? null)
  );
};
