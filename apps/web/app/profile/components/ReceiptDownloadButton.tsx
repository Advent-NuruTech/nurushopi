"use client";

import React, { useRef } from "react";
import { FileDown } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { statusLabel } from "./orderUtils";
import type { ApiOrder } from "../types";

interface ReceiptDownloadButtonProps {
  order: ApiOrder;
  disabled?: boolean;
}

export default function ReceiptDownloadButton({ order, disabled = false }: ReceiptDownloadButtonProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || disabled) return;
    
    try {
      // Dynamic import to avoid SSR issues
      const [jsPDF, html2canvas] = await Promise.all([
        import("jspdf").then(module => module.default),
        import("html2canvas").then(module => module.default)
      ]);

      // Create a clone of the receipt element
      const receiptClone = receiptRef.current.cloneNode(true) as HTMLDivElement;
      
      // Apply basic styles to the clone
      receiptClone.className = "";
      receiptClone.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 600px;
        background: white;
        padding: 24px;
        font-family: Arial, sans-serif;
        color: #111827;
        line-height: 1.5;
        box-sizing: border-box;
      `;

      // Simplify all child element styles
      const simplifyStyles = (element: HTMLElement) => {
        element.className = "";
        
        if (element.tagName === 'H1') {
          element.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            margin: 0 0 8px 0;
            color: white;
            text-align: center;
          `;
        } else if (element.tagName === 'H3') {
          element.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 8px 0;
            color: #1e3a8a;
            border-left: 4px solid #1e3a8a;
            padding-left: 8px;
          `;
        } else if (element.tagName === 'P') {
          element.style.cssText = `
            margin: 4px 0;
            font-size: 14px;
          `;
        } else if (element.tagName === 'TABLE') {
          element.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 13px;
          `;
        } else if (element.tagName === 'TH' || element.tagName === 'TD') {
          element.style.cssText = `
            padding: 8px;
            border: 1px solid #e5e7eb;
            text-align: left;
          `;
          if (element.tagName === 'TH') {
            element.style.cssText += 'background: #f3f4f6; font-weight: bold;';
          }
        }
        
        // Process children
        Array.from(element.children).forEach(child => {
          simplifyStyles(child as HTMLElement);
        });
      };

      simplifyStyles(receiptClone);
      
      // Temporarily add to DOM
      document.body.appendChild(receiptClone);
      
      const canvas = await html2canvas(receiptClone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: false,
      });

      // Clean up
      document.body.removeChild(receiptClone);

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      
      // Handle multi-page - Removed unused variables
      if (imgHeight > pageHeight) {
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -pageHeight, imgWidth, imgHeight);
      }

      pdf.save(`NURURSHOP_RECEIPT_${order.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to download receipt. Please try again.");
    }
  };

  const computedTotal = order.totalAmount && order.totalAmount > 0
    ? order.totalAmount
    : order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <>
      <button
        onClick={handleDownloadReceipt}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          disabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-sm hover:shadow"
        }`}
        type="button"
      >
        <FileDown size={18} />
        {disabled ? "Receipt not available" : "Download Receipt"}
      </button>

      {/* Hidden Receipt Template */}
      <div
        ref={receiptRef}
        style={{
          position: "absolute",
          left: "-9999px",
          width: "600px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          padding: "24px",
          fontFamily: "Arial, sans-serif",
          color: "#111827",
          lineHeight: "1.5",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#1e3a8a",
            color: "white",
            textAlign: "center",
            borderRadius: "12px 12px 0 0",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
            NururShop Official Receipt
          </h1>
          <p style={{ fontSize: "14px", opacity: 0.95, margin: "4px 0" }}>
            &quot;Health &amp; Truth.&quot;
          </p>
          <p style={{ fontSize: "12px", opacity: 0.8, margin: "4px 0" }}>
            Website: <strong>nururshop.co.ke</strong> | Email: <strong>nurushoponline@gmail.com</strong>
          </p>
        </div>

        {/* Order & Customer Info */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            padding: "20px 0",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: "20px",
          }}
        >
          <div style={{ flex: 1 }}>
            <h3 style={{
              color: "#1e3a8a",
              borderLeft: "4px solid #1e3a8a",
              paddingLeft: "8px",
              marginBottom: "12px",
              fontSize: "16px",
              fontWeight: "bold",
            }}>
              📦 Order Details
            </h3>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <strong>Order ID:</strong> #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <strong>Status:</strong> {statusLabel(order.status)}
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <strong>Total:</strong> {formatPrice(computedTotal)}
            </p>
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{
              color: "#1e3a8a",
              borderLeft: "4px solid #1e3a8a",
              paddingLeft: "8px",
              marginBottom: "12px",
              fontSize: "16px",
              fontWeight: "bold",
            }}>
              👤 Customer Information
            </h3>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <strong>Name:</strong> {order.name}
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <strong>Phone:</strong> {order.phone}
            </p>
            {order.email && (
              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Email:</strong> {order.email}
              </p>
            )}
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <strong>County:</strong> {order.county}
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <strong>Locality:</strong> {order.locality}
            </p>
            {order.country && (
              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <strong>Country:</strong> {order.country}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{
            color: "#1e3a8a",
            borderLeft: "4px solid #1e3a8a",
            paddingLeft: "8px",
            marginBottom: "12px",
            fontSize: "16px",
            fontWeight: "bold",
          }}>
            🛒 Order Items
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "10px",
              fontSize: "13.5px",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "left" }}>#</th>
                <th style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "left" }}>Item</th>
                <th style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "left" }}>Qty</th>
                <th style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "left" }}>Price</th>
                <th style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "left" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={item.id}>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{i + 1}</td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{item.name}</td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{item.quantity}</td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>{formatPrice(item.price)}</td>
                  <td style={{ padding: "8px", border: "1px solid #e5e7eb" }}>
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              textAlign: "right",
              marginTop: "16px",
              paddingTop: "8px",
              fontWeight: "bold",
              fontSize: "15px",
              color: "#1e3a8a",
              borderTop: "2px solid #e5e7eb",
            }}
          >
            Total: {formatPrice(computedTotal)}
          </div>
        </div>

        {/* Notes */}
        <div style={{ 
          padding: "20px 0", 
          borderTop: "1px solid #e5e7eb",
          marginBottom: "20px",
        }}>
          <h3 style={{
            color: "#1e3a8a",
            borderLeft: "4px solid #1e3a8a",
            paddingLeft: "8px",
            marginBottom: "12px",
            fontSize: "16px",
            fontWeight: "bold",
          }}>
            📝 Notes from NururShop
          </h3>
          <p style={{ margin: "4px 0", fontSize: "14px" }}>
            ✅ This is an auto-generated receipt from NururShop.
          </p>
          <p style={{ margin: "4px 0", fontSize: "14px" }}>
            📞 For inquiries, contact <strong>nurushoponline@gmail.com</strong>.
          </p>
          <p style={{ margin: "4px 0", fontSize: "14px" }}>
            🙏 Thank you for shopping with us!
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
            This receipt is valid only for delivered orders.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#6b7280",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "10px",
          }}
        >
          © {new Date().getFullYear()} <strong>NururShop</strong> — Health &amp; Truth.
        </div>
      </div>
    </>
  );
}