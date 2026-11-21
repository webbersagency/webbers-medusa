import { useTranslation } from 'react-i18next';
import { Input, Select, Textarea } from '@medusajs/ui';
import { z } from '@medusajs/framework/zod';
import { SVGProps } from 'react';
import { useFormContext } from 'react-hook-form';
import { Rating } from 'react-simple-star-rating';
import { Form } from '../../../../components/common/form';

export const StarIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" focusable="false" {...props}>
    <path d="M12 17.27l-5.18 3.05 1.4-5.98-4.64-4.02 6.1-.52L12 4l2.32 5.8 6.1.52-4.64 4.02 1.4 5.98L12 17.27z" />
  </svg>
);

const ageRanges = [
  { label: '18 - 30', value: '18-30' },
  { label: '30 - 40', value: '30-40' },
  { label: '40 - 50', value: '40-50' },
  { label: '50 - 60', value: '50-60' },
  { label: '60 - 70', value: '60-70' },
  { label: '70 - 80', value: '70-80' },
  { label: '80 - 90', value: '80-90' },
];

export const useReviewOptions = () => {
  const { t } = useTranslation('webbersMedusa');

  return {
    ageOptions: [...ageRanges, { label: t('reviews.options.notApplicable'), value: 'nvt' }],
    genderOptions: [
      { label: t('reviews.options.male'), value: 'M' },
      { label: t('reviews.options.female'), value: 'V' },
      { label: t('reviews.options.other'), value: 'X' },
      { label: t('reviews.options.undisclosed'), value: 'nvt' },
    ],
    recommendOptions: [
      { label: t('common.yes'), value: 'yes' },
      { label: t('common.no'), value: 'no' },
    ],
  };
};

export const reviewFormSchema = z.object({
  name: z.string(),
  city: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
  email: z.string(),
  title: z.string(),
  content: z.string(),
  rating: z.number().min(1).max(5),
  recommend: z.string(),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export type ReviewPayload = {
  rating: number;
  name: string;
  city: string;
  age?: string;
  gender?: string;
  title: string;
  content: string;
  recommend: boolean;
  email: string;
};

/** Maps the shared form values to the request body expected by the reviews API. */
export const toReviewPayload = (values: ReviewFormValues): ReviewPayload => ({
  rating: values.rating,
  name: values.name ?? '',
  city: values.city ?? '',
  age: values.age ?? '',
  gender: values.gender ?? '',
  title: values.title ?? '',
  content: values.content ?? '',
  recommend: values.recommend === 'yes',
  email: values.email ?? '',
});

/**
 * The shared set of review form fields. Relies on a surrounding `FormProvider`
 * (from react-hook-form) for its form context, so both the create and edit
 * flows can render an identical form.
 */
export const ReviewFormFields = () => {
  const { t } = useTranslation('webbersMedusa');
  const { ageOptions, genderOptions, recommendOptions } = useReviewOptions();
  const { control } = useFormContext<ReviewFormValues>();

  return (
    <form className="flex flex-col gap-4">
      <Form.Field
        control={control}
        name="rating"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t('reviews.fields.rating')}</Form.Label>
            <Form.Control>
              <div>
                <Rating
                  {...field}
                  initialValue={field.value}
                  fillIcon={<StarIcon className="w-4 h-4 inline-block" fill="#FAB82B" />}
                  emptyIcon={
                    <StarIcon
                      className="w-4 h-4 inline-block"
                      fill="none"
                      stroke="#FAB82B"
                      strokeWidth={1}
                      strokeLinejoin="round"
                    />
                  }
                  onClick={field.onChange}
                />
              </div>
            </Form.Control>
          </Form.Item>
        )}
      />
      <Form.Field
        control={control}
        name="name"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t('reviews.fields.name')}</Form.Label>
            <Form.Control>
              <Input type="text" {...field} />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        control={control}
        name="city"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t('reviews.fields.cityOptional')}</Form.Label>
            <Form.Control>
              <Input type="text" {...field} />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        control={control}
        name="age"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t('reviews.fields.ageOptional')}</Form.Label>
            <Form.Control>
              <Select {...field} onValueChange={field.onChange}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {ageOptions?.map(o => (
                    <Select.Item key={o.value} value={o.value}>
                      {o.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        control={control}
        name="gender"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t('reviews.fields.genderOptional')}</Form.Label>
            <Form.Control>
              <Select {...field} onValueChange={field.onChange}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {genderOptions?.map(o => (
                    <Select.Item key={o.value} value={o.value}>
                      {o.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        control={control}
        name="title"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t('reviews.fields.title')}</Form.Label>
            <Form.Control>
              <Input type="text" {...field} />
            </Form.Control>
          </Form.Item>
        )}
      />
      <Form.Field
        control={control}
        name="content"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t('reviews.fields.content')}</Form.Label>
            <Form.Control>
              <Textarea {...field} />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        control={control}
        name="recommend"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t('reviews.fields.recommend')}</Form.Label>
            <Form.Control>
              <Select {...field} onValueChange={field.onChange}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {recommendOptions?.map(o => (
                    <Select.Item key={o.value} value={o.value}>
                      {o.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <Form.Field
        control={control}
        name="email"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t('reviews.fields.email')}</Form.Label>
            <Form.Control>
              <Input type="text" {...field} />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    </form>
  );
};
