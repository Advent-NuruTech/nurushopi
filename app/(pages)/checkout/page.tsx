"use client";

import React, { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { type Route } from "next";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query, orderBy } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

const counties = [
  "Nairobi", "Kisumu", "Mombasa", "Nakuru", "Uasin Gishu", "Kiambu",
  "Machakos", "Kakamega", "Homabay", "Siaya", "Nandi", "Migori", "Kericho",
  "Kisii", "Busia", "Vihiga", "Embu", "Murang’a", "Meru", "Bomet", "Other"
];

export default function CheckoutPage() {
  const { cart, total, removeFromCart, clearCart, updateQuantity } = useCart();
  const { user } = useUser();
  const router = useRouter();

  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    county: "",
    locality: "",
    message: "",
  });

  // ✅ Fetch related products
  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(4));
        const snap = await getDocs(q);
        setRelatedProducts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
    fetchRelated();
  }, []);

  // ✅ Handle form field changes smoothly
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Handle order submission
  const handleSubmitOrder = async () => {
    if (cart.length === 0 || total <= 0) {
      alert("Your cart is empty. Please add products before ordering.");
      return;
    }

    if (!user) {
      alert("Please sign in to complete your order.");
      router.push("/sign-in" as Route);
      return;
    }

    const { name, phone, county, locality } = formData;
    if (!name || !phone || !county || !locality) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        userId: user.id,
        userEmail: user.emailAddresses[0]?.emailAddress,
        ...formData,
        items: cart,
        totalAmount: total,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) throw new Error("Order submission failed");

      setSuccess(true);
      clearCart();
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
      setShowForm(false);
    }
  };

  // ✅ Quantity handlers
  const increaseQuantity = (id: string, current: number) => {
    updateQuantity(id, current + 1);
  };

  const decreaseQuantity = (id: string, current: number) => {
    const newQty = current - 1;
    if (newQty <= 0) {
      removeFromCart(id); // auto remove if zero
    } else {
      updateQuantity(id, newQty);
    }
  };

  // ✅ Success screen
  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <h2 className="text-2xl font-semibold text-green-700">
          ✅ Order placed successfully!
        </h2>
        <p className="text-gray-600 mt-3">
          You’ll receive a confirmation via WhatsApp or Email soon.
        </p>
        <button
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          onClick={() => router.push("/")}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  // ✅ Checkout Page
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-700 mb-8">Checkout</h1>

        {cart.length === 0 ? (
          <p className="text-gray-600">Your cart is empty.</p>
        ) : (
          <>
            <div className="space-y-5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row justify-between items-center border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <Image
                        src={item.image || "/images/placeholder.png"}
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

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => decreaseQuantity(item.id, item.quantity)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                        >
                          <Minus size={14} />
                        </button>

                        <span className="w-10 text-center">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => increaseQuantity(item.id, item.quantity)}
                          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
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

            {/* Total Section */}
            <div className="mt-8 border-t pt-6 flex flex-col sm:flex-row items-center justify-between">
              <p className="text-xl font-semibold">
                Total:{" "}
                <span className="text-blue-700">
                  KSh {total.toFixed(2)}
                </span>
              </p>
              <button
                onClick={() => {
                  if (cart.length > 0 && total > 0) setShowForm(true);
                  else alert("Your cart is empty.");
                }}
                className="mt-5 sm:mt-0 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                disabled={cart.length === 0 || total <= 0}
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
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
            You may also like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {relatedProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800"
              >
                <div className="relative w-full h-40">
                  <Image
                    src={product.images?.[0] || product.imageUrl || "/images/placeholder.png"}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {product.name}
                  </h3>
                  <p className="text-blue-700 font-semibold text-sm mt-1">
                    KSh {product.price?.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-700">
              Complete Your Order
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Please fill this form to finish submitting your order.
            </p>

            <div className="space-y-3">
              <input
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <input
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <input
                name="email"
                placeholder="Email (optional)"
                value={formData.email}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <select
                name="county"
                value={formData.county}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
              >
                <option value="">Select County</option>
                {counties.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                name="locality"
                placeholder="Exact Locality (e.g. Nyamasaria, Kisumu)"
                value={formData.locality}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <textarea
                name="message"
                placeholder="Special message (optional)"
                value={formData.message}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 h-20 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Finish Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
