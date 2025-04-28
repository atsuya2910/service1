'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TryActionsProps {
  tryId: string;
  userId: string;
  currentUserId?: string;
}

export default function TryActions({ tryId, userId, currentUserId }: TryActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwner = currentUserId === userId;

  const handleDelete = async () => {
    if (!isOwner || !confirm('このTRYを削除してもよろしいですか？')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'tries', tryId));
      router.push('/tries');
      router.refresh();
    } catch (error) {
      console.error('Error deleting try:', error);
      alert('TRYの削除中にエラーが発生しました。');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.push('/tries')}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-4">
      <button
        type="button"
        onClick={() => router.push('/tries')}
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      >
        一覧に戻る
      </button>
      <button
        type="button"
        onClick={() => router.push(`/tries/${tryId}/edit`)}
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm ring-1 ring-inset ring-blue-300 hover:bg-blue-50"
      >
        編集
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDeleting ? '削除中...' : '削除'}
      </button>
    </div>
  );
} 