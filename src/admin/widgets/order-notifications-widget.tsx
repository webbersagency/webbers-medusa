import { useTranslation } from 'react-i18next';
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { AdminOrder, DetailWidgetProps } from '@medusajs/framework/types';
import { Container, Heading, Text } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { getAdminLocale } from '../lib/admin-locale';
import { sdk } from '../lib/sdk';
import { useFeatureEnabled } from '../lib/use-feature-flags';

const formatDateTime = (date: string | Date, locale: string) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};

type NotificationGroup = {
  template: string;
  recipients: string[];
  sent_at: string;
};

type NotificationsResponse = {
  notifications: NotificationGroup[];
};

const OrderNotificationsWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const { t, i18n } = useTranslation('webbersMedusa');
  const locale = getAdminLocale(i18n.language);
  const enabled = useFeatureEnabled('orderNotifications');

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryFn: () =>
      sdk.client.fetch<NotificationsResponse>(`/admin/orders/${order.id}/notifications`),
    queryKey: ['order-notifications', order.id],
    enabled,
  });

  const notifications = data?.notifications ?? [];

  if (!enabled) return null;

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t('orders.notifications.title')}</Heading>
      </div>

      {isLoading ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">{t('common.loading')}</Text>
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">{t('orders.notifications.empty')}</Text>
        </div>
      ) : (
        notifications.map((notification, i) => (
          <div key={i} className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
            <div className="flex flex-col gap-y-1">
              <Text>
                {notification.template === 'order-invoice' ? t('orders.notifications.invoice') : notification.template}
              </Text>
              {notification.recipients.map(recipient => (
                <Text key={recipient} size="small" className="text-ui-fg-muted">
                  {recipient}
                </Text>
              ))}
            </div>
            <Text size="small">{formatDateTime(notification.sent_at, locale)}</Text>
          </div>
        ))
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: 'order.details.side.before',
});

export default OrderNotificationsWidget;
