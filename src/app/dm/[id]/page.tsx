'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DirectMessage from '@/app/components/DirectMessage';
import Image from 'next/image';

export default function DMRoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
      return;
    }

    if (!user || !roomId) return;

    const fetchRoomData = async () => {
      try {
        // DMルームの情報を取得
        const roomDoc = await getDoc(doc(db, 'dmRooms', roomId));
        if (!roomDoc.exists()) {
          router.push('/dm');
          return;
        }

        const roomData = roomDoc.data();
        // 相手のユーザーIDを特定
        const otherUserId = roomData.participants.find((id: string) => id !== user.uid);
        
        // 相手のユーザー情報を取得
        const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
        if (otherUserDoc.exists()) {
          setOtherUser({
            uid: otherUserId,
            ...otherUserDoc.data()
          });
        }
      } catch (error) {
        console.error('Error fetching room data:', error);
        alert('データの取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [user, roomId, router, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!otherUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">ユーザー情報を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm">
        {/* ヘッダー */}
        <div className="p-4 border-b flex items-center space-x-4">
          <div className="relative w-12 h-12">
            <Image
              src={otherUser.photoURL || '/default-avatar.png'}
              alt={otherUser.displayName}
              fill
              className="rounded-full object-cover"
              sizes="(max-width: 48px) 100vw, 48px"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">{otherUser.displayName}</h1>
            {otherUser.bio && (
              <p className="text-sm text-gray-600">{otherUser.bio}</p>
            )}
          </div>
        </div>

        {/* メッセージエリア */}
        <DirectMessage roomId={roomId} otherUserId={otherUser.uid} />
      </div>
    </div>
  );
} 