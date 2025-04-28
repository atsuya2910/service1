import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAdmin: boolean;
  createdAt: Timestamp;
}

export interface Try {
  id: string;
  title: string;
  description: string;
  userId: string;
  needSupporter: boolean;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tags?: string[];
}

export interface Support {
  id: string;
  tryId: string;
  userId: string;
  message: string;
  createdAt: Timestamp;
} 