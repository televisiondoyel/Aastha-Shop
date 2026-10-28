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
  initializeFirestore,
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

// Use initializeFirestore with experimentalForceLongPolling to avoid WebSocket connection drops in iFrame/proxy environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);

// Test connection as required by Firebase skill, catching offline/unavailable states gracefully
export async function testConnection() {
  try {
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection check timeout')), 3000))
    ]);
  } catch (error: any) {
    if (error?.code === 'unavailable' || (error instanceof Error && (error.message.includes('offline') || error.message.includes('unavailable') || error.message.includes('timeout')))) {
      // Offline mode active; Firestore seamlessly operates in offline mode
      return;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or internet connection.");
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
  const err = error as any;
  if (err?.code === 'unavailable' || (err instanceof Error && (err.message.includes('unavailable') || err.message.includes('the client is offline') || err.message.includes('Could not reach Cloud Firestore')))) {
    console.warn(`Firestore is currently offline or unreachable for ${operationType} on ${path}. Operating in cached offline mode.`);
    return null;
  }
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
  aboutTitle?: string;
  aboutText?: string;
  aboutImage?: string;
  aboutStory?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  contactAddress?: string;
  contactHours?: string;
  updatedAt?: string;
}

export interface CustomerMessage {
  id: string;
  name: string;
  contact: string;
  subject?: string;
  message: string;
  status?: string;
  createdAt?: string;
}

export interface OrderItem {
  id: number | string;
  qty: number;
  name?: string;
  price?: number;
  unit?: string;
  image?: string;
}

export interface OrderData {
  id: string;
  name: string;
  customer?: string;
  phone: string;
  address: string;
  area: string;
  note?: string;
  items: OrderItem[];
  itemsDetail?: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  total: number;
  status: string;
  payment?: string;
  paymentMethod?: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
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
    const rawPayload = {
      ...o,
      createdAt: o.createdAt || new Date().toISOString()
    };
    // Strip undefined properties so Firestore never throws 'Unsupported field value: undefined'
    const payload = JSON.parse(JSON.stringify(rawPayload));
    await setDoc(doc(db, 'orders', String(o.id)), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function updateOrderStatusInFirestore(orderId: string, status: string, payment?: string) {
  const path = `orders/${orderId}`;
  try {
    const payload: Record<string, any> = { status, updatedAt: new Date().toISOString() };
    if (payment !== undefined) {
      payload.payment = payment;
    }
    await setDoc(doc(db, 'orders', String(orderId)), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

export async function updateOrderPaymentInFirestore(orderId: string, payment: string, status?: string) {
  const path = `orders/${orderId}`;
  try {
    const payload: Record<string, any> = { payment, updatedAt: new Date().toISOString() };
    if (status !== undefined) {
      payload.status = status;
    }
    await setDoc(doc(db, 'orders', String(orderId)), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

export async function deleteOrderFromFirestore(orderId: string) {
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, 'orders', String(orderId)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
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
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date || 0).getTime();
      const timeB = new Date(b.createdAt || b.date || 0).getTime();
      return (timeB || 0) - (timeA || 0);
    });
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

// =================== CUSTOMER MESSAGES / INQUIRIES ===================

export async function saveMessageToFirestore(m: CustomerMessage) {
  const path = `messages/${m.id}`;
  try {
    const rawPayload = {
      ...m,
      createdAt: m.createdAt || new Date().toISOString()
    };
    const payload = JSON.parse(JSON.stringify(rawPayload));
    await setDoc(doc(db, 'messages', String(m.id)), payload);
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function getMessagesFromFirestore(): Promise<CustomerMessage[]> {
  const path = 'messages';
  try {
    const snap = await getDocs(collection(db, path));
    const items: CustomerMessage[] = [];
    snap.forEach(d => {
      items.push(d.data() as CustomerMessage);
    });
    return items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function updateMessageStatusInFirestore(messageId: string, status: string) {
  const path = `messages/${messageId}`;
  try {
    await setDoc(doc(db, 'messages', String(messageId)), { status, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

export async function deleteMessageFromFirestore(messageId: string) {
  const path = `messages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'messages', String(messageId)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

export function subscribeMessages(callback: (messages: CustomerMessage[]) => void) {
  const path = 'messages';
  return onSnapshot(collection(db, path), (snap) => {
    const items: CustomerMessage[] = [];
    snap.forEach(d => {
      items.push(d.data() as CustomerMessage);
    });
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    callback(items);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

// =================== CUSTOMER STATUS (SUSPENSION & BLOCKING) ===================

export function normalizePhoneKey(phone: string): string {
  if (!phone) return '';
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('880')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('1')) digits = '0' + digits;
  return digits || String(phone).trim();
}

export async function getCustomerStatusesFromFirestore(): Promise<Record<string, string>> {
  const path = 'settings/customer_statuses';
  try {
    const snap = await getDoc(doc(db, 'settings', 'customer_statuses'));
    if (snap.exists()) {
      const data = snap.data();
      const res: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'string') {
          res[k] = v;
        } else if (v && typeof v === 'object' && 'status' in v) {
          res[k] = (v as { status: string }).status;
        }
      }
      return res;
    }
    return {};
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return {};
  }
}

export async function updateCustomerStatusInFirestore(phoneOrKey: string, status: 'Active' | 'Suspended' | 'Blocked', reason: string = '') {
  const path = 'settings/customer_statuses';
  try {
    const norm = normalizePhoneKey(phoneOrKey);
    const key = norm || phoneOrKey.replace(/[^a-zA-Z0-9_+@-]/g, '');
    const payload = {
      [key]: {
        status,
        reason,
        updatedAt: new Date().toISOString()
      }
    };
    await setDoc(doc(db, 'settings', 'customer_statuses'), payload, { merge: true });
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export function subscribeCustomerStatuses(cb: (statuses: Record<string, string>) => void) {
  const path = 'settings/customer_statuses';
  return onSnapshot(doc(db, 'settings', 'customer_statuses'), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const res: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'string') {
          res[k] = v;
        } else if (v && typeof v === 'object' && 'status' in v) {
          res[k] = (v as { status: string }).status;
        }
      }
      cb(res);
    } else {
      cb({});
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
  });
}


