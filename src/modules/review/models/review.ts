import { model } from '@medusajs/framework/utils';
import { ReviewImageModel } from './review-image';
import { ReviewResponseModel } from './review-response';

export const ReviewModel = model.define('review', {
  id: model.id({ prefix: 'rev' }).primaryKey(),
  name: model.text().searchable().nullable(),
  email: model.text().searchable().nullable(),
  rating: model.number(),
  title: model.text().searchable().nullable(),
  gender: model.text().nullable(),
  city: model.text().nullable(),
  age: model.text().nullable(),
  recommend: model.boolean().default(false),
  content: model.text().searchable().nullable(),
  images: model.hasMany(() => ReviewImageModel),
  has_images: model.boolean().default(false),
  type: model.enum(['store', 'product']).default('store'),
  response: model.hasOne(() => ReviewResponseModel, { nullable: true }).nullable(),
  status: model.enum(['pending', 'approved', 'flagged']).default('pending'),
  translations: model.json().nullable(),
  metadata: model.json().nullable(),
});
