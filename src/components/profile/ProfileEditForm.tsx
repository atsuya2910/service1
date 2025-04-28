'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Image from 'next/image';

interface ProfileEditFormProps {
  onClose: () => void;
}

export default function ProfileEditForm({ onClose }: ProfileEditFormProps) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await updateProfile(auth.currentUser!, {
        displayName: displayName,
      });

      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('プロフィールの更新中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            プロフィールを編集
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* プロフィール画像 */}
            <div className="flex justify-center">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                {user?.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'プロフィール画像'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* 表示名 */}
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700"
              >
                表示名
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="表示名を入力"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            {/* ボタン */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? '更新中...' : '更新する'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 