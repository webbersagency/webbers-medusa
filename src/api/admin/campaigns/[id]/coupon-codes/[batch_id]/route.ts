import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { COUPON_BATCH_ID_KEY } from '../../../../../../utils/coupon-codes';
import { listCampaignPromotions } from '../list-campaign-promotions';

// The codes of one batch, so its CSV can be downloaded again later.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { id, batch_id: batchId } = req.params;

  const promotions = await listCampaignPromotions(req.scope, id);
  const codes = promotions
    .filter(promotion => promotion.metadata?.[COUPON_BATCH_ID_KEY] === batchId)
    .map(promotion => ({ code: promotion.code, used: (promotion.used ?? 0) > 0 }));

  if (!codes.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Coupon batch not found');
  }

  res.json({ batch_id: batchId, codes });
};
