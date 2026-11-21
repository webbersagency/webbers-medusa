import { useTranslation } from 'react-i18next';
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { Container, Heading, Button, Input, toast } from '@medusajs/ui';
import { DetailWidgetProps, AdminCustomer } from '@medusajs/framework/types';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeatureEnabled } from '../lib/use-feature-flags';

async function updateCustomerEmail(id: string, email: string) {
  const res = await fetch(`/admin/customers/${id}/edit-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error('Failed to update customer');
  }

  return res.json();
}

const CustomerEmailWidget = (props: DetailWidgetProps<AdminCustomer>) => {
  // Remount the form when navigating to another customer, so stale state is discarded
  return <CustomerEmailForm key={props.data.id} {...props} />;
};

const CustomerEmailForm = ({ data }: DetailWidgetProps<AdminCustomer>) => {
  const { t } = useTranslation('webbersMedusa');
  const [email, setEmail] = useState(data.email);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const enabled = useFeatureEnabled('editCustomerEmail');

  if (!enabled || !data.has_account) {
    return null;
  }

  const onSave = async () => {
    setLoading(true);

    try {
      await updateCustomerEmail(data.id, email);
      await queryClient.invalidateQueries({ queryKey: [] });
      toast.success(t('customer.email.success'));
    } catch {
      toast.error(t('customer.email.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t('customer.email.title')}</Heading>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Input type="email" value={email ?? ''} onChange={e => setEmail(e.target.value)} />
        <div className="flex items-center gap-x-3">
          <Button size="small" variant="primary" disabled={loading || email === data.email} onClick={onSave}>
            {loading ? t('common.saving') : t('customer.email.save')}
          </Button>
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: 'customer.details.side.before', // customer detail widget zone
});

export default CustomerEmailWidget;
