"use client";

import { useEffect, useState } from "react";
import type { MerchandisingCollectionDTO } from "@nuru/types";
import { merchandisingApi } from "@/lib/api";
import MerchandisingAssignments from "@/components/inventory/MerchandisingAssignments";
import AdminMerchandisingWorkspace from "./AdminMerchandisingWorkspace";

function VendorMerchandisingTab() {
  const [collections, setCollections] = useState<MerchandisingCollectionDTO[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    merchandisingApi.vendor
      .collections()
      .then((data) => setCollections(data.collections))
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Could not load merchandising."),
      );
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-semibold text-brand-strong">Merchandising</p>
        <h2 className="mt-1 text-2xl font-bold">Place your retail products</h2>
        <p className="mt-1 text-sm text-slate-500">
          You can add only products owned by your vendor account. Wholesale inventory automatically
          participates in the wholesale discovery feed.
        </p>
      </header>
      {message && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
      {collections.length > 0 ? (
        <MerchandisingAssignments actor="vendor" collections={collections} />
      ) : (
        !message && (
          <p className="rounded-xl border p-5 text-sm text-slate-500">
            No active collections are accepting vendor products.
          </p>
        )
      )}
    </div>
  );
}

export default function MerchandisingTab({ actor = "admin" }: { actor?: "admin" | "vendor" }) {
  return actor === "vendor" ? <VendorMerchandisingTab /> : <AdminMerchandisingWorkspace />;
}
