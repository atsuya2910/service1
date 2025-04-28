import { Timestamp } from 'firebase/firestore';

export type NotificationType = 
  | 'try_application'      // TRY参加申請
  | 'chat_message'         // チャットメッセージ
  | 'application_approved' // 申請承認
  | 'application_rejected' // 申請却下
  | 'date_changed'         // 日程変更
  | 'bulk_notification'    // 一括通知
  ;

export interface Notification {
  id: string;
  userId: string;          // 通知の受信者ID
  type: NotificationType;  // 通知タイプ
  title: string;          // 通知タイトル
  message: string;        // 通知メッセージ
  tryId?: string;         // 関連するTRYのID
  chatId?: string;        // 関連するチャットのID
  isRead: boolean;        // 既読状態
  createdAt: Timestamp;   // 作成日時
  link: string;          // 通知クリック時の遷移先URL
  relatedUserId?: string; // 関連するユーザーID
  metadata?: {           // 追加のメタデータ
    oldDate?: string;    // 変更前の日程
    newDate?: string;    // 変更後の日程
    senderId?: string;   // 通知送信者ID
  };
}

export const getNotificationTitle = (type: NotificationType): string => {
  switch (type) {
    case 'try_application':
      return 'TRY参加申請';
    case 'chat_message':
      return '新着メッセージ';
    case 'application_approved':
      return '申請が承認されました';
    case 'application_rejected':
      return '申請が却下されました';
    case 'date_changed':
      return 'TRYの日程が変更されました';
    case 'bulk_notification':
      return 'お知らせ';
    default:
      return '新着通知';
  }
};

interface NotificationMessageParams {
  tryTitle: string;
  userName: string;
}

export const notificationMessages: Record<NotificationType, (params: NotificationMessageParams) => string> = {
  try_application: ({ tryTitle, userName }) => 
    `${userName}さんが「${tryTitle}」への参加を申請しました`,
  chat_message: ({ tryTitle, userName }) => 
    `${userName}さんから「${tryTitle}」に関するメッセージが届いています`,
  application_approved: ({ tryTitle }) => 
    `「${tryTitle}」への参加申請が承認されました`,
  application_rejected: ({ tryTitle }) => 
    `「${tryTitle}」への参加申請が却下されました`,
  date_changed: ({ tryTitle }) => 
    `「${tryTitle}」の日程が変更されました`,
  bulk_notification: ({ tryTitle }) => 
    `「${tryTitle}」に関するお知らせがあります`
}; 