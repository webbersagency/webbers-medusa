import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { AdminCampaign, DetailWidgetProps } from '@medusajs/framework/types';
import { ArrowDownTray } from '@medusajs/icons';
import { Button, Container, Heading, Input, Label, Select, Table, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { sdk } from '../lib/sdk';
import { useFeatureEnabled } from '../lib/use-feature-flags';

// Mirror the limits of the API validator.
const MAX_QUANTITY = 2000;
const PREFIX_REGEX = /^([A-Z0-9]{2,12})?$/;

const TEXTS = {
  en: {
    title: 'Unique coupon codes',
    subtitle: 'Generate single-use codes from a promotion in this campaign, for example for a Klaviyo flow.',
    noTemplates:
      'First add a promotion with a code to this campaign. It serves as the template for the discount and its conditions. Keep the template as a draft, so nobody can redeem the template code itself.',
    template: 'Template promotion',
    templatePlaceholder: 'Choose a promotion',
    quantity: `Number of codes (maximum ${MAX_QUANTITY} at a time)`,
    prefix: 'Prefix (optional)',
    prefixHint: 'Empty or 2 to 12 letters or digits. A code looks like',
    submit: 'Generate codes',
    draft: 'draft',
    createdAt: 'Created',
    batchPrefix: 'Prefix',
    total: 'Codes',
    used: 'Used',
    remaining: 'Unused',
    download: 'Download CSV',
    empty: 'No codes have been generated for this campaign yet.',
    generated: (count: number) => `${count} codes created. The CSV was downloaded; upload it to the coupon in Klaviyo.`,
    error: 'The codes could not be created',
    downloadError: 'The CSV could not be downloaded',
  },
  nl: {
    title: 'Unieke kortingscodes',
    subtitle:
      'Genereer eenmalig te gebruiken codes op basis van een promotie in deze campagne, bijvoorbeeld voor een Klaviyo-flow.',
    noTemplates:
      'Voeg eerst een promotie met een code aan deze campagne toe. Die dient als sjabloon voor de korting en de voorwaarden. Zet het sjabloon op concept, dan kan niemand de sjablooncode zelf gebruiken.',
    template: 'Sjabloonpromotie',
    templatePlaceholder: 'Kies een promotie',
    quantity: `Aantal codes (maximaal ${MAX_QUANTITY} per keer)`,
    prefix: 'Voorvoegsel (optioneel)',
    prefixHint: 'Leeg of 2 tot 12 letters of cijfers. Een code wordt bijvoorbeeld',
    submit: 'Genereer codes',
    draft: 'concept',
    createdAt: 'Aangemaakt',
    batchPrefix: 'Voorvoegsel',
    total: 'Codes',
    used: 'Gebruikt',
    remaining: 'Ongebruikt',
    download: 'Download CSV',
    empty: 'Er zijn nog geen codes gegenereerd voor deze campagne.',
    generated: (count: number) =>
      `${count} codes aangemaakt. De CSV is gedownload; upload die in Klaviyo bij de coupon.`,
    error: 'De codes konden niet worden aangemaakt',
    downloadError: 'De CSV kon niet worden gedownload',
  },
};

// The plugin has no i18next dependency of its own, so this reads the language the dashboard's
// language detector stores (`lng`) and falls back to English.
const getLanguage = (): keyof typeof TEXTS => {
  try {
    const stored =
      window.localStorage.getItem('lng') ?? document.cookie.match(/(?:^|;\s*)lng=([^;]+)/)?.[1] ?? '';

    return stored.toLowerCase().startsWith('nl') ? 'nl' : 'en';
  } catch {
    return 'en';
  }
};

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
  const enabled = useFeatureEnabled('uniqueCouponCodes');
  const language = getLanguage();
  const t = TEXTS[language];
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
      toast.success(t.generated(codes.length));
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast.error(t.error, { description: error.message });
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
      toast.error(t.downloadError);
    },
  });

  if (!enabled) return null;

  const templates = data?.templates ?? [];
  const batches = data?.batches ?? [];
  const quantityNumber = Number(quantity);
  const isQuantityValid = Number.isInteger(quantityNumber) && quantityNumber >= 1 && quantityNumber <= MAX_QUANTITY;
  const isValid = !!templateId && PREFIX_REGEX.test(prefix) && isQuantityValid;

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' }) : '-';

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t.title}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t.subtitle}
        </Text>
      </div>

      {!isLoading && templates.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t.noTemplates}
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-y-3 px-6 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus">
                {t.template}
              </Label>
              <Select size="small" value={templateId} onValueChange={setTemplateId}>
                <Select.Trigger>
                  <Select.Value placeholder={t.templatePlaceholder} />
                </Select.Trigger>
                <Select.Content>
                  {templates.map(template => (
                    <Select.Item key={template.id} value={template.id}>
                      {template.code}
                      {template.status === 'draft' ? ` (${t.draft})` : ''}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small" weight="plus" htmlFor="coupon-prefix">
                {t.prefix}
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
                {t.quantity}
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
              {t.prefixHint} {prefix ? `${prefix}-K7M2X9QP` : 'K7M2-X9QP-4HTB'}.
            </Text>
            <Button
              size="small"
              disabled={!isValid || generateMutation.isPending}
              isLoading={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {t.submit}
            </Button>
          </div>
        </div>
      )}

      {batches.length > 0 ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t.createdAt}</Table.HeaderCell>
              <Table.HeaderCell>{t.batchPrefix}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">{t.total}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">{t.used}</Table.HeaderCell>
              <Table.HeaderCell className="text-right">{t.remaining}</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {batches.map(batch => (
              <Table.Row key={batch.id}>
                <Table.Cell>{formatDate(batch.created_at)}</Table.Cell>
                <Table.Cell>{batch.prefix || '-'}</Table.Cell>
                <Table.Cell className="text-right">{batch.total}</Table.Cell>
                <Table.Cell className="text-right">{batch.used}</Table.Cell>
                <Table.Cell className="text-right">{batch.total - batch.used}</Table.Cell>
                <Table.Cell className="text-right">
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={downloadMutation.isPending}
                    onClick={() => downloadMutation.mutate(batch)}
                  >
                    <ArrowDownTray /> {t.download}
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
              {t.empty}
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
