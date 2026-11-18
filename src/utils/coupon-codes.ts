import { randomInt } from 'crypto';

// No 0/O and 1/I: the codes end up in emails and get typed over by hand.
export const COUPON_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const COUPON_CODE_LENGTH = 8;
export const COUPON_CODE_GROUPS = 3;
export const COUPON_CODE_GROUP_LENGTH = 4;
// The prefix is optional: an empty prefix gives codes like XXXX-XXXX-XXXX.
export const COUPON_PREFIX_REGEX = /^([A-Z0-9]{2,12})?$/;
export const COUPON_MAX_QUANTITY = 2000;

// Promotion metadata keys that mark a promotion as part of a generated batch.
export const COUPON_BATCH_ID_KEY = 'coupon_batch_id';
export const COUPON_BATCH_CREATED_AT_KEY = 'coupon_batch_created_at';
export const COUPON_BATCH_TEMPLATE_ID_KEY = 'coupon_batch_template_id';
export const COUPON_BATCH_PREFIX_KEY = 'coupon_batch_prefix';

function randomChars(length: number): string {
  let chars = '';

  for (let i = 0; i < length; i++) {
    chars += COUPON_CODE_ALPHABET[randomInt(COUPON_CODE_ALPHABET.length)];
  }

  return chars;
}

/** `PREFIX-XXXXXXXX` with a prefix, `XXXX-XXXX-XXXX` without one. */
export function generateCouponCode(prefix: string): string {
  if (prefix) {
    return `${prefix}-${randomChars(COUPON_CODE_LENGTH)}`;
  }

  return Array.from({ length: COUPON_CODE_GROUPS }, () => randomChars(COUPON_CODE_GROUP_LENGTH)).join('-');
}

/** Generates `quantity` distinct codes, none of which is in `taken`. */
export function generateCouponCodes(prefix: string, quantity: number, taken: Set<string> = new Set()): string[] {
  const codes = new Set<string>();

  while (codes.size < quantity) {
    const code = generateCouponCode(prefix);

    if (!taken.has(code)) {
      codes.add(code);
    }
  }

  return [...codes];
}

export function isGeneratedCoupon(promotion: { metadata?: Record<string, unknown> | null }): boolean {
  return !!promotion.metadata?.[COUPON_BATCH_ID_KEY];
}

/** One code per line without a header row, the format Klaviyo's "Upload codes" takes. */
export function couponCodesToCsv(codes: string[]): string {
  return codes.join('\n') + '\n';
}
