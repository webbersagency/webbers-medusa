import { useTranslation } from 'react-i18next';
import { StatusCell } from "../status-cell";
import { HttpTypes } from '@medusajs/types';

type ProductStatusCellProps = {
  status: HttpTypes.AdminProductStatus;
};

export const ProductStatusCell = ({ status }: ProductStatusCellProps) => {
  const { t } = useTranslation('webbersMedusa');
  if (!status) return;

  const color = {
    draft: 'grey',
    proposed: 'orange',
    published: 'green',
    rejected: 'red',
  } as const;

  return <StatusCell color={color[status]}>{t(`products.status.${status}`)}</StatusCell>;
};

export const ProductStatusHeader = () => {
  const { t } = useTranslation('webbersMedusa');
  return (
    <div className="flex h-full w-full items-center">
      <span>{t('common.status')}</span>
    </div>
  );
};
