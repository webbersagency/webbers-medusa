import { useTranslation } from 'react-i18next';
import { PlaceholderCell } from "../placeholder-cell";
import { HttpTypes } from '@medusajs/types';

type VariantCellProps = {
  variants?: HttpTypes.AdminProductVariant[] | null;
};

export const VariantCell = ({ variants }: VariantCellProps) => {
  const { t } = useTranslation('webbersMedusa');
  if (!variants || !variants.length) {
    return <PlaceholderCell />;
  }

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <span className="truncate">{t('products.variantCount', { count: variants.length })}</span>
    </div>
  );
};

export const VariantHeader = () => {
  const { t } = useTranslation('webbersMedusa');
  return (
    <div className="flex h-full w-full items-center">
      <span>{t('products.variants')}</span>
    </div>
  );
};
