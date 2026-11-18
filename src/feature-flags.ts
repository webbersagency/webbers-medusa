// Single source of truth for the toggleable features in this plugin.
// Pure constants only (no imports) so it can be shared by both the server build
// and the admin (vite) build.

export type WebbersFeatureKey =
  | 'notes'
  | 'anonymizeCustomer'
  | 'transferGuestOrders'
  | 'editCustomerEmail'
  | 'orderDiscountBreakdown'
  | 'orderNotifications'
  | 'alwaysFreePromotion'
  | 'disallowPriceListDiscounts'
  | 'uniqueCouponCodes'
  | 'reviews';

export type WebbersFeatureDefinition = {
  key: WebbersFeatureKey;
  label: string;
  description: string;
};

export const WEBBERS_FEATURES: WebbersFeatureDefinition[] = [
  {
    key: 'notes',
    label: 'Notes',
    description: 'Free-text notes on customer and order detail pages.',
  },
  {
    key: 'anonymizeCustomer',
    label: 'Anonymize customer',
    description: 'AVG/GDPR data scrub action on the customer page (superadmin only).',
  },
  {
    key: 'transferGuestOrders',
    label: 'Transfer guest orders',
    description: 'Merge unassigned guest orders into a customer account.',
  },
  {
    key: 'editCustomerEmail',
    label: 'Edit customer email',
    description: "Change a registered customer's email from the customer page.",
  },
  {
    key: 'orderDiscountBreakdown',
    label: 'Order discount breakdown',
    description: 'Summary of discount codes applied to an order.',
  },
  {
    key: 'orderNotifications',
    label: 'Order notifications',
    description: 'List of transactional emails sent for an order.',
  },
  {
    key: 'alwaysFreePromotion',
    label: 'Always-free promotion',
    description: 'Free-shipping toggle on the promotion page (widget only).',
  },
  {
    key: 'disallowPriceListDiscounts',
    label: 'Disallow price-list discounts',
    description: "Toggle on a price list to stop discount codes from overriding its prices.",
  },
  {
    key: 'uniqueCouponCodes',
    label: 'Unique coupon codes',
    description: 'Generate single-use codes from a template promotion on the campaign page, with a CSV download.',
  },
  {
    key: 'reviews',
    label: 'Product reviews',
    description: 'Product reviews: admin Reviews page, store review endpoints and review stats.',
  },
];

export const WEBBERS_FEATURE_KEYS: WebbersFeatureKey[] = WEBBERS_FEATURES.map((f) => f.key);

// Features default to ON when no row has been persisted yet.
export const DEFAULT_FEATURE_ENABLED = true;
