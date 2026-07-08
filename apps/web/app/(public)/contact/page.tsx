'use client';

import React, { useState } from 'react';
import { contactApi, ApiClientError } from '@/lib/api';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaComment, 
  FaPaperPlane, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaClock,
  FaSpinner
} from 'react-icons/fa';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      await contactApi.submit({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        message: message.trim(),
      });

      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setStatus('success');
    } catch (error) {
      console.error('Error sending contact form:', error);
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : 'Failed to send. Please try again later.'
      );
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-4 md:px-8 lg:px-16 pt-20 md:pt-24 pb-8 md:pb-12 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-2 bg-emerald-500 rounded-full"></div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-sky-700 dark:text-emerald-400">
              Contact Us
            </h1>
          </div>
          <div className="h-1 w-20 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full mb-4"></div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Have questions about our products or need help with an order? 
            We&apos;d love to hear from you. Reach out anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl border border-sky-100 dark:border-slate-700 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-sky-700 dark:text-emerald-400 mb-6">
                Send Us a Message
              </h2>

              {/* Name Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-emerald-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-emerald-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+254 700 000 000"
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-emerald-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Message Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Message <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FaComment className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder="How can we help you today?"
                    rows={5}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-emerald-500 focus:border-transparent transition resize-y"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-semibold text-lg transition-all shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                {status === 'sending' ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    Send Message
                  </>
                )}
              </button>

              {/* Status Messages */}
              {status === 'success' && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300">
                  <FaCheckCircle className="text-emerald-500 dark:text-emerald-400" />
                  <span>Message sent successfully! We&apos;ll respond within 24 hours.</span>
                </div>
              )}
              
              {status === 'error' && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300">
                  <FaExclamationCircle className="text-rose-500 dark:text-rose-400" />
                  <span>{errorMessage || 'Failed to send. Please try again.'}</span>
                </div>
              )}
            </form>
          </div>

          {/* Contact Information Sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/50 p-6 rounded-2xl border border-sky-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-sky-700 dark:text-emerald-400 mb-4">
                Get in Touch
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg shrink-0">
                    <FaPhoneAlt className="text-sky-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</p>
                    <a 
                      href="tel:+254759167209" 
                      className="text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      +254 759 167 209
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
                    <FaEnvelope className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</p>
                    <a 
                      href="mailto:nurushoponline@gmail.com" 
                      className="text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-emerald-400 transition-colors break-all"
                    >
                      nurushoponline@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg shrink-0">
                    <FaClock className="text-sky-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Hours</p>
                    <p className="text-slate-600 dark:text-slate-400">
                      sunday - Thursday: 24 hours <br />
                      Friday: 12 hours <br />
                      Saturday: closed 

                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
                    <FaMapMarkerAlt className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Kenya
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Response Note */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-emerald-500 dark:text-emerald-400" />
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Quick Response</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We typically respond within 24 hours during business days. 
                For urgent inquiries, please call us directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}