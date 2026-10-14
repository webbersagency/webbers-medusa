import { Review } from '../../../page.tsx';

export type ReviewTranslationsSectionProps = {
  review: Review;
};

export type ReviewTranslationSettings = {
  enabled: boolean;
  source_language: string | null;
  target_languages: string[];
};
