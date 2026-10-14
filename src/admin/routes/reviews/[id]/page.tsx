import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { sdk } from '../../../sdk.ts';
import { ListReviewsResponse, Review } from '../page.tsx';
import ReviewGeneralSection from './components/review-general-section';
import ReviewProductsSection from './components/review-products-section';
import ReviewImagesSection from './components/review-images-section';
import ReviewTranslationsSection from './components/review-translations-section';
import { MetadataSection } from '../../../components/common/metadata-section';

const ReviewDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<ListReviewsResponse>({
    queryFn: () =>
      sdk.client.fetch(
        `/admin/reviews?id=${encodeURIComponent(id ?? '')}&fields=id,name,title,email,name,products.*,age,city,gender,status,rating,content,recommend,metadata,translations,images.*,has_images`
      ),
    queryKey: ['review', id],
  });

  const review = data?.reviews?.[0];

  useEffect(() => {
    if (!isLoading && !review) {
      navigate('/reviews', { replace: true });
    }
  }, [isLoading, review, navigate]);

  if (!review) return null;

  return (
    <div className="flex w-full flex-col items-start gap-x-4 gap-y-3">
      <div className="flex w-full min-w-0 flex-col gap-y-3">
        <ReviewGeneralSection review={review} />
        <ReviewTranslationsSection review={review} />
        <ReviewImagesSection review={review} />
        <ReviewProductsSection review={review} />
        <MetadataSection data={review} />
      </div>
    </div>
  );
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;

  const { reviews } = await sdk.client.fetch<ListReviewsResponse>(
    `/admin/reviews?id=${encodeURIComponent(id ?? '')}&fields=id,title,name`
  );

  return { review: reviews?.[0] };
}

export const handle = {
  breadcrumb: ({ data }: UIMatch<{ review?: Review }>) => data?.review?.title || data?.review?.name || 'Review',
};

export default ReviewDetailPage;
