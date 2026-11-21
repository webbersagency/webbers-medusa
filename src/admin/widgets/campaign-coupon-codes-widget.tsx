import { useTranslation } from 'react-i18next';
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { AdminCampaign, DetailWidgetProps } from '@medusajs/framework/types';
import { ArrowDownTray } from '@medusajs/icons';
import { Button, Container, Heading, Input, Label, Select, Table, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getAdminLocale } from '../lib/admin-locale';
import { sdk } from '../lib/sdk';
import { useFeatureEnabled } from '../lib/use-feature-flags';

// Mirror the limits of the API validator.
const MAX_QUANTITY = 2000;
const PREFIX_REGEX = /^([A-Z0-9]{2,12})?$/;

type CouponTemplate = { id: string; code: string; status: string };

type CouponBatch = {
  id: string;
  created_at: string | null;
  prefix: string;
  total: number;
  used: number;
};

type CouponCodesResponse = { templates: CouponTemplate[]; batches: CouponBatch[] };

// One code per line without a header row, the format Klaviyo's "Upload codes" takes.
const downloadCsv = (codes: string[], filename: string) => {
  const url = URL.createObjectURL(new Blob([codes.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const csvFilename = (prefix: string, createdAt?: string | null) =>
  `coupon-codes-${prefix ? `${prefix.toLowerCase()}-` : ''}${(createdAt ?? new Date().toISOString()).slice(0, 10)}.csv`;

const CampaignCouponCodesWidget = ({ data: campaign }: DetailWidgetProps<AdminCampaign>) => {
  const { t, i18n } = useTranslation('webbersMedusa');
  const enabled = useFeatureEnabled('uniqueCouponCodes');
  const locale = getAdminLocale(i18n.language);
  const numberFormat = new Intl.NumberFormat(locale);
  const queryClient = useQueryClient();
  const queryKey = ['campaign-coupon-codes', campaign.id];

  const [templateId, setTemplateId] = useState('');
  const [quantity, setQuantity] = useState('500');
  const [prefix, setPrefix] = useState('');

  const { data, isLoading } = useQuery<CouponCodesResponse>({
    queryKey,
    queryFn: () => sdk.client.fetch<CouponCodesResponse>(`/admin/campaigns/${campaign.id}/coupon-codes`),
    enabled,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ batch_id: string; codes: string[] }>(`/admin/campaigns/${campaign.id}/coupon-codes`, {
        method: 'POST',
        body: { template_promotion_id: templateId, quantity: Number(quantity), prefix },
      }),
    onSuccess: async ({ codes }) => {
      downloadCsv(codes, csvFilename(prefix));
      toast.success(t('coupons.generated', { count: codes.length }));
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast.error(t('coupons.error'), { description: error.message });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (batch: CouponBatch) => {
      const { codes } = await sdk.client.fetch<{ codes: { code: string }[] }>(
        `/admin/campaigns/${campaign.id}/coupon-codes/${batch.id}`
      );

      downloadCsv(
        codes.map(({ code }) => code),
        csvFilename(batch.prefix, batch.created_at)
      );
    },
    onError: () => {
      toast.error(t('coupons.downloadError'));
    },
  });

  if (!enabled) return null;

  const templates = data?.templates ?? [];
  const batches = data?.batches ?? [];
  const quantityNumber = Number(quantity);
  const isQuantityValid = Number.isInteger(quantityNumber) && quantityNumber >= 1 && quantityNumber <= MAX_QUANTITY;
  const isValid = !!templateId && PREFIX_REGEX.test(prefix) && isQuantityValid;

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '-';

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t('coupons.title')}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t('coupons.subtitle')}
        </Text>
      </div>

      {!isLoading && templates.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t('coupons.noTemplates')}
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-y-3 px-6 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus">
                {t('coupons.template')}
              </Label>
              <Select size="small" value={templateId} onValueChange={setTemplateId}>
                <Select.Trigger>
                  <Select.Value placeholder={t('coupons.templatePlaceholder')} />
                </Select.Trigger>
                <Select.Content>
                  {templates.map(template => (
                    <Select.Item key={template.id} value={template.id}>
                      {template.code}
                      {template.status === 'draft' ? ` (${t('coupons.draft')})` : ''}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus" htmlFor="coupon-prefix">
                {t('coupons.prefix')}
              </Label>
              <Input
                id="coupon-prefix"
                size="small"
                value={prefix}
                maxLength={12}
                aria-invalid={!PREFIX_REGEX.test(prefix)}
                onChange={event => setPrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus" htmlFor="coupon-quantity">
                {t('coupons.quantity', { max: MAX_QUANTITY })}
              </Label>
              <Input
                id="coupon-quantity"
                size="small"
                type="number"
                min={1}
                max={MAX_QUANTITY}
                value={quantity}
                aria-invalid={quantity !== '' && !isQuantityValid}
                onChange={event => setQuantity(event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-x-4">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {t('coupons.prefixHint', { example: prefix ? `${prefix}-K7M2X9QP` : 'K7M2-X9QP-4HTB' })}
            </Text>
            <Button
              size="small"
              disabled={!isValid || generateMutation.isPending}
              isLoading={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {t('coupons.submit')}
            </Button>
          </div>
        </div>
      )}

      {batches.length > 0 ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t('coupons.createdAt')}</Table.HeaderCell>
              <Table.HeaderCell>{t('coupons.batchPrefix')}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">{t('coupons.total')}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">{t('coupons.used')}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">{t('coupons.remaining')}</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {batches.map(batch => (
              <Table.Row key={batch.id}>
                <Table.Cell>{formatDate(batch.created_at)}</Table.Cell>
                <Table.Cell>{batch.prefix || '-'}</Table.Cell>
                <Table.Cell className="text-right">{numberFormat.format(batch.total)}</Table.Cell>
                <Table.Cell className="text-right">{numberFormat.format(batch.used)}</Table.Cell>
                <Table.Cell className="text-right">{numberFormat.format(batch.total - batch.used)}</Table.Cell>
                <Table.Cell className="text-right">
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={downloadMutation.isPending}
                    onClick={() => downloadMutation.mutate(batch)}
                  >
                    <ArrowDownTray /> {t('coupons.download')}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ) : (
        !isLoading &&
        templates.length > 0 && (
          <div className="px-6 py-4">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {t('coupons.empty')}
            </Text>
          </div>
        )
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: 'campaign.details.after',
});

export default CampaignCouponCodesWidget;
