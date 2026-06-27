'use client';

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      // 🔹 Add new message to Firestore
      await addDoc(collection(db, 'contacts'), {
        name,
        email,
        phone,
        message,
        createdAt: Timestamp.now(),
      });

      // Clear form and show success
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setStatus('success');
    } catch (error) {
      console.error('Error sending contact form:', error);
      setStatus('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">Contact Us</h1>
      <p className="text-slate-600 mb-6">
        Questions? Orders? Use the form below or reach us on{' '}
        <strong>+254 759 167 209</strong>.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-xl shadow"
      >
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mt-1 block w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="mt-1 block w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 bg-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="mt-1 block w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-2 h-28 bg-transparent"
          />
        </div>

        <div>
          <button
            type="submit"
            className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 transition"
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Sending...' : 'Send Message'}
          </button>
        </div>

        {status === 'success' && (
          <div className="text-emerald-600 text-sm mt-2">
            ✅ Message sent successfully! We&apos;ll respond soon.
          </div>
        )}
        {status === 'error' && (
          <div className="text-rose-600 text-sm mt-2">
            ❌ Failed to send. Please try again later.
          </div>
        )}
      </form>

      <div className="mt-8 text-sm text-slate-600 dark:text-slate-400">
        <p className="font-semibold mb-2">Official contacts:</p>
        <ul className="space-y-1">
          <li>
            Phone:{' '}
            <a className="underline" href="tel:+254759167209">
              +254 759 167 209
            </a>
          </li>
          <li>
            Email:{' '}
            <a
              className="underline"
              href="mailto:nurushop@adventnurutech.xyz"
            >
              nurushoponline@gmail.com
            </a>
          </li>
          
        </ul>
      </div>
    </div>
  );
}
