import { useTranslation } from 'react-i18next';
import { AdminPriceList, DetailWidgetProps, MetadataType } from '@medusajs/framework/types';
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { Container, Heading, Switch, Text } from '@medusajs/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sdk } from '../lib/sdk';
import { useFeatureEnabled } from '../lib/use-feature-flags';

const PriceListExtWidget = ({ data }: DetailWidgetProps<AdminPriceList>) => {
  const { t } = useTranslation('webbersMedusa');
  const { id } = data;
  const enabled = useFeatureEnabled('disallowPriceListDiscounts');

  const {
    data: extendedPriceList,
    refetch,
    isPending: isPendingQuery,
  } = useQuery<{ price_list_ext: { id: string; metadata?: MetadataType } }>({
    queryFn: () =>
      sdk.client.fetch(`/admin/price-lists/${id}/ext`, {
        headers: { cache: 'no-cache' },
      }),
    queryKey: [`${id}-price-list-ext`],
    enabled,
  });

  const { price_list_ext } = extendedPriceList ?? {};

  const { mutate, isPending: isPendingMutate } = useMutation({
    mutationFn: (body: { id: string; metadata: MetadataType }) =>
      sdk.client.fetch(`/admin/price-lists/${id}/ext`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: async () => {
      await refetch();
    },
  });

  const handleToggle = async () => {
    if (!price_list_ext) {
      return;
    }

    const metadata = price_list_ext?.metadata ?? ({} as MetadataType);

    if (metadata && price_list_ext?.id) {
      metadata.disallow_discounts = !metadata?.disallow_discounts;
      mutate({ id: price_list_ext.id, metadata });
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t('priceList.title')}</Heading>
        <Switch
          checked={!!price_list_ext?.metadata?.disallow_discounts}
          onCheckedChange={handleToggle}
          disabled={isPendingMutate || isPendingQuery}
        />
      </div>
      <div className="px-6 py-4">
        <Text size="small">{t('priceList.description')}</Text>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: 'price_list.details.side.after',
});

export default PriceListExtWidget;
