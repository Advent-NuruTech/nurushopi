"use client";

import { useState } from "react";
import {
  FaWhatsapp,
  FaVideo,
  FaStore,
  FaCheckCircle,
  FaBuilding,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";

export default function VendorMeetingBooking() {
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    email: "",
    whatsapp: "",
    location: "",
    preferredDate: "",
    preferredTime: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const submit = () => {
    const message = `
🛍️ NEW NURUSHOP SELLER MEETING REQUEST

Business: ${form.businessName}
Contact Person: ${form.contactName}

Email: ${form.email}
WhatsApp: ${form.whatsapp}
Location: ${form.location}

Preferred Date: ${form.preferredDate}
Preferred Time: ${form.preferredTime}


The applicant is requesting a 15-minute onboarding meeting.
`;

    const url = `https://wa.me/254142225233?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 mb-6">
            <FaStore className="text-3xl text-white" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Book an online meeting
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Before selling on NuruShop, we invite you
            to schedule a short virtual meeting with our team.
            During this atleast 15-minute session we will understand your
            products, answer your questions, and determine if
            NuruShop is the right marketplace for you.
            If approved, our team will send you the official seller
            onboarding link to start listing your products.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-8 md:p-10 border border-slate-100 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaBuilding className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                name="businessName"
                placeholder="Business Name"
                value={form.businessName}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-800 dark:text-white"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaUser className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                name="contactName"
                placeholder="Contact Person"
                value={form.contactName}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-800 dark:text-white"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaEnvelope className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                name="email"
                placeholder="Email Address"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-800 dark:text-white"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaPhone className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                name="whatsapp"
                placeholder="WhatsApp Number"
                value={form.whatsapp}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-800 dark:text-white"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaMapMarkerAlt className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                name="location"
                placeholder="Your Location (Town / County)"
                value={form.location}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-slate-800 dark:text-white"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaCalendarAlt className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                name="preferredDate"
                type="date"
                value={form.preferredDate}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-slate-800 dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert"
              />
            </div>

            <div className="relative md:col-span-2">
              <div className="absolute top-4 left-4 pointer-events-none">
                <FaClock className="text-slate-400 dark:text-slate-500" />
              </div>
              <input
                name="preferredTime"
                type="time"
                value={form.preferredTime}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-slate-800 dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert"
              />
            </div>

            <div className="relative md:col-span-2">
              {/* Empty div removed */}
            </div>
          </div>

          <button
            onClick={submit}
            className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 hover:shadow-xl hover:shadow-emerald-300 dark:hover:shadow-emerald-900/50"
          >
            <FaWhatsapp className="text-xl" />
            Request Meeting via WhatsApp
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
            We&apos;ll respond within 24 hours
          </p>
        </div>

        {/* Next Steps Section */}
        <div className="mt-10 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-3xl p-8 border border-sky-100 dark:border-slate-600">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-200 dark:shadow-sky-900/30">
                <FaVideo className="text-white text-xl" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">
                What Happens Next?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "A meeting link will be shared",
                  "15-minute virtual discussion",
                  "Approved sellers receive onboarding link",
                ].map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <FaCheckCircle className="text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300 text-sm">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}