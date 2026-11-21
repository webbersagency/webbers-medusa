import { useTranslation } from 'react-i18next';
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { AdminOrder, DetailWidgetProps } from '@medusajs/types';
import { Container, Heading, Text } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { getAdminLocale } from '../lib/admin-locale';
import { sdk } from '../lib/sdk.ts';
import { useFeatureEnabled } from '../lib/use-feature-flags';

type AdjustmentLike = { code?: string | null; amount?: number | string | null };
type LineItemLike = { adjustments?: AdjustmentLike[] | null };
type PromotionLike = {
  code?: string | null;
  application_method?: { type?: string | null; value?: number | string | null } | null;
};
type OrderWithCartPromotions = { cart?: { promotions?: PromotionLike[] | null } | null };
type DiscountCodeBreakdownEntry = { code: string; total: number; percentage?: number };

const buildDiscountCodeBreakdown = (
  items?: LineItemLike[] | null,
  promotions?: PromotionLike[] | null
): DiscountCodeBreakdownEntry[] => {
  if (!items?.length) return [];
  const totals = new Map<string, number>();

  items.forEach(item => {
    (item.adjustments ?? []).forEach(adj => {
      if (!adj?.code) return;
      totals.set(adj.code, (totals.get(adj.code) ?? 0) + (Number(adj.amount) || 0));
    });
  });

  const percentages = new Map<string, number>();

  (promotions ?? []).forEach(p => {
    if (!p?.code || p.application_method?.type !== 'percentage') return;
    const raw = p.application_method?.value;
    const val = typeof raw === 'string' ? parseFloat(raw) : raw;
    if (typeof val === 'number' && !Number.isNaN(val)) percentages.set(p.code, val);
  });

  return Array.from(totals.entries())
    .map(([code, total]) => ({ code, total, percentage: percentages.get(code) }))
    .sort((a, b) => b.total - a.total);
};

const formatAmount = (amount: number, currencyCode: string, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currencyDisplay: 'narrowSymbol',
    currency: currencyCode,
  }).format(amount);

const OrderDiscountBreakdownWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const { t, i18n } = useTranslation('webbersMedusa');
  const locale = getAdminLocale(i18n.language);
  const percentageFormat = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 10 });
  const enabled = useFeatureEnabled('orderDiscountBreakdown');

  const { data, isLoading } = useQuery({
    queryKey: ['order-discount-breakdown', order.id],
    queryFn: () =>
      sdk.admin.order.retrieve(order.id, {
        fields:
          '*items.adjustments,*cart.promotions,+cart.promotions.application_method.type,+cart.promotions.application_method.value',
      }),
  });

  const enriched = data?.order;
  const promotions = (enriched as unknown as OrderWithCartPromotions | undefined)?.cart?.promotions;

  const breakdown = buildDiscountCodeBreakdown(enriched?.items, promotions);

  if (!enabled) {
    return null;
  }

  if (!isLoading && breakdown.length === 0) {
    return null;
  }

  return (
    <Container className="divide-y divide-dashed p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t('orders.discounts.title')}</Heading>
      </div>

      <div className="text-ui-fg-subtle flex flex-col gap-y-2 px-6 py-4">
        {isLoading ? (
          <Text size="small">{t('common.loading')}</Text>
        ) : (
          breakdown.map(({ code, total, percentage }) => (
            <div key={code} className="flex items-center justify-between gap-x-2">
              <div className="flex gap-1">
                <span className="txt-small">{code}</span>
                {typeof percentage === 'number' && (
                  <span className="txt-small">({percentageFormat.format(percentage / 100)})</span>
                )}
              </div>
              <div className="relative flex-1">
                <div className="bottom-[calc(50% - 2px)] absolute h-[1px] w-full border-b border-dashed" />
              </div>
              <span className="txt-small text-ui-fg-muted">{formatAmount(total, order.currency_code, locale)}</span>
            </div>
          ))
        )}
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: 'order.details.side.after',
});

export default OrderDiscountBreakdownWidget;
