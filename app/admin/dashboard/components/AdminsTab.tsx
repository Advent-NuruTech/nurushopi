"use client";

import React, { useEffect, useState, useCallback } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Admin } from "./types";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserX, 
  UserCheck, 
  Mail,
  Shield,
  ShieldAlert,
  ChevronRight
} from "lucide-react";

interface FilterState {
  role: "all" | "senior" | "sub";
  search: string;
}

export default function AdminsTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    role: "all",
    search: ""
  });

  const applyFilters = useCallback((adminList: Admin[], filterState: FilterState) => {
    let result = [...adminList];
    
    if (filterState.role !== "all") {
      result = result.filter(admin => admin.role === filterState.role);
    }
    
    if (filterState.search.trim()) {
      const searchTerm = filterState.search.toLowerCase();
      result = result.filter(admin => 
        admin.name.toLowerCase().includes(searchTerm) ||
        admin.email.toLowerCase().includes(searchTerm)
      );
    }
    
    setFilteredAdmins(result);
  }, []);

  useEffect(() => {
    fetch("/api/admin/admins", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const adminsList = d.admins ?? [];
        setAdmins(adminsList);
        applyFilters(adminsList, filters);
      })
      .finally(() => setLoading(false));
  }, [applyFilters, filters]);

  useEffect(() => {
    applyFilters(admins, filters);
  }, [filters, admins, applyFilters]);

  const removeAdmin = async (adminId: string, adminName: string) => {
    if (!confirm(`Are you sure you want to remove ${adminName}? This action cannot be undone.`)) return;
    
    const res = await fetch(`/api/admin/admins?adminId=${adminId}`, {
      method: "DELETE",
      credentials: "include",
    });
    
    if (res.ok) {
      setAdmins((prev) => prev.filter((a) => a.adminId !== adminId));
      setExpandedAdmin(null);
    }
  };

  const toggleExpand = (adminId: string) => {
    setExpandedAdmin(expandedAdmin === adminId ? null : adminId);
  };

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

  const seniorAdminsCount = admins.filter(a => a.role === "senior").length;
  const subAdminsCount = admins.filter(a => a.role === "sub").length;

  return (
    <div className="space-y-6">
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
              <p className="text-sm font-medium text-amber-700">Super Admins</p>
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
              <p className="text-2xl font-bold text-emerald-900 mt-1">{admins.length}</p>
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
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value as FilterState["role"] }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="senior">Super Admin</option>
                <option value="sub">Sub Admin</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Cards/Table - Responsive Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hidden xl:block">
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
                  <tr key={admin.adminId} className="hover:bg-gray-50 transition-colors">
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
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        admin.role === "senior" 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {admin.role === "senior" ? (
                          <>
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            Super Admin
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
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {admin.role === "sub" && (
                          <button
                            onClick={() => removeAdmin(admin.adminId, admin.name)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Remove
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(admin.adminId)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          Details
                          <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${
                            expandedAdmin === admin.adminId ? "rotate-90" : ""
                          }`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Expanded View */}
          {expandedAdmin && (
            <div className="border-t border-gray-200 bg-gray-50">
              {filteredAdmins
                .filter(a => a.adminId === expandedAdmin)
                .map(admin => (
                  <div key={admin.adminId} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Admin Details</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-gray-500">Admin ID:</span>
                            <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1">{admin.adminId}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Created:</span>
                            <p className="text-sm">{new Date().toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions</h4>
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              admin.role === "senior" ? "bg-amber-500" : "bg-gray-400"
                            }`}></div>
                            {admin.role === "senior" ? "Full system access" : "Limited access"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Mobile/Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:hidden gap-4">
          {filteredAdmins.map((admin) => (
            <div key={admin.adminId} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {admin.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900">{admin.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Mail className="w-3 h-3 mr-1" />
                      {admin.email}
                    </p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  admin.role === "senior" 
                    ? "bg-amber-100 text-amber-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {admin.role === "senior" ? (
                    <>
                      <ShieldAlert className="w-3 h-3 mr-1" />
                      Super Admin
                    </>
                  ) : (
                    <>
                      <Shield className="w-3 h-3 mr-1" />
                      Sub Admin
                    </>
                  )}
                </span>
                
                <span className="inline-flex items-center text-sm text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                  Active
                </span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-end">
                  {admin.role === "sub" && (
                    <button
                      onClick={() => removeAdmin(admin.adminId, admin.name)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove Admin
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
        {filters.role !== "all" && ` • ${filters.role === "senior" ? "Super" : "Sub"} Admins only`}
      </div>
    </div>
  );
}