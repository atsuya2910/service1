import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

export const CATEGORIES = ['event', 'project', 'recruitment', 'sports', 'other'] as const;

export type TryStatus = 'open' | 'closed' | 'completed';

export const statusLabels: Record<TryStatus, string> = {
  open: '募集中',
  closed: '募集終了',
  completed: '完了'
};

export const statusColors: Record<TryStatus, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  completed: 'bg-blue-100 text-blue-800'
};

export interface Try {
  id?: string;
  title: string;
  category: typeof CATEGORIES[number];
  description?: string;
  dates: string[];  // 複数の日付を必須に変更
  location?: string;
  capacity: number;
  imageUrls: string[];
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status?: TryStatus;
  progress?: number;
  completedAt?: Timestamp | null;
  tags: string[];
  seekingCompanion: boolean;
  participants?: TryParticipant[];
  participantCount: number;
}

export const trySchema = z.object({
  title: z.string().min(1, '必須項目です'),
  category: z.enum(CATEGORIES),
  description: z.string(),
  dates: z.array(z.string()).min(1, '少なくとも1つの開催日を選択してください'),
  location: z.string().optional(),
  capacity: z.number().min(1, '最小1人以上の定員が必要です'),
  imageUrls: z.array(z.string()),
  tags: z.array(z.string()),
  seekingCompanion: z.boolean(),
});

export type TryInput = z.infer<typeof trySchema>;

export const initialTryFormData: TryInput = {
  title: '',
  category: 'event',
  description: '',
  dates: [],
  location: '',
  capacity: 1,
  imageUrls: [],
  tags: [],
  seekingCompanion: false,
};

export interface TryComment {
  id: string;
  tryId: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
}

export interface TryParticipant {
  id: string;
  userId: string;
  tryId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  name: string;
  email: string;
  introduction: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  id: string;
  displayName: string;
  photoURL: string;
  email: string;
  bio?: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: '承認待ち',
  approved: '承認済み',
  rejected: '却下'
};

export const applicationStatusColors: Record<ApplicationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

export interface TryApplication {
  id: string;
  tryId: string;
  userId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TryApplicationWithUser extends TryApplication {
  user: {
    displayName: string;
    photoURL: string;
    bio?: string;
    email: string;
  };
}

export interface TryChatMessage {
  id: string;
  tryId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  content: string;
  createdAt: Timestamp;
  isOrganizer: boolean;
}

export interface ContactShare {
  id: string;
  tryId: string;
  userId: string;
  isPublic: boolean;
  contactType: 'email' | 'twitter' | 'facebook' | 'instagram' | 'other';
  contactValue: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserContact {
  email?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  other?: string;
}

export interface TrySearchFilter {
  keyword?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export interface TryReview {
  id: string;
  tryId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TryCompletion {
  id: string;
  tryId: string;
  userId: string;
  completionStatus: 'completed' | 'partially_completed' | 'not_completed';
  completionComment: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
} 