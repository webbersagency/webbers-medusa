import { useTranslation } from 'react-i18next';
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Adjustments } from '@medusajs/icons';
import { Container, Heading, Switch, Text, toast } from '@medusajs/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../../lib/sdk';
import { useFeatureFlags, WEBBERS_SETTINGS_QUERY_KEY } from '../../../lib/use-feature-flags';
import { WEBBERS_FEATURE_KEYS } from '../../../../feature-flags';

type FlagsResponse = { flags: Record<string, boolean> };

const WebbersSettingsPage = () => {
  const { t } = useTranslation('webbersMedusa');
  const queryClient = useQueryClient();
  const { data, isLoading } = useFeatureFlags();

  const { mutate, isPending } = useMutation({
    mutationFn: (flags: Record<string, boolean>) =>
      sdk.client.fetch<FlagsResponse>('/admin/webbers-medusa/settings', {
        method: 'POST',
        body: { flags },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WEBBERS_SETTINGS_QUERY_KEY });
      toast.success(t('settings.success'));
    },
    onError: () => toast.error(t('settings.error')),
  });

  const flags = data?.flags ?? {};

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">{t('settings.title')}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t('settings.description')}
        </Text>
      </div>

      {WEBBERS_FEATURE_KEYS.map((key) => {
        const enabled = flags[key] ?? true;
        return (
          <div key={key} className="flex items-center justify-between gap-x-4 px-6 py-4">
            <div className="flex flex-col">
              <Text weight="plus" size="small">
                {t(`settings.features.${key}.label`)}
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                {t(`settings.features.${key}.description`)}
              </Text>
            </div>
            <Switch
              aria-label={t(`settings.features.${key}.label`)}
              checked={enabled}
              disabled={isLoading || isPending}
              onCheckedChange={(next) => mutate({ [key]: next })}
            />
          </div>
        );
      })}
    </Container>
  );
};

export const config = defineRouteConfig({
  label: 'settings.nav',
  translationNs: 'webbersMedusa',
  icon: Adjustments,
});

export default WebbersSettingsPage;
