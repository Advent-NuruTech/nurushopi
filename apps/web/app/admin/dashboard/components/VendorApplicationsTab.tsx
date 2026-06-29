"use client";

import React, { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { vendorsApi, ApiClientError } from "@/lib/api";
import type { VendorApplicationDTO, VendorApplicationStatus } from "@nuru/types";

const STATUS_OPTIONS: Array<{ value: "all" | VendorApplicationStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function StatusBadge({ status }: { status: VendorApplicationStatus }) {
  const styles =
    status === "APPROVED"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : status === "REJECTED"
        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function VendorApplicationsTab() {
  const [items, setItems] = useState<VendorApplicationDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | VendorApplicationStatus>("PENDING");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page,
      pageSize: 10,
      ...(status !== "all" ? { status } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [page, search, status],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    vendorsApi.admin
      .list(query)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const updateStatus = async (applicationId: string, nextStatus: VendorApplicationStatus) => {
    const previous = items;
    setUpdatingId(applicationId);
    setItems((current) =>
      current.map((item) => (item.id === applicationId ? { ...item, status: nextStatus } : item)),
    );
    try {
      const { application } = await vendorsApi.admin.moderate(applicationId, { status: nextStatus });
      setItems((current) => current.map((item) => (item.id === applicationId ? application : item)));
    } catch (err) {
      setItems(previous);
      if (err instanceof ApiClientError) alert(err.message);
    } finally {
      setUpdatingId(null);
    }
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
          placeholder="Search by business, contact, email"
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
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {application.contactName || "Unknown contact"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {application.email} · {application.phone || "No phone"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Applied: {new Date(application.createdAt).toLocaleString()}
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

                  {application.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        disabled={updatingId === application.id}
                        onClick={() => updateStatus(application.id, "APPROVED")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === application.id}
                        onClick={() => updateStatus(application.id, "REJECTED")}
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
                  <Detail label="Description" value={application.description || "N/A"} />
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
