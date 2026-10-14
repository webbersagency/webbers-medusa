import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework';
import { translateReviewsWorkflow } from "../../../../../workflows";

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { result } = await translateReviewsWorkflow(req.scope).run({
    input: { ids: [req.params.id] },
  });

  res.status(200).json({ review: result[0] ?? null });
};
