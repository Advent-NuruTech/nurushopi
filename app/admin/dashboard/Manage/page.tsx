"use client";

import React, { useState } from "react";

type LinkItem = {
  name: string;
  href: string;
};

export default function ManagementPage() {
  // 🔹 List of management links
  const [links] = useState<LinkItem[]>([
    { name: "Upload Banner", href: "/admin/dashboard/upload-banner" },
    { name: "Upload Products Video", href: "/uploadproduct" },
    { name: "Control", href: "/admin/dashboard/control" },
    { name: "Received Contact Messages", href: "/admin/dashboard/received-contact" },
    { name: "Received Orders", href: "/admin/dashboard/received" },
  ]);

  return (
    <div className="max-w-3xl mx-auto p-6 mt-10 bg-white shadow-md rounded-2xl">
      <h1 className="text-2xl font-bold mb-6 text-center text-green-700">
        Management Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="p-4 bg-green-600 text-white rounded-xl text-center hover:bg-green-700 transition"
          >
            {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}
