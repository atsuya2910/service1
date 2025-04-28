'use client';

import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { markNotificationAsRead } from '@/lib/notifications';

interface Notification {
  id: string;
  userId: string;
  type: 'try_joined' | 'try_completed' | 'try_updated' | 'try_application' | 'chat_message' | 'application_approved' | 'application_rejected';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
  tryId?: string;
  chatId?: string;
  link?: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  console.log('NotificationBell user:', user);

  useEffect(() => {
    if (!user) {
      console.log('NotificationBell: No user, skipping subscription');
      return;
    }

    console.log('NotificationBell: Setting up subscription for user:', user.uid);

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    console.log('NotificationBell: Query created:', {
      collection: 'notifications',
      userId: user.uid,
      orderBy: 'createdAt'
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('NotificationBell: Snapshot received:', {
        empty: snapshot.empty,
        size: snapshot.size,
        docs: snapshot.docs.map(doc => ({
          id: doc.id,
          type: doc.data().type,
          isRead: doc.data().isRead,
          createdAt: doc.data().createdAt
        }))
      });

      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      console.log('NotificationBell: Setting notifications:', newNotifications);
      setNotifications(newNotifications);
    }, (error) => {
      console.error('NotificationBell: Error in subscription:', error);
    });

    return () => {
      console.log('NotificationBell: Cleaning up subscription');
      unsubscribe();
    };
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      console.log('NotificationBell: Handling notification click:', {
        id: notification.id,
        type: notification.type,
        link: notification.link
      });

      if (!notification.isRead) {
        console.log('NotificationBell: Marking notification as read:', notification.id);
        await markNotificationAsRead(notification.id);
      }

      if (notification.link) {
        console.log('NotificationBell: Navigating to:', notification.link);
        router.push(notification.link);
      }

      setShowNotifications(false);
    } catch (error) {
      console.error('NotificationBell: Error handling notification click:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 hover:bg-gray-100 rounded-full flex items-center justify-center"
        style={{ minWidth: '2.5rem', minHeight: '2.5rem' }}
      >
        <BellIcon className="h-6 w-6 text-gray-600 hover:text-gray-800" aria-hidden="false" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform bg-red-500 rounded-full min-w-[1.25rem] min-h-[1.25rem]">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">通知</h3>
            <div className="space-y-3">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-3 rounded-lg transition-colors duration-200 hover:bg-gray-50 ${
                      notification.isRead ? 'bg-white' : 'bg-blue-50'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-500">
                        {notification.createdAt.toDate().toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">通知はありません</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 