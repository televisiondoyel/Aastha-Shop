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
  getDocs,
  deleteDoc,
  collection,
  onSnapshot,
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
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

export interface ProductItem {
  id: number;
  name: string;
  category: string;
  price: number;
  old: number;
  discount: number;
  deal: boolean;
  image: string;
  stock?: number;
  description?: string;
  color?: string;
  kind?: string;
  updatedAt?: string;
}

export interface StoreSettingsData {
  storeName?: string;
  freeDelivery?: number;
  deliveryFee?: number;
  dealEnd?: string;
  logo?: string;
  favicon?: string;
  hero?: string;
  promo1?: string;
  promo2?: string;
  adminAvatar?: string;
  adminName?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: number;
  qty: number;
}

export interface OrderData {
  id: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  note?: string;
  items: OrderItem[];
  total: number;
  status: string;
  date: string;
  createdAt?: string;
}

export const DELIVERY_AREAS = [
  'Gachhua',
  'Santoshpur',
  'Dirghapar',
  'Kalapania',
  'Harishpur',
  'Bauria',
  'Muchapur',
  'Rahmatpur',
  'Azimpur',
  'Maitbhanga',
  'Sarikait',
  'Mogdhara',
  'Haramia',
  'Amanullah'
];

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
      area: area || 'Gachhua',
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'users', cred.user.uid), profile);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${cred.user.uid}`);
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
    area: 'Gachhua'
  };
  try {
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (snap.exists()) {
      profile = snap.data() as UserProfileData;
      if (profile.name && cred.user.displayName !== profile.name) {
        try {
          await updateProfile(cred.user, { displayName: profile.name });
        } catch (e) {}
      }
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${cred.user.uid}`);
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
    const cur = JSON.parse(localStorage.getItem('af_customer_profile') || '{}');
    const updated = { ...cur, ...data };
    localStorage.setItem('af_customer_profile', JSON.stringify(updated));
    return updated;
  }
  const cur = JSON.parse(localStorage.getItem('af_customer_profile') || '{}');
  const updated = { ...cur, ...data, uid: user.uid, email: user.email || cur.email };
  if (data.name) {
    try {
      await updateProfile(user, { displayName: data.name });
    } catch (e) {
      console.error('Failed to update displayName on auth user:', e);
    }
  }
  try {
    await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
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
        area: 'Gachhua'
      };
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          p = snap.data() as UserProfileData;
          if (p.name && u.displayName !== p.name) {
            try {
              await updateProfile(u, { displayName: p.name });
            } catch (e) {}
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
      }
      localStorage.setItem('af_customer_profile', JSON.stringify(p));
      callback(u, p);
    } else {
      callback(null, null);
    }
  });
}

// =================== ADMIN & STORE FIRESTORE INTEGRATION ===================

export async function saveProductToFirestore(p: ProductItem) {
  const path = `products/${p.id}`;
  try {
    const payload = {
      ...p,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'products', String(p.id)), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function deleteProductFromFirestore(productId: number | string) {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', String(productId)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

export async function getProductsFromFirestore(): Promise<ProductItem[]> {
  const path = 'products';
  try {
    const snap = await getDocs(collection(db, path));
    const items: ProductItem[] = [];
    snap.forEach(d => {
      items.push(d.data() as ProductItem);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function saveSettingsToFirestore(settings: StoreSettingsData) {
  const path = 'settings/store';
  try {
    const payload = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'settings', 'store'), payload, { merge: true });
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function getSettingsFromFirestore(): Promise<StoreSettingsData | null> {
  const path = 'settings/store';
  try {
    const snap = await getDoc(doc(db, 'settings', 'store'));
    if (snap.exists()) {
      return snap.data() as StoreSettingsData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function saveOrderToFirestore(o: OrderData) {
  const path = `orders/${o.id}`;
  try {
    const payload = {
      ...o,
      createdAt: o.createdAt || new Date().toISOString()
    };
    await setDoc(doc(db, 'orders', String(o.id)), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function updateOrderStatusInFirestore(orderId: string, status: string) {
  const path = `orders/${orderId}`;
  try {
    await setDoc(doc(db, 'orders', String(orderId)), { status, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

export async function getOrdersFromFirestore(): Promise<OrderData[]> {
  const path = 'orders';
  try {
    const snap = await getDocs(collection(db, path));
    const orders: OrderData[] = [];
    snap.forEach(d => {
      orders.push(d.data() as OrderData);
    });
    return orders;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export function subscribeProducts(cb: (products: ProductItem[]) => void) {
  return onSnapshot(collection(db, 'products'), (snap) => {
    const list: ProductItem[] = [];
    snap.forEach(d => list.push(d.data() as ProductItem));
    cb(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'products');
  });
}

export function subscribeSettings(cb: (settings: StoreSettingsData) => void) {
  return onSnapshot(doc(db, 'settings', 'store'), (snap) => {
    if (snap.exists()) {
      cb(snap.data() as StoreSettingsData);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'settings/store');
  });
}

export function subscribeOrders(cb: (orders: OrderData[]) => void) {
  return onSnapshot(collection(db, 'orders'), (snap) => {
    const list: OrderData[] = [];
    snap.forEach(d => list.push(d.data() as OrderData));
    cb(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'orders');
  });
}

export interface AdminAuthData {
  registered: boolean;
  username: string;
  passwordHash: string;
  updatedAt?: string;
}

export async function getAdminAuthFromFirestore(): Promise<AdminAuthData | null> {
  const path = 'settings/admin_auth';
  try {
    const snap = await getDoc(doc(db, 'settings', 'admin_auth'));
    if (snap.exists()) {
      return snap.data() as AdminAuthData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function saveAdminAuthToFirestore(data: { username: string; passwordHash: string }): Promise<AdminAuthData> {
  const path = 'settings/admin_auth';
  try {
    const payload: AdminAuthData = {
      registered: true,
      username: data.username,
      passwordHash: data.passwordHash,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'settings', 'admin_auth'), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export function subscribeAdminAuth(cb: (authData: AdminAuthData | null) => void) {
  return onSnapshot(doc(db, 'settings', 'admin_auth'), (snap) => {
    if (snap.exists()) {
      cb(snap.data() as AdminAuthData);
    } else {
      cb(null);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'settings/admin_auth');
  });
}

export async function hashPassword(str: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Crypto subtle unavailable', e);
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'pw_' + Math.abs(hash).toString(16);
}

export interface CategoryItem {
  id: string;
  name: string;
  image?: string;
  color?: string;
  slug?: string;
  updatedAt?: string;
}

export async function getCategoriesFromFirestore(): Promise<CategoryItem[]> {
  const path = 'settings/categories';
  try {
    const snap = await getDoc(doc(db, 'settings', 'categories'));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.items)) {
        return data.items as CategoryItem[];
      }
    }
    return [];
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function saveCategoriesToFirestore(items: CategoryItem[]): Promise<CategoryItem[]> {
  const path = 'settings/categories';
  try {
    const payload = {
      items,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'settings', 'categories'), payload);
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export function subscribeCategories(cb: (items: CategoryItem[]) => void) {
  return onSnapshot(doc(db, 'settings', 'categories'), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.items)) {
        cb(data.items as CategoryItem[]);
      }
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'settings/categories');
  });
}

