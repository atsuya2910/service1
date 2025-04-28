'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import MatchedTries from '@/app/components/MatchedTries';
import UserRatingDisplay from '@/app/components/UserRatingDisplay';
import { User, Skill, SocialLinks } from '@/app/types/user';
import { PrivacySettingsForm } from '@/app/components/PrivacySettingsForm';

interface UserData extends Omit<User, 'skills' | 'socialLinks'> {
  skills?: Skill[];
  socialLinks?: SocialLinks;
}

interface Try {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  tags: string[];
  needSupporter: boolean;
  status: string;
  createdAt: any;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [tries, setTries] = useState<Try[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    const fetchUserTries = async () => {
      if (!user) return;

      try {
        const triesQuery = query(
          collection(db, 'tries'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(triesQuery);
        const triesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Try[];

        setTries(triesData);
      } catch (error) {
        console.error('Error fetching tries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTries();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
          ログインが必要です。
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4">
      {/* プロフィールセクション */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-start gap-6">
          {/* プロフィール画像 */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || 'プロフィール画像'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            )}
          </div>

          {/* ユーザー情報 */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {user.displayName || 'ユーザー'}
            </h1>
            <p className="text-gray-500 mt-1">{user.email}</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                プロフィールを編集
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TRY一覧セクション */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">投稿したTRY</h2>
          <Link
            href="/tries/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            新規TRYを作成
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : tries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">まだTRYを投稿していません。</p>
            <Link
              href="/tries/new"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700"
            >
              最初のTRYを投稿する →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {tries.map((tryItem) => (
              <Link
                key={tryItem.id}
                href={`/tries/${tryItem.id}`}
                className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {tryItem.imageUrls && tryItem.imageUrls.length > 0 && (
                  <div className="relative h-48">
                    <Image
                      src={tryItem.imageUrls[0]}
                      alt={tryItem.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-medium text-gray-900 line-clamp-1">
                      {tryItem.title}
                    </h3>
                    {tryItem.needSupporter && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                        伴走者募集中
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                    {tryItem.description}
                  </p>
                  {tryItem.tags && tryItem.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {tryItem.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {format(tryItem.createdAt.toDate(), 'yyyy年MM月dd日', {
                        locale: ja,
                      })}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      {tryItem.status === 'active' ? '進行中' : '完了'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* プロフィール編集モーダル */}
      {isEditingProfile && (
        <ProfileEditForm onClose={() => setIsEditingProfile(false)} />
      )}

      <MatchedTries userId={user.uid} />
    </div>
  );
} 