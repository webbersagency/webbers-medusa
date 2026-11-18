import { CreatePromotionDTO, CreatePromotionRuleDTO, PromotionDTO, PromotionRuleDTO } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, MedusaError, Modules, PromotionStatus } from '@medusajs/framework/utils';
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { createPromotionsStep } from '@medusajs/medusa/core-flows';
import { randomUUID } from 'crypto';
import {
  COUPON_BATCH_CREATED_AT_KEY,
  COUPON_BATCH_ID_KEY,
  COUPON_BATCH_PREFIX_KEY,
  COUPON_BATCH_TEMPLATE_ID_KEY,
  generateCouponCodes,
  isGeneratedCoupon,
} from '../../utils/coupon-codes';

export type GenerateCampaignCouponCodesInput = {
  campaign_id: string;
  template_promotion_id: string;
  quantity: number;
  prefix: string;
};

const copyRules = (rules?: PromotionRuleDTO[] | null): CreatePromotionRuleDTO[] =>
  (rules ?? []).map(rule => ({
    description: rule.description,
    attribute: rule.attribute!,
    operator: rule.operator!,
    values: (rule.values ?? []).map(value => value.value!),
  }));

// Builds one single-use promotion per code, each a copy of the template promotion's discount and
// rules. Read-only: the promotions are created by the next step, which also rolls them back.
export const buildCouponPromotionsStep = createStep(
  'build-coupon-promotions-step',
  async (input: GenerateCampaignCouponCodesInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const promotionModule = container.resolve(Modules.PROMOTION);

    const { data } = await query.graph({
      entity: 'promotion',
      fields: [
        'id',
        'type',
        'is_automatic',
        'is_tax_inclusive',
        'campaign_id',
        'metadata',
        'application_method.*',
        'application_method.target_rules.*',
        'application_method.target_rules.values.*',
        'application_method.buy_rules.*',
        'application_method.buy_rules.values.*',
        'rules.*',
        'rules.values.*',
      ],
      filters: { id: input.template_promotion_id },
    });
    // `metadata` is on the promotion model, but older Medusa versions leave it out of PromotionDTO.
    const template = data[0] as unknown as
      | (PromotionDTO & { metadata?: Record<string, unknown> | null })
      | undefined;

    if (!template || template.campaign_id !== input.campaign_id) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, 'The template promotion is not part of this campaign');
    }

    if (template.is_automatic) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'An automatic promotion cannot be used as a template');
    }

    if (isGeneratedCoupon(template) || !template.application_method) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'This promotion cannot be used as a template');
    }

    // Retry until none of the codes exists yet; a collision is unlikely, so this rarely loops.
    let codes: string[] = [];
    const taken = new Set<string>();

    while (codes.length < input.quantity) {
      const candidates = generateCouponCodes(input.prefix, input.quantity - codes.length, new Set([...taken, ...codes]));
      const existing = await promotionModule.listPromotions({ code: candidates }, { select: ['code'], take: null });

      existing.forEach(promotion => taken.add(promotion.code!));
      codes = [...codes, ...candidates.filter(code => !taken.has(code))];
    }

    const batchId = `cbatch_${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const method = template.application_method;

    const promotionsData: CreatePromotionDTO[] = codes.map(code => ({
      code,
      type: template.type!,
      // Always active, so the template itself can stay a draft that nobody can redeem.
      status: PromotionStatus.ACTIVE,
      is_automatic: false,
      is_tax_inclusive: template.is_tax_inclusive,
      limit: 1,
      campaign_id: input.campaign_id,
      metadata: {
        [COUPON_BATCH_ID_KEY]: batchId,
        [COUPON_BATCH_CREATED_AT_KEY]: createdAt,
        [COUPON_BATCH_TEMPLATE_ID_KEY]: template.id,
        [COUPON_BATCH_PREFIX_KEY]: input.prefix,
      },
      application_method: {
        type: method.type!,
        target_type: method.target_type!,
        allocation: method.allocation,
        value: method.value,
        currency_code: method.currency_code,
        max_quantity: method.max_quantity,
        buy_rules_min_quantity: method.buy_rules_min_quantity,
        apply_to_quantity: method.apply_to_quantity,
        target_rules: copyRules(method.target_rules),
        buy_rules: copyRules(method.buy_rules),
      },
      rules: copyRules(template.rules),
    }));

    return new StepResponse({ batch_id: batchId, codes, promotionsData });
  }
);

// Uses the core step instead of createPromotionsWorkflow on purpose: a host's promotionsCreated
// hook handler (e.g. the always-free one) does not apply to unique codes and would otherwise run
// once for every generated code.
export const generateCampaignCouponCodesWorkflow = createWorkflow(
  'generate-campaign-coupon-codes',
  function (input: GenerateCampaignCouponCodesInput) {
    const built = buildCouponPromotionsStep(input);

    createPromotionsStep(built.promotionsData);

    const result = transform({ built }, ({ built }) => ({ batch_id: built.batch_id, codes: built.codes }));

    return new WorkflowResponse(result);
  }
);
