import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Try, TryApplicationWithUser } from '@/app/types/try';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function ApplicationManagement() {
  const { user } = useAuth();
  const [tries, setTries] = useState<Try[]>([]);
  const [selectedTry, setSelectedTry] = useState<Try | null>(null);
  const [applications, setApplications] = useState<TryApplicationWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTries = async () => {
      if (!user?.uid) return;

      try {
        const triesQuery = query(
          collection(db, 'tries'),
          where('userId', '==', user.uid)
        );
        const triesSnapshot = await getDocs(triesQuery);
        const triesData = triesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Try[];
        setTries(triesData);
      } catch (error) {
        console.error('Error fetching tries:', error);
      }
    };

    fetchTries();
  }, [user]);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!selectedTry) return;

      try {
        // 参加申請を取得
        const applicationsQuery = query(
          collection(db, 'applications'),
          where('tryId', '==', selectedTry.id)
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        
        // 各申請に対応するユーザー情報を取得
        const applicationsData = await Promise.all(
          applicationsSnapshot.docs.map(async (doc) => {
            const application = { id: doc.id, ...doc.data() } as TryApplicationWithUser;
            
            // ユーザー情報を取得
            const userDoc = await getDocs(
              query(collection(db, 'users'), where('uid', '==', application.userId))
            );
            const userData = userDoc.docs[0]?.data();
            
            return {
              ...application,
              user: {
                displayName: userData?.displayName || '名前未設定',
                photoURL: userData?.photoURL || '/default-avatar.png',
                bio: userData?.bio || '',
                email: userData?.email || '',
              }
            };
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
  }, [selectedTry]);

  const handleStatusUpdate = async (applicationId: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'applications', applicationId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      // 申請一覧を更新
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ));
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">参加申請管理</h2>
      
      {/* イベント選択 */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          イベントを選択
        </label>
        <select
          value={selectedTry?.id || ''}
          onChange={(e) => {
            const selected = tries.find(t => t.id === e.target.value);
            setSelectedTry(selected || null);
          }}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">イベントを選択してください</option>
          {tries.map((try_) => (
            <option key={try_.id} value={try_.id}>
              {try_.title}
            </option>
          ))}
        </select>
      </div>

      {/* 申請一覧 */}
      {selectedTry && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {selectedTry.title} の参加申請一覧
          </h3>
          
          {applications.length === 0 ? (
            <p className="text-gray-500">参加申請はありません</p>
          ) : (
            <div className="grid gap-4">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden">
                      <Image
                        src={application.user.photoURL}
                        alt={application.user.displayName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {application.user.displayName}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {application.user.email}
                          </p>
                          {application.user.bio && (
                            <p className="text-gray-600 mt-2">
                              {application.user.bio}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            application.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : application.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {application.status === 'pending'
                            ? '承認待ち'
                            : application.status === 'approved'
                            ? '承認済み'
                            : '却下'}
                        </span>
                      </div>
                      <div className="mt-4 flex space-x-4">
                        {application.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(application.id, 'approved')}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(application.id, 'rejected')}
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                              拒否
                            </button>
                          </>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-2">
                        申請日: {format(new Date(application.createdAt), 'yyyy年MM月dd日', { locale: ja })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 