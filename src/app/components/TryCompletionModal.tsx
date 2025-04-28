'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { doc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs, getDoc, FieldValue } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TryCompletion } from '../types/try';
import { useAuth } from '@/hooks/useAuth';
import { createTryCompletedNotification } from '@/lib/notifications';

interface TryCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tryId: string;
  onComplete: () => void;
}

interface CompletionFormData {
  completionStatus: 'completed' | 'partially_completed' | 'not_completed';
  completionComment: string;
}

export default function TryCompletionModal({
  isOpen,
  onClose,
  tryId,
  onComplete,
}: TryCompletionModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<CompletionFormData>();

  const onSubmit = async (data: CompletionFormData) => {
    if (!user) return;

    try {
      setIsSubmitting(true);

      // TRYの完了情報を保存
      const completionData: Omit<TryCompletion, 'id' | 'createdAt' | 'updatedAt'> & {
        createdAt: FieldValue;
        updatedAt: FieldValue;
      } = {
        tryId,
        userId: user.uid,
        completionStatus: data.completionStatus,
        completionComment: data.completionComment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'tryCompletions'), completionData);

      // TRYのステータスを更新
      const tryRef = doc(db, 'tries', tryId);
      await updateDoc(tryRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 参加者全員に通知を送信
      const participantsQuery = query(
        collection(db, 'tryParticipants'),
        where('tryId', '==', tryId),
        where('status', '==', 'approved')
      );
      const participantsSnapshot = await getDocs(participantsQuery);
      
      const tryDoc = await getDoc(tryRef);
      const tryTitle = tryDoc.data()?.title || '';

      for (const participant of participantsSnapshot.docs) {
        await createTryCompletedNotification(
          tryId,
          tryTitle,
          participant.data().userId
        );
      }

      onComplete();
      reset();
      onClose();
    } catch (error) {
      console.error('Error completing try:', error);
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
                  TRYを完了する
                </Dialog.Title>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      完了状況
                    </label>
                    <select
                      {...register('completionStatus', { required: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="completed">完全に完了</option>
                      <option value="partially_completed">部分的に完了</option>
                      <option value="not_completed">完了できなかった</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      コメント
                    </label>
                    <textarea
                      {...register('completionComment', { required: true })}
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="TRYの感想や学びを共有してください"
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
                      {isSubmitting ? '保存中...' : '完了する'}
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