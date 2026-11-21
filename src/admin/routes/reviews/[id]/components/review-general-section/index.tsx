import { useTranslation } from 'react-i18next';
import { Copy, Heading, StatusBadge, toast, usePrompt, useToggleState } from '@medusajs/ui';
import { ActionMenu } from '../../../../../components/common/action-menu';
import { CheckCircleSolid, FlagMini, PencilSquare, Trash } from '@medusajs/icons';
import { ReviewGeneralSectionProps } from './types.ts';
import { getReviewStatus } from '../../../../../components/table-cells/common/status-cell';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../../../../sdk.ts';
import ReviewEditModal from '../review-edit-modal';
import { StarRatingCell } from '../../../page.tsx';
import { useNavigate, useParams } from 'react-router-dom';
import { useReviewOptions } from '../../../components/review-form';

const ReviewGeneralSection = ({ review }: ReviewGeneralSectionProps) => {
  const { t } = useTranslation('webbersMedusa');
  const { ageOptions, genderOptions } = useReviewOptions();
  const navigate = useNavigate();
  const dialog = usePrompt();
  const queryClient = useQueryClient();
  const [state, open, close] = useToggleState();
  const { id } = useParams();

  const updateReviewStatus = useMutation({
    mutationFn: async (params: { reviewId: string; status: 'approved' | 'flagged' }) => {
      const { reviewId, status } = params;

      return sdk.client.fetch(`/admin/reviews/${reviewId}/status`, {
        method: 'PUT',
        body: { status: status },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['review', id] });
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(t('reviews.statusSuccess'));
    },
    onError: err => {
      console.error(err);
      toast.error(t('reviews.statusError'));
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (params: { reviewId: string }) => {
      const { reviewId } = params;

      return sdk.client.fetch(`/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['review', id] });
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(t('reviews.deleteSuccess'));
      navigate('/reviews');
    },
    onError: err => {
      console.error(err);
      toast.error(t('reviews.deleteError'));
    },
  });

  const handleRemove = async () => {
    const confirmed = await dialog({
      title: t('common.confirmTitle'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      description: t('reviews.deleteConfirm'),
    });

    if (!confirmed) {
      return;
    }

    await deleteReview.mutateAsync({ reviewId: review.id });
  };

  const reviewStatus = getReviewStatus(review.status);

  const canApprove = review.status === 'pending' || review.status === 'flagged';
  const canFlag = review.status === 'pending' || review.status === 'approved';

  const isUpdatingThisRow = updateReviewStatus.isPending && updateReviewStatus.variables?.reviewId === review?.id;

  return (
    <div className="shadow-elevation-card-rest bg-ui-bg-base w-full rounded-lg divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-x-1">
            <Heading>{review?.id}</Heading>
            <Copy content={review.id} className="text-ui-fg-muted" aria-label={t('reviews.copyId')} />
          </div>
        </div>
        <div className="flex items-center gap-x-4">
          <div className="flex items-center gap-x-1.5">
            <StatusBadge color={reviewStatus.color}>{t(reviewStatus.label)}</StatusBadge>
          </div>
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t('common.edit'),
                    onClick: open,
                    icon: <PencilSquare />,
                  },
                  {
                    icon: <CheckCircleSolid />,
                    label: t('reviews.approve'),
                    disabled: !canApprove || isUpdatingThisRow,
                    onClick: () =>
                      updateReviewStatus.mutate({
                        reviewId: review.id,
                        status: 'approved',
                      }),
                  },
                  {
                    icon: <FlagMini />,
                    label: t('reviews.flag'),
                    disabled: !canFlag || isUpdatingThisRow,
                    onClick: () =>
                      updateReviewStatus.mutate({
                        reviewId: review.id,
                        status: 'flagged',
                      }),
                  },
                  {
                    icon: <Trash />,
                    label: t('common.delete'),
                    onClick: () => handleRemove(),
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
      <div className="w-full p-0 divide-y">
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
          <p className="font-medium font-sans txt-compact-small">{t('reviews.fields.rating')}</p>
          <p className="font-normal font-sans txt-compact-small">
            {review.rating ? <StarRatingCell rating={review.rating} /> : '-'}
          </p>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
          <p className="font-medium font-sans txt-compact-small">{t('reviews.fields.name')}</p>
          <p className="font-normal font-sans txt-compact-small">{review.name ?? '-'}</p>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
          <p className="font-medium font-sans txt-compact-small">{t('reviews.fields.city')}</p>
          <p className="font-normal font-sans txt-compact-small">{review.city ?? '-'}</p>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
          <p className="font-medium font-sans txt-compact-small">{t('reviews.fields.age')}</p>
          <p className="font-normal font-sans txt-compact-small">
            {ageOptions.find(o => o.value === review.age)?.label ?? '-'}
          </p>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
          <p className="font-medium font-sans txt-compact-small">{t('reviews.fields.gender')}</p>
          <p className="font-normal font-sans txt-compact-small">
            {genderOptions.find(o => o.value === review.gender)?.label ?? '-'}
          </p>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
          <p className="font-medium font-sans txt-compact-small">{t('reviews.fields.title')}</p>
          <p className="font-normal font-sans txt-compact-small">{review.title ?? '-'}</p>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
          <p className="font-medium font-sans txt-compact-small">{t('reviews.fields.content')}</p>
          <p className="font-normal font-sans txt-compact-small">{review.content ?? '-'}</p>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
          <p className="font-medium font-sans txt-compact-small">{t('reviews.fields.recommended')}</p>
          <p className="font-normal font-sans txt-compact-small">{review.recommend ? t('common.yes') : t('common.no')}</p>
        </div>
        <div className="text-ui-fg-subtle grid grid-cols-2 items-center py-4 px-6">
          <p className="font-medium font-sans txt-compact-small">{t('reviews.fields.email')}</p>
          <p className="font-normal font-sans txt-compact-small">{review.email ?? '-'}</p>
        </div>
      </div>
      <ReviewEditModal state={state} close={close} review={review} />
    </div>
  );
};

export default ReviewGeneralSection;
