"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query, orderBy } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, AlertCircle, XCircle } from "lucide-react";
import PhoneInput, { validatePhoneForSubmission } from "@/components/ui/PhoneInput";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export const dynamic = "force-dynamic";

// -------------------- Types --------------------
type Product = {
  id: string;
  name: string;
  price: number;
  image?: string;
  images?: string[];
  createdAt?: string;
};

// -------------------- Common Countries --------------------
const commonCountries = [
  "Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia", "South Africa",
  "Nigeria", "Ghana", "United States", "United Kingdom", "Canada",
  "Australia", "Germany", "France", "India", "China", "Japan"
];

// -------------------- Checkout Page --------------------
function CheckoutContent() {
  const { cart, total, removeFromCart, clearCart, updateQuantity } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");

  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneValid, setPhoneValid] = useState(true);
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    country: "",
    county: "",
    locality: "",
    message: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const ref = localStorage.getItem("nurushop_referrer");
      if (ref) setReferrerId(ref);
    } catch {
      setReferrerId(null);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      email: user.email ?? prev.email,
      name: prev.name || user.displayName || prev.name,
    }));
  }, [user]);

  useEffect(() => {
    if (authReady && !user) {
      setShowForm(false);
    }
  }, [authReady, user]);

  useEffect(() => {
    if (!authReady) return;
    if (!user && step === "details") {
      router.replace(
        `/auth/login?redirectTo=${encodeURIComponent("/checkout?step=details")}`
      );
      return;
    }

    if (user && step === "details") {
      setShowForm(true);
    }
  }, [user, step, router, authReady]);

  // -------------------- Fetch Related Products --------------------
  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const q = query(
          collection(db, "products"),
          orderBy("createdAt", "desc"),
          limit(4)
        );
        const snap = await getDocs(q);
        setRelatedProducts(
          snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Product, "id">) }))
        );
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchRelated();
  }, []);

  // -------------------- Handlers --------------------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "country" && value.trim()) {
      setShowCountrySuggestions(true);
    }
  };

  const handlePhoneChange = (phone: string) => {
    setFormData((prev) => ({ ...prev, phone }));
  };

  const handlePhoneValidationChange = (isValid: boolean) => {
    setPhoneValid(isValid);
  };

  const handleCountrySelect = (country: string) => {
    setFormData((prev) => ({ ...prev, country }));
    setShowCountrySuggestions(false);
  };

  const filteredCountries = commonCountries.filter((country) =>
    country.toLowerCase().includes(formData.country.toLowerCase())
  );

  const redirectToAuth = () => {
    router.push(
      `/auth/login?redirectTo=${encodeURIComponent("/checkout?step=details")}`
    );
  };

  // -------------------- Submit Order --------------------
  const handleSubmitOrder = async () => {
    setErrorMessage("");

    if (!user) {
      redirectToAuth();
      return;
    }

    if (cart.length === 0 || total <= 0) {
      setErrorMessage("Your cart is empty. Add items before ordering.");
      return;
    }

    const { name, phone, country, county, locality } = formData;
    const errors: string[] = [];

    if (!name.trim()) errors.push("Name is required");

    const phoneValidation = validatePhoneForSubmission(phone, true);
    if (!phoneValidation.isValid) errors.push(phoneValidation.message);

    if (!country.trim()) errors.push("Country is required");
    if (!county.trim()) errors.push("County/State/Province is required");
    if (!locality.trim()) errors.push("Locality/Address is required");

    if (errors.length > 0) {
      setErrorMessage(errors.join(", "));
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedPhone = phoneValidation.normalized || phone;

      const orderData = {
        userId: user?.uid || null,
        userEmail: user?.email || null,
        ...formData,
        phone: normalizedPhone,
        items: cart,
        totalAmount: total,
        createdAt: new Date().toISOString(),
        referrerId:
          referrerId && referrerId !== user?.uid ? referrerId : null,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        setErrorMessage("Order submission failed. Try again.");
        return;
      }

      const productList = cart
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.name} (x${item.quantity}) — KSh ${(item.price * item.quantity).toFixed(2)} [ID: ${item.id}]`
        )
        .join("%0A");

      const whatsappMessage = `🛍️ *Receive My Order*%0A--------------------------------%0A*Name:* ${name}%0A*Phone:* ${normalizedPhone}%0A*Country:* ${country}%0A*County/State:* ${county}%0A*Locality:* ${locality}%0A--------------------------------%0A${productList}%0A--------------------------------%0A*Total:* KSh ${total.toFixed(2)}%0AThank you!`;

      const phoneNumber = "254105178685";
      const whatsappURL = `https://wa.me/${phoneNumber}?text=${whatsappMessage}`;
      window.open(whatsappURL, "_blank");

      setSuccess(true);
      clearCart();
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const increaseQuantity = (id: string, current: number) => {
    updateQuantity(id, current + 1);
  };

  const decreaseQuantity = (id: string, current: number) => {
    const newQty = current - 1;
    if (newQty <= 0) removeFromCart(id);
    else updateQuantity(id, newQty);
  };

  // -------------------- Success Screen --------------------
  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <h2 className="text-2xl font-semibold text-green-700">
          ✅ Order placed successfully!
        </h2>
        <p className="text-gray-600 mt-3">
          You&apos;ll receive a confirmation via WhatsApp or Email soon.
        </p>
        {user && (
          <p className="text-gray-600 mt-3">
            Your order is successful. Invite more people to keep earning wallet rewards.
          </p>
        )}
        <Link
          href="/profile"
          className="mt-4 inline-flex items-center justify-center text-sky-600 font-medium hover:underline"
        >
          Go to your profile to invite more people →
        </Link>
        <button
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          onClick={() => router.push("/shop")}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  // -------------------- Render --------------------
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-700 mb-8">Checkout</h1>

        {cart.length === 0 ? (
          <p className="text-gray-600">Your cart is empty.</p>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row justify-between items-center border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20">
                      <Image
                        src={item.image || "/assets/logo.jpg"}
                        alt={item.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {item.name}
                      </p>
                      <p className="text-gray-500 text-sm">
                        KSh {item.price.toFixed(2)}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          Product ID: <code className="font-mono">{item.id}</code>
                        </span>
                        <Link
                          href={`/products/${item.id}`}
                          className="rounded-full border border-blue-200 px-2 py-0.5 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
                        >
                          View details
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => decreaseQuantity(item.id, item.quantity)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-blue-100 text-blue-700 hover:text-blue-300 text-sm"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center">{item.quantity}</span>
                        <button
                          onClick={() => increaseQuantity(item.id, item.quantity)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-blue-100 text-blue-700 hover:text-blue-300 text-sm"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 sm:mt-0">
                    <p className="font-semibold text-blue-700">
                      KSh {(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total & Place Order */}
            <div className="mt-8 border-t pt-6 flex flex-col sm:flex-row items-center justify-between">
              <p className="text-xl font-semibold">
                Total: <span className="text-blue-700">KSh {total.toFixed(2)}</span>
              </p>
              <button
                onClick={() => {
                  if (total <= 0) return;
                  if (!user) {
                    redirectToAuth();
                    return;
                  }
                  setShowForm(true);
                }}
                className="mt-5 sm:mt-0 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Place Order
              </button>
            </div>
          </>
        )}
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16">
          <h2 className="text-2xl font-semibold mb-6">You may also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {relatedProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="border rounded-lg shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800"
              >
                <div className="relative w-full h-40">
                  <Image
                    src={product.images?.[0] || "/assets/logo.jpg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm">{product.name}</h3>
                  <p className="text-blue-700 font-semibold text-sm mt-1">
                    KSh {product.price.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="text-center mt-4 text-red-600 font-medium">{errorMessage}</div>
      )}

      {/* Order Form Modal */}
      {showForm && user && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-700">
              Complete Your Order
            </h2>

            <div className="space-y-3">
              <input
                name="name"
                placeholder="Full Name *"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />

              <PhoneInput
                value={formData.phone}
                onChange={handlePhoneChange}
                onValidationChange={handlePhoneValidationChange}
                required
                placeholder="Phone Number * (e.g., +1 234 567 8900)"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />

              <input
                name="email"
                type="email"
                placeholder="Email (optional)"
                value={formData.email}
                onChange={handleChange}
                readOnly={Boolean(user?.email)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {user?.email && (
                <p className="text-xs text-gray-500">Signed in as {user.email}</p>
              )}

              {/* Country with suggestions */}
              <div className="relative">
                <input
                  name="country"
                  placeholder="Country *"
                  value={formData.country}
                  onChange={handleChange}
                  onFocus={() => formData.country.trim() && setShowCountrySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                {showCountrySuggestions && filteredCountries.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCountries.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        onMouseDown={(e) => e.preventDefault()}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                name="county"
                placeholder="County/State/Province *"
                value={formData.county}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />

              <input
                name="locality"
                placeholder="Exact Locality/Address * (e.g., Street, City, ZIP Code)"
                value={formData.locality}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />

              <textarea
                name="message"
                placeholder="Special instructions or message (optional)"
                value={formData.message}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-32 resize-none"
              />
            </div>

            {/* Enhanced Error Display */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
                <p className="text-red-700 dark:text-red-400 text-sm">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage("")}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <XCircle size={18} />
                </button>
              </div>
            )}

            {/* Form Buttons */}
            <div className="mt-6 flex justify-between gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || !phoneValid}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </span>
                ) : (
                  "Finish Submission"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-gray-500">Loading checkout...</div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
