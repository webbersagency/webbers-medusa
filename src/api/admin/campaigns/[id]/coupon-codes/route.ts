import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import {
  COUPON_BATCH_CREATED_AT_KEY,
  COUPON_BATCH_ID_KEY,
  COUPON_BATCH_PREFIX_KEY,
  COUPON_BATCH_TEMPLATE_ID_KEY,
  isGeneratedCoupon,
} from '../../../../../utils/coupon-codes';
import { generateCampaignCouponCodesWorkflow } from '../../../../../workflows/coupon-codes/generate-campaign-coupon-codes';
import { listCampaignPromotions } from './list-campaign-promotions';
import { PostAdminGenerateCouponCodesType } from './validators';

type CouponBatch = {
  id: string;
  created_at: string | null;
  template_promotion_id: string | null;
  prefix: string;
  total: number;
  used: number;
};

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const promotions = await listCampaignPromotions(req.scope, req.params.id);
  const batches = new Map<string, CouponBatch>();

  for (const promotion of promotions.filter(isGeneratedCoupon)) {
    const batchId = promotion.metadata![COUPON_BATCH_ID_KEY] as string;

    const batch = batches.get(batchId) ?? {
      id: batchId,
      created_at: (promotion.metadata![COUPON_BATCH_CREATED_AT_KEY] as string) ?? null,
      template_promotion_id: (promotion.metadata![COUPON_BATCH_TEMPLATE_ID_KEY] as string) ?? null,
      prefix: (promotion.metadata![COUPON_BATCH_PREFIX_KEY] as string) ?? '',
      total: 0,
      used: 0,
    };

    batch.total += 1;
    batch.used += (promotion.used ?? 0) > 0 ? 1 : 0;
    batches.set(batchId, batch);
  }

  const templates = promotions
    .filter(promotion => !isGeneratedCoupon(promotion) && !promotion.is_automatic)
    .map(({ id, code, status }) => ({ id, code, status }));

  res.json({
    templates,
    batches: [...batches.values()].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
  });
};

export const POST = async (req: AuthenticatedMedusaRequest<PostAdminGenerateCouponCodesType>, res: MedusaResponse) => {
  const { result } = await generateCampaignCouponCodesWorkflow(req.scope).run({
    input: {
      campaign_id: req.params.id,
      ...req.validatedBody,
    },
  });

  res.json(result);
};
