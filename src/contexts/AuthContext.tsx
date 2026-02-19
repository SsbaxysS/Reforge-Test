import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  type User
} from 'firebase/auth';
import { ref, set, get, onValue } from 'firebase/database';
import { auth, db, googleProvider } from '@/firebase';
import { generateFingerprint, storeFingerprint, storeUserId, getStoredUserIds } from '@/utils/fingerprint';

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  admin: boolean;
  createdAt: number;
  fingerprint: string;
  linkedFingerprints: string[];
  suspiciousFlag: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function checkAntiCheat(uid: string, fingerprint: string) {
    // Store locally
    storeFingerprint(fingerprint);
    storeUserId(uid);

    // Check if other users used this device
    const localUserIds = getStoredUserIds();
    const otherUsers = localUserIds.filter(id => id !== uid);

    // Record fingerprint in database
    const fpRef = ref(db, `fingerprints/${fingerprint}`);
    const fpSnap = await get(fpRef);

    let associatedUsers: string[] = [];
    if (fpSnap.exists()) {
      associatedUsers = fpSnap.val().users || [];
    }
    if (!associatedUsers.includes(uid)) {
      associatedUsers.push(uid);
    }
    await set(fpRef, {
      users: associatedUsers,
      lastSeen: Date.now()
    });

    // If multiple accounts from same device — flag all
    const isSuspicious = associatedUsers.length > 1 || otherUsers.length > 0;

    if (isSuspicious) {
      // Flag current user
      await set(ref(db, `users/${uid}/suspiciousFlag`), true);
      // Flag all associated users
      for (const associatedUid of associatedUsers) {
        if (associatedUid !== uid) {
          await set(ref(db, `users/${associatedUid}/suspiciousFlag`), true);
        }
      }
    }

    // Update fingerprint list for user
    const userFpRef = ref(db, `users/${uid}/linkedFingerprints`);
    const userFpSnap = await get(userFpRef);
    let userFps: string[] = [];
    if (userFpSnap.exists()) {
      userFps = userFpSnap.val() || [];
    }
    if (!userFps.includes(fingerprint)) {
      userFps.push(fingerprint);
      await set(userFpRef, userFps);
    }
    await set(ref(db, `users/${uid}/fingerprint`), fingerprint);
  }

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const fp = await generateFingerprint();
    await checkAntiCheat(cred.user.uid, fp);
  }

  async function register(email: string, password: string, firstName: string, lastName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const fp = await generateFingerprint();

    await set(ref(db, `users/${cred.user.uid}`), {
      uid: cred.user.uid,
      firstName,
      lastName,
      email,
      admin: false,
      createdAt: Date.now(),
      fingerprint: fp,
      linkedFingerprints: [fp],
      suspiciousFlag: false
    });

    await checkAntiCheat(cred.user.uid, fp);
  }

  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const fp = await generateFingerprint();

    // Check if user exists
    const userRef = ref(db, `users/${cred.user.uid}`);
    const snap = await get(userRef);

    if (!snap.exists()) {
      const displayName = cred.user.displayName || '';
      const parts = displayName.split(' ');
      const firstName = parts[0] || 'User';
      const lastName = parts.slice(1).join(' ') || '';

      await set(userRef, {
        uid: cred.user.uid,
        firstName,
        lastName,
        email: cred.user.email || '',
        admin: false,
        createdAt: Date.now(),
        fingerprint: fp,
        linkedFingerprints: [fp],
        suspiciousFlag: false
      });
    }

    await checkAntiCheat(cred.user.uid, fp);
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        onValue(userRef, (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.val() as UserProfile);
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
