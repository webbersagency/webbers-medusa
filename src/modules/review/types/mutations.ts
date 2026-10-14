import type { Review } from './common';

export type CreateReviewInput = Partial<Omit<Review, 'id' | 'created_at' | 'updated_at' | 'images'>> & {
  images?: { url: string }[];
  products?: string[];
};

export type UpdateReviewInput = Partial<Omit<Review, 'id' | 'created_at' | 'updated_at' | 'images'>> & {
  id: string;
  images?: { url: string }[];
};

export type CreateReviewsWorkflowInput = {
  reviews: CreateReviewInput[];
};

export type UpdateReviewsWorkflowInput = {
  reviews: UpdateReviewInput[];
  add_product_ids?: string[];
  remove_product_ids?: string[];
};

export type TranslateReviewsWorkflowInput = {
  ids: string[];
  /** Skip reviews whose translations already match their current title and content. */
  only_outdated?: boolean;
};

export type DeleteReviewResponsesWorkflowInput = {
  ids: string[];
};

export type CreateReviewResponseWorkflowInput = {
  responses: CreateReviewResponseInput[];
};

export type UpdateReviewResponsesWorkflowInput = {
  responses: UpdateReviewResponseInput[];
};

export type CreateReviewResponseInput = {
  review_id: string;
  content: string;
};

export type UpdateReviewResponseInput = {
  id: string;
  content: string;
};
