import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from '@/lib/auth';
import { Notification, NotificationType, notificationMessages } from '@/app/types/notification';
import { Try } from '@/app/types/try';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // 通知のリアルタイム監視
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.isRead).length);
    });

    return () => unsubscribe();
  }, [user]);

  // 通知を作成する関数
  const createNotification = async (
    recipientId: string,
    type: NotificationType,
    tryData: Try,
    relatedUserId?: string
  ) => {
    try {
      const notification: Omit<Notification, 'id'> = {
        userId: recipientId,
        tryId: tryData.id!,
        type,
        title: tryData.title,
        message: notificationMessages[type]({
          tryTitle: tryData.title,
          userName: user?.displayName || 'ユーザー'
        }),
        isRead: false,
        createdAt: Timestamp.now(),
        link: `/tries/${tryData.id}`,
        relatedUserId
      };

      await addDoc(collection(db, 'notifications'), notification);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // 通知を既読にする関数
  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // すべての通知を既読にする関数
  const markAllAsRead = async () => {
    try {
      const promises = notifications
        .filter(n => !n.isRead)
        .map(n => markAsRead(n.id));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
  };
} 