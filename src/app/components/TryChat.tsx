import { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TryChatMessage, ContactShare } from '@/app/types/try';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createChatMessageNotification } from '@/lib/notifications';

interface TryChatProps {
  tryId: string;
  organizerId: string;
}

export default function TryChat({ tryId, organizerId }: TryChatProps) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<TryChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [contactShares, setContactShares] = useState<ContactShare[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [userContacts, setUserContacts] = useState({
    email: currentUser?.email || '',
    twitter: '',
    facebook: '',
    instagram: '',
    other: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!currentUser) return;

    const messagesQuery = query(
      collection(db, 'tryChats'),
      where('tryId', '==', tryId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TryChatMessage[];
      setMessages(messagesData);
      setLoading(false);
    });

    const contactSharesQuery = query(
      collection(db, 'contactShares'),
      where('tryId', '==', tryId)
    );

    const unsubscribeContacts = onSnapshot(contactSharesQuery, (snapshot) => {
      const sharesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactShare[];
      setContactShares(sharesData);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeContacts();
    };
  }, [tryId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    try {
      console.log('Sending chat message...');
      
      await addDoc(collection(db, 'tryChats'), {
        tryId,
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || '匿名ユーザー',
        userPhotoURL: currentUser.photoURL || '/default-avatar.png',
        content: newMessage.trim(),
        createdAt: serverTimestamp(),
        isOrganizer: currentUser.uid === organizerId,
      });

      console.log('Message sent, fetching TRY details...');
      
      const tryDoc = await getDocs(
        query(collection(db, 'tries'), where('__name__', '==', tryId))
      );

      if (!tryDoc.empty) {
        const tryData = tryDoc.docs[0].data();
        const tryTitle = tryData.title || 'TRY';

        console.log('Creating notifications for message:', {
          tryTitle,
          currentUserId: currentUser.uid,
          organizerId
        });

        if (currentUser.uid !== organizerId) {
          console.log('Creating notification for organizer...');
          await createChatMessageNotification({
            userId: organizerId,
            tryId,
            chatId: tryId,
            senderName: currentUser.displayName || '匿名ユーザー',
            tryTitle
          });
        }

        console.log('Fetching participants...');
        const participantsQuery = query(
          collection(db, 'tryParticipants'),
          where('tryId', '==', tryId),
          where('status', '==', 'approved')
        );
        const participantsSnapshot = await getDocs(participantsQuery);
        
        console.log('Creating notifications for participants...');
        for (const participantDoc of participantsSnapshot.docs) {
          const participantData = participantDoc.data();
          if (participantData.userId !== currentUser.uid) {
            console.log('Creating notification for participant:', participantData.userId);
            await createChatMessageNotification({
              userId: participantData.userId,
              tryId,
              chatId: tryId,
              senderName: currentUser.displayName || '匿名ユーザー',
              tryTitle
            });
          }
        }
      }

      setNewMessage('');
      console.log('Message sending and notifications completed successfully');
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
    }
  };

  const handleContactShare = async () => {
    if (!currentUser) return;

    try {
      const existingShareQuery = query(
        collection(db, 'contactShares'),
        where('tryId', '==', tryId),
        where('userId', '==', currentUser.uid)
      );
      const existingShareDocs = await getDocs(existingShareQuery);

      if (!existingShareDocs.empty) {
        const shareDoc = existingShareDocs.docs[0];
        const docRef = doc(db, 'contactShares', shareDoc.id);
        await updateDoc(docRef, {
          isPublic: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'contactShares'), {
          tryId,
          userId: currentUser.uid,
          isPublic: true,
          contactType: 'email',
          contactValue: currentUser.email || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setShowContactModal(false);
    } catch (error) {
      console.error('Error sharing contact:', error);
    }
  };

  const canShareContacts = (userId1: string, userId2: string) => {
    const share1 = contactShares.find(share => share.userId === userId1);
    const share2 = contactShares.find(share => share.userId === userId2);
    return share1?.isPublic && share2?.isPublic;
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
      <div className="p-4 border-b">
        <button
          onClick={() => setShowContactModal(true)}
          className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          連絡先を公開する
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.userId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] ${
                message.userId === currentUser?.uid ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden mx-2">
                <Image
                  src={message.userPhotoURL}
                  alt={message.userDisplayName}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div
                className={`rounded-lg p-3 ${
                  message.userId === currentUser?.uid
                    ? 'bg-blue-500 text-white'
                    : message.isOrganizer
                    ? 'bg-green-100 text-gray-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                {currentUser && canShareContacts(currentUser.uid, message.userId) && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                    <p>📧 {message.userId === currentUser.uid ? currentUser.email : 
                      contactShares.find(share => share.userId === message.userId)?.contactValue}
                    </p>
                  </div>
                )}
              </div>
              <div
                className={`text-xs text-gray-500 mt-1 ${
                  message.userId === currentUser?.uid ? 'text-right' : 'text-left'
                }`}
              >
                {message.userDisplayName} •{' '}
                {message.createdAt instanceof Timestamp
                  ? format(message.createdAt.toDate(), 'HH:mm', { locale: ja })
                  : format(new Date(message.createdAt), 'HH:mm', { locale: ja })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t">
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

      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">連絡先の公開</h3>
            <p className="text-sm text-gray-600 mb-4">
              連絡先を公開すると、相手も連絡先を公開している場合に限り、お互いの連絡先が表示されます。
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                <input
                  type="email"
                  value={userContacts.email}
                  onChange={(e) => setUserContacts(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleContactShare}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                公開する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 