'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import TryCard from '@/app/components/TryCard';
import { Try, TryParticipant } from '@/app/types/try';
import { User, UserFormData, Badge } from '@/app/types/user';
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format as formatFns, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import TryComments from '@/app/components/TryComments';
import MyApplications from '@/app/components/MyApplications';
import ApplicationManagement from '@/app/components/ApplicationManagement';
import MatchedTries from '@/app/components/MatchedTries';
import TryEditModal from '@/app/components/TryEditModal';
import ProfileEditor from '@/app/components/ProfileEditor';
import UserBadges from '@/app/components/UserBadges';
import { Timestamp } from 'firebase/firestore';
import DefaultAvatar from '../components/DefaultAvatar';

type TabType = 'posted' | 'participated';

interface MonthlyData {
  name: string;
  count: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'posted' | 'completed';
  tryData: Try;
}

const locales = {
  'ja': ja,
};

const localizer = dateFnsLocalizer({
  format: formatFns,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// イベントスタイルの設定を関数コンポーネントの外に移動
const getEventStyle = (event: CalendarEvent) => {
  return {
    style: {
      backgroundColor: event.type === 'posted' ? '#3B82F6' : '#10B981',
      borderRadius: '4px',
      opacity: 0.8,
      color: 'white',
      border: 'none',
      display: 'block',
    }
  };
};

export default function MyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('posted');
  const [postedTries, setPostedTries] = useState<Try[]>([]);
  const [participatedTries, setParticipatedTries] = useState<Try[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedTry, setSelectedTry] = useState<Try | null>(null);
  const [showTryDetails, setShowTryDetails] = useState(false);
  const [myTries, setMyTries] = useState<Try[]>([]);
  const [editingTry, setEditingTry] = useState<Try | null>(null);

  const calculateStatistics = useCallback((tries: Try[]) => {
    // 達成済みの数を計算
    const completed = tries.filter(try_ => try_.status === 'completed').length;
    setCompletedCount(completed);

    // 過去12ヶ月の月別データを作成
    const end = new Date();
    const start = subMonths(end, 11);
    const months = eachMonthOfInterval({ start, end });

    const monthlyStats = months.map(month => {
      const count = tries.filter(try_ => {
        const tryDate = try_.createdAt.toDate();
        return startOfMonth(tryDate).getTime() === startOfMonth(month).getTime();
      }).length;

      return {
        name: format(month, 'yyyy年M月', { locale: ja }),
        count: count
      };
    });

    setMonthlyData(monthlyStats);
  }, []);

  const fetchPostedTries = useCallback(async () => {
    if (!user) return;

    try {
      const triesQuery = query(
        collection(db, 'tries'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(triesQuery);
      const triesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          category: data.category || 'other',
          description: data.description || '',
          dates: Array.isArray(data.dates) ? data.dates : [],
          location: data.location || '',
          capacity: data.capacity || 1,
          imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
          userId: data.userId || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          completedAt: data.completedAt || null,
          tags: Array.isArray(data.tags) ? data.tags : [],
          seekingCompanion: Boolean(data.seekingCompanion),
          status: data.status || 'open',
          participantCount: data.participantCount || 0
        } as Try;
      });

      console.log('Fetched posted tries:', triesData); // デバッグ用
      setPostedTries(triesData);
      calculateStatistics(triesData);
    } catch (error) {
      console.error('Error fetching posted tries:', error);
      setPostedTries([]);
      // エラーメッセージをユーザーに表示
      alert('TRYの取得中にエラーが発生しました。ページを更新してください。');
    }
  }, [user, calculateStatistics]);

  const fetchParticipatedTries = useCallback(async () => {
    if (!user) return;

    try {
      const participantsQuery = query(
        collection(db, 'tryParticipants'),
        where('userId', '==', user.uid)
      );
      const participantsSnapshot = await getDocs(participantsQuery);
      const participantData = participantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TryParticipant[];

      const tryPromises = participantData.map(async (participant) => {
        if (!participant.tryId) return null;
        
        try {
          const tryDoc = await getDocs(
            query(collection(db, 'tries'), where('__name__', '==', participant.tryId))
          );
          
          if (!tryDoc.empty) {
            const doc = tryDoc.docs[0];
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || '',
              category: data.category || 'other',
              description: data.description || '',
              dates: Array.isArray(data.dates) ? data.dates : [],
              location: data.location || '',
              capacity: data.capacity || 1,
              imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
              userId: data.userId || '',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              completedAt: data.completedAt || null,
              tags: Array.isArray(data.tags) ? data.tags : [],
              seekingCompanion: Boolean(data.seekingCompanion),
              status: data.status || 'open',
              participantCount: data.participantCount || 0
            } as Try;
          }
          return null;
        } catch (error) {
          console.error(`Error fetching try ${participant.tryId}:`, error);
          return null;
        }
      });

      const tries = (await Promise.all(tryPromises)).filter((try_): try_ is Try => try_ !== null);
      console.log('Fetched participated tries:', tries); // デバッグ用
      setParticipatedTries(tries);
    } catch (error) {
      console.error('Error fetching participated tries:', error);
      setParticipatedTries([]);
      // エラーメッセージをユーザーに表示
      alert('参加中のTRYの取得中にエラーが発生しました。ページを更新してください。');
    }
  }, [user]);

  const prepareCalendarEvents = useCallback((tries: Try[]) => {
    const events: CalendarEvent[] = [];
    tries.forEach(try_ => {
      // 投稿日のイベント
      events.push({
        id: `${try_.id}-posted`,
        title: `📝 ${try_.title}`,
        start: try_.createdAt.toDate(),
        end: try_.createdAt.toDate(),
        type: 'posted',
        tryData: try_,
      });

      // 達成日のイベント（もし達成済みの場合）
      if (try_.status === 'completed' && try_.completedAt) {
        events.push({
          id: `${try_.id}-completed`,
          title: `🎉 ${try_.title}`,
          start: try_.completedAt.toDate(),
          end: try_.completedAt.toDate(),
          type: 'completed',
          tryData: try_,
        });
      }
    });
    setCalendarEvents(events);
  }, []);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        setUserProfile({
          id: userDoc.docs[0].id,
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
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // データの取得を実行
    fetchUserProfile();
    fetchPostedTries();
    fetchParticipatedTries();
  }, [user, loading, router, fetchUserProfile, fetchPostedTries, fetchParticipatedTries]);

  useEffect(() => {
    if (postedTries.length > 0) {
      prepareCalendarEvents(postedTries);
    }
  }, [postedTries, prepareCalendarEvents]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedTry(event.tryData);
    setShowTryDetails(true);
  }, []);

  const handleEdit = (try_: Try) => {
    setEditingTry(try_);
  };

  const handleDelete = async (try_: Try) => {
    if (!try_.id) return;
    
    if (window.confirm('このTRYを削除してもよろしいですか？')) {
      try {
        await deleteDoc(doc(db, 'tries', try_.id));
        await fetchPostedTries(); // 一覧を更新
      } catch (error) {
        console.error('Error deleting try:', error);
        alert('削除中にエラーが発生しました。');
      }
    }
  };

  const handleUpdate = async (updatedTry: Try) => {
    try {
      const tryRef = doc(db, 'tries', updatedTry.id!);
      await updateDoc(tryRef, {
        ...updatedTry,
        updatedAt: Timestamp.now()
      });
      await fetchPostedTries();
      setEditingTry(null);
    } catch (error) {
      console.error('Error updating try:', error);
      alert('TRYの更新中にエラーが発生しました。');
    }
  };

  const handleProfileUpdate = () => {
    if (!userProfile) return;

    const initialData: UserFormData = {
      displayName: userProfile.displayName,
      email: userProfile.email,
      bio: userProfile.bio || '',
      photoURL: userProfile.photoURL,
      location: userProfile.location || '',
      website: userProfile.website || '',
    };

    setShowProfileEditor(true);
  };

  const handleProfileClose = async () => {
    setShowProfileEditor(false);
    try {
      await fetchUserProfile();
      // 成功メッセージを表示
      alert('プロフィールが更新されました');
    } catch (error) {
      console.error('Error refreshing profile:', error);
      alert('プロフィールの更新に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">ユーザー情報を読み込んでいます...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-600">ログインページに移動します...</p>
      </div>
    );
  }

  // eventStyleGetterをuseCallbackから通常の関数参照に変更
  const eventStyleGetter = getEventStyle;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* プロフィールセクション */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-start gap-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100">
            {userProfile?.photoURL ? (
              <Image
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <DefaultAvatar displayName={userProfile?.displayName} size={80} />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                {userProfile?.displayName || 'ユーザー'}
              </h1>
              <button
                onClick={handleProfileUpdate}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                プロフィールを編集
              </button>
            </div>
            
            {userProfile?.bio && (
              <p className="mt-2 text-gray-600">{userProfile.bio}</p>
            )}

            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              {userProfile?.location && (
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {userProfile.location}
                </div>
              )}
              {userProfile?.website && (
                <a
                  href={userProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  ウェブサイト
                </a>
              )}
            </div>

            <div className="mt-4 flex items-center space-x-4">
              <div className="text-sm">
                <span className="font-medium text-gray-900">{postedTries.length}</span>
                <span className="text-gray-500"> 投稿</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-900">{completedCount}</span>
                <span className="text-gray-500"> 達成</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-900">{userProfile?.badges?.length || 0}</span>
                <span className="text-gray-500"> バッジ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* バッジセクション */}
      {userProfile?.badges && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <UserBadges badges={userProfile.badges} />
        </div>
      )}

      {/* メインプロフィールカード */}
      <div className="bg-white rounded-3xl shadow-lg p-8 mb-12">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <div className="w-full md:w-1/3">
            <div className="relative w-48 h-48 mx-auto md:mx-0 rounded-2xl overflow-hidden ring-8 ring-blue-100/50 shadow-xl">
              <Image
                src={userProfile?.photoURL || '/images/default-avatar.png'}
                alt={userProfile?.displayName || 'ユーザー'}
                fill
                className="object-cover"
              />
            </div>
          </div>
          <div className="flex-1 w-full md:w-2/3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {userProfile?.displayName || 'ユーザー名未設定'}
                </h1>
                <p className="text-gray-600 mb-4">{userProfile?.email}</p>
              </div>
              <button
                onClick={() => router.push('/tries/new')}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新しいTRYを始める
              </button>
            </div>
            
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">{postedTries.length}</div>
                <div className="text-sm text-gray-600">投稿したTRY</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">{completedCount}</div>
                <div className="text-sm text-gray-600">達成したTRY</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">{participatedTries.length}</div>
                <div className="text-sm text-gray-600">参加中のTRY</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRYタイムライン */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-800">最近のTRY</h2>
            </div>
            <div className="space-y-4">
              {postedTries.slice(0, 3).map((try_) => (
                <div
                  key={try_.id}
                  className="transform transition-all duration-300 hover:-translate-y-1"
                >
                  <TryCard
                    key={try_.id}
                    try_={try_}
                    onEdit={() => handleEdit(try_)}
                    onDelete={() => handleDelete(try_)}
                    disableNavigation
                  />
                </div>
              ))}
              {postedTries.length === 0 && (
                <p className="text-center text-gray-500 py-4">まだTRYがありません</p>
              )}
            </div>
          </div>

          {/* 活動統計 */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center mb-6">
              <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-800">活動統計</h2>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="count" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* サイドバー */}
        <div className="space-y-8">
          {/* カレンダー */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-800">TRYカレンダー</h2>
            </div>
            <div className="h-[400px] rounded-xl overflow-hidden">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event: CalendarEvent) => handleEventClick(event)}
                messages={{
                  next: '次へ',
                  previous: '前へ',
                  today: '今日',
                  month: '月',
                  week: '週',
                  day: '日',
                  agenda: '予定',
                  date: '日付',
                  time: '時間',
                  event: 'イベント',
                  noEventsInRange: 'この期間のTRYはありません',
                }}
                formats={{
                  monthHeaderFormat: (date: Date) => format(date, 'yyyy年M月', { locale: ja }),
                  dayHeaderFormat: (date: Date) => format(date, 'yyyy年M月d日(E)', { locale: ja }),
                  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                    `${format(start, 'yyyy年M月d日', { locale: ja })} - ${format(end, 'M月d日', { locale: ja })}`,
                }}
                className="rounded-xl"
                views={['month']}
              />
            </div>
          </div>

          {/* 参加中のTRY */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-800">参加中のTRY</h2>
            </div>
            <div className="space-y-4">
              {participatedTries.slice(0, 3).map((try_) => (
                <div
                  key={try_.id}
                  className="transform transition-all duration-300 hover:-translate-y-1"
                >
                  <TryCard
                    key={try_.id}
                    try_={try_}
                    disableNavigation
                  />
                </div>
              ))}
              {participatedTries.length === 0 && (
                <p className="text-center text-gray-500 py-4">参加中のTRYはありません</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* マッチしたTRY一覧 */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <MatchedTries userId={user.uid} />
      </div>

      {/* 活動統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">{postedTries.length}</div>
          <div className="text-sm text-gray-600">投稿したTRY</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600 mb-1">{completedCount}</div>
          <div className="text-sm text-gray-600">達成したTRY</div>
        </div>
      </div>

      {/* TRYカレンダー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-[400px] rounded-xl overflow-hidden">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(event: CalendarEvent) => handleEventClick(event)}
            messages={{
              next: '次へ',
              previous: '前へ',
              today: '今日',
              month: '月',
              week: '週',
              day: '日',
              agenda: '予定',
              date: '日付',
              time: '時間',
              event: 'イベント',
              noEventsInRange: 'この期間のTRYはありません',
            }}
            formats={{
              monthHeaderFormat: (date: Date) => format(date, 'yyyy年M月', { locale: ja }),
              dayHeaderFormat: (date: Date) => format(date, 'yyyy年M月d日(E)', { locale: ja }),
              dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${format(start, 'yyyy年M月d日', { locale: ja })} - ${format(end, 'M月d日', { locale: ja })}`,
            }}
            className="rounded-xl"
            views={['month']}
          />
        </div>
      </div>

      {/* TRY詳細モーダル */}
      {showTryDetails && selectedTry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">{selectedTry.title}</h3>
              <button
                onClick={() => setShowTryDetails(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-gray-600">{selectedTry.description}</p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-semibold text-gray-700">カテゴリー:</span>
                    <span className="ml-2 text-gray-600">{selectedTry.category}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-gray-700">ステータス:</span>
                    <span className="ml-2 text-gray-600">{selectedTry.status}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-gray-700">投稿日:</span>
                    <span className="ml-2 text-gray-600">
                      {format(selectedTry.createdAt.toDate(), 'yyyy年M月d日', { locale: ja })}
                    </span>
                  </div>
                  {selectedTry.completedAt && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-gray-700">達成日:</span>
                      <span className="ml-2 text-gray-600">
                        {format(selectedTry.completedAt.toDate(), 'yyyy年M月d日', { locale: ja })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* コメントセクション */}
              <div className="border-t pt-6">
                <TryComments tryId={selectedTry.id || ''} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 参加申請一覧 */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <MyApplications />
      </div>

      {/* 参加申請管理 */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <ApplicationManagement />
      </div>

      {editingTry && (
        <TryEditModal
          try_={editingTry}
          isOpen={true}
          onClose={() => setEditingTry(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* プロフィール編集モーダル */}
      {showProfileEditor && userProfile && (
        <ProfileEditor
          userId={userProfile.id}
          initialData={{
            displayName: userProfile.displayName,
            email: userProfile.email,
            bio: userProfile.bio || '',
            photoURL: userProfile.photoURL,
            location: userProfile.location || '',
            website: userProfile.website || '',
          }}
          onClose={handleProfileClose}
        />
      )}
    </div>
  );
} 