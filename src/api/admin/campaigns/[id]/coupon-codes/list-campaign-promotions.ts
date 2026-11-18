import { MedusaContainer } from '@medusajs/framework/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

export type CampaignPromotionRow = {
  id: string;
  code: string;
  status: string;
  is_automatic: boolean;
  used: number | null;
  metadata: Record<string, unknown> | null;
};

export async function listCampaignPromotions(
  container: MedusaContainer,
  campaignId: string
): Promise<CampaignPromotionRow[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data } = await query.graph({
    entity: 'promotion',
    fields: ['id', 'code', 'status', 'is_automatic', 'used', 'metadata'],
    filters: { campaign_id: campaignId },
    pagination: { take: null as unknown as number, order: { created_at: 'ASC' } },
  });

  return data as unknown as CampaignPromotionRow[];
}
