import { z } from '@medusajs/framework/zod';
import { COUPON_MAX_QUANTITY, COUPON_PREFIX_REGEX } from '../../../../../utils/coupon-codes';

export const PostAdminGenerateCouponCodes = z.object({
  template_promotion_id: z.string().min(1),
  quantity: z.number().int().min(1).max(COUPON_MAX_QUANTITY),
  prefix: z
    .string()
    .trim()
    .default('')
    .transform(value => value.toUpperCase())
    .pipe(z.string().regex(COUPON_PREFIX_REGEX)),
});

export type PostAdminGenerateCouponCodesType = z.infer<typeof PostAdminGenerateCouponCodes>;
