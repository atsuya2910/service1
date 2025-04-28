'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from '@/app/components/NotificationBell';
import Image from 'next/image';
import { UserIcon } from '@heroicons/react/24/outline';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DefaultAvatar from '@/app/components/DefaultAvatar';

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('=== Header Debug ===');
    console.log('Header component mounted');
    console.log('User:', user);
    console.log('Loading:', loading);
    console.log('==================');
  }, [user, loading]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                TRYFIELD
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                ホーム
              </Link>
              <Link
                href="/tries"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                みんなのTRY
              </Link>
              <Link
                href="/tries/new"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                新規TRY作成
              </Link>
              {user && (
                <Link
                  href="/dm"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  メッセージ
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center justify-end space-x-4 min-w-[200px]">
            {!loading && user && (
              <>
                <div className="flex items-center justify-center relative" style={{ border: '1px solid green' }}>
                  <NotificationBell />
                </div>
                
                <Link
                  href="/my-page"
                  className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
                >
                  <div className="w-8 h-8 relative">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        fill
                        sizes="32px"
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <DefaultAvatar
                        displayName={user.displayName}
                        size={32}
                      />
                    )}
                  </div>
                  <span>マイページ</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ログアウト
                </button>
              </>
            )}
            {!loading && !user && (
              <Link
                href="/login"
                className="text-gray-500 hover:text-gray-700"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 