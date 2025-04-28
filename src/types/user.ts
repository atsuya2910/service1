import { Timestamp } from 'firebase/firestore';

export interface UserRating {
  id: string;
  raterId: string;  // 評価したユーザーのID
  ratedId: string;  // 評価されたユーザーのID
  tryId: string;    // 関連するTRYのID
  rating: number;   // 1-5の評価
  comment: string;  // 評価コメント
  createdAt: Timestamp;
}

export interface UserRatingSummary {
  averageRating: number;
  totalRatings: number;
  ratings: {
    [key: number]: number; // 1-5の各評価の数
  };
}

export type BadgeType = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master'; 