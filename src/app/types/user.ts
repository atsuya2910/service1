import { Timestamp } from 'firebase/firestore';

export type BadgeType = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';

export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  imageUrl: string;
  acquiredAt: Timestamp;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  github?: string;
  facebook?: string;
  linkedin?: string;
}

export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  bio?: string;
  location?: string;
  website?: string;
  badges: Badge[];
  skills: Skill[];
  socialLinks: SocialLinks;
  completedTryCount: number;
  participatedTryCount: number;
  unreadDMCount?: number;
  lastReadDMTimestamp?: Timestamp;
}

export interface UserFormData {
  displayName: string;
  email: string;
  bio?: string;
  photoURL?: string;
  location?: string;
  website?: string;
  skills?: Skill[];
  socialLinks?: SocialLinks;
}

export const DEFAULT_BADGES: Omit<Badge, 'id' | 'acquiredAt'>[] = [
  {
    type: 'beginner',
    name: 'はじめの一歩',
    description: '最初のTRYを作成',
    imageUrl: '/badges/beginner.png',
  },
  {
    type: 'intermediate',
    name: 'チャレンジャー',
    description: '5つのTRYに参加',
    imageUrl: '/badges/challenger.png',
  },
  {
    type: 'advanced',
    name: 'アチーバー',
    description: '10個のTRYを完了',
    imageUrl: '/badges/achiever.png',
  },
  {
    type: 'expert',
    name: 'メンター',
    description: '他のユーザーを5人サポート',
    imageUrl: '/badges/mentor.png',
  },
  {
    type: 'master',
    name: 'マスター',
    description: '全てのバッジを獲得',
    imageUrl: '/badges/master.png',
  },
]; 