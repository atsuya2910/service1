'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { DMRoom } from '@/app/types/dm';
import { User } from '@/app/types/user';
import Image from 'next/image';
import Link from 'next/link';
import DefaultAvatar from './DefaultAvatar';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface DMRoomWithUser extends Omit<DMRoom, 'unreadCount'> {
  otherUser?: User;
  unreadCount?: number;
}

export default function DMRoomList() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<DMRoomWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('=== DMRoomList Debug ===');
    console.log('User:', user);
    console.log('Loading:', loading);

    if (!user?.uid) {
      console.log('No user.uid found, returning');
      return;
    }

    console.log('Creating rooms query for user:', user.uid);

    const roomsQuery = query(
      collection(db, 'dmRooms'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastUpdated', 'desc')
    );

    console.log('Setting up snapshot listener');

    const unsubscribe = onSnapshot(roomsQuery, async (snapshot) => {
      console.log('Snapshot received:', {
        empty: snapshot.empty,
        size: snapshot.size,
        docs: snapshot.docs.map(doc => doc.id)
      });

      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DMRoomWithUser[];

      console.log('Fetching user data for rooms:', roomsData);

      // Fetch other user's data and unread count for each room
      const roomsWithUsers = await Promise.all(
        roomsData.map(async (room) => {
          const otherUserId = room.participants.find(id => id !== user.uid);
          if (!otherUserId) {
            console.log('No other user found for room:', room.id);
            return room;
          }

          console.log('Fetching user data for:', otherUserId);

          // Get other user's data
          const userDoc = await getDocs(
            query(collection(db, 'users'), where('uid', '==', otherUserId))
          );

          if (!userDoc.empty) {
            room.otherUser = {
              ...userDoc.docs[0].data(),
              id: userDoc.docs[0].id
            } as User;
            console.log('Found user data:', room.otherUser);
          } else {
            console.log('No user document found for:', otherUserId);
          }

          // Get unread messages count
          const unreadQuery = query(
            collection(db, 'dmMessages'),
            where('roomId', '==', room.id),
            where('senderId', '==', otherUserId),
            where('isRead', '==', false)
          );
          const unreadSnapshot = await getDocs(unreadQuery);
          room.unreadCount = unreadSnapshot.size;

          return room;
        })
      );

      console.log('Setting rooms with users:', roomsWithUsers);
      setRooms(roomsWithUsers);
      setLoading(false);
    }, (error) => {
      console.error('Error in snapshot listener:', error);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up snapshot listener');
      unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>DMルームがありません</p>
        <p className="mt-2 text-sm">他のユーザーのプロフィールページからDMを開始できます</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rooms.map((room) => (
        <Link href={`/dm/${room.id}`} key={room.id} className="block">
          <div className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-lg transition duration-200">
            {room.otherUser?.photoURL ? (
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={room.otherUser.photoURL}
                  alt={room.otherUser.displayName || ''}
                  fill
                  className="object-cover"
                  sizes="(max-width: 40px) 100vw, 40px"
                />
              </div>
            ) : (
              <DefaultAvatar 
                displayName={room.otherUser?.displayName || ''} 
                size={40}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {room.otherUser?.displayName || '不明なユーザー'}
                </p>
                {room.lastUpdated && (
                  <p className="text-xs text-gray-400">
                    {format(room.lastUpdated.toDate(), 'MM/dd HH:mm', { locale: ja })}
                  </p>
                )}
              </div>
              <div className="flex items-center mt-1">
                {room.lastMessage && (
                  <p className="text-sm text-gray-500 truncate flex-1">
                    {typeof room.lastMessage === 'string' 
                      ? room.lastMessage 
                      : room.lastMessage.text}
                  </p>
                )}
                {typeof room.unreadCount === 'number' && room.unreadCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {room.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
} 