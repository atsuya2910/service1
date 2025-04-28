'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TryChat from '@/app/components/TryChat';
import { Try } from '@/app/types/try';

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const tryId = params?.id;
  const [tryData, setTryData] = useState<Try | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTryData = async () => {
      if (!tryId) return;

      try {
        const tryDoc = await getDoc(doc(db, 'tries', tryId));
        if (tryDoc.exists()) {
          setTryData({ id: tryDoc.id, ...tryDoc.data() } as Try);
        }
      } catch (error) {
        console.error('Error fetching try data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTryData();
  }, [tryId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!tryData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">TRYが見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{tryData.title} - チャット</h1>
      <TryChat tryId={tryData.id || ''} organizerId={tryData.userId || ''} />
    </div>
  );
} 