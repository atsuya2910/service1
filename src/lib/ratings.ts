import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, where, Timestamp, getDoc } from 'firebase/firestore';
import { UserRating, UserRatingSummary } from '@/types/user';

// ユーザー評価を作成する
export const createUserRating = async (
  raterId: string,
  ratedId: string,
  tryId: string,
  rating: number,
  comment: string
): Promise<void> => {
  try {
    const ratingRef = doc(collection(db, 'userRatings'));
    await setDoc(ratingRef, {
      id: ratingRef.id,
      raterId,
      ratedId,
      tryId,
      rating,
      comment,
      createdAt: Timestamp.now()
    });

    // 評価サマリーを更新
    await updateUserRatingSummary(ratedId);
  } catch (error) {
    console.error('Error creating user rating:', error);
    throw error;
  }
};

// ユーザーの評価サマリーを取得する
export const getUserRatingSummary = async (userId: string): Promise<UserRatingSummary> => {
  try {
    const ratingsRef = collection(db, 'userRatings');
    const q = query(ratingsRef, where('ratedId', '==', userId));
    const querySnapshot = await getDocs(q);

    let totalRating = 0;
    let totalRatings = 0;
    const ratings: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserRating;
      totalRating += data.rating;
      totalRatings++;
      ratings[data.rating]++;
    });

    return {
      averageRating: totalRatings > 0 ? totalRating / totalRatings : 0,
      totalRatings,
      ratings
    };
  } catch (error) {
    console.error('Error getting user rating summary:', error);
    throw error;
  }
};

// ユーザーの評価サマリーを更新する
const updateUserRatingSummary = async (userId: string): Promise<void> => {
  try {
    const summary = await getUserRatingSummary(userId);
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { ratingSummary: summary }, { merge: true });
  } catch (error) {
    console.error('Error updating user rating summary:', error);
    throw error;
  }
};

// 特定のTRYに対する評価を取得する
export const getTryRatings = async (tryId: string): Promise<UserRating[]> => {
  try {
    const ratingsRef = collection(db, 'userRatings');
    const q = query(ratingsRef, where('tryId', '==', tryId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => doc.data() as UserRating);
  } catch (error) {
    console.error('Error getting try ratings:', error);
    throw error;
  }
}; 