import { useState } from 'react';
import { TrySearchFilter as TrySearchFilterType } from '../types/try';

interface TrySearchFilterProps {
  onFilterChange: (filter: TrySearchFilterType) => void;
}

const CATEGORIES = [
  { value: 'event', label: 'イベント' },
  { value: 'project', label: 'プロジェクト' },
  { value: 'recruitment', label: '募集' },
  { value: 'sports', label: 'スポーツ' },
];

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

export default function TrySearchFilter({ onFilterChange }: TrySearchFilterProps) {
  const [filter, setFilter] = useState<TrySearchFilterType>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilter = { ...filter, [name]: value };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* キーワード検索 */}
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700">
            キーワード
          </label>
          <input
            type="text"
            id="keyword"
            name="keyword"
            value={filter.keyword || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="TRYを検索"
          />
        </div>

        {/* カテゴリー選択 */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            カテゴリー
          </label>
          <select
            id="category"
            name="category"
            value={filter.category || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* 場所選択 */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            場所
          </label>
          <select
            id="location"
            name="location"
            value={filter.location || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            {PREFECTURES.map((prefecture) => (
              <option key={prefecture} value={prefecture}>
                {prefecture}
              </option>
            ))}
          </select>
        </div>

        {/* 日付範囲 */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            開始日
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={filter.startDate || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            終了日
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={filter.endDate || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
} 