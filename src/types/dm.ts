import { Timestamp, FieldValue } from 'firebase/firestore';

export interface DMMessage {
  id: string;
  roomId: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  createdAt: Timestamp;
}

export interface DMRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastUpdated: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  unreadCount: number;
} 