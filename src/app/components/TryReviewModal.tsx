'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { collection, addDoc, serverTimestamp, getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TryReview } from '../types/try';
import { useAuth } from '@/hooks/useAuth';
import { createTryReviewNotification } from '@/lib/notifications';

interface TryReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tryId: string;
  reviewedUserId: string;
  onReview: () => void;
}

interface ReviewFormData {
  rating: number;
  comment: string;
}

export default function TryReviewModal({
  isOpen,
  onClose,
  tryId,
  reviewedUserId,
  onReview,
}: TryReviewModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<ReviewFormData>();

  const onSubmit = async (data: ReviewFormData) => {
    if (!user) return;

    try {
      setIsSubmitting(true);

      const reviewData: Omit<TryReview, 'id'> = {
        tryId,
        reviewerId: user.uid,
        reviewedUserId,
        rating: data.rating,
        comment: data.comment,
        createdAt: serverTimestamp() as unknown as Timestamp,
        updatedAt: serverTimestamp() as unknown as Timestamp,
      };

      await addDoc(collection(db, 'tryReviews'), reviewData);

      // TRYのタイトルを取得
      const tryDoc = await getDoc(doc(db, 'tries', tryId));
      const tryTitle = tryDoc.data()?.title || '';

      // 評価されたユーザーに通知を送信
      await createTryReviewNotification(
        tryId,
        tryTitle,
        user.uid,
        reviewedUserId,
        data.rating
      );

      onReview();
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  参加者を評価する
                </Dialog.Title>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      評価
                    </label>
                    <select
                      {...register('rating', { required: true, valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value={5}>5 - 最高</option>
                      <option value={4}>4 - 良い</option>
                      <option value={3}>3 - 普通</option>
                      <option value={2}>2 - 悪い</option>
                      <option value={1}>1 - 最悪</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      コメント
                    </label>
                    <textarea
                      {...register('comment', { required: true })}
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="参加者の印象や協力についてコメントしてください"
                    />
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {isSubmitting ? '保存中...' : '評価を送信'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 