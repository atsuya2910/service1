'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Try, TryParticipant, TryReview, TryCompletion } from '@/app/types/try';
import EntryFormModal from '@/app/components/EntryFormModal';
import TryChat from '@/app/components/TryChat';
import ParticipantsList from '@/app/components/ParticipantsList';
import { createTryJoinedNotification } from '@/lib/notifications';
import { getOrCreateDMRoom } from '@/lib/dm';
import TryCompletionModal from '@/app/components/TryCompletionModal';
import TryReviewModal from '@/app/components/TryReviewModal';
import UserRating from '@/app/components/UserRating';
import UserRatingDisplay from '@/app/components/UserRatingDisplay';
import Link from 'next/link';
import DefaultAvatar from '@/app/components/DefaultAvatar';
import { CalendarIcon } from '@heroicons/react/24/outline';

// プレースホルダー画像のデータURI
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

interface User {
  id: string;
  displayName: string;
  photoURL: string;
  bio?: string;
}

interface Participant {
  userId: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface PageParams {
  id: string;
}

interface Props {
  params: PageParams;
}

export default function TryDetailPage() {
  const params = useParams<{ id: string }>();
  const tryId = params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tryData, setTryData] = useState<Try | null>(null);
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [participants, setParticipants] = useState<TryParticipant[]>([]);
  const [isParticipating, setIsParticipating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isDMProcessing, setIsDMProcessing] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [completions, setCompletions] = useState<TryCompletion[]>([]);
  const [reviews, setReviews] = useState<TryReview[]>([]);

  // 無効なIDの場合のリダイレクト
  useEffect(() => {
    if (!tryId) {
      router.push('/tries');
      return;
    }
  }, [tryId, router]);

  const formatDate = useCallback((dateInput: string | Date | Timestamp | null): string => {
    if (!dateInput) return '日付未設定';

    try {
      let date: Date;

      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (dateInput instanceof Timestamp) {
        date = dateInput.toDate();
      } else if (typeof dateInput === 'string') {
        date = parseISO(dateInput);
      } else {
        return '日付未設定';
      }

      if (!isValid(date)) {
        return '日付未設定';
      }

      return format(date, 'yyyy年MM月dd日(E)', { locale: ja });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '日付未設定';
    }
  }, []);

  const fetchTryData = useCallback(async () => {
    if (!tryId) return;

    try {
      const tryDoc = await getDoc(doc(db, 'tries', tryId));
      if (!tryDoc.exists()) {
        router.push('/not-found');
        return;
      }

      const data = { id: tryDoc.id, ...tryDoc.data() } as Try;
      setTryData(data);

      // 主催者情報を取得
      const organizerDoc = await getDoc(doc(db, 'users', data.userId));
      if (organizerDoc.exists()) {
        setOrganizer({
          id: organizerDoc.id,
          displayName: organizerDoc.data().displayName || '名前未設定',
          photoURL: organizerDoc.data().photoURL || '',
          bio: organizerDoc.data().bio,
        });
      }

      // 参加者情報を取得
      const participantsQuery = query(
        collection(db, 'tryParticipants'),
        where('tryId', '==', tryId)
      );
      const participantsSnapshot = await getDocs(participantsQuery);
      const participantsData = participantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TryParticipant[];
      setParticipants(participantsData);

      // 現在のユーザーが参加しているか確認
      if (user) {
        const isParticipating = participantsData.some(p => 
          p.userId === user.uid && p.status !== 'cancelled'
        );
        setIsParticipating(isParticipating);
      }
    } catch (error) {
      console.error('Error fetching try data:', error);
      alert('データの取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, [tryId, user, router]);

  const fetchCompletionsAndReviews = useCallback(async () => {
    if (!tryId) return;

    try {
      // 完了情報を取得
      const completionsQuery = query(
        collection(db, 'tryCompletions'),
        where('tryId', '==', tryId)
      );
      const completionsSnapshot = await getDocs(completionsQuery);
      const completionsData = completionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TryCompletion[];
      setCompletions(completionsData);

      // 評価情報を取得
      const reviewsQuery = query(
        collection(db, 'tryReviews'),
        where('tryId', '==', tryId)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TryReview[];
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching completions and reviews:', error);
    }
  }, [tryId]);

  useEffect(() => {
    fetchTryData();
    fetchCompletionsAndReviews();
  }, [fetchTryData, fetchCompletionsAndReviews]);

  const handleParticipate = async () => {
    if (!user || !tryData) {
      router.push('/login');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // 定員チェック
      if (participants.length >= tryData.capacity) {
        alert('申し訳ありません。定員に達しました。');
        return;
      }

      // 参加登録
      const participantData = {
        userId: user.uid,
        tryId: tryId,
        status: 'approved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'tryParticipants'), participantData);
      const newParticipant = { id: docRef.id, ...participantData } as TryParticipant;
      setParticipants([...participants, newParticipant]);
      setIsParticipating(true);

      // 主催者に通知を送信
      if (tryData.userId) {
        await createTryJoinedNotification(
          tryData.userId,
          tryId,
          tryData.title,
          user.displayName || 'ゲスト'
        );
      }

      alert('参加登録が完了しました！');
      
      // 参加者情報を更新
      fetchTryData();
    } catch (error) {
      console.error('Error participating in try:', error);
      alert('参加登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelParticipation = async (participantId: string) => {
    try {
      await deleteDoc(doc(db, 'tryParticipants', participantId));
      setParticipants(participants.filter(p => p.id !== participantId));
      setIsParticipating(false);
      alert('参加キャンセルが完了しました！');
      
      // 参加者情報を更新
      fetchTryData();
    } catch (error) {
      console.error('Error cancelling participation:', error);
      alert('キャンセルに失敗しました。');
    }
  };

  const handleDMClick = async () => {
    if (!user || !tryData || isDMProcessing) return;

    try {
      setIsDMProcessing(true);
      const roomId = await getOrCreateDMRoom(user.uid, tryData.userId);
      router.push(`/dm/${roomId}`);
    } catch (error) {
      console.error('Error creating DM room:', error);
      alert('DMルームの作成に失敗しました。');
    } finally {
      setIsDMProcessing(false);
    }
  };

  const handleCompleteTry = async () => {
    setIsCompletionModalOpen(true);
  };

  const handleReviewParticipant = (participantId: string) => {
    setSelectedParticipantId(participantId);
    setIsReviewModalOpen(true);
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!tryData) {
    return null;
  }

  const isCapacityFull = tryData.capacity ? participants.filter(p => p.status === 'approved').length >= tryData.capacity : false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : tryData ? (
        <div className="space-y-8">
          {/* TRYの基本情報 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* 主催者情報 */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                {organizer?.photoURL ? (
                  <Image
                    src={organizer.photoURL}
                    alt={organizer.displayName}
                    fill
                    sizes="(max-width: 48px) 100vw, 48px"
                    className="object-cover"
                  />
                ) : (
                  <DefaultAvatar displayName={organizer?.displayName || ''} size={48} />
                )}
              </div>
              <div>
                <Link
                  href={`/users/${organizer?.id}`}
                  className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {organizer?.displayName || '名前未設定'}
                </Link>
                {organizer?.bio && (
                  <p className="text-sm text-gray-500">{organizer.bio}</p>
                )}
              </div>
              {user && organizer && user.uid !== organizer.id && (
                <button
                  onClick={handleDMClick}
                  disabled={isDMProcessing}
                  className="ml-auto px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  {isDMProcessing ? '処理中...' : 'DMを送る'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">開催日時</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                    <span>
                      {tryData.dates && tryData.dates.map((date, index) => (
                        <span key={date}>
                          {format(new Date(date), 'yyyy年MM月dd日')}
                          {index < tryData.dates.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">場所</h3>
                <p className="mt-1 text-lg">{tryData.location}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">募集人数</h3>
                <p className="mt-1 text-lg">{participants.length} / {tryData.capacity}人</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">ステータス</h3>
                <p className="mt-1 text-lg">{tryData.status}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">詳細説明</h3>
              <p className="whitespace-pre-wrap">{tryData.description}</p>
            </div>

            {tryData.imageUrls && tryData.imageUrls.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">画像</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {tryData.imageUrls.map((url, index) => (
                    <div key={index} className="relative aspect-video">
                      <Image
                        src={url}
                        alt={`TRY画像 ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!authLoading && user && user.uid !== tryData.userId && (
              <div className="flex justify-center">
                {isParticipating ? (
                  <button
                    onClick={() => {
                      const participant = participants.find(p => p.userId === user.uid);
                      if (participant) {
                        handleCancelParticipation(participant.id);
                      }
                    }}
                    disabled={isSubmitting}
                    className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 disabled:bg-red-300"
                  >
                    {isSubmitting ? '処理中...' : '参加をキャンセル'}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEntryModalOpen(true)}
                    disabled={isSubmitting || participants.length >= tryData.capacity}
                    className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                  >
                    {isSubmitting ? '処理中...' : '参加する'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 参加者一覧 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">参加者一覧</h2>
            <ParticipantsList
              participants={participants}
              tryId={tryId}
              capacity={tryData.capacity}
              onCancelParticipation={handleCancelParticipation}
              isOrganizer={user?.uid === tryData.userId}
              tryTitle={tryData.title}
            />
          </div>

          {/* チャット */}
          {(user?.uid === tryData.userId || isParticipating) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">チャット</h2>
              <TryChat tryId={tryId} organizerId={tryData.userId} />
            </div>
          )}

          {/* 完了・評価セクション */}
          {tryData.status === 'completed' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">TRYの完了情報</h2>
              {completions.map(completion => (
                <div key={completion.id} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">完了状況: {completion.completionStatus}</p>
                  <p className="mt-2">{completion.completionComment}</p>
                </div>
              ))}

              <h3 className="text-lg font-bold mt-6 mb-4">参加者の評価</h3>
              {reviews.map(review => (
                <div key={review.id} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">評価: {review.rating}/5</p>
                    <p className="text-sm text-gray-500">
                      {review.createdAt instanceof Timestamp
                        ? format(review.createdAt.toDate(), 'yyyy年MM月dd日 HH:mm')
                        : '日付不明'}
                    </p>
                  </div>
                  <p className="mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* アクションボタン */}
          {user && (
            <div className="flex justify-end space-x-4">
              {user.uid === tryData.userId && tryData.status !== 'completed' && (
                <button
                  onClick={handleCompleteTry}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  TRYを完了する
                </button>
              )}
              {tryData.status === 'completed' && !reviews.some(r => r.reviewerId === user.uid) && (
                <button
                  onClick={() => handleReviewParticipant(tryData.userId)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  主催者を評価する
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500">
          TRYが見つかりませんでした。
        </div>
      )}

      <EntryFormModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        tryId={tryId}
        onSubmit={async () => {
          await handleParticipate();
          setIsEntryModalOpen(false);
        }}
      />

      <TryCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        tryId={tryId}
        onComplete={() => {
          fetchTryData();
          fetchCompletionsAndReviews();
        }}
      />

      <TryReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedParticipantId(null);
        }}
        tryId={tryId}
        reviewedUserId={selectedParticipantId || ''}
        onReview={() => {
          fetchCompletionsAndReviews();
        }}
      />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* 開催日セクション */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">開催日</h3>
            {tryData?.dates && tryData.dates.length > 0 ? (
              <div className="space-y-2">
                {tryData.dates.map((date) => (
                  <div key={date} className="bg-gray-50 p-3 rounded-md">
                    <p className="text-gray-700">{formatDate(date)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">日付未設定</p>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          {/* ユーザー評価セクション */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">ユーザー評価</h2>
            {tryData && (
              <>
                <div className="mb-6">
                  <UserRatingDisplay userId={tryData.userId} />
                </div>
                {user && user.uid !== tryData.userId && (
                  <UserRating
                    ratedId={tryData.userId}
                    tryId={params.id}
                    onRatingSubmitted={() => {
                      // 評価が送信された後の処理（必要に応じて）
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 