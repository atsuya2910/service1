import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TryApplication, Try } from '@/app/types/try';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
} as const;

const statusLabels = {
  pending: '承認待ち',
  approved: '承認済み',
  rejected: '却下',
} as const;

export default function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<(TryApplication & { try: Try })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) return;

      try {
        // 参加申請を取得
        const applicationsQuery = query(
          collection(db, 'applications'),
          where('userId', '==', user.uid)
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        
        // 各申請に対応するTRYを取得
        const applicationsData = await Promise.all(
          applicationsSnapshot.docs.map(async (doc) => {
            const application = { id: doc.id, ...doc.data() } as TryApplication;
            
            // TRYの詳細を取得
            const tryDoc = await getDocs(
              query(collection(db, 'tries'), where('id', '==', application.tryId))
            );
            const tryData = tryDoc.docs[0]?.data() as Try;
            
            return { ...application, try: tryData };
          })
        );

        setApplications(applicationsData);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">参加申請したイベントはありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">参加申請一覧</h2>
      <div className="grid gap-4">
        {applications.map((application) => (
          <div
            key={application.id}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{application.try.title}</h3>
                <p className="text-gray-600 mt-1">
                  申請日: {format(new Date(application.createdAt), 'yyyy年MM月dd日', { locale: ja })}
                </p>
                <p className="text-gray-600">
                  イベント日: {application.try.dates && application.try.dates.length > 0 ? format(new Date(application.try.dates[0]), 'yyyy年MM月dd日', { locale: ja }) : '未定'}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusStyles[application.status]
                }`}
              >
                {statusLabels[application.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 