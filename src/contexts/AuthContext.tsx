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
import { generateFingerprint, storeFingerprint, storeUserId, getStoredUserIds, getDeviceSignals, getCreationTimestamps, storeCreationTimestamp } from '@/utils/fingerprint';

export interface DeviceInfo {
  ip?: string;
  os?: string;
  browser?: string;
  language?: string;
  screenResolution?: string;
  timezone?: string;
}

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
  suspiciousScore?: number;
  suspiciousReasons?: string[];
  deviceInfo?: DeviceInfo;
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

  const SUSPICIOUS_THRESHOLD = 50;

  async function checkAntiCheat(uid: string, fingerprint: string, isNewAccount = false) {
    // Store locally
    storeFingerprint(fingerprint);
    storeUserId(uid);
    if (isNewAccount) storeCreationTimestamp();

    // ========= COLLECT SIGNALS =========
    let score = 0;
    const reasons: string[] = [];

    // --- Signal 1: Shared fingerprint ---
    const fpRef = ref(db, `fingerprints/${fingerprint}`);
    const fpSnap = await get(fpRef);
    let associatedUsers: string[] = [];
    if (fpSnap.exists()) {
      associatedUsers = fpSnap.val().users || [];
    }
    if (!associatedUsers.includes(uid)) {
      associatedUsers.push(uid);
    }
    await set(fpRef, { users: associatedUsers, lastSeen: Date.now() });

    const otherFpUsers = associatedUsers.filter(id => id !== uid);
    if (otherFpUsers.length >= 2) {
      score += 50;
      reasons.push(`fingerprint_3plus (${otherFpUsers.length + 1} акк.)`);
    } else if (otherFpUsers.length === 1) {
      score += 30;
      reasons.push('fingerprint_shared (2 акк.)');
    }

    // --- Signal 2: localStorage has other UIDs ---
    const localUserIds = getStoredUserIds();
    const otherLocalUsers = localUserIds.filter(id => id !== uid);
    if (otherLocalUsers.length > 0) {
      score += 25;
      reasons.push(`localStorage_uids (${otherLocalUsers.length} чужих)`);
    }

    // --- Signal 3: Rapid account creation (within 24h) ---
    if (isNewAccount) {
      const timestamps = getCreationTimestamps();
      const now = Date.now();
      const recentCreations = timestamps.filter(ts => now - ts < 24 * 60 * 60 * 1000);
      if (recentCreations.length > 1) {
        score += 20;
        reasons.push(`rapid_creation (${recentCreations.length} за 24ч)`);
      }
    }

    // --- Signal 4: Identical screen + timezone (weak signal) ---
    const signals = getDeviceSignals();
    const signalKey = `${signals.screenRes}_${signals.timezone}_${signals.hardwareConcurrency}`;
    const signalRef = ref(db, `deviceSignals/${btoa(signalKey).replace(/[.#$/[\]]/g, '_')}`);
    const signalSnap = await get(signalRef);
    let signalUsers: string[] = [];
    if (signalSnap.exists()) {
      signalUsers = signalSnap.val().users || [];
    }
    if (!signalUsers.includes(uid)) {
      signalUsers.push(uid);
    }
    await set(signalRef, { users: signalUsers, signals: signalKey, lastSeen: Date.now() });

    if (signalUsers.filter(id => id !== uid).length > 0) {
      score += 5;
      reasons.push('device_signals_match');
    }

    // ========= GATHER EXTENDED DEVICE INFO =========
    let ip = '';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      ip = ipData.ip;
    } catch (e) { console.error('Failed to fetch IP', e); }

    const os = navigator.platform || 'Неизвестно';
    const browser = navigator.userAgent || 'Неизвестно';
    const language = navigator.language || 'Неизвестно';
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Неизвестно';

    const deviceInfo: DeviceInfo = {
      ip, os, browser, language, screenResolution, timezone
    };

    // ========= SAVE =========
    const isSuspicious = score >= SUSPICIOUS_THRESHOLD;
    await set(ref(db, `users/${uid}/suspiciousFlag`), isSuspicious);
    await set(ref(db, `users/${uid}/suspiciousScore`), score);
    await set(ref(db, `users/${uid}/suspiciousReasons`), reasons);
    await set(ref(db, `users/${uid}/deviceInfo`), deviceInfo);

    // If flagged, also flag associated accounts with recalculated scores
    if (isSuspicious) {
      for (const associatedUid of otherFpUsers) {
        const assocRef = ref(db, `users/${associatedUid}`);
        const assocSnap = await get(assocRef);
        if (assocSnap.exists()) {
          const assocData = assocSnap.val();
          // Only escalate, don't de-escalate
          const existingScore = assocData.suspiciousScore || 0;
          if (score > existingScore) {
            await set(ref(db, `users/${associatedUid}/suspiciousFlag`), true);
            await set(ref(db, `users/${associatedUid}/suspiciousScore`), score);
            await set(ref(db, `users/${associatedUid}/suspiciousReasons`), reasons);
          }
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
      suspiciousFlag: false,
      suspiciousScore: 0,
      suspiciousReasons: []
    });

    await checkAntiCheat(cred.user.uid, fp, true);
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
        suspiciousFlag: false,
        suspiciousScore: 0,
        suspiciousReasons: []
      });
      await checkAntiCheat(cred.user.uid, fp, true);
    } else {
      await checkAntiCheat(cred.user.uid, fp);
    }
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
