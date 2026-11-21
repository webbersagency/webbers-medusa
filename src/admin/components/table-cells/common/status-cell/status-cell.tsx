import { useTranslation } from 'react-i18next';
import { clx } from '@medusajs/ui';
import { PropsWithChildren } from 'react';

type StatusCellProps = PropsWithChildren<{
  color?: 'green' | 'red' | 'blue' | 'orange' | 'grey' | 'purple';
}>;

const reviewStatuses = {
  approved: { label: 'reviews.status.approved', color: 'green' },
  pending: { label: 'reviews.status.pending', color: 'orange' },
  flagged: { label: 'reviews.status.flagged', color: 'red' },
} as const;

export const getReviewStatus = (status: string) =>
  reviewStatuses[status as keyof typeof reviewStatuses];

export const StatusCell = ({ color, children }: StatusCellProps) => {
  return (
    <div className="txt-compact-small text-ui-fg-subtle flex h-full w-full items-center gap-x-2 overflow-hidden">
      <div role="presentation" className="flex h-5 w-2 items-center justify-center">
        <div
          className={clx('h-2 w-2 rounded-sm shadow-[0px_0px_0px_1px_rgba(0,0,0,0.12)_inset]', {
            'bg-ui-tag-green-icon': color === 'green',
            'bg-ui-tag-red-icon': color === 'red',
            'bg-ui-tag-orange-icon': color === 'orange',
          })}
        />
      </div>
      <span className="truncate">{children}</span>
    </div>
  );
};

export const ReviewStatusCell = ({ status }: { status: string }) => {
  const { t } = useTranslation('webbersMedusa');
  const reviewStatus = getReviewStatus(status);

  if (!reviewStatus) {
    return <span>-</span>;
  }

  const { label, color } = reviewStatus;

  return <StatusCell color={color}>{t(label)}</StatusCell>;
};
