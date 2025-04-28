'use client';

import { Badge } from '@/app/types/user';
import Image from 'next/image';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface UserBadgesProps {
  badges: Badge[];
}

export default function UserBadges({ badges }: UserBadgesProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">獲得バッジ</h3>
      {badges.length === 0 ? (
        <p className="text-gray-500">まだバッジを獲得していません</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="relative w-16 h-16 mx-auto mb-3">
                <Image
                  src={badge.imageUrl}
                  alt={badge.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-center">
                <h4 className="font-medium text-gray-900">{badge.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{badge.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  獲得日: {format(badge.acquiredAt.toDate(), 'yyyy/MM/dd', { locale: ja })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 