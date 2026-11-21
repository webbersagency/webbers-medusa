import { useTranslation } from 'react-i18next';
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { Container, Heading, Button, Text, Prompt, toast } from '@medusajs/ui';
import { DetailWidgetProps, AdminCustomer } from '@medusajs/framework/types';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../lib/sdk';
import { useFeatureEnabled } from '../lib/use-feature-flags';

const CustomerAnonymizeWidget = ({ data }: DetailWidgetProps<AdminCustomer>) => {
  const { t } = useTranslation('webbersMedusa');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const enabled = useFeatureEnabled('anonymizeCustomer');

  const { data: currentUser } = useQuery({
    queryKey: ['current-admin-user'],
    queryFn: () => sdk.admin.user.me(),
  });

  if (!enabled) {
    return null;
  }

  if (!currentUser?.user?.metadata?.superadmin) {
    return null;
  }

  const onConfirm = async () => {
    setLoading(true);
    try {
      await sdk.client.fetch(`/admin/customers/${data.id}/anonymize`, {
        method: 'POST',
      });
      await queryClient.invalidateQueries({ queryKey: [] });
      toast.success(t('customer.anonymize.success'));
    } catch (e: any) {
      toast.error(t('customer.anonymize.error'), { description: e.message });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t('customer.anonymize.title')}</Heading>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {t('customer.anonymize.description')}
        </Text>
        <div>
          <Button size="small" variant="danger" onClick={() => setOpen(true)}>
            {t('settings.features.anonymizeCustomer.label')}
          </Button>
        </div>
      </div>

      <Prompt open={open} onOpenChange={setOpen}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t('customer.anonymize.confirmTitle')}</Prompt.Title>
            <Prompt.Description>
              {t('customer.anonymize.confirmDescription')}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel disabled={loading}>{t('common.cancel')}</Prompt.Cancel>
            <Prompt.Action onClick={onConfirm} disabled={loading}>
              {loading ? t('customer.anonymize.pending') : t('customer.anonymize.action')}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: 'customer.details.side.before',
});

export default CustomerAnonymizeWidget;
