import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ----------------------------
// 🔹 Interfaces
// ----------------------------
export interface Product {
  id: string;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  sellingPrice?: number;
  description: string;
  shortDescription?: string;
  category: string;
  images: string[];
  imagePublicIds?: string[];
  imageUrl: string;
  createdAt?: Timestamp;
  mode?: "wholesale" | "retail";
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  wholesaleUnit?: string;
  coverImage?: string | null;
  createdBy?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Order {
  id?: string;
  userId: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  totalAmount: number;
  status?: "pending" | "shipped" | "received" | "cancelled";
  createdAt?: Timestamp;
}

export interface ContactMessage {
  id?: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt?: Timestamp;
}

export interface UserProfile {
  fullName?: string;
  phone?: string;
  address?: string;
  inviteCount?: number;
  walletBalance?: number;
  referredBy?: string | null;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
  updatedAt?: Timestamp;
}

// ----------------------------
// Category Helpers
// ----------------------------

export const getAllCategories = async (): Promise<Category[]> => {
  const q = query(collection(db, "categories"), orderBy("name_lowercase", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name ?? "",
      slug: data.slug ?? "",
      icon: data.icon ?? undefined,
      description: data.description ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Category;
  });
};

// ----------------------------
// Product Helpers
// ----------------------------

export const addProduct = async (
  data: Omit<Product, "id" | "imageUrl"> & { images: string[] }
): Promise<string> => {
  const limitedImages = data.images.slice(0, 3);
  const payload = {
    ...data,
    images: limitedImages,
    imageUrl: limitedImages[0] || "",
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "products"), payload);
  return ref.id;
};

// ✅ Get all products
export const getAllProducts = async (): Promise<Product[]> => {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const images = (data.images || []).slice(0, 3);
    const sellingPrice = Number(data.sellingPrice ?? data.price ?? 0);
    const originalPriceValue = data.originalPrice;
    const originalPrice =
      typeof originalPriceValue === "number" && Number.isFinite(originalPriceValue)
        ? originalPriceValue
        : undefined;
    return {
      id: docSnap.id,
      name: data.name,
      price: sellingPrice,
      sellingPrice,
      originalPrice,
      category: data.category,
      shortDescription: data.shortDescription,
      description: data.description,
      images,
      imageUrl: data.imageUrl || images[0] || "",
      mode: data.mode ?? "retail",
      wholesalePrice: data.wholesalePrice ?? undefined,
      wholesaleMinQty: data.wholesaleMinQty ?? undefined,
      wholesaleUnit: data.wholesaleUnit ?? undefined,
      coverImage: data.coverImage ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: data.createdAt,
    } as Product;
  });
};

// ✅ Get products by category
export const getProductsByCategory = async (
  category: string
): Promise<Product[]> => {
  const q = query(
    collection(db, "products"),
    where("category", "==", category.toLowerCase()),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const images = (data.images || []).slice(0, 3);
    const sellingPrice = Number(data.sellingPrice ?? data.price ?? 0);
    const originalPriceValue = data.originalPrice;
    const originalPrice =
      typeof originalPriceValue === "number" && Number.isFinite(originalPriceValue)
        ? originalPriceValue
        : undefined;
    return {
      id: docSnap.id,
      name: data.name,
      price: sellingPrice,
      sellingPrice,
      originalPrice,
      category: data.category,
      shortDescription: data.shortDescription,
      description: data.description,
      images,
      imageUrl: data.imageUrl || images[0] || "",
      mode: data.mode ?? "retail",
      wholesalePrice: data.wholesalePrice ?? undefined,
      wholesaleMinQty: data.wholesaleMinQty ?? undefined,
      wholesaleUnit: data.wholesaleUnit ?? undefined,
      coverImage: data.coverImage ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: data.createdAt,
    } as Product;
  });
};

// ✅ Get single product
export const getProductById = async (id: string): Promise<Product | null> => {
  const ref = doc(db, "products", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data();
  const images = (data.images || []).slice(0, 3);
  const sellingPrice = Number(data.sellingPrice ?? data.price ?? 0);
  const originalPriceValue = data.originalPrice;
  const originalPrice =
    typeof originalPriceValue === "number" && Number.isFinite(originalPriceValue)
      ? originalPriceValue
      : undefined;
  return {
    id: snap.id,
    name: data.name,
    price: sellingPrice,
    sellingPrice,
    originalPrice,
    category: data.category,
    shortDescription: data.shortDescription,
    description: data.description,
    images,
    imageUrl: data.imageUrl || images[0] || "",
    mode: data.mode ?? "retail",
    wholesalePrice: data.wholesalePrice ?? undefined,
    wholesaleMinQty: data.wholesaleMinQty ?? undefined,
    wholesaleUnit: data.wholesaleUnit ?? undefined,
    coverImage: data.coverImage ?? null,
    createdBy: data.createdBy ?? null,
    createdAt: data.createdAt,
  } as Product;
};

// ✅ Update product
export const updateProduct = async (id: string, data: Partial<Product>) => {
  const ref = doc(db, "products", id);
  const updatedData = {
    ...data,
    ...(data.images ? { images: data.images.slice(0, 3) } : {}),
  };
  await updateDoc(ref, updatedData);
};

// ✅ Delete product
export const deleteProduct = async (id: string) => {
  const ref = doc(db, "products", id);
  await deleteDoc(ref);
};

// ----------------------------
// 🔹 Orders Helpers
// ----------------------------

export const addOrder = async (data: Order): Promise<string> => {
  const ref = await addDoc(collection(db, "orders"), {
    ...data,
    totalAmount: Number(data.totalAmount || 0), // ✅ ensure number
    status: data.status || "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getOrdersByUser = async (userId: string): Promise<Order[]> => {
  const q = query(
    collection(db, "orders"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      totalAmount: Number(data.totalAmount ?? data.total ?? 0), // ✅ safe numeric conversion
    } as Order;
  });
};

export const getAllOrders = async (): Promise<Order[]> => {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      totalAmount: Number(data.totalAmount ?? data.total ?? 0), // ✅ consistent field
    } as Order;
  });
};

// ----------------------------
// 🔹 User Profile Helpers (Firestore)
// ----------------------------

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
};

export const updateUserProfile = async (
  uid: string,
  data: Partial<Pick<UserProfile, "fullName" | "phone" | "address">>
): Promise<void> => {
  const ref = doc(db, "users", uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
};

export const incrementInviteCount = async (uid: string): Promise<void> => {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    { inviteCount: increment(1), updatedAt: serverTimestamp() },
    { merge: true }
  );
};

// ----------------------------
// 🔹 Contact Message Helpers
// ----------------------------
export const addContactMessage = async (
  data: ContactMessage
): Promise<string> => {
  const ref = await addDoc(collection(db, "contacts"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getAllMessages = async (): Promise<ContactMessage[]> => {
  const q = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as ContactMessage),
  }));
};

