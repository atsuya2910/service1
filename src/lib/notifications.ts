import { addDoc, collection, serverTimestamp, updateDoc, doc, FieldValue, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotificationType, getNotificationTitle } from '@/app/types/notification';

export interface Notification {
  id?: string;
  userId: string;
  type: 'try_joined' | 'try_completed' | 'try_updated' | 'try_application' | 'chat_message' | 'application_approved' | 'application_rejected' | 'try_review' | 'date_changed' | 'bulk_notification';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: FieldValue;
  tryId?: string;
  chatId?: string;
  link?: string;
  rating?: number;
  reviewerId?: string;
  reviewedUserId?: string;
  metadata?: {
    oldDate: string;
    newDate?: string;
  };
}

export interface CreateNotificationParams {
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  tryId?: string;
  chatId?: string;
  link?: string;
}

/**
 * 通知を作成する
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const notificationData: Omit<Notification, 'id'> = {
      ...params,
      isRead: false,
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

/**
 * TRYに参加した際の通知を作成
 */
export async function createTryJoinedNotification(
  organizerId: string,
  tryTitle: string,
  participantName: string,
  tryId: string
): Promise<void> {
  try {
    await createNotification({
      userId: organizerId,
      type: 'try_joined',
      title: 'TRYに新しい参加者が加わりました',
      message: `${participantName}さんが「${tryTitle}」に参加しました`,
      tryId,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

/**
 * 通知を既読にする
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
    });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

export async function createTryCompletedNotification(
  tryId: string,
  tryTitle: string,
  userId: string
) {
  try {
    const notificationData = {
      type: 'try_completed',
      tryId,
      tryTitle,
      userId,
      isRead: false,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (error) {
    console.error('Error creating try completed notification:', error);
  }
}

export async function createTryUpdatedNotification(participantIds: string[], tryTitle: string) {
  await Promise.all(
    participantIds.map((participantId) =>
      createNotification({
        userId: participantId,
        title: 'TRY更新',
        message: `参加中の「${tryTitle}」が更新されました`,
        type: 'try_updated',
      })
    )
  );
}

// TRY参加申請の通知を作成
export const createTryApplicationNotification = async ({
  userId,
  tryId,
  tryTitle,
  applicantName
}: {
  userId: string;
  tryId: string;
  tryTitle: string;
  applicantName: string;
}) => {
  await createNotification({
    userId,
    type: 'try_application',
    title: '新規参加申請',
    message: `${applicantName}さんが「${tryTitle}」への参加を希望しています`,
    tryId,
    link: `/tries/${tryId}`
  });
};

// チャットメッセージ受信の通知を作成
export const createChatMessageNotification = async ({
  userId,
  tryId,
  chatId,
  senderName,
  tryTitle
}: {
  userId: string;
  tryId: string;
  chatId: string;
  senderName: string;
  tryTitle: string;
}) => {
  await createNotification({
    userId,
    type: 'chat_message',
    title: '新規メッセージ',
    message: `${senderName}さんから「${tryTitle}」のチャットでメッセージが届いています`,
    tryId,
    chatId,
    link: `/tries/${tryId}/chat`
  });
};

// 申請承認の通知を作成
export const createApplicationApprovedNotification = async ({
  userId,
  tryId,
  tryTitle
}: {
  userId: string;
  tryId: string;
  tryTitle: string;
}) => {
  await createNotification({
    userId,
    type: 'application_approved',
    title: '参加申請承認',
    message: `「${tryTitle}」への参加が承認されました`,
    tryId,
    link: `/tries/${tryId}`
  });
};

// 申請却下の通知を作成
export const createApplicationRejectedNotification = async ({
  userId,
  tryId,
  tryTitle
}: {
  userId: string;
  tryId: string;
  tryTitle: string;
}) => {
  await createNotification({
    userId,
    type: 'application_rejected',
    title: '参加申請却下',
    message: `「${tryTitle}」への参加が却下されました`,
    tryId,
    link: `/tries/${tryId}`
  });
};

export async function createTryReviewNotification(
  tryId: string,
  tryTitle: string,
  reviewerId: string,
  reviewedUserId: string,
  rating: number
) {
  try {
    const notificationData = {
      type: 'try_review',
      tryId,
      tryTitle,
      reviewerId,
      reviewedUserId,
      rating,
      isRead: false,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (error) {
    console.error('Error creating try review notification:', error);
  }
}

// 日程変更通知の作成
export const createDateChangedNotification = async (
  tryId: string,
  tryTitle: string,
  oldDate: string,
  newDate: string,
  participants: string[]
) => {
  try {
    const notifications = participants.map(userId => ({
      userId,
      type: 'date_changed' as NotificationType,
      title: 'TRYの日程が変更されました',
      message: `${tryTitle}の日程が${oldDate}から${newDate}に変更されました`,
      tryId,
      isRead: false,
      createdAt: serverTimestamp(),
      link: `/tries/${tryId}`,
      metadata: {
        oldDate,
        newDate
      }
    }));

    const batch = writeBatch(db);
    const notificationsRef = collection(db, 'notifications');
    
    for (const notification of notifications) {
      const docRef = doc(notificationsRef);
      batch.set(docRef, notification);
    }

    await batch.commit();
  } catch (error) {
    console.error('Error creating date changed notifications:', error);
    throw error;
  }
};

// 一括通知の作成
export const createBulkNotification = async (
  title: string,
  message: string,
  userIds: string[],
  link?: string
) => {
  try {
    const notifications = userIds.map(userId => ({
      userId,
      type: 'bulk_notification' as NotificationType,
      title,
      message,
      isRead: false,
      createdAt: serverTimestamp(),
      link: link || '/notifications',
      metadata: {
        senderId: 'system'
      }
    }));

    const batch = writeBatch(db);
    const notificationsRef = collection(db, 'notifications');
    
    for (const notification of notifications) {
      const docRef = doc(notificationsRef);
      batch.set(docRef, notification);
    }

    await batch.commit();
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

// すべての通知を既読にする
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}; 