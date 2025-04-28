import { Timestamp, FieldValue } from 'firebase/firestore';

export type VisibilityLevel = 'public' | 'registered' | 'private';

export interface PrivacySettings {
  userId: string;
  profileVisibility: VisibilityLevel;
  contactInfoVisibility: {
    email: VisibilityLevel;
    phone: VisibilityLevel;
    socialLinks: VisibilityLevel;
  };
  activityVisibility: {
    tries: VisibilityLevel;
    evaluations: VisibilityLevel;
    participations: VisibilityLevel;
  };
  searchable: boolean;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  updatedAt: Timestamp | FieldValue;
}

export const defaultPrivacySettings: Omit<PrivacySettings, 'userId' | 'updatedAt'> = {
  profileVisibility: 'registered',
  contactInfoVisibility: {
    email: 'private',
    phone: 'private',
    socialLinks: 'registered'
  },
  activityVisibility: {
    tries: 'registered',
    evaluations: 'registered',
    participations: 'registered'
  },
  searchable: true,
  showOnlineStatus: true,
  allowDirectMessages: true
}; 