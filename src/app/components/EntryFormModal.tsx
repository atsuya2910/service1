import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { entrySchema, type EntryFormData } from '../types/entry';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { createNotification } from '@/lib/notifications';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tryId: string;
  onSubmit: () => Promise<void>;
};

export default function EntryFormModal({ isOpen, onClose, tryId }: Props) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      userId: user?.uid || '',
      tryId: tryId,
    },
  });

  const onSubmit = async (data: EntryFormData) => {
    if (!user) return;

    try {
      setIsSubmitting(true);

      // TRYの情報を取得
      const tryDoc = await getDoc(doc(db, 'tries', tryId));
      if (!tryDoc.exists()) throw new Error('TRY not found');
      const tryData = tryDoc.data();

      // tryParticipantsに保存（pending状態）
      const participantData = {
        userId: user.uid,
        tryId: tryId,
        status: 'pending',
        name: data.name,
        email: data.email,
        introduction: data.introduction,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'tryParticipants'), participantData);

      // 主催者に通知を送信
      await createNotification({
        userId: tryData.userId,
        type: 'try_application',
        title: '新規参加申請',
        message: `${user.displayName || 'ゲスト'}さんが「${tryData.title}」への参加を希望しています`,
        tryId: tryId,
        link: `/tries/${tryId}`
      });

      reset();
      onClose();
      alert('参加申請を送信しました。主催者の承認をお待ちください。');
    } catch (error) {
      console.error('Error submitting entry:', error);
      alert('エントリーの送信中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg rounded bg-white p-6 w-full">
          <Dialog.Title className="text-lg font-medium mb-4">
            エントリーフォーム
          </Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                自己紹介 <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('introduction')}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.introduction && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.introduction.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? '送信中...' : '送信する'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 