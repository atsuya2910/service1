'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export default function Auth() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user && pathname === '/login') {
      router.push('/my-page');
    }
  }, [user, router, pathname]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        router.push('/my-page');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      alert('ログインに失敗しました。もう一度お試しください。');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('ログアウトに失敗しました。もう一度お試しください。');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {user ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <p className="text-lg font-medium">{user.displayName}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md transition-colors"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.607,1.972-2.101,3.467-4.073,4.073v-2.364 c0-1.054-0.855-1.909-1.909-1.909h-3.536c0.607-1.972,2.101-3.467,4.073-4.073v2.364L12.545,12.151z M12,2C6.477,2,2,6.477,2,12 s4.477,10,10,10s10-4.477,10-10S17.523,2,12,2z M12,20c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8S16.418,20,12,20z"
            />
          </svg>
          <span>Googleでログイン</span>
        </button>
      )}
    </div>
  );
} 