'use client';

import { CalendarIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Try } from '@/app/types/try';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/app/types/user';
import { useAuth } from '@/hooks/useAuth';
import { getOrCreateDMRoom } from '@/lib/dm';
import Link from 'next/link';
import DefaultAvatar from '@/app/components/DefaultAvatar';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface TryCardProps {
  try_: Try;
  onEdit?: (tryId: string) => void;
  onDelete?: (tryId: string) => void;
  disableNavigation?: boolean;
}

// 日付変換のヘルパー関数を追加
const formatDate = (date: string | Timestamp | undefined) => {
  if (!date) return '';
  try {
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'yyyy年MM月dd日');
    }
    return format(new Date(date), 'yyyy年MM月dd日');
  } catch (error) {
    console.error('Date formatting error:', error);
    return '無効な日付';
  }
};

export default function TryCard({ try_, onEdit, onDelete, disableNavigation = false }: TryCardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchOrganizer = async () => {
      try {
        const organizerDoc = await getDoc(doc(db, 'users', try_.userId));
        if (organizerDoc.exists()) {
          setOrganizer({
            id: organizerDoc.id,
            ...organizerDoc.data()
          } as User);
        }
      } catch (error) {
        console.error('Error fetching organizer:', error);
      }
    };

    fetchOrganizer();
  }, [try_.userId]);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || disableNavigation) {
      return;
    }
    router.push(`/tries/${try_.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (try_.id && onEdit) {
      onEdit(try_.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (try_.id && onDelete) {
      onDelete(try_.id);
    }
  };

  const handleDMClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || !organizer || isProcessing) return;

    try {
      setIsProcessing(true);
      const roomId = await getOrCreateDMRoom(currentUser.uid, try_.userId);
      router.push(`/dm/${roomId}`);
    } catch (error) {
      console.error('Error creating DM room:', error);
      alert('DMルームの作成に失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ${
        !disableNavigation ? 'cursor-pointer' : ''
      }`}
    >
      {try_?.imageUrls?.[0] && (
        <div className="relative h-48 w-full">
          <Image
            src={try_?.imageUrls[0]}
            alt={try_?.title || ''}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={true}
            className="object-cover rounded-t-lg"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{try_?.title || 'タイトルなし'}</h3>
          <div className="flex space-x-2">
            {onEdit && try_?.id && (
              <button
                onClick={handleEdit}
                className="text-blue-600 hover:text-blue-800"
              >
                編集
              </button>
            )}
            {onDelete && try_?.id && (
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800"
              >
                削除
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{try_?.description || '説明なし'}</p>
        
        {/* 主催者情報 */}
        {organizer && currentUser && currentUser.uid !== try_?.userId && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-2">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                {organizer?.photoURL ? (
                  <Image
                    src={organizer.photoURL}
                    alt={organizer?.displayName || ''}
                    fill
                    sizes="(max-width: 32px) 100vw, 32px"
                    className="object-cover"
                  />
                ) : (
                  <DefaultAvatar displayName={organizer?.displayName} size={32} />
                )}
              </div>
              <Link
                href={`/users/${organizer?.id}`}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {organizer?.displayName || 'Unknown User'}
              </Link>
            </div>
            <button
              onClick={handleDMClick}
              disabled={isProcessing}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              {isProcessing ? '処理中...' : 'DMを送る'}
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-500" />
            <span>
              {try_?.dates?.map((date, index) => (
                <span key={index}>
                  {formatDate(date)}
                  {index < (try_?.dates?.length || 0) - 1 ? ', ' : ''}
                </span>
              )) || '日付未設定'}
            </span>
          </div>
          <div className="flex items-center">
            <MapPinIcon className="h-4 w-4 mr-1" />
            <span>{try_?.location || '場所未設定'}</span>
          </div>
          <div className="flex items-center">
            <UsersIcon className="h-4 w-4 mr-1" />
            <span>{try_?.participants?.length || 0}人</span>
          </div>
        </div>
      </div>
    </div>
  );
}