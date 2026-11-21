import { useTranslation } from 'react-i18next';
import { LocalizedTablePagination } from '../../../../../components/common/localized-table-pagination';
import {
  Button,
  Checkbox,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  DataTableSortingState,
  FocusModal,
  toast,
  useDataTable,
} from '@medusajs/ui';
import { AddProductsDrawerProps } from './types.ts';
import { ProductCell, ProductHeader } from '../../../../../components/table-cells/common/product-cell';
import { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { AdminProduct } from '@medusajs/framework/types';
import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../../../../sdk.ts';
import { z } from '@medusajs/framework/zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProductStatusCell,
  ProductStatusHeader,
} from '../../../../../components/table-cells/common/product-status-cell';
import { VariantCell, VariantHeader } from '../../../../../components/table-cells/common/variant-cell';
import { ExclamationCircle } from '@medusajs/icons';

const AddProductsToTypeSchema = z.object({
  add: z.array(z.string()).min(1),
});

const limit = 15;

const AddProductsDrawer = ({ open, onClose, review }: AddProductsDrawerProps) => {
  const { t } = useTranslation('webbersMedusa');
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<DataTableSortingState | null>(null);
  const [search, setSearch] = useState<string>('');

  const offset = useMemo(() => {
    return pagination.pageIndex * limit;
  }, [pagination]);

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.admin.product.list({
        limit,
        offset,
        q: search,
      }),
    queryKey: ['allProducts', offset, limit, search],
  });

  const addProductsMutation = useMutation({
    mutationFn: (values: string[]) => {
      return sdk.client.fetch(`/admin/reviews/${id}`, {
        method: 'PATCH',
        body: {
          add_product_ids: values,
        },
      });
    },
    onSuccess: async () => {
      toast.success(t('reviews.products.addSuccess'));
      await queryClient.invalidateQueries({ queryKey: ['review', id] });
      onClose();
    },
    onError: err => {
      toast.error(t('reviews.products.addError'), { description: err.message });
    },
  });

  const products = data?.products ?? [];

  const typeProducts = review?.products?.map(p => p?.id) ?? [];

  const shownProducts = useMemo(() => {
    const safeProducts = products ?? [];

    if (!safeProducts.length) {
      return [];
    }

    let result = safeProducts;

    if (search) {
      result = result.filter(product => product.title.toLowerCase().includes(search.toLowerCase()));
    }

    if (sorting) {
      result = result.slice().sort((a, b) => {
        // @ts-ignore
        const aVal = a?.[sorting.id] || '';
        // @ts-ignore
        const bVal = b?.[sorting.id] || '';
        if (aVal < bVal) {
          return sorting.desc ? 1 : -1;
        }
        if (aVal > bVal) {
          return sorting.desc ? -1 : 1;
        }
        return 0;
      });
    }

    return result;
  }, [products, sorting, search]);

  const columnHelper = createDataTableColumnHelper<AdminProduct>();

  const form = useForm<z.infer<typeof AddProductsToTypeSchema>>({
    defaultValues: {
      add: [],
    },
    resolver: zodResolver(AddProductsToTypeSchema),
  });

  const { setValue } = form;

  const updater: OnChangeFn<RowSelectionState> = newSelection => {
    const update = typeof newSelection === 'function' ? newSelection(rowSelection) : newSelection;

    setValue(
      'add',
      Object.keys(update).filter(k => update[k]),
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    );

    setRowSelection(update);
  };

  useEffect(() => {
    setValue(
      'add',
      Object.keys(rowSelection).filter(k => rowSelection[k]),
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    );
  }, [rowSelection, setValue, search]);

  const columns = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => {
        return (
          <Checkbox
            aria-label={t('common.selectAll')}
            checked={table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected()}
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          />
        );
      },
      cell: ({ row }) => {
        const isAdded = typeProducts?.includes(row.original.id);

        const isDisabled = isAdded;
        const isSelected = row.getIsSelected() || isAdded;

        return (
          <Checkbox
            aria-label={t('common.selectItem', { name: row.original.title })}
            checked={isSelected}
            disabled={isDisabled}
            onCheckedChange={value => row.toggleSelected(!!value)}
            onClick={e => {
              e.stopPropagation();
            }}
          />
        );
      },
    }),
    columnHelper.accessor('title', {
      enableSorting: true,
      sortLabel: t('reviews.fields.title'),
      sortAscLabel: t('common.sortAscending'),
      sortDescLabel: t('common.sortDescending'),
      header: () => <ProductHeader />,
      cell: ({ row }) => <ProductCell product={row.original} />,
    }),
    columnHelper.accessor('variants', {
      header: () => <VariantHeader />,
      cell: ({ row }) => <VariantCell variants={row.original.variants} />,
    }),
    columnHelper.accessor('status', {
      header: () => <ProductStatusHeader />,
      cell: ({ row }) => <ProductStatusCell status={row.original.status} />,
    }),
  ];

  const table = useDataTable({
    columns,
    data: shownProducts || [],
    getRowId: row => row?.id,
    rowCount: data?.count || 0,
    rowSelection: {
      state: rowSelection,
      onRowSelectionChange: updater,
    },
    isLoading,
    sorting: {
      state: sorting,
      onSortingChange: setSorting,
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
  });

  const handleSubmit = form.handleSubmit(async values => {
    await addProductsMutation.mutate(values.add);
  });

  return (
    <FocusModal open={open} onOpenChange={onClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center justify-end gap-x-2">
            <Button variant={'secondary'} size={'small'} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant={'primary'} size={'small'} type={'submit'} onClick={handleSubmit}>
              {t('common.save')}
            </Button>
          </div>
        </FocusModal.Header>
        <FocusModal.Body>
          <DataTable instance={table} className="!border-t-0">
            <div className="flex items-start justify-end gap-x-4 px-6 py-4">
              <div className="flex shrink-0 items-center gap-x-2">
                <DataTable.Search placeholder={t('common.search')} />
                <DataTable.SortingMenu tooltip={t('common.sort')} />
              </div>
            </div>
            <DataTable.Table
              emptyState={{
                empty: {
                  custom: (
                    <div className="flex flex-col items-center gap-y-3">
                      <ExclamationCircle />
                      <div className="flex flex-col items-center gap-y-1">
                        <p className="font-medium font-sans txt-compact-small">{t('common.noRecords')}</p>
                        <p className="font-normal font-sans txt-small text-ui-fg-muted">{t('common.noRecordsDescription')}</p>
                      </div>
                    </div>
                  ),
                },
              }}
            />
            <LocalizedTablePagination />
          </DataTable>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
};

export default AddProductsDrawer;
