'use client';

import { useRef } from 'react';
import { formatPrice } from '@/lib/formatPrice';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type Order = {
  id: string;
  userId?: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  name: string;
  phone: string;
  email?: string;
  county: string;
  locality: string;
  message?: string;
  items: OrderItem[];
};

interface DownloadReceiptButtonProps {
  order: Order;
}

export default function DownloadReceiptButton({ order }: DownloadReceiptButtonProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    const canvas = await html2canvas(receiptRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/jpg');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;

    pdf.addImage(imgData, 'JPG', 0, 0, pageWidth, pdfHeight);
    pdf.save(`NURURSHOP_RECEIPT_${order.id.slice(0, 8)}.pdf`);
  };

  return (
    <>
      {/* Hidden receipt layout for rendering */}
      <div
        ref={receiptRef}
        style={{
          width: '600px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 0 8px rgba(0,0,0,0.1)',
          padding: '24px',
          fontFamily: 'Segoe UI, sans-serif',
          color: '#111827',
        }}
        className="hidden print:block"
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(90deg, #1e3a8a, #1d4ed8)',
            color: 'white',
            textAlign: 'center',
            borderRadius: '12px 12px 0 0',
            padding: '20px',
          }}
        >
          <img
            src="https://i.imgur.com/9K8F7pA.jpg"
            alt="NururShop Logo"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              margin: '0 auto 10px',
              objectFit: 'cover',
              background: 'white',
              padding: '4px',
            }}
          />
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>NururShop Official Receipt</h1>
          <p style={{ margin: 0 }}>“Health & Truth. Pick & Pay”</p>
          <p style={{ fontSize: '12px', opacity: 0.9 }}>
            Website: <strong>nururshop.xyz</strong> | Email: nurushoponline@gmail.com
          </p>
        </div>

        {/* Order Details */}
        <section style={{ padding: '20px 0', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ color: '#1e3a8a', borderLeft: '4px solid #1e3a8a', paddingLeft: '8px' }}>
            📦 Order Details
          </h3>
          <p>
            <strong>Order ID:</strong> #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p>
            <strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Status:</strong> {order.status}
          </p>
          <p>
            <strong>Total Amount:</strong> {formatPrice(order.totalAmount)}
          </p>
        </section>

        {/* Customer Info */}
        <section style={{ padding: '20px 0', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ color: '#1e3a8a', borderLeft: '4px solid #1e3a8a', paddingLeft: '8px' }}>
            👤 Customer Information
          </h3>
          <p>
            <strong>Name:</strong> {order.name}
          </p>
          <p>
            <strong>Phone:</strong> {order.phone}
          </p>
          {order.email && (
            <p>
              <strong>Email:</strong> {order.email}
            </p>
          )}
          <p>
            <strong>County:</strong> {order.county}
          </p>
          <p>
            <strong>Locality:</strong> {order.locality}
          </p>
          {order.message && (
            <p>
              <strong>Message:</strong> "{order.message}"
            </p>
          )}
        </section>

        {/* Items Table */}
        <section style={{ padding: '20px 0' }}>
          <h3 style={{ color: '#1e3a8a', borderLeft: '4px solid #1e3a8a', paddingLeft: '8px' }}>
            🛒 Order Items
          </h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '10px',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>#</th>
                <th style={{ padding: '8px' }}>Item</th>
                <th style={{ padding: '8px' }}>Qty</th>
                <th style={{ padding: '8px' }}>Price</th>
                <th style={{ padding: '8px' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={item.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{i + 1}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{item.name}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                    {formatPrice(item.price)}
                  </td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Notes */}
        <section style={{ padding: '20px 0', borderTop: '1px solid #e5e7eb' }}>
          <h3 style={{ color: '#1e3a8a', borderLeft: '4px solid #1e3a8a', paddingLeft: '8px' }}>
            💡 Notes from NururShop
          </h3>
          <p>✅ This is an auto-generated receipt from NururShop.</p>
          <p>📞 For inquiries, contact <strong>nurushoponline@gmail.com</strong>.</p>
          <p>🙏 Thank you for shopping with us!</p>
        </section>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '10px',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '10px',
          }}
        >
          © {new Date().getFullYear()} <strong>NururShop</strong> — Health & Truth.
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownloadPDF}
        className="text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-1.5 rounded-md shadow hover:from-blue-700 hover:to-blue-600 transition"
      >
        🧾 Download PDF Receipt
      </button>
    </>
  );
}
