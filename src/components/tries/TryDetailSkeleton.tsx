export default function TryDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-8 animate-pulse">
      {/* メインコンテンツ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* 画像プレースホルダー */}
        <div className="w-full h-96 bg-gray-200" />

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            {/* タイトル */}
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            {/* ステータスバッジ */}
            <div className="h-6 bg-gray-200 rounded-full w-24" />
          </div>

          {/* 説明文 */}
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>

          {/* タグ */}
          <div className="flex flex-wrap gap-2">
            <div className="h-6 bg-gray-200 rounded-full w-16" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
            <div className="h-6 bg-gray-200 rounded-full w-24" />
          </div>

          {/* フッター */}
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end gap-4">
        <div className="h-10 bg-gray-200 rounded w-24" />
        <div className="h-10 bg-gray-200 rounded w-24" />
      </div>
    </div>
  );
} 