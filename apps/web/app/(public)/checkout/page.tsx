"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import PhoneInput, { validatePhoneForSubmission } from "@/components/ui/PhoneInput";
import { useSabbathStatus } from "@/lib/useSabbathStatus";
import { useAppUser } from "@/context/UserContext";
import { catalogApi, orderApi, ApiClientError } from "@/lib/api";
import type { ProductDTO } from "@nuru/types";

export const dynamic = "force-dynamic";

// -------------------- Types --------------------
type RelatedProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
};

// -------------------- Common Countries --------------------
const commonCountries = [
  "Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia", "South Africa",
  "Nigeria", "Ghana", "United States", "United Kingdom", "Canada",
  "Australia", "Germany", "France", "India", "China", "Japan"
];

function toRelated(p: ProductDTO): RelatedProduct {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.sellingPrice ?? p.price) || 0,
    image: p.images[0] || "/assets/logo.jpg",
  };
}

// -------------------- Checkout Page --------------------
function CheckoutContent() {
  const { cart, total, removeFromCart, clearCart, updateQuantity } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");

  const { user, isLoading: authLoading } = useAppUser();

  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneValid, setPhoneValid] = useState(true);
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [useWallet, setUseWallet] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    country: "",
    county: "",
    locality: "",
    message: "",
  });

  const { isClosed: sabbathClosed, end: sabbathEndsAt } = useSabbathStatus();

  const walletBalance = user ? Number(user.walletBalance) || 0 : 0;

  // Prefill contact details from the signed-in user.
  useEffect(() => {
    if (!user) return;
    const addressParts = (user.address ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      email: user.email ?? prev.email,
      name: prev.name || user.name || prev.name,
      phone: prev.phone || user.phone || prev.phone,
      locality: prev.locality || addressParts.slice(0, -2).join(", ") || addressParts[0] || "",
      county: prev.county || addressParts.at(-2) || "",
      country: prev.country || addressParts.at(-1) || "",
    }));
  }, [user]);

  // Auth gating: a logged-out user landing on ?step=details is sent to login.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setShowForm(false);
      if (step === "details") {
        router.replace(
          `/auth/login?redirectTo=${encodeURIComponent("/checkout?step=details")}`
        );
      }
      return;
    }
    if (step === "details") setShowForm(true);
  }, [user, step, router, authLoading]);

  useEffect(() => {
    if (sabbathClosed) setShowForm(false);
  }, [sabbathClosed]);

  // -------------------- Fetch Related Products --------------------
  useEffect(() => {
    let cancelled = false;
    catalogApi
      .recommendProducts({ limit: 4 })
      .then((res) => {
        if (!cancelled) setRelatedProducts(res.products.map(toRelated));
      })
      .catch(() =>
        catalogApi
          .listProducts({ sort: "most_viewed_today", pageSize: 4, inStock: true })
          .then((res) => {
            if (!cancelled) setRelatedProducts(res.items.map(toRelated));
          })
          .catch((err) => console.error("Error fetching products:", err)),
      );
    return () => {
      cancelled = true;
    };
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

  const redirectToAuth = useCallback(() => {
    router.push(
      `/auth/login?redirectTo=${encodeURIComponent("/checkout?step=details")}`
    );
  }, [router]);

  // -------------------- Submit Order --------------------
  const handleSubmitOrder = async () => {
    setErrorMessage("");

    if (sabbathClosed) {
      setErrorMessage(
        "Shopping is paused in honor of the Sabbath. Please return after sunset on Saturday in your local time."
      );
      return;
    }

    if (!user) {
      redirectToAuth();
      return;
    }

    if (cart.length === 0 || total <= 0) {
      setErrorMessage("Your cart is empty. Add items before ordering.");
      return;
    }

    const { name, phone, email, country, county, locality, message } = formData;
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
      const address = [locality, county, country]
        .map((p) => p.trim())
        .filter(Boolean)
        .join(", ");

      const { order } = await orderApi.checkout({
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        contactName: name.trim(),
        contactPhone: normalizedPhone,
        contactEmail: email.trim() || user.email || null,
        address,
        note: message.trim() || null,
        useWallet,
      });

      // Notify the shop via WhatsApp with the live order number.
      const productList = cart
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.name} (x${item.quantity}) — KSh ${(item.price * item.quantity).toFixed(2)} [ID: ${item.id}]`
        )
        .join("%0A");

      const whatsappMessage = `🛍️ *New Order ${order.orderNumber}*%0A--------------------------------%0A*Name:* ${name}%0A*Phone:* ${normalizedPhone}%0A*Address:* ${address}%0A--------------------------------%0A${productList}%0A--------------------------------%0A*Total:* KSh ${Number(order.total).toFixed(2)}%0AThank you!`;

      const phoneNumber = "254105178685";
      window.open(`https://wa.me/${phoneNumber}?text=${whatsappMessage}`, "_blank");

      setOrderNumber(order.orderNumber);
      setSuccess(true);
      clearCart();
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof ApiClientError
          ? err.message
          : "Something went wrong. Please try again."
      );
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
        {orderNumber && (
          <p className="text-gray-700 dark:text-gray-300 mt-3">
            Your order number is{" "}
            <span className="font-mono font-semibold">{orderNumber}</span>. Keep it
            to track your order.
          </p>
        )}
        <p className="text-gray-600 mt-3">
          You&apos;ll receive a confirmation via WhatsApp or Email soon.
        </p>
        <Link
          href="/profile?tab=orders"
          className="mt-4 inline-flex items-center justify-center text-sky-600 font-medium hover:underline"
        >
          View your orders →
        </Link>
        <div>
          <button
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            onClick={() => router.push("/shop")}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  // -------------------- Render --------------------
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-gray-950 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
              Secure checkout
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
              Review your cart
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Confirm quantities, sign in to save your order, then share delivery details.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-200"
          >
            Continue shopping
            <ArrowRight size={16} />
          </Link>
        </div>

       {/* Error Message */}
      {errorMessage && (
        <div className="text-center mt-4 text-red-600 font-medium">{errorMessage}</div>
      )}

      {sabbathClosed && (
        <div className="max-w-4xl mx-auto mt-6 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
          We honor the Sabbath from Friday sunset to Saturday sunset in your local time. Checkout and purchasing are
          temporarily disabled until {sabbathEndsAt.toLocaleString()}.
        </div>
      )}
        {cart.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-gray-900">
            <ShoppingBag className="mx-auto mb-4 text-slate-400" size={48} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your cart is empty</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Add products to your cart before placing an order.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Browse products
              <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
 {/* Cart Items */}
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-gray-900 sm:grid-cols-[96px_1fr_auto]"
                >
                    <div className="relative h-24 w-24 overflow-hidden rounded-md bg-slate-50 dark:bg-slate-800">
                      <Image
                        src={item.image || "/assets/logo.jpg"}
                        alt={item.name}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold text-gray-900 dark:text-gray-100">
                        {item.name}
                      </p>
                      <p className="text-gray-500 text-sm">
                        KSh {item.price.toFixed(2)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="break-all text-gray-500 dark:text-gray-400">
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
                          className="grid h-8 w-8 place-items-center rounded-md bg-gray-100 text-blue-700 hover:bg-blue-100 dark:bg-gray-800"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center">{item.quantity}</span>
                        <button
                          onClick={() => increaseQuantity(item.id, item.quantity)}
                          className="grid h-8 w-8 place-items-center rounded-md bg-gray-100 text-blue-700 hover:bg-blue-100 dark:bg-gray-800"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <p className="font-bold text-blue-700">
                      KSh {(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total & Place Order */}
            <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-gray-900">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Order summary</h2>
              <div className="mt-4 space-y-3 border-b border-slate-200 pb-4 text-sm dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Items</span>
                  <span>{cart.reduce((count, item) => count + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Subtotal</span>
                  <span>KSh {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Delivery</span>
                  <span>Confirmed after order</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-base font-bold text-slate-900 dark:text-white">Total</span>
                <span className="text-2xl font-black text-blue-700">KSh {total.toFixed(2)}</span>
              </div>
              <button
                onClick={() => {
                  if (total <= 0) return;
                  if (sabbathClosed) {
                    setErrorMessage(
                      "Shopping is paused in honor of the Sabbath. Please return after sunset on Saturday in your local time."
                    );
                    return;
                  }
                  if (!user) {
                    redirectToAuth();
                    return;
                  }
                  setShowForm(true);
                }}
                disabled={sabbathClosed}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-8 py-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Place order
                <CreditCard size={18} />
              </button>
              <div className="mt-5 grid gap-3 text-xs text-slate-500 dark:text-slate-400">
                {[
                  { icon: ShieldCheck, text: "Secure checkout and saved order history" },
                  { icon: Truck, text: "Delivery details confirmed by customer care" },
                  { icon: PackageCheck, text: "WhatsApp order confirmation available" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2">
                    <item.icon className="text-blue-700 dark:text-blue-400" size={16} />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
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
                    src={product.image}
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



      {/* Order Form Modal */}
      {showForm && user && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
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
                readOnly={Boolean(user.email)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {user.email && (
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

              {walletBalance > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Apply wallet balance (KSh {walletBalance.toFixed(2)} available)
                </label>
              )}
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
                disabled={isSubmitting || !phoneValid || sabbathClosed}
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
