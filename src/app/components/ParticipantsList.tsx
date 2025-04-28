import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TryParticipant, UserProfile } from '../types/try';
import { useAuth } from '@/hooks/useAuth';
import { createNotification } from '@/lib/notifications';

interface ParticipantsListProps {
  participants: TryParticipant[];
  tryId: string;
  capacity: number;
  onCancelParticipation?: (participantId: string) => void;
  isOrganizer?: boolean;
  tryTitle?: string;
}

export default function ParticipantsList({
  participants,
  tryId,
  capacity,
  onCancelParticipation,
  isOrganizer,
  tryTitle
}: ParticipantsListProps) {
  const [participantProfiles, setParticipantProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchParticipantProfiles = async () => {
      try {
        const profiles = await Promise.all(
          participants.map(async (participant) => {
            const userDoc = await getDoc(doc(db, 'users', participant.userId));
            return {
              id: userDoc.id,
              ...userDoc.data()
            } as UserProfile;
          })
        );
        setParticipantProfiles(profiles);
      } catch (error) {
        console.error('Error fetching participant profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantProfiles();
  }, [participants]);

  const handleApproval = async (participant: TryParticipant, approved: boolean) => {
    if (!user || processingId) return;

    try {
      setProcessingId(participant.id);
      const participantRef = doc(db, 'tryParticipants', participant.id);
      
      await updateDoc(participantRef, {
        status: approved ? 'approved' : 'rejected',
        updatedAt: new Date().toISOString()
      });

      // 参加者に通知を送信
      await createNotification({
        userId: participant.userId,
        type: approved ? 'application_approved' : 'application_rejected',
        title: approved ? '参加申請が承認されました' : '参加申請が却下されました',
        message: `「${tryTitle}」への参加申請が${approved ? '承認' : '却下'}されました`,
        tryId: tryId,
        link: `/tries/${tryId}`
      });

      // 画面をリロード
      window.location.reload();
    } catch (error) {
      console.error('Error updating participant status:', error);
      alert('ステータスの更新中にエラーが発生しました。');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div>参加者情報を読み込み中...</div>;
  }

  const pendingParticipants = participants.filter(p => p.status === 'pending');
  const approvedParticipants = participants.filter(p => p.status === 'approved');
  const rejectedParticipants = participants.filter(p => p.status === 'rejected');

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">参加者一覧</h3>
        <span className="text-sm text-gray-600">
          {approvedParticipants.length} / {capacity} 人
        </span>
      </div>

      {/* 承認待ちの参加者 */}
      {isOrganizer && pendingParticipants.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3">承認待ち</h4>
          <div className="space-y-4">
            {pendingParticipants.map((participant, index) => {
              const profile = participantProfiles.find(p => p.id === participant.userId);
              if (!profile) return null;

              return (
                <div key={participant.id} className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-10 h-10">
                      <Image
                        src={profile.photoURL || '/default-avatar.png'}
                        alt={profile.displayName}
                        fill
                        className="rounded-full object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div>
                      <Link
                        href={`/users/${profile.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {profile.displayName}
                      </Link>
                      <p className="text-sm text-gray-500">{participant.introduction}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproval(participant, true)}
                      disabled={!!processingId}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {processingId === participant.id ? '処理中...' : '承認'}
                    </button>
                    <button
                      onClick={() => handleApproval(participant, false)}
                      disabled={!!processingId}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {processingId === participant.id ? '処理中...' : '却下'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 承認済みの参加者 */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-3">参加確定</h4>
        {approvedParticipants.length === 0 ? (
          <p className="text-gray-500 text-center py-4">まだ参加確定者はいません</p>
        ) : (
          <div className="space-y-4">
            {approvedParticipants.map((participant) => {
              const profile = participantProfiles.find(p => p.id === participant.userId);
              if (!profile) return null;

              return (
                <div key={participant.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-10 h-10">
                      <Image
                        src={profile.photoURL || '/default-avatar.png'}
                        alt={profile.displayName}
                        fill
                        className="rounded-full object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div>
                      <Link
                        href={`/users/${profile.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {profile.displayName}
                      </Link>
                    </div>
                  </div>
                  
                  {user && user.uid === participant.userId && onCancelParticipation && (
                    <button
                      onClick={() => onCancelParticipation(participant.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {approvedParticipants.length >= capacity && (
        <div className="mt-4 bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm">
          定員に達しました
        </div>
      )}
    </div>
  );
} 