import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserDoc } from '../types';

interface AuthContextType {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userDoc: null,
  loading: true,
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserDoc(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      try {
        const docSnap = await getDoc(userRef);
        const isAdminEmail = currentUser.email === 'prps2013araujo@gmail.com';
        
        if (!docSnap.exists()) {
          // Create the user document
          // Special rule for pedagogical/admin purpose email
          const newUserDoc: UserDoc = {
            email: currentUser.email || '',
            role: isAdminEmail ? 'admin' : 'user',
            status: isAdminEmail ? 'ativo' : 'pendente',
          };
          try {
            await setDoc(userRef, newUserDoc);
            setUserDoc(newUserDoc);
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'users/' + currentUser.uid);
          }
        } else {
          const data = docSnap.data() as UserDoc;
          if (isAdminEmail && (data.role !== 'admin' || data.status !== 'ativo')) {
            const updatedDoc: UserDoc = { ...data, role: 'admin', status: 'ativo' };
            try {
              await setDoc(userRef, updatedDoc, { merge: true });
              setUserDoc(updatedDoc);
            } catch (e) {
              handleFirestoreError(e, OperationType.UPDATE, 'users/' + currentUser.uid);
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users/' + currentUser.uid);
      }

      const unsubscribeDoc = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setUserDoc(docSnap.data() as UserDoc);
          }
          setLoading(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'users/' + currentUser.uid);
          setLoading(false);
        }
      );

      return () => unsubscribeDoc();
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
