import {
  Button,
  Container,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DataTable,
  DataTableFilteringState,
  DataTablePaginationState,
  DataTableSortingState,
  Heading,
  toast,
  useDataTable,
  usePrompt,
  useToggleState,
} from '@medusajs/ui';
import { ChatBubble, CheckCircleSolid, ExclamationCircle, FlagMini, Trash } from '@medusajs/icons';
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../sdk.ts';
import { DateCell } from '../../components/table-cells/common/date-cell';
import { ReviewStatusCell } from '../../components/table-cells/common/status-cell';
import { ActionMenu } from '../../components/common/action-menu';
import { AdminProduct } from '@medusajs/framework/types';
import AddReviewDrawer from './components/add-review-drawer';
import { useFeatureEnabled } from '../../lib/use-feature-flags';

export type Review = {
  id: string;
  title: string;
  recommend: boolean;
  city: string;
  age: string;
  gender: string;
  status: 'approved' | 'flagged' | 'pending';
  rating: number;
  name: string;
  email: string;
  content: string;
  created_at: string;
  updated_at: string;
  products: AdminProduct[];
  images?: { id: string; url: string }[];
  has_images: boolean;
  translations?: Record<string, unknown> | null;
};

export type ListReviewsResponse = {
  reviews: Review[];
  count: number;
  limit: number;
  offset: number;
};
const limit = 20;

const FILTER_IDS = ['status', 'rating', 'product'] as const;
const ORDER_PARAM = 'order';

// Before @medusajs/ui 4.2 the filter bar renders its own filter and sort menus (it hands the filter
// menu an `onAddFilter`); from 4.2 they have to be placed in the toolbar, so add them only then.
const IS_FILTER_BAR_WITH_MENUS = String(DataTable.FilterBar).includes('onAddFilter');
const DEFAULT_SORTING: DataTableSortingState = { id: 'created_at', desc: true };

// Sorting lives in the URL as the API's `order` value, e.g. `-rating` for highest rating first.
function parseSortingState(value: string | null): DataTableSortingState {
  if (!value) return DEFAULT_SORTING;
  return value.startsWith('-') ? { id: value.slice(1), desc: true } : { id: value, desc: false };
}

function transformSortingState(value: DataTableSortingState) {
  return `${value.desc ? '-' : ''}${value.id}`;
}

function transformPaginationState(value: DataTablePaginationState) {
  return value.pageIndex * value.pageSize;
}

function parsePaginationState(value: string, pageSize: number): DataTablePaginationState {
  const offset = parseInt(value, 10);
  return { pageIndex: Math.floor(offset / pageSize), pageSize };
}

function parseFilterValue(raw: string): unknown {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'boolean' ? raw : parsed;
  } catch {
    return raw;
  }
}

const columnHelper = createDataTableColumnHelper<Review>();
const filterHelper = createDataTableFilterHelper();

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const StarIcon = ({ filled }: { filled: boolean }) => {
  const cls = filled ? 'h-4 w-4' : 'h-4 w-4';

  return filled ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="#FAB82B">
      <path d="M12 17.27l-5.18 3.05 1.4-5.98-4.64-4.02 6.1-.52L12 4l2.32 5.8 6.1.52-4.64 4.02 1.4 5.98L12 17.27z" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="none">
      <path
        d="M12 17.27l-5.18 3.05 1.4-5.98-4.64-4.02 6.1-.52L12 4l2.32 5.8 6.1.52-4.64 4.02 1.4 5.98L12 17.27z"
        stroke="#FAB82B"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const StarRatingCell = ({ rating, max = 5 }: { rating: number; max?: number }) => {
  const value = clamp(Math.round(Number(rating) || 0), 0, max);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <StarIcon key={i} filled={i < value} />
        ))}
      </div>
    </div>
  );
};

const ReviewOverviewPage = () => {
  const dialog = usePrompt();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, open, close] = useToggleState(false);

  const searchValue = searchParams.get('q') || '';

  const pagination = useMemo<DataTablePaginationState>(() => {
    const offsetParam = searchParams.get('offset');
    return offsetParam ? parsePaginationState(offsetParam, limit) : { pageIndex: 0, pageSize: limit };
  }, [searchParams]);

  const filtering = useMemo<DataTableFilteringState>(() => {
    const filters: DataTableFilteringState = {};
    for (const id of FILTER_IDS) {
      const raw = searchParams.get(id);
      if (raw !== null) filters[id] = parseFilterValue(raw);
    }
    return filters;
  }, [searchParams]);

  const sorting = useMemo(() => parseSortingState(searchParams.get(ORDER_PARAM)), [searchParams]);

  const offset = useMemo(() => pagination.pageIndex * limit, [pagination.pageIndex]);

  // The table cycles a column asc → desc → unsorted and reports "unsorted" as undefined;
  // flipping the direction instead keeps repeated clicks toggling between asc and desc.
  const handleSortingChange = useCallback(
    (value: DataTableSortingState | undefined) => {
      const nextSorting = value ?? { id: sorting.id, desc: !sorting.desc };

      setSearchParams(prev => {
        prev.set(ORDER_PARAM, transformSortingState(nextSorting));
        prev.delete('offset');
        return prev;
      });
    },
    [setSearchParams, sorting]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchParams(prev => {
        if (value) prev.set('q', value);
        else prev.delete('q');
        return prev;
      });
    },
    [setSearchParams]
  );

  const handlePaginationChange = useCallback(
    (value: DataTablePaginationState) => {
      setSearchParams(prev => {
        if (value.pageIndex === 0) prev.delete('offset');
        else prev.set('offset', String(transformPaginationState(value)));
        return prev;
      });
    },
    [setSearchParams]
  );

  const handleFilteringChange = useCallback(
    (value: DataTableFilteringState) => {
      setSearchParams(prev => {
        FILTER_IDS.forEach(id => {
          if (!(id in value)) prev.delete(id);
        });
        Object.entries(value).forEach(([key, filter]) => {
          if (filter !== undefined) prev.set(key, JSON.stringify(filter));
          else prev.delete(key);
        });
        return prev;
      });
    },
    [setSearchParams]
  );

  const updateReviewStatus = useMutation({
    mutationFn: async (params: { reviewId: string; status: 'approved' | 'flagged' }) => {
      const { reviewId, status } = params;

      return sdk.client.fetch(`/admin/reviews/${reviewId}/status`, {
        method: 'PUT',
        body: { status: status },
      });
    },
    onSuccess: async () => {
      toast.success('Successfully updated review status.');
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['review'] });
    },
    onError: () => {
      toast.error('Failed to update review status.');
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
      toast.success('Successfully deleted review.');
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: () => {
      toast.error('Failed to delete review.');
    },
  });

  const handleRemove = async (id: string) => {
    const confirmed = await dialog({
      title: 'Are you sure?',
      description: `You are about to delete this review? This action cannot be undone.`,
    });

    if (!confirmed) {
      return;
    }

    await deleteReview.mutateAsync({ reviewId: id });
  };

  const statusFilters = useMemo(() => filtering.status || [], [filtering.status]) as string[];
  const ratingFilters = useMemo(() => filtering.rating || [], [filtering.rating]) as string[];
  const productFilters = useMemo(() => filtering.product || [], [filtering.product]) as string[];

  const columns = useMemo(
    () => [
      columnHelper.accessor('created_at', {
        header: 'Date',
        enableSorting: true,
        cell: ({ getValue }) => <DateCell date={new Date(getValue())} />,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        enableSorting: true,
        cell: ({ getValue }) => <ReviewStatusCell status={getValue()} />,
      }),
      columnHelper.accessor('name', { header: 'Name' }),
      columnHelper.accessor('title', { header: 'Title' }),
      columnHelper.accessor('rating', {
        header: 'Rating',
        enableSorting: true,
        cell: ({ getValue }) => <StarRatingCell rating={getValue()} />,
      }),
      columnHelper.accessor('has_images', {
        header: 'Photo',
        enableSorting: true,
        sortLabel: 'Photo',
        sortAscLabel: 'Without photo first',
        sortDescLabel: 'With photo first',
        cell: ({ row }) => {
          const [firstImage] = row.original.images ?? [];

          return firstImage ? (
            <img src={firstImage.url} alt="" className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <span className="text-ui-fg-muted">-</span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Edit',
        cell: ({ row }) => {
          const status = row.original.status;

          const canApprove = status === 'pending' || status === 'flagged';
          const canFlag = status === 'pending' || status === 'approved';

          const isUpdatingThisRow =
            updateReviewStatus.isPending && updateReviewStatus.variables?.reviewId === row.original.id;

          return (
            <ActionMenu
              groups={[
                {
                  actions: [
                    {
                      icon: <CheckCircleSolid />,
                      label: 'Approve',
                      disabled: !canApprove || isUpdatingThisRow,
                      onClick: () =>
                        updateReviewStatus.mutate({
                          reviewId: row.original.id,
                          status: 'approved',
                        }),
                    },
                    {
                      icon: <FlagMini />,
                      label: 'Flag',
                      disabled: !canFlag || isUpdatingThisRow,
                      onClick: () =>
                        updateReviewStatus.mutate({
                          reviewId: row.original.id,
                          status: 'flagged',
                        }),
                    },
                    {
                      icon: <Trash />,
                      label: 'Delete',
                      onClick: () => handleRemove(row.original.id),
                    },
                  ],
                },
              ]}
            />
          );
        },
      }),
    ],
    [updateReviewStatus]
  );

  const { data } = useQuery<ListReviewsResponse>({
    queryFn: () => {
      const queryParams: any = {
        limit,
        offset,
        ...(productFilters.length > 0 && { product_id: productFilters.join(',') }),
        q: searchValue,
        status: statusFilters,
        rating: ratingFilters,
        order: transformSortingState(sorting),
      };
      return sdk.client.fetch(`/admin/reviews`, { query: queryParams });
    },
    queryKey: ['reviews', limit, pagination, offset, searchValue, statusFilters, ratingFilters, productFilters, sorting],
    placeholderData: keepPreviousData,
  });

  const { data: productData } = useQuery<{ count: number; limit: number; offset: number; products: AdminProduct[] }>({
    queryFn: () => {
      return sdk.client.fetch(`/admin/products`, {
        query: {
          limit: 1000,
        },
      });
    },
    queryKey: ['products-for-filter'],
  });

  const products = productData?.products;

  const filters = useMemo(
    () => [
      filterHelper.accessor('status', {
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Approved', value: 'approved' },
          { label: 'Pending', value: 'pending' },
          { label: 'Flagged', value: 'flagged' },
        ],
      }),
      filterHelper.accessor('rating', {
        type: 'select',
        label: 'Rating',
        options: [
          { label: '1', value: '1' },
          { label: '2', value: '2' },
          { label: '3', value: '3' },
          { label: '4', value: '4' },
          { label: '5', value: '5' },
        ],
      }),
      filterHelper.accessor('product', {
        type: 'select',
        label: 'Product',
        options: products?.map(p => ({ label: p.title, value: p.id })) || [],
      }),
    ],
    [products]
  );

  const table = useDataTable({
    columns: columns,
    data: data?.reviews || [],
    getRowId: row => row.id,
    rowCount: data?.count || 0,
    pagination: {
      state: pagination,
      onPaginationChange: handlePaginationChange,
    },
    filtering: { state: filtering, onFilteringChange: handleFilteringChange },
    sorting: { state: sorting, onSortingChange: handleSortingChange },
    filters,
    search: {
      state: searchValue,
      onSearchChange: handleSearchChange,
    },
    onRowClick: (_, row) => navigate(`/reviews/${row.id}`),
  });

  return (
    <Container className="divide-y p-0">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <Heading>Reviews</Heading>
          <div className="flex gap-2">
            {!IS_FILTER_BAR_WITH_MENUS && <DataTable.FilterMenu tooltip="Filter" />}
            {!IS_FILTER_BAR_WITH_MENUS && <DataTable.SortingMenu tooltip="Sort" />}
            <DataTable.Search placeholder="Search..." />
            <Button size="small" type="button" variant="secondary" onClick={open}>
              Create
            </Button>
          </div>{' '}
        </DataTable.Toolbar>
        <DataTable.Table
          emptyState={{
            empty: {
              custom: (
                <div className="flex flex-col items-center gap-y-3">
                  <ExclamationCircle />
                  <div className="flex flex-col items-center gap-y-1">
                    <p className="font-medium txt-compact-small">No records</p>
                    <p className="font-normal txt-small text-ui-fg-muted">There are no records to show</p>
                  </div>
                </div>
              ),
            },
          }}
        />
        <DataTable.Pagination />
      </DataTable>
      <AddReviewDrawer state={state} onClose={close} />
    </Container>
  );
};

export const config = defineRouteConfig({
  label: 'Reviews',
  icon: ChatBubble,
});

export const handle = {
  breadcrumb: () => 'Reviews',
};

// The sidebar entry from defineRouteConfig cannot be hidden dynamically, so when the
// feature is off the page explains where to re-enable it instead of rendering the table
// (whose endpoints would return 403 anyway).
const GatedReviewOverviewPage = () => {
  const enabled = useFeatureEnabled('reviews');

  if (!enabled) {
    return (
      <Container className="p-6">
        <Heading level="h2">Reviews</Heading>
        <p className="text-ui-fg-subtle mt-2">
          The reviews feature is disabled. Enable it under Settings → Webbers QoL.
        </p>
      </Container>
    );
  }

  return <ReviewOverviewPage />;
};

export default GatedReviewOverviewPage;
