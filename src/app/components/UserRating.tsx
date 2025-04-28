import { useState } from 'react';
import { createUserRating } from '@/lib/ratings';
import { useAuth } from '@/lib/auth';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';

interface UserRatingProps {
  ratedId: string;
  tryId: string;
  onRatingSubmitted?: () => void;
}

export default function UserRating({ ratedId, tryId, onRatingSubmitted }: UserRatingProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rating) return;

    try {
      setIsSubmitting(true);
      await createUserRating(user.uid, ratedId, tryId, rating, comment);
      setRating(0);
      setComment('');
      onRatingSubmitted?.();
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">ユーザーを評価する</h3>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="focus:outline-none"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              {(hoverRating || rating) >= star ? (
                <StarIcon className="h-8 w-8 text-yellow-400" />
              ) : (
                <StarIconOutline className="h-8 w-8 text-gray-300" />
              )}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
            コメント（任意）
          </label>
          <textarea
            id="comment"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="評価の理由や感想を入力してください"
          />
        </div>
        <button
          type="submit"
          disabled={!rating || isSubmitting}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '送信中...' : '評価を送信'}
        </button>
      </form>
    </div>
  );
} 