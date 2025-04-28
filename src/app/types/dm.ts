import { Timestamp } from 'firebase/firestore';
import type { User } from './user';

export interface DirectMessage {
  id: string;
  roomId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Timestamp;
  isRead: boolean;
}

export interface DMMessage {
  id: string;
  roomId: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  createdAt: Timestamp;
  isRead: boolean;
}

export interface DMRoom {
  id: string;
  participants: string[];
  lastMessage?: DMMessage;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
  unreadCount: number;
}

export interface DMRoomWithUser extends DMRoom {
  otherUser: User;
  unreadCount: number;
} 