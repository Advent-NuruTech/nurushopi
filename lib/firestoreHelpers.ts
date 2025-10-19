import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
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
  description: string;
  shortDescription?: string;
  category: string;
  images: string[];
  imageUrl: string;
  createdAt?: Timestamp;
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
  status?: "pending" | "received" | "cancelled";
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

// ----------------------------
// 🔹 Product Helpers
// ----------------------------

// ✅ Add new product
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
    return {
      id: docSnap.id,
      name: data.name,
      price: Number(data.price || 0),
      category: data.category,
      shortDescription: data.shortDescription,
      description: data.description,
      images,
      imageUrl: data.imageUrl || images[0] || "",
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
    return {
      id: docSnap.id,
      name: data.name,
      price: Number(data.price || 0),
      category: data.category,
      shortDescription: data.shortDescription,
      description: data.description,
      images,
      imageUrl: data.imageUrl || images[0] || "",
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
  return {
    id: snap.id,
    name: data.name,
    price: Number(data.price || 0),
    category: data.category,
    shortDescription: data.shortDescription,
    description: data.description,
    images,
    imageUrl: data.imageUrl || images[0] || "",
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
