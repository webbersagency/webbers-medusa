import { useTranslation } from 'react-i18next';
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { Container, Heading, Text, Button, Badge, toast } from '@medusajs/ui';
import { DetailWidgetProps, AdminCustomer } from '@medusajs/framework/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../lib/sdk';
import { useFeatureEnabled } from '../lib/use-feature-flags';

type GuestOrdersResponse = { count: number; email: string };
type MergeResponse = { transferred_count: number };

const CustomerMergeGuestOrdersWidget = ({ data }: DetailWidgetProps<AdminCustomer>) => {
  const { t } = useTranslation('webbersMedusa');
  const queryClient = useQueryClient();
  const featureEnabled = useFeatureEnabled('transferGuestOrders');

  const { data: guestData, isLoading } = useQuery<GuestOrdersResponse>({
    queryKey: ['customer-guest-orders', data.id],
    queryFn: () => sdk.client.fetch(`/admin/customers/${data.id}/merge-guest-orders`),
    enabled: data.has_account && featureEnabled,
  });

  const mergeMutation = useMutation<MergeResponse>({
    mutationFn: () =>
      sdk.client.fetch(`/admin/customers/${data.id}/merge-guest-orders`, {
        method: 'POST',
      }),
    onSuccess: async result => {
      await queryClient.invalidateQueries({ queryKey: [] });
      toast.success(t('customer.guestOrders.success', { count: result.transferred_count }));
    },
    onError: (error: any) => {
      toast.error(t('customer.guestOrders.error'), { description: error.message });
    },
  });

  if (!featureEnabled || !data.has_account || isLoading) return null;

  const count = guestData?.count ?? 0;

  if (count === 0) return null;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t('customer.guestOrders.title')}</Heading>
        <Badge color="orange">{count}</Badge>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {t('customer.guestOrders.description', { count, email: guestData?.email })}
        </Text>
        <div>
          <Button
            size="small"
            variant="primary"
            isLoading={mergeMutation.isPending}
            disabled={mergeMutation.isPending}
            onClick={() => mergeMutation.mutate()}
          >
            {t('customer.guestOrders.merge')}
          </Button>
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: 'customer.details.side.before',
});

export default CustomerMergeGuestOrdersWidget;
