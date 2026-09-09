"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Pencil, Plus, Route, X } from "lucide-react";
import type { DeliveryRateCreateInput, DeliveryRateDTO, DeliveryRateMethod } from "@nuru/types";
import { ApiClientError, fulfillmentApi } from "@/lib/api";
import { formatPrice } from "@/lib/formatPrice";
import { KENYA_COUNTIES } from "@/lib/kenyaLocations";

type Draft = {
  name: string;
  method: DeliveryRateMethod;
  originCounty: string;
  originArea: string;
  destinationCounty: string;
  destinationArea: string;
  fee: string;
  estimatedDeliveryTime: string;
  priority: string;
  isActive: boolean;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-950";

const nullable = (value: string): string | null => value.trim() || null;

function makeDraft(originCounty: string, originArea: string): Draft {
  return {
    name: "",
    method: "DOORSTEP",
    originCounty,
    originArea,
    destinationCounty: "",
    destinationArea: "",
    fee: "",
    estimatedDeliveryTime: "",
    priority: "0",
    isActive: true,
  };
}

function fromRate(rate: DeliveryRateDTO): Draft {
  return {
    name: rate.name,
    method: rate.method,
    originCounty: rate.originCounty,
    originArea: rate.originArea ?? "",
    destinationCounty: rate.destinationCounty,
    destinationArea: rate.destinationArea ?? "",
    fee: rate.fee,
    estimatedDeliveryTime: rate.estimatedDeliveryTime,
    priority: String(rate.priority),
    isActive: rate.isActive,
  };
}

export default function DeliveryRatesManager({
  dispatchCounty,
  dispatchArea,
}: {
  dispatchCounty: string;
  dispatchArea: string;
}) {
  const [rates, setRates] = useState<DeliveryRateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(() => makeDraft(dispatchCounty, dispatchArea));
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fulfillmentApi.admin.listRates({ pageSize: 100 });
      setRates(page.items);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Could not load delivery routes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  const startNew = () => {
    setEditingId(null);
    setDraft(makeDraft(dispatchCounty, dispatchArea));
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const input: DeliveryRateCreateInput = {
      name: draft.name.trim(),
      method: draft.method,
      originCounty: draft.originCounty,
      originArea: nullable(draft.originArea),
      destinationCounty: draft.destinationCounty,
      destinationArea: nullable(draft.destinationArea),
      fee: Number(draft.fee),
      estimatedDeliveryTime: draft.estimatedDeliveryTime.trim(),
      priority: Number(draft.priority),
      isActive: draft.isActive,
    };
    try {
      if (editingId) await fulfillmentApi.admin.updateRate(editingId, input);
      else await fulfillmentApi.admin.createRate(input);
      setShowForm(false);
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Could not save the delivery route.",
      );
    } finally {
      setSaving(false);
    }
  };

  const archive = async (rate: DeliveryRateDTO) => {
    if (!window.confirm(`Archive ${rate.name}? Existing orders keep their quoted price.`)) return;
    try {
      await fulfillmentApi.admin.archiveRate(rate.id);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not archive the route.");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-white">
            <Route size={20} className="text-brand" /> Delivery route pricing
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Each price covers one origin-to-destination route. Leave an area blank to price the
            whole county; a matching area-specific route takes priority.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong"
        >
          <Plus size={17} /> Add route price
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {loading && <p className="text-sm text-slate-500">Loading route prices...</p>}
        {!loading && rates.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No route prices yet. Unmatched checkout destinations will be saved for a manual quote.
          </p>
        )}
        {rates.map((rate) => (
          <article
            key={rate.id}
            className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white">{rate.name}</h3>
                  <span className="rounded-full bg-brand-surface px-2 py-0.5 text-xs font-semibold text-brand-strong">
                    {rate.method === "DOORSTEP" ? "Doorstep" : "Pickup"}
                  </span>
                  {!rate.isActive && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {[rate.originArea, rate.originCounty].filter(Boolean).join(", ")} →{" "}
                  {[rate.destinationArea, rate.destinationCounty].filter(Boolean).join(", ")}
                </p>
                <p className="mt-1 text-sm font-semibold text-brand-strong">
                  {formatPrice(Number(rate.fee))} · {rate.estimatedDeliveryTime}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(rate.id);
                    setDraft(fromRate(rate));
                    setShowForm(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand-strong"
                >
                  <Pencil size={15} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => void archive(rate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  <Archive size={15} /> Archive
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit route price" : "Add route price"}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2">
                Route name
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Nairobi CBD to Kisumu town"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Delivery method
                <select
                  value={draft.method}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, method: e.target.value as DeliveryRateMethod }))
                  }
                  className={inputClass}
                >
                  <option value="DOORSTEP">Doorstep</option>
                  <option value="PICKUP_STATION">Pickup station</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Price (KES)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.fee}
                  onChange={(e) => setDraft((d) => ({ ...d, fee: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Origin county
                <select
                  value={draft.originCounty}
                  onChange={(e) => setDraft((d) => ({ ...d, originCounty: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Choose county</option>
                  {KENYA_COUNTIES.map((county) => (
                    <option key={county}>{county}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Origin area (optional)
                <input
                  value={draft.originArea}
                  onChange={(e) => setDraft((d) => ({ ...d, originArea: e.target.value }))}
                  placeholder="e.g. Nairobi CBD"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Destination county
                <select
                  value={draft.destinationCounty}
                  onChange={(e) => setDraft((d) => ({ ...d, destinationCounty: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Choose county</option>
                  {KENYA_COUNTIES.map((county) => (
                    <option key={county}>{county}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Destination area (optional)
                <input
                  value={draft.destinationArea}
                  onChange={(e) => setDraft((d) => ({ ...d, destinationArea: e.target.value }))}
                  placeholder="Blank covers the whole county"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Delivery estimate
                <input
                  value={draft.estimatedDeliveryTime}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, estimatedDeliveryTime: e.target.value }))
                  }
                  placeholder="e.g. 1–2 working days"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Priority
                <input
                  type="number"
                  min="0"
                  value={draft.priority}
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  className="h-4 w-4 accent-brand"
                />{" "}
                Active
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save route"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
