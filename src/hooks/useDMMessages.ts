import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DMMessage } from '@/app/types/dm';
import { User } from '@/app/types/user';

interface UseDMMessagesProps {
  roomId: string;
  currentUser: User | null;
}

export const useDMMessages = ({ roomId, currentUser }: UseDMMessagesProps) => {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !currentUser) return;

    const messagesRef = collection(db, 'dmMessages');
    const messagesQuery = query(
      messagesRef,
      where('roomId', '==', roomId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DMMessage[];
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId, currentUser]);

  const sendMessage = async (text: string) => {
    if (!roomId || !currentUser || !text.trim()) return;

    try {
      await addDoc(collection(db, 'dmMessages'), {
        roomId,
        text,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderPhotoURL: currentUser.photoURL,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
  };
}; 