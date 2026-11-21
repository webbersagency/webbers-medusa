import { useTranslation } from 'react-i18next';
import { ReviewEditModalProps } from './types.ts';
import { Button, Drawer, toast } from '@medusajs/ui';
import { FormProvider, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../../../../sdk.ts';
import { useParams } from 'react-router-dom';
import {
  ReviewFormFields,
  ReviewFormValues,
  ReviewPayload,
  toReviewPayload,
} from '../../../components/review-form';

const ReviewEditModal = ({ state, close, review }: ReviewEditModalProps) => {
  const { t } = useTranslation('webbersMedusa');
  const queryClient = useQueryClient();
  const methods = useForm<ReviewFormValues>({
    defaultValues: {
      rating: review.rating,
      email: review.email,
      title: review.title,
      content: review.content,
      age: review.age,
      name: review.name,
      gender: review.gender,
      recommend: review.recommend ? 'yes' : 'no',
      city: review.city,
    },
  });

  const { id } = useParams();

  const updateReview = useMutation({
    mutationFn: async (params: ReviewPayload) => {
      return sdk.client.fetch(`/admin/reviews/${review.id}`, {
        method: 'PATCH',
        body: params,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['review', id] });
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(t('reviews.editSuccess'));
      close();
    },
    onError: err => {
      console.error(err);
      toast.error(t('reviews.editError'));
    },
  });

  const onSubmit = async (values: ReviewFormValues) => {
    await updateReview.mutateAsync(toReviewPayload(values));
  };

  return (
    <FormProvider {...methods}>
      <Drawer open={state} onOpenChange={close}>
        <Drawer.Content>
          <Drawer.Header>
            <h1 className="font-sans font-medium h1-core">{t('reviews.editTitle')}</h1>
          </Drawer.Header>

          <Drawer.Body className="overflow-y-auto">
            <ReviewFormFields />
          </Drawer.Body>

          <Drawer.Footer>
            <Button variant="secondary" type="submit" onClick={close} size={'small'}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" onClick={methods.handleSubmit(onSubmit)} size={'small'}>
              {t('common.save')}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </FormProvider>
  );
};

export default ReviewEditModal;
