import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from '@medusajs/framework/http';
import type { MiddlewareVerb } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import type { ZodRawShape } from '@medusajs/framework/zod';
import { StoreAddCartLineItem, StoreGetCartsCart } from '@medusajs/medusa/api/store/carts/validators';
import * as CartsQueryConfig from '@medusajs/medusa/api/store/carts/query-config';
import { PostAdminEditNote } from './admin/note/validators';
import { adminReviewRoutesMiddlewares } from './admin/reviews/middlewares';
import { adminProductReviewStatRoutesMiddlewares } from './admin/product-review-stats/middlewares';
import { adminReviewResponseRouteMiddlewares } from './admin/reviews/[id]/response/middlewares';
import { adminProductReviewStatusRoutesMiddlewares } from './admin/reviews/[id]/status/middlewares';
import { storeProductReviewRoutesMiddlewares } from './store/product-reviews/middlewares';
import { storeProductReviewUploadsMiddlewares } from './store/product-reviews/uploads/middlewares';
import { storeProductReviewStatRoutesMiddlewares } from './store/product-review-stats/middlewares';
import { PostEditEmail } from './admin/customers/[id]/edit-email/validators';
import { PostWebbersSettings } from './admin/webbers-medusa/settings/validators';
import { PatchAdminUpdatePriceListExt } from './admin/price-lists/[id]/ext/validators';
import { WEBBERS_SETTINGS_MODULE } from '../modules/webbers-settings';
import WebbersSettingsService from '../modules/webbers-settings/service';
import { WebbersFeatureKey } from '../feature-flags';

// Rejects the request with 403 when the given feature has been disabled from the
// Webbers QoL settings page. Keeps server-side gating in one place instead of in every route.
const featureGuard =
  (key: WebbersFeatureKey) => async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const service: WebbersSettingsService = req.scope.resolve(WEBBERS_SETTINGS_MODULE);
    const enabled = await service.isEnabled(key);
    if (!enabled) {
      res.status(403).json({ message: `The "${key}" feature is disabled.` });
      return;
    }
    return next();
  };

export default defineMiddlewares({
  routes: [
    // --- Notes ---
    {
      matcher: '/admin/note',
      methods: ['GET'] as MiddlewareVerb[],
      middlewares: [featureGuard('notes')],
    },
    {
      matcher: '/admin/note',
      methods: ['POST'] as MiddlewareVerb[],
      middlewares: [featureGuard('notes'), validateAndTransformBody(PostAdminEditNote)],
    },
    // --- Anonymize customer ---
    {
      matcher: '/admin/customers/:id/anonymize',
      methods: ['POST'] as MiddlewareVerb[],
      middlewares: [featureGuard('anonymizeCustomer')],
    },
    // --- Transfer guest orders ---
    {
      matcher: '/admin/customers/:id/merge-guest-orders',
      methods: ['GET', 'POST'] as MiddlewareVerb[],
      middlewares: [featureGuard('transferGuestOrders')],
    },
    // --- Edit customer email ---
    {
      matcher: '/admin/customers/:id/edit-email',
      methods: ['POST'] as MiddlewareVerb[],
      middlewares: [featureGuard('editCustomerEmail'), validateAndTransformBody(PostEditEmail)],
    },
    // --- Order notifications ---
    {
      matcher: '/admin/orders/:id/notifications',
      methods: ['GET'] as MiddlewareVerb[],
      middlewares: [featureGuard('orderNotifications')],
    },
    // --- Disallow price-list discounts ---
    {
      matcher: '/admin/price-lists/:id/ext',
      methods: ['GET'] as MiddlewareVerb[],
      middlewares: [featureGuard('disallowPriceListDiscounts')],
    },
    {
      matcher: '/admin/price-lists/:id/ext',
      methods: ['PATCH'] as MiddlewareVerb[],
      middlewares: [
        featureGuard('disallowPriceListDiscounts'),
        validateAndTransformBody(PatchAdminUpdatePriceListExt),
      ],
    },
    // Store add-to-cart that honours a price list's disallow_discounts flag. Not
    // feature-guarded: the route itself skips the disallow logic when the feature is
    // off, so it keeps working as a plain add-to-cart endpoint.
    {
      matcher: '/store/carts/:id/line-item-price-list',
      methods: ['POST'] as MiddlewareVerb[],
      middlewares: [
        validateAndTransformBody(StoreAddCartLineItem),
        validateAndTransformQuery(StoreGetCartsCart, CartsQueryConfig.retrieveTransformQueryConfig),
      ],
    },
    // --- Always-free promotion: whitelist the additional_data field ---
    {
      matcher: '/admin/promotions',
      methods: ['POST'] as MiddlewareVerb[],
      additionalDataValidator: {
        always_free: z.boolean().optional(),
      } as ZodRawShape,
    },
    {
      matcher: '/admin/promotions/:id',
      methods: ['POST'] as MiddlewareVerb[],
      additionalDataValidator: {
        always_free: z.boolean().nullish(),
      } as ZodRawShape,
    },
    // --- Settings page API ---
    {
      matcher: '/admin/webbers-medusa/settings',
      methods: ['POST'] as MiddlewareVerb[],
      middlewares: [validateAndTransformBody(PostWebbersSettings)],
    },
    // --- Reviews ---
    // Guard entries first: middleware entries with the same matcher compose in order,
    // so the guard runs before the per-route validation middlewares below.
    {
      matcher: '/admin/reviews*',
      middlewares: [featureGuard('reviews')],
    },
    {
      matcher: '/admin/product-review-stats*',
      middlewares: [featureGuard('reviews')],
    },
    {
      matcher: '/admin/review-translations*',
      middlewares: [featureGuard('reviews')],
    },
    {
      matcher: '/store/product-reviews*',
      middlewares: [featureGuard('reviews')],
    },
    {
      matcher: '/store/product-review-stats*',
      middlewares: [featureGuard('reviews')],
    },
    ...adminReviewRoutesMiddlewares,
    ...adminProductReviewStatRoutesMiddlewares,
    ...adminReviewResponseRouteMiddlewares,
    ...adminProductReviewStatusRoutesMiddlewares,
    ...storeProductReviewUploadsMiddlewares,
    ...storeProductReviewRoutesMiddlewares,
    ...storeProductReviewStatRoutesMiddlewares,
  ],
});
