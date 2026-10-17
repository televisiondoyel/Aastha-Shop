import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';

export const firebaseConfig = {
  projectId: "gen-lang-client-0792321102",
  appId: "1:829216040973:web:dc96e1c943b9fad0618d44",
  apiKey: "AIzaSyDigpeGeVVIBs9solvVyfpXgtcTKJPwzUM",
  authDomain: "gen-lang-client-0792321102.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-codeexecutor-ea1e433b-955a-48a8-ac96-355a3bd15466",
  storageBucket: "gen-lang-client-0792321102.firebasestorage.app",
  messagingSenderId: "829216040973",
  measurementId: "",
  oAuthClientId: "829216040973-00tue7rkktcs92ng4hcvisi2eaq7js9t.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test connection as required by Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export interface UserProfileData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  area?: string;
  note?: string;
  createdAt?: string;
}

export async function registerWithFirebase(
  name: string,
  email: string,
  pass: string,
  phone?: string,
  address?: string,
  area?: string
) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (cred.user) {
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    const profile: UserProfileData = {
      uid: cred.user.uid,
      name: name || 'Customer',
      email: cred.user.email || email,
      phone: phone || '',
      address: address || '',
      area: area || 'Inside city',
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'users', cred.user.uid), profile);
    } catch (e) {
      console.warn("Failed to save profile to Firestore, saving locally:", e);
    }
    localStorage.setItem('af_customer_profile', JSON.stringify(profile));
    return profile;
  }
  throw new Error("Failed to create account");
}

export async function loginWithFirebase(email: string, pass: string) {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  let profile: UserProfileData = {
    uid: cred.user.uid,
    name: cred.user.displayName || 'Customer',
    email: cred.user.email || email,
    phone: '',
    address: '',
    area: 'Inside city'
  };
  try {
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (snap.exists()) {
      profile = snap.data() as UserProfileData;
    }
  } catch (e) {
    console.warn("Could not fetch remote user profile, using auth data", e);
  }
  localStorage.setItem('af_customer_profile', JSON.stringify(profile));
  return profile;
}

export async function logoutFromFirebase() {
  await signOut(auth);
  localStorage.removeItem('af_customer_profile');
}

export async function updateUserProfile(data: Partial<UserProfileData>) {
  const user = auth.currentUser;
  if (!user) {
    // Save to local
    const cur = JSON.parse(localStorage.getItem('af_customer_profile') || '{}');
    const updated = { ...cur, ...data };
    localStorage.setItem('af_customer_profile', JSON.stringify(updated));
    return updated;
  }
  const cur = JSON.parse(localStorage.getItem('af_customer_profile') || '{}');
  const updated = { ...cur, ...data, uid: user.uid, email: user.email || cur.email };
  try {
    await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
  } catch (e) {
    console.warn("Could not save to Firestore:", e);
  }
  localStorage.setItem('af_customer_profile', JSON.stringify(updated));
  return updated;
}

export function subscribeAuth(callback: (user: FirebaseUser | null, profile: UserProfileData | null) => void) {
  return onAuthStateChanged(auth, async (u) => {
    if (u) {
      let p: UserProfileData = {
        uid: u.uid,
        name: u.displayName || 'Customer',
        email: u.email || '',
        phone: '',
        address: '',
        area: 'Inside city'
      };
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          p = snap.data() as UserProfileData;
        }
      } catch (err) {
        console.warn("Could not load user doc:", err);
      }
      localStorage.setItem('af_customer_profile', JSON.stringify(p));
      callback(u, p);
    } else {
      callback(null, null);
    }
  });
}
