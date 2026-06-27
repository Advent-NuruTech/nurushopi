'use client';
import { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatPrice } from '@/lib/formatPrice';

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
    try {
      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: receiptRef.current.scrollWidth,
        windowHeight: receiptRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // ✅ Prevent cut-off issue by careful pagination
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`NURURSHOP_RECEIPT_${order.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('❌ Failed to download receipt. Please try again.');
    }
  };

  const computedTotal =
    order.totalAmount && order.totalAmount > 0
      ? order.totalAmount
      : order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <>
      {/* Hidden but renderable receipt layout */}
      <div
        ref={receiptRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '600px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          padding: '24px',
          fontFamily: 'Segoe UI, sans-serif',
          color: '#111827',
          lineHeight: '1.5',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: 'linear-gradient(90deg, #1e3a8a, #2563eb)',
            color: 'white',
            textAlign: 'center',
            borderRadius: '12px 12px 0 0',
            padding: '20px',
          }}
        >
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>
            NururShop Official Receipt
          </h1>
          <p style={{ fontSize: '13px', opacity: 0.95, margin: 0 }}>
            “Health & Truth.”
          </p>
          <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            Website: <strong>nururshop.co.ke</strong> | Email: <strong>nurushoponline@gmail.com</strong>
          </p>
        </div>

        {/* ORDER + CUSTOMER INFO */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            padding: '20px 0',
            borderBottom: '1px solid #e5e7eb',
            textAlign: 'left',
          }}
        >
          <div style={{ flex: 1 }}>
            <h3
              style={{
                color: '#1e3a8a',
                borderLeft: '4px solid #1e3a8a',
                paddingLeft: '8px',
                marginBottom: '8px',
              }}
            >
              📦 Order Details
            </h3>
            <p><strong>Order ID:</strong> #{order.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
            <p><strong>Total:</strong> {formatPrice(computedTotal)}</p>
          </div>

          <div style={{ flex: 1 }}>
            <h3
              style={{
                color: '#1e3a8a',
                borderLeft: '4px solid #1e3a8a',
                paddingLeft: '8px',
                marginBottom: '8px',
              }}
            >
              👤 Customer Information
            </h3>
            <p><strong>Name:</strong> {order.name}</p>
            <p><strong>Phone:</strong> {order.phone}</p>
            {order.email && <p><strong>Email:</strong> {order.email}</p>}
            <p><strong>County:</strong> {order.county}</p>
            <p><strong>Locality:</strong> {order.locality}</p>
          </div>
        </section>

        {/* ITEMS */}
        <section style={{ padding: '20px 0', textAlign: 'left' }}>
          <h3
            style={{
              color: '#1e3a8a',
              borderLeft: '4px solid #1e3a8a',
              paddingLeft: '8px',
            }}
          >
            🛒 Order Items
          </h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '10px',
              fontSize: '13.5px',
              textAlign: 'left',
              pageBreakInside: 'auto',
            }}
          >
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
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
                  <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{item.quantity}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{formatPrice(item.price)}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              textAlign: 'right',
              marginTop: '16px',
              paddingTop: '8px',
              fontWeight: 'bold',
              fontSize: '15px',
              color: '#1e3a8a',
              borderTop: '2px solid #e5e7eb',
            }}
          >
            Total: {formatPrice(computedTotal)}
          </div>
        </section>

        {/* Notes */}
        <section style={{ padding: '20px 0', borderTop: '1px solid #e5e7eb', textAlign: 'left' }}>
          <h3
            style={{
              color: '#1e3a8a',
              borderLeft: '4px solid #1e3a8a',
              paddingLeft: '8px',
            }}
          >
             Notes from NururShop
          </h3>
          <p>✅ This is an auto-generated receipt from NururShop.</p>
          <p>📞 For inquiries, contact <strong>nurushoponline@gmail.com</strong>.</p>
          <p>🙏 Thank you for shopping with us!</p>
        </section>

        <div
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
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
