"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { adminAuthApi, ApiClientError } from "@/lib/api";
import type { AdminUserDTO } from "@nuru/types";
import {
  Search,
  Filter,
  UserX,
  UserCheck,
  Mail,
  Shield,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";

interface FilterState {
  role: "all" | "SENIOR" | "SUB";
  search: string;
}

export default function AdminsTab() {
  const [admins, setAdmins] = useState<AdminUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ role: "all", search: "" });

  const load = useCallback(() => {
    setLoading(true);
    adminAuthApi
      .listAdmins()
      .then((d) => setAdmins(d.admins))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load admins."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredAdmins = useMemo(() => {
    let result = admins;
    if (filters.role !== "all") result = result.filter((a) => a.role === filters.role);
    const term = filters.search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (a) => a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term),
      );
    }
    return result;
  }, [admins, filters]);

  const removeAdmin = async (id: string, adminName: string) => {
    if (!confirm(`Are you sure you want to remove ${adminName}? This action cannot be undone.`)) return;
    try {
      await adminAuthApi.removeAdmin(id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      setExpandedAdmin(null);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : "Failed to remove admin.");
    }
  };

  const toggleExpand = (id: string) => setExpandedAdmin((cur) => (cur === id ? null : id));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <LoadingSpinner size={48} />
        <div className="text-center">
          <p className="text-gray-700 font-medium">Loading Admin Team</p>
          <p className="text-gray-500 text-sm mt-1">Fetching admin details...</p>
        </div>
      </div>
    );
  }

  const seniorAdminsCount = admins.filter((a) => a.role === "SENIOR").length;
  const subAdminsCount = admins.filter((a) => a.role === "SUB").length;
  const activeCount = admins.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Admins</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{admins.length}</p>
            </div>
            <div className="p-2 bg-white rounded-lg">
              <UserCheck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Senior Admins</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{seniorAdminsCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Sub Admins</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{subAdminsCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg">
              <Shield className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Active</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{activeCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg">
              <UserCheck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Admin Management</h2>
            <p className="text-sm text-gray-500 mt-1">Manage team permissions and access</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search admins..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filters.role}
                onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value as FilterState["role"] }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="SENIOR">Senior Admin</option>
                <option value="SUB">Sub Admin</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Admin</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAdmins.map((admin) => (
                <React.Fragment key={admin.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {admin.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {admin.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          admin.role === "SENIOR" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {admin.role === "SENIOR" ? (
                          <>
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            Senior Admin
                          </>
                        ) : (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Sub Admin
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          admin.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${admin.isActive ? "bg-emerald-500" : "bg-gray-400"}`}
                        ></div>
                        {admin.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {admin.role === "SUB" && (
                          <button
                            onClick={() => removeAdmin(admin.id, admin.name)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Remove
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(admin.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          Details
                          <ChevronRight
                            className={`w-4 h-4 ml-1 transition-transform ${
                              expandedAdmin === admin.id ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedAdmin === admin.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-500">Admin ID:</span>
                            <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1">{admin.id}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Created:</span>
                            <p className="text-sm mt-1">{new Date(admin.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredAdmins.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserX className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No admins found</h3>
            <p className="text-gray-500 mb-6">
              {filters.search || filters.role !== "all"
                ? "Try adjusting your search or filters"
                : "No admins have been added yet"}
            </p>
            {(filters.search || filters.role !== "all") && (
              <button
                onClick={() => setFilters({ role: "all", search: "" })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="text-sm text-gray-500 text-center">
        Showing {filteredAdmins.length} of {admins.length} admins
        {filters.search && ` • Matching "${filters.search}"`}
        {filters.role !== "all" && ` • ${filters.role === "SENIOR" ? "Senior" : "Sub"} Admins only`}
      </div>
    </div>
  );
}
