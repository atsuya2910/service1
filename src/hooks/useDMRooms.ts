import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { DMRoom } from '@/app/types/dm';

export const useDMRooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<DMRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const roomsRef = collection(db, 'dmRooms');
    const q = query(
      roomsRef,
      where('participants', 'array-contains', user.uid),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DMRoom[];
      setRooms(roomsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const createRoom = async (participantId: string) => {
    if (!user) return null;

    try {
      const roomsRef = collection(db, 'dmRooms');
      const newRoom = {
        participants: [user.uid, participantId],
        lastMessage: '',
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      };
      const docRef = await addDoc(roomsRef, newRoom);
      return docRef.id;
    } catch (error) {
      console.error('Error creating DM room:', error);
      return null;
    }
  };

  const updateRoomLastMessage = async (roomId: string, lastMessage: string) => {
    try {
      const roomRef = doc(db, 'dmRooms', roomId);
      await updateDoc(roomRef, {
        lastMessage,
        lastUpdated: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating room last message:', error);
    }
  };

  return { rooms, loading, createRoom, updateRoomLastMessage };
}; 