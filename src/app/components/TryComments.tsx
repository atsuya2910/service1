'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, addDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { TryComment } from '../types/try';
import Image from 'next/image';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import DefaultAvatar from './DefaultAvatar';

interface Comment {
  id: string;
  content: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  createdAt: Timestamp;
  tryId: string;
}

interface TryCommentsProps {
  tryId: string;
}

export default function TryComments({ tryId }: TryCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!tryId) return;

    const commentsQuery = query(
      collection(db, 'tryComments'),
      where('tryId', '==', tryId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData);
    }, (error) => {
      console.error('Error fetching comments:', error);
    });

    return () => unsubscribe();
  }, [tryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'tryComments'), {
        tryId,
        userId: user.uid,
        userDisplayName: user.displayName || '名前未設定',
        userPhotoURL: user.photoURL || 'https://via.placeholder.com/40',
        content: newComment.trim(),
        createdAt: Timestamp.now()
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('コメントの投稿に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">コメント</h3>
      
      {/* コメント投稿フォーム */}
      {user && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? '送信中...' : 'コメントを投稿'}
          </button>
        </form>
      )}

      {/* コメント一覧 */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="relative w-10 h-10">
                {comment.userPhotoURL ? (
                  <Image
                    src={comment.userPhotoURL}
                    alt={comment.userDisplayName || ''}
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <DefaultAvatar
                    displayName={comment.userDisplayName}
                    size={40}
                  />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900">{comment.userDisplayName || '名前未設定'}</p>
                <span className="text-sm text-gray-500">
                  {format(comment.createdAt.toDate(), 'yyyy/MM/dd HH:mm', { locale: ja })}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-center text-gray-500 py-4">まだコメントはありません</p>
        )}
      </div>
    </div>
  );
} 