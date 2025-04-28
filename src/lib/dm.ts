import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DMRoom } from '@/types/dm';

export async function getOrCreateDMRoom(userId1: string, userId2: string): Promise<string> {
  try {
    // 既存のDMルームを検索
    const dmRoomsRef = collection(db, 'dmRooms');
    
    // 両方のユーザーIDを含むルームを検索
    const q1 = query(
      dmRoomsRef,
      where('participants', 'array-contains', userId1)
    );
    
    const querySnapshot = await getDocs(q1);
    const existingRoom = querySnapshot.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(userId2);
    });
    
    // 既存のDMルームが見つかった場合
    if (existingRoom) {
      return existingRoom.id;
    }
    
    // 新しいDMルームを作成
    const newRoomData: Omit<DMRoom, 'id'> = {
      participants: [userId1, userId2],
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      lastMessage: '',
      unreadCount: 0
    };
    
    const newRoomRef = await addDoc(dmRoomsRef, newRoomData);
    return newRoomRef.id;
  } catch (error) {
    console.error('Error in getOrCreateDMRoom:', error);
    throw error;
  }
} 