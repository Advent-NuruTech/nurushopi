"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Save, UserCog } from "lucide-react";
import type { PickupAgentCreateInput, PickupAgentDTO, PickupStationDTO } from "@nuru/types";
import { ApiClientError, pickupAgentApi } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-950";

export default function PickupAgentsManager({ stations }: { stations: PickupStationDTO[] }) {
  const [agents, setAgents] = useState<PickupAgentDTO[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    stationId: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const load = useCallback(async () => {
    try {
      setAgents((await pickupAgentApi.admin.list()).agents);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not load pickup agents.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const input: PickupAgentCreateInput = {
        stationId: draft.stationId,
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
        phone: draft.phone.trim() || null,
        password: draft.password,
        isActive: true,
      };
      await pickupAgentApi.admin.create(input);
      setDraft({ stationId: "", name: "", email: "", phone: "", password: "" });
      setShowForm(false);
      setMessage("Pickup agent created.");
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Could not create pickup agent.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (agent: PickupAgentDTO) => {
    setError("");
    try {
      const { agent: updated } = await pickupAgentApi.admin.update(agent.id, {
        isActive: !agent.isActive,
      });
      setAgents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not update agent.");
    }
  };

  const reassignStation = async (agent: PickupAgentDTO, stationId: string) => {
    if (!stationId || stationId === agent.stationId) return;
    setError("");
    try {
      const { agent: updated } = await pickupAgentApi.admin.update(agent.id, { stationId });
      setAgents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`${agent.name} reassigned to ${updated.stationName}.`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not reassign agent.");
    }
  };

  const resetPassword = async (agent: PickupAgentDTO) => {
    const password = window.prompt(
      `Enter a new temporary password for ${agent.name} (at least 8 characters, including a letter and number):`,
    );
    if (!password) return;
    try {
      await pickupAgentApi.admin.update(agent.id, { password });
      setMessage(`Password updated for ${agent.name}.`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Could not reset password.");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <UserCog className="text-brand" size={21} /> Pickup station agents
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Station-scoped accounts for arrival, notification, and customer handover.
          </p>
        </div>
        <button
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong"
        >
          <Plus size={17} /> Add agent
        </button>
      </div>
      {(error || message) && (
        <p
          role="status"
          className={`mt-4 rounded-xl border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-brand-border bg-brand-surface text-brand-strong"}`}
        >
          {error || message}
        </p>
      )}
      {showForm && (
        <div className="mt-5 grid gap-3 rounded-2xl border border-brand-border bg-brand-surface p-4 sm:grid-cols-2">
          <select
            aria-label="Pickup station"
            value={draft.stationId}
            onChange={(event) =>
              setDraft((current) => ({ ...current, stationId: event.target.value }))
            }
            className={inputClass}
          >
            <option value="">Choose station</option>
            {stations
              .filter((station) => station.isActive && !station.archivedAt)
              .map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} — {station.city}
                </option>
              ))}
          </select>
          <input
            placeholder="Full name"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Work email"
            value={draft.email}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
            className={inputClass}
          />
          <input
            placeholder="Phone (optional)"
            value={draft.phone}
            onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
            className={inputClass}
          />
          <input
            type="password"
            placeholder="Temporary password"
            value={draft.password}
            onChange={(event) =>
              setDraft((current) => ({ ...current, password: event.target.value }))
            }
            className={inputClass}
          />
          <button
            disabled={saving || !draft.stationId || !draft.name || !draft.email || !draft.password}
            onClick={() => void create()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
          >
            <Save size={16} /> {saving ? "Creating…" : "Create secure account"}
          </button>
        </div>
      )}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {agents.map((agent) => (
          <article
            key={agent.id}
            className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{agent.name}</p>
                <p className="truncate text-sm text-slate-500">{agent.email}</p>
                <p className="mt-2 text-sm font-semibold text-brand-strong">{agent.stationName}</p>
                <p className="truncate text-xs text-slate-500">{agent.stationAddress}</p>
                <label className="mt-3 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Assigned station
                  <select
                    value={agent.stationId}
                    onChange={(event) => void reassignStation(agent, event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    {stations
                      .filter((station) => station.isActive && !station.archivedAt)
                      .map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${agent.isActive ? "bg-brand-surface text-brand-strong" : "bg-slate-100 text-slate-500"}`}
              >
                {agent.isActive ? "Active" : "Disabled"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void toggleActive(agent)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700"
              >
                {agent.isActive ? "Disable access" : "Enable access"}
              </button>
              <button
                onClick={() => void resetPassword(agent)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700"
              >
                <KeyRound size={14} /> Reset password
              </button>
            </div>
          </article>
        ))}
      </div>
      {agents.length === 0 && !showForm && (
        <p className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-950">
          No station agents yet.
        </p>
      )}
    </section>
  );
}
