import { useTranslation } from 'react-i18next';
import { Button, Container, Heading, StatusBadge, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../../../../sdk.ts';
import { getReviewTranslation, isReviewTranslationCurrent } from '../../../../../../review-translations';
import { ReviewTranslationSettings, ReviewTranslationsSectionProps } from './types.ts';

const getTranslationStatus = (review: ReviewTranslationsSectionProps['review'], language: string) => {
  if (!getReviewTranslation(review, language)) {
    return { color: 'grey' as const, label: 'reviews.translations.missing' as const };
  }
  return isReviewTranslationCurrent(review, language)
    ? { color: 'green' as const, label: 'reviews.translations.current' as const }
    : { color: 'orange' as const, label: 'reviews.translations.outdated' as const };
};

const ReviewTranslationsSection = ({ review }: ReviewTranslationsSectionProps) => {
  const { t } = useTranslation('webbersMedusa');
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<ReviewTranslationSettings>({
    queryFn: () => sdk.client.fetch('/admin/review-translations'),
    queryKey: ['review-translation-settings'],
    staleTime: 60_000,
  });

  const translateReview = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/reviews/${review.id}/translate`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['review', review.id] });
      toast.success(t('reviews.translations.success'));
    },
    onError: err => {
      console.error(err);
      toast.error(t('reviews.translations.error'));
    },
  });

  if (!settings?.enabled) return null;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t('reviews.translations.title')}</Heading>
        <Button
          size="small"
          variant="secondary"
          isLoading={translateReview.isPending}
          onClick={() => translateReview.mutate()}
        >
          {t('reviews.translations.action')}
        </Button>
      </div>
      {settings.target_languages.map(language => {
        const translation = getReviewTranslation(review, language);
        const translationStatus = getTranslationStatus(review, language);
        const languageLabel = language.toUpperCase();

        return (
          <div key={language} className="divide-y">
            <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
              <p className="font-medium font-sans txt-compact-small">{t('reviews.translations.status', { language: languageLabel })}</p>
              <div>
                <StatusBadge color={translationStatus.color}>{t(translationStatus.label)}</StatusBadge>
              </div>
            </div>
            <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
              <p className="font-medium font-sans txt-compact-small">
                {t('reviews.translations.titleLabel', { language: languageLabel })}
              </p>
              <p className="font-normal font-sans txt-compact-small">{translation?.title || '-'}</p>
            </div>
            <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
              <p className="font-medium font-sans txt-compact-small">{t('reviews.translations.content', { language: languageLabel })}</p>
              <p className="font-normal font-sans txt-compact-small">{translation?.content || '-'}</p>
            </div>
          </div>
        );
      })}
    </Container>
  );
};

export default ReviewTranslationsSection;
