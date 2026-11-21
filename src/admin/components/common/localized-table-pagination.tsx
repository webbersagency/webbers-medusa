import { DataTable } from '@medusajs/ui';
import { useTranslation } from 'react-i18next';

export const LocalizedTablePagination = () => {
  const { t } = useTranslation('webbersMedusa');

  return (
    <DataTable.Pagination
      translations={{
        of: t('common.pagination.of'),
        results: t('common.pagination.results'),
        pages: t('common.pagination.pages'),
        prev: t('common.pagination.previous'),
        next: t('common.pagination.next'),
      }}
    />
  );
};
