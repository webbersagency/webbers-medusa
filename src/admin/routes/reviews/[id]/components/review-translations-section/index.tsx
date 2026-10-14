import { Button, Container, Heading, StatusBadge, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../../../../sdk.ts';
import { getReviewTranslation, isReviewTranslationCurrent } from '../../../../../../review-translations';
import { ReviewTranslationSettings, ReviewTranslationsSectionProps } from './types.ts';

const getTranslationStatus = (review: ReviewTranslationsSectionProps['review'], language: string) => {
  if (!getReviewTranslation(review, language)) {
    return { color: 'grey' as const, label: 'Not translated' };
  }
  return isReviewTranslationCurrent(review, language)
    ? { color: 'green' as const, label: 'Up to date' }
    : { color: 'orange' as const, label: 'Outdated' };
};

const ReviewTranslationsSection = ({ review }: ReviewTranslationsSectionProps) => {
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
      toast.success('Review translated successfully');
    },
    onError: err => {
      console.error(err);
      toast.error('Failed to translate review');
    },
  });

  if (!settings?.enabled) return null;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Translations</Heading>
        <Button
          size="small"
          variant="secondary"
          isLoading={translateReview.isPending}
          onClick={() => translateReview.mutate()}
        >
          Translate
        </Button>
      </div>
      {settings.target_languages.map(language => {
        const translation = getReviewTranslation(review, language);
        const translationStatus = getTranslationStatus(review, language);
        const languageLabel = language.toUpperCase();

        return (
          <div key={language} className="divide-y">
            <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
              <p className="font-medium font-sans txt-compact-small">Status ({languageLabel})</p>
              <div>
                <StatusBadge color={translationStatus.color}>{translationStatus.label}</StatusBadge>
              </div>
            </div>
            <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
              <p className="font-medium font-sans txt-compact-small">Title ({languageLabel})</p>
              <p className="font-normal font-sans txt-compact-small">{translation?.title || '-'}</p>
            </div>
            <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
              <p className="font-medium font-sans txt-compact-small">Content ({languageLabel})</p>
              <p className="font-normal font-sans txt-compact-small">{translation?.content || '-'}</p>
            </div>
          </div>
        );
      })}
    </Container>
  );
};

export default ReviewTranslationsSection;
