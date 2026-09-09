"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, MapPin, Pencil, Plus, Save, Truck, X } from "lucide-react";
import type {
  FulfillmentConfigurationDTO,
  PickupStationCreateInput,
  PickupStationDTO,
} from "@nuru/types";
import { ApiClientError, fulfillmentApi } from "@/lib/api";
import { formatPrice } from "@/lib/formatPrice";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const defaultConfiguration: FulfillmentConfigurationDTO = {
  featureEnabled: false,
  pickupEnabled: true,
  doorstepEnabled: true,
  doorstepFee: "0.00",
  doorstepEstimatedDeliveryTime: null,
};

type StationDraft = {
  name: string;
  address: string;
  city: string;
  region: string;
  latitude: string;
  longitude: string;
  contactPhone: string;
  operatingHours: string;
  deliveryFee: string;
  estimatedDeliveryTime: string;
  instructions: string;
  isActive: boolean;
  displayOrder: string;
};

const emptyStation: StationDraft = {
  name: "",
  address: "",
  city: "",
  region: "",
  latitude: "",
  longitude: "",
  contactPhone: "",
  operatingHours: "",
  deliveryFee: "0",
  estimatedDeliveryTime: "",
  instructions: "",
  isActive: true,
  displayOrder: "0",
};

const inputClass =
  "mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function nullable(value: string): string | null {
  return value.trim() || null;
}

function toDraft(station: PickupStationDTO): StationDraft {
  return {
    name: station.name,
    address: station.address,
    city: station.city ?? "",
    region: station.region ?? "",
    latitude: station.latitude ?? "",
    longitude: station.longitude ?? "",
    contactPhone: station.contactPhone ?? "",
    operatingHours: station.operatingHours ?? "",
    deliveryFee: station.deliveryFee,
    estimatedDeliveryTime: station.estimatedDeliveryTime ?? "",
    instructions: station.instructions ?? "",
    isActive: station.isActive,
    displayOrder: String(station.displayOrder),
  };
}

function toInput(draft: StationDraft): PickupStationCreateInput {
  return {
    name: draft.name.trim(),
    address: draft.address.trim(),
    city: nullable(draft.city),
    region: nullable(draft.region),
    latitude: draft.latitude.trim() ? Number(draft.latitude) : null,
    longitude: draft.longitude.trim() ? Number(draft.longitude) : null,
    contactPhone: nullable(draft.contactPhone),
    operatingHours: nullable(draft.operatingHours),
    deliveryFee: Number(draft.deliveryFee),
    estimatedDeliveryTime: nullable(draft.estimatedDeliveryTime),
    instructions: nullable(draft.instructions),
    isActive: draft.isActive,
    displayOrder: Number(draft.displayOrder),
  };
}

export default function FulfillmentTab() {
  const [configuration, setConfiguration] =
    useState<FulfillmentConfigurationDTO>(defaultConfiguration);
  const [stations, setStations] = useState<PickupStationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfiguration, setSavingConfiguration] = useState(false);
  const [savingStation, setSavingStation] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showStationForm, setShowStationForm] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [draft, setDraft] = useState<StationDraft>(emptyStation);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ configuration: nextConfiguration }, stationPage] = await Promise.all([
        fulfillmentApi.admin.getConfiguration(),
        fulfillmentApi.admin.listStations({ page, pageSize: 25, includeArchived, search }),
      ]);
      setConfiguration(nextConfiguration);
      setStations(stationPage.items);
      setTotalPages(stationPage.totalPages);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Could not load delivery settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [includeArchived, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const updateConfig = <K extends keyof FulfillmentConfigurationDTO>(
    key: K,
    value: FulfillmentConfigurationDTO[K],
  ) => setConfiguration((current) => ({ ...current, [key]: value }));

  const saveConfiguration = async () => {
    setError("");
    setMessage("");
    setSavingConfiguration(true);
    try {
      const { configuration: saved } = await fulfillmentApi.admin.updateConfiguration({
        ...configuration,
        doorstepFee: Number(configuration.doorstepFee),
      });
      setConfiguration(saved);
      setMessage("Delivery settings saved.");
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Could not save delivery settings.",
      );
    } finally {
      setSavingConfiguration(false);
    }
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyStation);
    setShowStationForm(true);
    setError("");
  };

  const startEdit = (station: PickupStationDTO) => {
    setEditingId(station.id);
    setDraft(toDraft(station));
    setShowStationForm(true);
    setError("");
  };

  const saveStation = async () => {
    setError("");
    setMessage("");
    setSavingStation(true);
    try {
      const input = toInput(draft);
      if (editingId) await fulfillmentApi.admin.updateStation(editingId, input);
      else await fulfillmentApi.admin.createStation(input);
      setShowStationForm(false);
      setEditingId(null);
      setDraft(emptyStation);
      setMessage(editingId ? "Pickup station updated." : "Pickup station added.");
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Could not save the pickup station.",
      );
    } finally {
      setSavingStation(false);
    }
  };

  const archiveStation = async (station: PickupStationDTO) => {
    if (
      !window.confirm(`Archive ${station.name}? Existing orders will keep their station details.`)
    ) {
      return;
    }
    setError("");
    try {
      await fulfillmentApi.admin.archiveStation(station.id);
      setMessage("Pickup station archived.");
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Could not archive the station.",
      );
    }
  };

  if (loading && stations.length === 0)
    return <LoadingSpinner text="Loading delivery settings..." />;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Delivery methods</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              When this feature is off, checkout continues through the existing delivery process.
            </p>
          </div>
          <label className="inline-flex items-center gap-3 rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm font-semibold text-brand-strong">
            <input
              type="checkbox"
              checked={configuration.featureEnabled}
              onChange={(event) => updateConfig("featureEnabled", event.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Feature {configuration.featureEnabled ? "on" : "off"}
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <input
              type="checkbox"
              checked={configuration.pickupEnabled}
              onChange={(event) => updateConfig("pickupEnabled", event.target.checked)}
              className="mt-1 h-4 w-4 accent-brand"
            />
            <span>
              <span className="flex items-center gap-2 font-semibold">
                <MapPin size={17} /> Pickup stations
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Customers choose from active locations.
              </span>
            </span>
          </label>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={configuration.doorstepEnabled}
                onChange={(event) => updateConfig("doorstepEnabled", event.target.checked)}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span className="font-semibold">
                <span className="flex items-center gap-2">
                  <Truck size={17} /> Doorstep delivery
                </span>
              </span>
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Delivery fee
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={configuration.doorstepFee}
                  onChange={(event) => updateConfig("doorstepFee", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Estimated delivery time
                <input
                  value={configuration.doorstepEstimatedDeliveryTime ?? ""}
                  onChange={(event) =>
                    updateConfig("doorstepEstimatedDeliveryTime", event.target.value || null)
                  }
                  placeholder="e.g. 1–2 business days"
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={saveConfiguration}
          disabled={savingConfiguration}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
        >
          <Save size={17} /> {savingConfiguration ? "Saving..." : "Save settings"}
        </button>
      </div>

      {(error || message) && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-brand-border bg-brand-surface text-brand-strong"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Pickup stations</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add as many locations as your operation needs.
            </p>
          </div>
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong"
          >
            <Plus size={17} /> Add station
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search pickup stations"
            className={`${inputClass} mt-0 sm:max-w-sm`}
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => {
                setIncludeArchived(event.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 accent-brand"
            />
            Include archived
          </label>
        </div>

        <div className="mt-5 space-y-3">
          {stations.map((station) => (
            <article
              key={station.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 lg:flex-row lg:items-start lg:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white">{station.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      station.archivedAt
                        ? "bg-slate-100 text-slate-600"
                        : station.isActive
                          ? "bg-brand-surface-strong text-brand-strong"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {station.archivedAt ? "Archived" : station.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{station.address}</p>
                <p className="mt-2 text-sm font-semibold text-brand-strong">
                  {formatPrice(Number(station.deliveryFee))}
                  {station.estimatedDeliveryTime ? ` · ${station.estimatedDeliveryTime}` : ""}
                </p>
                {station.operatingHours && (
                  <p className="text-xs text-slate-500">Hours: {station.operatingHours}</p>
                )}
              </div>
              {!station.archivedAt && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(station)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-brand hover:text-brand-strong dark:border-slate-700"
                  >
                    <Pencil size={15} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void archiveStation(station)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Archive size={15} /> Archive
                  </button>
                </div>
              )}
            </article>
          ))}
          {stations.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No pickup stations found.
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-slate-300 px-3 py-2 font-semibold disabled:opacity-50 dark:border-slate-700"
            >
              Previous
            </button>
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-xl border border-slate-300 px-3 py-2 font-semibold disabled:opacity-50 dark:border-slate-700"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showStationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="station-form-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="station-form-title" className="text-xl font-bold">
                {editingId ? "Edit pickup station" : "Add pickup station"}
              </h2>
              <button
                type="button"
                onClick={() => setShowStationForm(false)}
                aria-label="Close"
                className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "Station name *"],
                  ["address", "Full address *"],
                  ["city", "City"],
                  ["region", "County / region"],
                  ["contactPhone", "Contact phone"],
                  ["operatingHours", "Operating hours"],
                  ["deliveryFee", "Delivery fee"],
                  ["estimatedDeliveryTime", "Estimated delivery time"],
                  ["latitude", "Latitude"],
                  ["longitude", "Longitude"],
                  ["displayOrder", "Display order"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className={key === "address" ? "text-sm sm:col-span-2" : "text-sm"}
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                  <input
                    type={
                      ["deliveryFee", "latitude", "longitude", "displayOrder"].includes(key)
                        ? "number"
                        : "text"
                    }
                    step={key === "deliveryFee" ? "0.01" : key === "displayOrder" ? "1" : "any"}
                    min={["deliveryFee", "displayOrder"].includes(key) ? "0" : undefined}
                    value={draft[key]}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              ))}
              <label className="text-sm sm:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Customer instructions
                </span>
                <textarea
                  value={draft.instructions}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, instructions: event.target.value }))
                  }
                  rows={3}
                  className={inputClass}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  className="h-4 w-4 accent-brand"
                />
                Available to customers
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowStationForm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveStation()}
                disabled={savingStation}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
              >
                <Save size={17} /> {savingStation ? "Saving..." : "Save station"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
