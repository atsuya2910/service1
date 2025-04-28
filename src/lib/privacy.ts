import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { PrivacySettings, defaultPrivacySettings } from '@/types/privacy';
import { User } from '@/app/types/user';

// プライバシー設定を取得する
export const getPrivacySettings = async (userId: string): Promise<PrivacySettings> => {
  try {
    const privacyDoc = await getDoc(doc(db, 'privacySettings', userId));
    if (!privacyDoc.exists()) {
      // デフォルト設定を作成して返す
      const defaultSettings: PrivacySettings = {
        userId,
        ...defaultPrivacySettings,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'privacySettings', userId), defaultSettings);
      return defaultSettings;
    }
    return privacyDoc.data() as PrivacySettings;
  } catch (error) {
    console.error('Error getting privacy settings:', error);
    throw error;
  }
};

// プライバシー設定を更新する
export const updatePrivacySettings = async (
  userId: string,
  settings: Partial<Omit<PrivacySettings, 'userId' | 'updatedAt'>>
): Promise<void> => {
  try {
    const updateData = {
      ...settings,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'privacySettings', userId), updateData, { merge: true });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    throw error;
  }
};

// ユーザーがコンテンツにアクセスできるかチェックする
export const canAccessContent = async (
  contentOwnerId: string,
  viewerId: string | null,
  contentType: keyof PrivacySettings['activityVisibility']
): Promise<boolean> => {
  try {
    const settings = await getPrivacySettings(contentOwnerId);
    const visibility = settings.activityVisibility[contentType];

    switch (visibility) {
      case 'public':
        return true;
      case 'registered':
        return !!viewerId;
      case 'private':
        return contentOwnerId === viewerId;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking content access:', error);
    return false;
  }
};

// ユーザープロフィールの表示可能な情報をフィルタリングする
export const filterUserDataByPrivacy = async (
  userData: User,
  viewerId: string | null
): Promise<Partial<User>> => {
  try {
    const settings = await getPrivacySettings(userData.id);
    const isOwner = userData.id === viewerId;
    const isRegistered = !!viewerId;

    if (isOwner) return userData;

    const filteredData: Partial<User> = {
      id: userData.id,
      displayName: userData.displayName,
    };

    switch (settings.profileVisibility) {
      case 'public':
        return {
          ...userData,
          email: settings.contactInfoVisibility.email === 'public' ? userData.email : undefined,
          socialLinks: settings.contactInfoVisibility.socialLinks === 'public' ? userData.socialLinks : undefined,
        };
      case 'registered':
        if (isRegistered) {
          return {
            ...userData,
            email: settings.contactInfoVisibility.email === 'registered' ? userData.email : undefined,
            socialLinks: settings.contactInfoVisibility.socialLinks === 'registered' ? userData.socialLinks : undefined,
          };
        }
        return filteredData;
      case 'private':
        return filteredData;
      default:
        return filteredData;
    }
  } catch (error) {
    console.error('Error filtering user data:', error);
    return {
      id: userData.id,
      displayName: userData.displayName,
    };
  }
}; 