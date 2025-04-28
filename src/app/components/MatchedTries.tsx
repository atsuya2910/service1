import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Try, TryParticipant } from '@/app/types/try';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface MatchedTry extends Try {
  organizerName: string;
  matchedAt: Date;
}

interface MatchedTriesProps {
  userId: string;
}

export default function MatchedTries({ userId }: MatchedTriesProps) {
  const [matchedTries, setMatchedTries] = useState<MatchedTry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatchedTries = async () => {
      try {
        // 承認された参加申請を取得
        const participantsQuery = query(
          collection(db, 'tryParticipants'),
          where('userId', '==', userId),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc')
        );
        const participantsSnapshot = await getDocs(participantsQuery);
        const participantData = participantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TryParticipant[];

        // 各TRYの詳細情報を取得
        const matchedTriesData = await Promise.all(
          participantData.map(async (participant) => {
            if (!participant.tryId) return null;

            const tryDoc = await getDocs(
              query(collection(db, 'tries'), where('__name__', '==', participant.tryId))
            );

            if (!tryDoc.empty) {
              const docData = tryDoc.docs[0].data();
              const tryData = {
                id: tryDoc.docs[0].id,
                title: docData.title || '',
                category: docData.category || '',
                description: docData.description || '',
                dates: docData.dates || [],
                location: docData.location || '',
                capacity: docData.capacity || 0,
                imageUrls: docData.imageUrls || [],
                userId: docData.userId || '',
                createdAt: docData.createdAt || null,
                updatedAt: docData.updatedAt || null,
                completedAt: docData.completedAt || null,
                tags: docData.tags || [],
                seekingCompanion: docData.seekingCompanion || false,
                status: docData.status || 'open'
              } as Try;

              const organizerDoc = await getDocs(query(
                collection(db, 'users'),
                where('uid', '==', tryData.userId)
              ));

              const organizerName = organizerDoc.docs[0]?.data()?.displayName || '名前未設定';
              
              let createdAtDate: Date;
              const createdAt = participant.createdAt as Timestamp | { seconds: number; nanoseconds: number } | string | null;
              
              if (createdAt instanceof Timestamp) {
                createdAtDate = createdAt.toDate();
              } else if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt) {
                createdAtDate = new Timestamp(createdAt.seconds, createdAt.nanoseconds).toDate();
              } else if (typeof createdAt === 'string') {
                createdAtDate = new Date(createdAt);
              } else {
                createdAtDate = new Date();
              }

              const matchedTry: MatchedTry = {
                ...tryData,
                organizerName,
                matchedAt: createdAtDate
              };

              return matchedTry;
            }
            return null;
          })
        );

        const isMatchedTry = (try_: any): try_ is MatchedTry => {
          return try_ !== null && typeof try_ === 'object' && 'id' in try_;
        };

        setMatchedTries(matchedTriesData.filter(isMatchedTry));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching matched tries:', error);
        setLoading(false);
      }
    };

    fetchMatchedTries();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (matchedTries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        マッチしたTRYはありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">マッチしたTRY一覧</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                イベント名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                主催者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                マッチ日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                チャット
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matchedTries.map((try_) => (
              <tr key={try_.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link 
                    href={`/tries/${try_.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {try_.title}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {try_.organizerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(try_.matchedAt, 'yyyy/MM/dd', { locale: ja })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/tries/${try_.id}#chat`}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-700 transition duration-150 ease-in-out"
                  >
                    チャットを開く
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 