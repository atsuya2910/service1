'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/app/types/user';
import Image from 'next/image';
import DefaultAvatar from '@/app/components/DefaultAvatar';
import TryCard from '@/app/components/TryCard';
import { Try, TryParticipant } from '@/app/types/try';
import UserBadges from '@/app/components/UserBadges';
import { useAuth } from '@/hooks/useAuth';
import { getOrCreateDMRoom } from '@/lib/dm';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import UserRatingDisplay from '@/app/components/UserRatingDisplay';
import { MapPinIcon, GlobeAltIcon, PlusIcon, UserPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { FaTwitter, FaInstagram, FaGlobe } from 'react-icons/fa';

export default function UserProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [postedTries, setPostedTries] = useState<Try[]>([]);
  const [participatedTries, setParticipatedTries] = useState<Try[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDMProcessing, setIsDMProcessing] = useState(false);
  const [recentActivities, setRecentActivities] = useState<{
    type: 'post' | 'participate' | 'complete';
    tryId: string;
    tryTitle: string;
    date: Date;
  }[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!id) {
        setError('ユーザーIDが指定されていません。');
        setLoading(false);
        return;
      }

      try {
        // ユーザー情報を取得
        const userDoc = await getDoc(doc(db, 'users', id as string));
        
        if (!userDoc.exists()) {
          setError('ユーザーが見つかりませんでした。');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        setUserProfile({
          id: userDoc.id,
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          bio: userData.bio || '',
          location: userData.location || '',
          website: userData.website || '',
          badges: userData.badges || [],
          skills: userData.skills || [],
          socialLinks: userData.socialLinks || {},
          completedTryCount: userData.completedTryCount || 0,
          participatedTryCount: userData.participatedTryCount || 0,
          unreadDMCount: userData.unreadDMCount || 0,
          lastReadDMTimestamp: userData.lastReadDMTimestamp
        });

        // 投稿したTRYを取得
        const postedTriesQuery = query(
          collection(db, 'tries'),
          where('userId', '==', id),
          where('status', '!=', 'draft'),
          orderBy('status'),
          orderBy('createdAt', 'desc'),
          limit(6)
        );
        const postedTriesSnapshot = await getDocs(postedTriesQuery);
        const postedTriesData = postedTriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Try[];
        setPostedTries(postedTriesData);

        // 参加中のTRYを取得
        const participantsQuery = query(
          collection(db, 'tryParticipants'),
          where('userId', '==', id),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(6)
        );
        const participantsSnapshot = await getDocs(participantsQuery);
        const participantData = participantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TryParticipant[];

        // 参加中のTRYの詳細情報を取得
        const participatedTriesData = await Promise.all(
          participantData.map(async (participant) => {
            const tryDoc = await getDoc(doc(db, 'tries', participant.tryId));
            return {
              id: tryDoc.id,
              ...tryDoc.data()
            } as Try;
          })
        );
        setParticipatedTries(participatedTriesData);

        // 最近の活動を構築
        const recentActivities = participantData
          .filter(participant => participant.tryId)
          .map(participant => {
            const tryData = participatedTriesData.find(t => t.id === participant.tryId);
            if (!tryData) return null;

            // createdAtの型を安全に処理
            let activityDate: Date;
            try {
              const timestamp = participant.createdAt;
              if (timestamp && typeof timestamp.toDate === 'function') {
                activityDate = timestamp.toDate();
              } else {
                activityDate = new Date();
              }
            } catch (error) {
              console.error('Error converting date:', error);
              activityDate = new Date();
            }

            return {
              type: 'participate' as const,
              tryId: participant.tryId,
              tryTitle: tryData.title,
              date: activityDate
            };
          })
          .filter((activity): activity is NonNullable<typeof activity> => activity !== null)
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 10);

        setRecentActivities(recentActivities);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('プロフィールの読み込み中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [id]);

  const handleDMClick = async () => {
    if (!currentUser || !userProfile || isDMProcessing) return;

    try {
      setIsDMProcessing(true);
      const roomId = await getOrCreateDMRoom(currentUser.uid, userProfile.uid);
      window.location.href = `/dm/${roomId}`;
    } catch (error) {
      console.error('Error creating DM room:', error);
      alert('DMルームの作成に失敗しました。');
    } finally {
      setIsDMProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center text-gray-500">
        ユーザーが見つかりませんでした。
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* プロフィールヘッダー */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* プロフィール画像 */}
          <div className="flex flex-col items-center md:items-start w-full md:w-1/3">
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 mb-4">
              {userProfile.photoURL ? (
                <Image
                  src={userProfile.photoURL}
                  alt={userProfile.displayName || 'プロフィール画像'}
                  fill
                  className="object-cover"
                />
              ) : (
                <DefaultAvatar displayName={userProfile.displayName || ''} size={128} />
              )}
            </div>
            {/* SNSリンク */}
            {(userProfile.socialLinks?.twitter || userProfile.socialLinks?.instagram || userProfile.website) && (
              <div className="flex flex-col gap-2 mt-4 w-full">
                <span className="text-gray-700 font-semibold mb-1">SNSリンク</span>
                {userProfile.socialLinks?.twitter && (
                  <a href={`https://twitter.com/${userProfile.socialLinks.twitter.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                    <FaTwitter />
                    @{userProfile.socialLinks.twitter.replace(/^@/, '')}
                  </a>
                )}
                {userProfile.socialLinks?.instagram && (
                  <a href={`https://instagram.com/${userProfile.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-500 hover:underline">
                    <FaInstagram />
                    {userProfile.socialLinks.instagram}
                  </a>
                )}
                {userProfile.website && (
                  <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
                    <FaGlobe />
                    {userProfile.website}
                  </a>
                )}
              </div>
            )}
            {/* 登録日・更新日 */}
            <div className="mt-4 text-xs text-gray-400">
              <div>登録日: {userProfile.createdAt && typeof userProfile.createdAt.toDate === 'function' ? format(userProfile.createdAt.toDate(), 'yyyy年MM月dd日') : ''}</div>
              <div>最終更新: {userProfile.updatedAt && typeof userProfile.updatedAt.toDate === 'function' ? format(userProfile.updatedAt.toDate(), 'yyyy年MM月dd日') : ''}</div>
            </div>
          </div>

          {/* ユーザー情報・自己紹介・スキル */}
          <div className="flex-1 w-full md:w-2/3">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {userProfile.displayName || 'ユーザー'}
            </h1>
            <p className="text-gray-500 mb-4">{userProfile.email}</p>
            {/* ユーザー評価 */}
            <div className="mb-4">
              <UserRatingDisplay userId={userProfile.id} />
            </div>
            {/* 自己紹介文 */}
            {userProfile.bio && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">自己紹介</h2>
                <p className="text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-4 border border-gray-100">{userProfile.bio}</p>
              </div>
            )}
            {/* スキル・得意分野 */}
            {userProfile.skills && userProfile.skills.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">スキル・得意分野</h2>
                <div className="flex flex-wrap gap-2">
                  {userProfile.skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {typeof skill === 'string' ? skill : skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* 統計情報 */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{userProfile.completedTryCount || 0}</p>
                <p className="text-sm text-gray-500">完了したTRY</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{userProfile.participatedTryCount || 0}</p>
                <p className="text-sm text-gray-500">参加したTRY</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{postedTries.length}</p>
                <p className="text-sm text-gray-500">投稿したTRY</p>
              </div>
            </div>
            {/* バッジ */}
            <UserBadges badges={userProfile.badges || []} />
          </div>
        </div>
      </div>

      {/* 投稿したTRY */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">投稿したTRY</h2>
        {postedTries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">まだTRYを投稿していません。</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {postedTries.map(try_ => (
              <TryCard
                key={try_.id}
                try_={try_}
                disableNavigation={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* 参加中のTRY */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">参加中のTRY</h2>
        {participatedTries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">参加中のTRYはありません。</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {participatedTries.map(try_ => (
              <TryCard
                key={try_.id}
                try_={try_}
                disableNavigation={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* 最近の活動 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">最近の活動</h2>
        {recentActivities.length === 0 ? (
          <p className="text-center text-gray-500 py-8">最近の活動はありません。</p>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {activity.type === 'post' && (
                    <PlusIcon className="h-6 w-6 text-blue-500" />
                  )}
                  {activity.type === 'participate' && (
                    <UserPlusIcon className="h-6 w-6 text-green-500" />
                  )}
                  {activity.type === 'complete' && (
                    <CheckCircleIcon className="h-6 w-6 text-purple-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {activity.type === 'post' && '新しいTRYを投稿しました'}
                    {activity.type === 'participate' && 'TRYに参加しました'}
                    {activity.type === 'complete' && 'TRYを完了しました'}
                  </p>
                  <Link
                    href={`/tries/${activity.tryId}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {activity.tryTitle}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(activity.date, 'yyyy年MM月dd日 HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 