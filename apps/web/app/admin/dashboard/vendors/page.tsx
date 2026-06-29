"use client";

// The standalone vendor-management route now reuses the dashboard's
// VendorApplications tab, which is backed by the Express/Postgres API
// (vendorsApi.admin). The previous Firebase-backed implementation is retired.
import VendorApplicationsTab from "../components/VendorApplicationsTab";

export default function VendorsPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <VendorApplicationsTab />
    </div>
  );
}
