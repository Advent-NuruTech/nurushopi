"use client";

import React, { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type VendorStatus = "pending" | "approved" | "rejected";

interface VendorApplication {
  id: string;
  status: VendorStatus;
  email: string;
  phone?: string;
  ownerName?: string;
  businessName?: string;
  businessType?: string;
  denomination?: string;
  country?: string;
  county?: string;
  city?: string;
  address?: string;
  category?: string;
  description?: string;
  products?: string[];
  createdAt?: unknown;
  reviewedAt?: unknown;
  rejectionReason?: string | null;
}

interface ApplicationsResponse {
  items: VendorApplication[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUS_OPTIONS: Array<{ value: "all" | VendorStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function toDisplayDate(value: unknown): string {
  if (!value) return "N/A";
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).toLocaleString();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toLocaleString();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: number }).seconds === "number"
  ) {
    return new Date((value as { seconds: number }).seconds * 1000).toLocaleString();
  }
  return "N/A";
}

function StatusBadge({ status }: { status: VendorStatus }) {
  const styles =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : status === "rejected"
        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
}

export default function VendorApplicationsTab() {
  const [items, setItems] = useState<VendorApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | VendorStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "10");
    params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [page, search, status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/admin/vendor-applications?${queryString}`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data: ApplicationsResponse) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const updateStatus = async (applicationId: string, nextStatus: VendorStatus) => {
    const previous = items;
    setUpdatingId(applicationId);

    setItems((current) =>
      current.map((item) => (item.id === applicationId ? { ...item, status: nextStatus } : item))
    );

    const response = await fetch("/api/admin/vendor-applications", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: applicationId, status: nextStatus }),
    });

    if (!response.ok) {
      setItems(previous);
    }

    setUpdatingId(null);
  };

  if (loading) return <LoadingSpinner text="Loading vendor applications..." />;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vendor Applications</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Review vendor submissions and approve or reject applications.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by business, owner, email, phone, category"
          className="w-full md:max-w-md rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                status === option.value
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center text-slate-500 dark:text-slate-400">
          No vendor applications match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((application) => (
            <article
              key={application.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                      {application.businessName || "Unnamed business"}
                    </h3>
                    <StatusBadge status={application.status} />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{application.ownerName || "Unknown owner"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {application.email} · {application.phone || "No phone"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Applied: {toDisplayDate(application.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded((current) => (current === application.id ? null : application.id))}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm"
                  >
                    {expanded === application.id ? "Hide details" : "View details"}
                  </button>

                  {application.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={updatingId === application.id}
                        onClick={() => updateStatus(application.id, "approved")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === application.id}
                        onClick={() => updateStatus(application.id, "rejected")}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {expanded === application.id && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                  <Detail label="Business type" value={application.businessType || "N/A"} />
                  <Detail label="Denomination" value={application.denomination || "N/A"} />
                  <Detail label="Category" value={application.category || "N/A"} />
                  <Detail
                    label="Location"
                    value={[application.city, application.county, application.country].filter(Boolean).join(", ") || "N/A"}
                  />
                  <Detail label="Address" value={application.address || "N/A"} />
                  <Detail
                    label="Products"
                    value={application.products?.length ? application.products.join(", ") : "N/A"}
                  />
                  <Detail label="Description" value={application.description || "N/A"} />
                  {application.rejectionReason && (
                    <Detail label="Rejection reason" value={application.rejectionReason} />
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Showing {items.length} of {total} applications
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-sm"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
