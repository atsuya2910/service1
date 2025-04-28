import { useEffect, useState } from 'react';
import { getUserRatingSummary } from '@/lib/ratings';
import { UserRatingSummary } from '@/types/user';
import { StarIcon } from '@heroicons/react/24/solid';

interface UserRatingDisplayProps {
  userId: string;
}

export default function UserRatingDisplay({ userId }: UserRatingDisplayProps) {
  const [ratingSummary, setRatingSummary] = useState<UserRatingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRatingSummary = async () => {
      try {
        const summary = await getUserRatingSummary(userId);
        setRatingSummary(summary);
      } catch (error) {
        console.error('Error fetching rating summary:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatingSummary();
  }, [userId]);

  if (isLoading) {
    return <div className="animate-pulse h-8 bg-gray-200 rounded"></div>;
  }

  if (!ratingSummary || ratingSummary.totalRatings === 0) {
    return <div className="text-gray-500">評価なし</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              className={`h-5 w-5 ${
                star <= Math.round(ratingSummary.averageRating)
                  ? 'text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="ml-2 text-sm text-gray-600">
          {ratingSummary.averageRating.toFixed(1)} ({ratingSummary.totalRatings}件の評価)
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[5, 4, 3, 2, 1].map((star) => (
          <div key={star} className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">{star}</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400"
                style={{
                  width: `${
                    (ratingSummary.ratings[star] / ratingSummary.totalRatings) * 100
                  }%`,
                }}
              />
            </div>
            <span className="text-sm text-gray-600">
              {ratingSummary.ratings[star]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 