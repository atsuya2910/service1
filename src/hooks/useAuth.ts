import { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '@/app/types/user';

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setState({
          user: null,
          loading: false,
        });
        return;
      }

      try {
        // Firestoreからユーザー情報を取得
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setState({
            user: {
              ...userData,
              id: userDoc.id,
              uid: firebaseUser.uid,
            },
            loading: false,
          });
        } else {
          console.error('User document not found in Firestore');
          setState({
            user: null,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setState({
          user: null,
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
} 