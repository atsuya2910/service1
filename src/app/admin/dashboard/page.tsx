'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// ダミーデータの型定義
interface Try {
  id: string;
  title: string;
  organizer: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  description: string;
  location: string;
  capacity: number;
  imageUrls: string[];
}

// ダミーデータ
const dummyTries: Try[] = [
  {
    id: '1',
    title: 'サッカー大会',
    organizer: '山田太郎',
    date: '2024-04-20',
    status: 'pending',
    category: 'スポーツ',
    description: '初心者歓迎のサッカー大会です。',
    location: '東京スタジアム',
    capacity: 20,
    imageUrls: ['/images/soccer.jpg'],
  },
  {
    id: '2',
    title: 'プログラミング勉強会',
    organizer: '佐藤花子',
    date: '2024-04-25',
    status: 'approved',
    category: '勉強会',
    description: 'ReactとNext.jsの勉強会です。',
    location: 'オンライン',
    capacity: 50,
    imageUrls: ['/images/programming.jpg'],
  },
  // 他のダミーデータ...
];

// ステータスバッジのコンポーネント
const StatusBadge = ({ status }: { status: Try['status'] }) => {
  const statusConfig = {
    pending: { label: '承認待ち', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
    rejected: { label: '却下済み', color: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// 詳細モーダルのコンポーネント
const TryDetailModal = ({
  tryData,
  isOpen,
  onClose,
}: {
  tryData: Try;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">{tryData.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700">主催者</h3>
              <p>{tryData.organizer}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">開催日</h3>
              <p>
                {format(new Date(tryData.date), 'yyyy年MM月dd日', {
                  locale: ja,
                })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">カテゴリー</h3>
              <p>{tryData.category}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">場所</h3>
              <p>{tryData.location}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">定員</h3>
              <p>{tryData.capacity}人</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700">説明</h3>
              <p className="whitespace-pre-wrap">{tryData.description}</p>
            </div>

            {tryData.imageUrls.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700">画像</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {tryData.imageUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`イベント画像 ${index + 1}`}
                      className="rounded-lg object-cover h-40 w-full"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [tries, setTries] = useState<Try[]>(dummyTries);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTry, setSelectedTry] = useState<Try | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // フィルタリングと検索
  const filteredTries = tries.filter((tryData) => {
    const matchesStatus =
      statusFilter === 'all' || tryData.status === statusFilter;
    const matchesSearch = tryData.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      tryData.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // ステータス更新
  const updateStatus = (id: string, newStatus: Try['status']) => {
    setTries(
      tries.map((tryData) =>
        tryData.id === id ? { ...tryData, status: newStatus } : tryData
      )
    );
  };

  // 削除
  const deleteTry = (id: string) => {
    if (window.confirm('このTRYを削除してもよろしいですか？')) {
      setTries(tries.filter((tryData) => tryData.id !== id));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">TRY管理ダッシュボード</h1>

      {/* フィルターと検索 */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="イベント名または主催者で検索..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">全ステータス</option>
          <option value="pending">承認待ち</option>
          <option value="approved">承認済み</option>
          <option value="rejected">却下済み</option>
        </select>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
                開催日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTries.map((tryData) => (
              <tr
                key={tryData.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {tryData.title}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{tryData.organizer}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {format(new Date(tryData.date), 'yyyy/MM/dd', {
                      locale: ja,
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={tryData.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTry(tryData);
                        setIsDetailModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      詳細
                    </button>
                    {tryData.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(tryData.id, 'approved')}
                          className="text-green-600 hover:text-green-900"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => updateStatus(tryData.id, 'rejected')}
                          className="text-red-600 hover:text-red-900"
                        >
                          却下
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteTry(tryData.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 詳細モーダル */}
      {selectedTry && (
        <TryDetailModal
          tryData={selectedTry}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
    </div>
  );
} 