'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, Timestamp, doc, updateDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { DMMessage } from '@/app/types/dm';
import DefaultAvatar from './DefaultAvatar';

interface DirectMessageProps {
  roomId: string;
  otherUserId: string;
}

export default function DirectMessage({ roomId, otherUserId }: DirectMessageProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<{ displayName: string; photoURL: string | null } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user) return;

    // 相手のユーザー情報を取得
    const fetchOtherUser = async () => {
      try {
        const userDoc = await getDocs(
          query(collection(db, 'users'), where('uid', '==', otherUserId))
        );
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setOtherUser({
            displayName: userData.displayName || '名前未設定',
            photoURL: userData.photoURL
          });
        }
      } catch (error) {
        console.error('Error fetching other user:', error);
      }
    };

    fetchOtherUser();

    // メッセージの購読
    const q = query(
      collection(db, 'dmMessages'),
      where('roomId', '==', roomId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as DMMessage[];
      setMessages(messagesData);
      setLoading(false);

      // 相手からのメッセージを既読にする
      const unreadMessages = messagesData.filter(
        msg => msg.senderId === otherUserId && !msg.isRead
      );

      if (unreadMessages.length > 0) {
        const batch = writeBatch(db);
        unreadMessages.forEach(msg => {
          const msgRef = doc(db, 'dmMessages', msg.id);
          batch.update(msgRef, { isRead: true });
        });

        // DMルームの未読カウントをリセット
        const roomRef = doc(db, 'dmRooms', roomId);
        batch.update(roomRef, { unreadCount: 0 });

        batch.commit().catch(error => {
          console.error('Error marking messages as read:', error);
        });
      }
    });

    return () => unsubscribe();
  }, [roomId, user, otherUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherUser) return;

    try {
      // メッセージを追加
      const messageData: Omit<DMMessage, 'id'> = {
        roomId,
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || '名前未設定',
        senderPhotoURL: user.photoURL || undefined,
        createdAt: Timestamp.now(),
        isRead: false
      };

      const messageRef = await addDoc(collection(db, 'dmMessages'), messageData);

      // DMルームの最終メッセージを更新
      const roomRef = doc(db, 'dmRooms', roomId);
      await updateDoc(roomRef, {
        lastMessage: messageData.text,
        lastUpdated: serverTimestamp(),
        unreadCount: increment(1)
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow">
      {/* ヘッダー */}
      <div className="p-4 border-b flex items-center">
        {otherUser && (
          <>
            {otherUser.photoURL ? (
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={otherUser.photoURL}
                  alt={otherUser.displayName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 40px) 100vw, 40px"
                />
              </div>
            ) : (
              <DefaultAvatar size={40} displayName={otherUser.displayName} />
            )}
            <span className="ml-3 font-medium">{otherUser.displayName}</span>
          </>
        )}
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
          >
            {message.senderId !== user?.uid && (
              <div className="flex-shrink-0 mr-2">
                <DefaultAvatar displayName={message.senderName} size={32} />
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.senderId === user?.uid
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <p className="text-xs opacity-75">
                  {message.createdAt instanceof Timestamp
                    ? format(message.createdAt.toDate(), 'HH:mm', { locale: ja })
                    : ''}
                </p>
                {message.senderId === user?.uid && (
                  <span className="text-xs opacity-75">
                    {message.isRead ? '既読' : '未読'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力 */}
      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </div>
      </form>
    </div>
  );
} 