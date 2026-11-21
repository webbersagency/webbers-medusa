import { useTranslation } from 'react-i18next';
import { LocalizedTablePagination } from '../../../../../components/common/localized-table-pagination';
import {
  Checkbox,
  Container,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  DataTableSortingState,
  toast,
  useDataTable,
  usePrompt,
  useToggleState,
} from '@medusajs/ui';
import { ExclamationCircle, Pencil, Plus, Trash } from '@medusajs/icons';
import { ReviewProductsSectionProps } from './types.ts';
import { useEffect, useMemo, useState } from 'react';
import { AdminProduct } from '@medusajs/framework/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@medusajs/framework/zod';
import { sdk } from '../../../../../sdk.ts';
import { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import AddProductsDrawer from '../review-add-products-drawer';
import { Header } from '../../../../../components/atoms/header.tsx';
import { ProductCell, ProductHeader } from '../../../../../components/table-cells/common/product-cell';
import { VariantCell, VariantHeader } from '../../../../../components/table-cells/common/variant-cell';
import {
  ProductStatusCell,
  ProductStatusHeader,
} from '../../../../../components/table-cells/common/product-status-cell';
import { useParams } from 'react-router-dom';

const limit = 15;

const ReviewProductsSection = ({ review }: ReviewProductsSectionProps) => {
  const { t } = useTranslation('webbersMedusa');
  const dialog = usePrompt();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const [addProductState, openAddProductState, closeAddProductState] = useToggleState();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<DataTableSortingState | null>(null);
  const [search, setSearch] = useState<string>('');
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  });

  const offset = useMemo(() => {
    return pagination.pageIndex * limit;
  }, [pagination]);

  const RemoveProductsReviewschema = z.object({
    remove: z.array(z.string()).min(1),
  });

  const form = useForm<z.infer<typeof RemoveProductsReviewschema>>({
    defaultValues: {
      remove: [],
    },
    resolver: zodResolver(RemoveProductsReviewschema),
  });

  const reviewProductIds = review?.products?.map(p => p.id) ?? [];
  const hasProducts = reviewProductIds.length > 0;
  const idsKey = hasProducts ? reviewProductIds.join(',') : 'none';

  const { data: productData } = useQuery({
    queryFn: () =>
      sdk.admin.product.list({
        id: reviewProductIds,
        limit,
        offset,
      }),
    queryKey: ['reviewProducts', idsKey, limit, offset],
    enabled: hasProducts,
  });

  const products = productData?.products ?? [];

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      sdk.client.fetch(`/admin/reviews/${review?.id}`, {
        method: 'PATCH',
        body: {
          remove_product_ids: ids,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['review', id] });
      toast.success(t('reviews.products.removeSuccess'));
      form.reset();
    },
  });

  const handleRemove = async (product: AdminProduct) => {
    const confirmed = await dialog({
      title: t('common.confirmTitle'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      description: t('reviews.products.removeConfirm', { title: product.title }),
    });

    if (!confirmed) {
      return;
    }

    await deleteMutation.mutateAsync([product.id]);
  };

  const handleRemoveRows = async (selection: Record<string, boolean>) => {
    const ids = Object.keys(selection);

    const confirmed = await dialog({
      title: t('common.confirmTitle'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      description: t('reviews.products.removeBatchConfirm', { count: ids.length }),
    });

    if (!confirmed) {
      return;
    }

    await deleteMutation.mutateAsync(ids);
  };

  const { setValue } = form;

  const updater: OnChangeFn<RowSelectionState> = newSelection => {
    const update = typeof newSelection === 'function' ? newSelection(rowSelection) : newSelection;

    setValue(
      'remove',
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
      'remove',
      Object.keys(rowSelection).filter(k => rowSelection[k]),
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    );
  }, [rowSelection, setValue]);

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
        return (
          <Checkbox
            aria-label={t('common.selectItem', { name: row.original.title })}
            checked={row.getIsSelected()}
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
      cell: ({ row }) => <VariantCell variants={row?.original?.variants} />,
    }),
    columnHelper.accessor('status', {
      header: () => <ProductStatusHeader />,
      cell: ({ row }) => <ProductStatusCell status={row?.original?.status} />,
    }),
    columnHelper.action({
      actions: [
        {
          label: t('common.edit'),
          onClick: row => (window.location.href = `/app/products/${row?.row?.original?.id}/edit`),
          icon: <Pencil />,
        },
        {
          label: t('common.delete'),
          onClick: row => handleRemove(row.row.original),
          icon: <Trash />,
        },
      ],
    }),
  ];

  const table = useDataTable({
    columns: columns || [],
    data: shownProducts,
    getRowId: row => row.id,
    rowCount: productData?.count,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    rowSelection: {
      state: rowSelection,
      onRowSelectionChange: updater,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    sorting: {
      state: sorting,
      onSortingChange: setSorting,
    },
    commands: [
      {
        label: t('common.remove'),
        action: handleRemoveRows,
        shortcut: 'r',
      },
    ],
  });

  const hasRows = table.rowCount > 0;

  return (
    <Container className="divide-y p-0">
      <Header
        title={t('products.title')}
        actions={[
          {
            type: 'action-menu',
            props: {
              groups: [
                {
                  actions: [
                    {
                      label: t('reviews.products.add'),
                      icon: <Plus />,
                      onClick: () => openAddProductState(),
                    },
                  ],
                },
              ],
            },
          },
        ]}
      />
      <DataTable instance={table}>
        <div className="flex items-start justify-end gap-x-4 px-6 py-4">
          <div className="flex shrink-0 items-center gap-x-2">
            <DataTable.Search placeholder={t('common.search')} />
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
        {hasRows && <LocalizedTablePagination />}
        <DataTable.CommandBar selectedLabel={count => t('common.selected', { count })} />
      </DataTable>
      <AddProductsDrawer open={addProductState} onClose={closeAddProductState} review={review} />
    </Container>
  );
};

export default ReviewProductsSection;
