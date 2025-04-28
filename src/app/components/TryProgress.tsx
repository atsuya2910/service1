'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TryProgressProps {
  tryId: string;
  currentProgress: number;
  onProgressUpdate?: () => void;
}

export default function TryProgress({ tryId, currentProgress, onProgressUpdate }: TryProgressProps) {
  const [progress, setProgress] = useState(currentProgress);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleProgressUpdate = async (newProgress: number) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'tries', tryId), {
        progress: newProgress,
        // 進捗が100%になった場合、ステータスを完了に更新
        ...(newProgress === 100 ? {
          status: 'completed',
          completedAt: new Date()
        } : {})
      });
      setProgress(newProgress);
      if (onProgressUpdate) {
        onProgressUpdate();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('進捗の更新に失敗しました。');
    } finally {
      setIsUpdating(false);
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">進捗状況</div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{progress}%</span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {isEditing ? 'キャンセル' : '編集'}
          </button>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 進捗編集UI */}
      {isEditing && (
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => handleProgressUpdate(progress)}
              disabled={isUpdating}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? '更新中...' : '更新'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 