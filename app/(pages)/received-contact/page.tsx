'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, Timestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Define accepted date types explicitly
type FirestoreDate = Timestamp | { seconds: number } | Date | string | number | null;

interface Contact {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  createdAt?: FirestoreDate;
}

function formatCreatedAt(createdAt?: FirestoreDate): string {
  if (!createdAt) return '—';

  // Firestore Timestamp
  if (createdAt instanceof Timestamp) {
    const d = createdAt.toDate();
    return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleString();
  }

  // Object with seconds (Firestore REST-like)
  if (typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt) {
    const d = new Date(createdAt.seconds * 1000);
    return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleString();
  }

  // JS Date
  if (createdAt instanceof Date) {
    return isNaN(createdAt.getTime()) ? 'Invalid date' : createdAt.toLocaleString();
  }

  // ISO string
  if (typeof createdAt === 'string') {
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleString();
  }

  // Timestamp as number
  if (typeof createdAt === 'number') {
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? String(createdAt) : d.toLocaleString();
  }

  return '—';
}

export default function ReceivedContact() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const contactList: Contact[] = querySnapshot.docs.map((d): Contact => {
          const data = d.data() as DocumentData;
          return {
            id: d.id,
            name: data.name ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            message: data.message ?? '',
            createdAt: data.createdAt ?? null,
          };
        });

        setContacts(contactList);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">📬 Received Contacts</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-600">
          <Loader2 className="animate-spin mr-2" /> Loading messages...
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-10 text-slate-500">No contact messages found.</div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-x-auto rounded-lg shadow bg-white dark:bg-slate-900"
        >
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Received</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <td className="px-4 py-3 font-medium">{contact.name || '—'}</td>
                  <td className="px-4 py-3">{contact.email || '—'}</td>
                  <td className="px-4 py-3">{contact.phone || '—'}</td>
                  <td className="px-4 py-3 max-w-xs truncate break-words">{contact.message || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatCreatedAt(contact.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
