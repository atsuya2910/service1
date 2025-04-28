'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PrivacySettings, VisibilityLevel } from '@/types/privacy';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

const defaultSettings: Omit<PrivacySettings, 'userId' | 'updatedAt'> = {
  profileVisibility: 'registered',
  contactInfoVisibility: {
    email: 'registered',
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

export const PrivacySettingsForm = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>({
    ...defaultSettings,
    userId: '',
    updatedAt: Timestamp.now()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(data.privacySettings || { ...defaultSettings, userId: user.uid, updatedAt: Timestamp.now() });
        } else {
          setSettings({ ...defaultSettings, userId: user.uid, updatedAt: Timestamp.now() });
        }
      } catch (error) {
        console.error('Error fetching privacy settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        privacySettings: {
          ...settings,
          updatedAt: serverTimestamp()
        }
      });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVisibilityChange = (
    field: keyof PrivacySettings,
    value: VisibilityLevel,
    nestedField?: string
  ) => {
    if (nestedField) {
      setSettings(prev => ({
        ...prev,
        [field]: {
          ...(prev[field] as Record<string, any>),
          [nestedField]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading...</div>;
  }

  if (!user) {
    return <div className="text-center p-4">ログインが必要です。</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-4">
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-4">プライバシー設定</h2>

        {/* プロフィール表示設定 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            プロフィールの表示
          </label>
          <select
            value={settings.profileVisibility}
            onChange={(e) => handleVisibilityChange('profileVisibility', e.target.value as VisibilityLevel)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="public">全員に公開</option>
            <option value="registered">登録ユーザーのみに公開</option>
            <option value="private">非公開</option>
          </select>
        </div>

        {/* 連絡先情報の表示設定 */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">連絡先情報の表示</h3>
          <div className="space-y-4">
            {Object.entries(settings.contactInfoVisibility).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 capitalize">
                  {key === 'socialLinks' ? 'SNSリンク' : key}
                </label>
                <select
                  value={value}
                  onChange={(e) => handleVisibilityChange('contactInfoVisibility', e.target.value as VisibilityLevel, key)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="public">全員に公開</option>
                  <option value="registered">登録ユーザーのみに公開</option>
                  <option value="private">非公開</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* アクティビティの表示設定 */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">アクティビティの表示</h3>
          <div className="space-y-4">
            {Object.entries(settings.activityVisibility).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 capitalize">
                  {key === 'tries' ? 'TRY' :
                   key === 'evaluations' ? '評価' :
                   key === 'participations' ? '参加履歴' : key}
                </label>
                <select
                  value={value}
                  onChange={(e) => handleVisibilityChange('activityVisibility', e.target.value as VisibilityLevel, key)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="public">全員に公開</option>
                  <option value="registered">登録ユーザーのみに公開</option>
                  <option value="private">非公開</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* その他の設定 */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">その他の設定</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="searchable"
                checked={settings.searchable}
                onChange={(e) => setSettings(prev => ({ ...prev, searchable: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="searchable" className="ml-2 block text-sm text-gray-700">
                検索可能にする
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowDirectMessages"
                checked={settings.allowDirectMessages}
                onChange={(e) => setSettings(prev => ({ ...prev, allowDirectMessages: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="allowDirectMessages" className="ml-2 block text-sm text-gray-700">
                ダイレクトメッセージを許可する
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showOnlineStatus"
                checked={settings.showOnlineStatus}
                onChange={(e) => setSettings(prev => ({ ...prev, showOnlineStatus: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showOnlineStatus" className="ml-2 block text-sm text-gray-700">
                オンラインステータスを表示する
              </label>
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => setSettings({ ...defaultSettings, userId: user.uid, updatedAt: Timestamp.now() })}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </form>
  );
}; 