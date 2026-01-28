export type AdminRole = "senior" | "sub";
export type TabId = "invite" | "admins" | "products" | "orders" | "banners" | "contacts";

export interface Admin {
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
}

// Removed JSX elements - they'll be created in the components
export const TABS_SENIOR: { id: TabId; label: string; icon: string }[] = [
  { id: "invite", label: "Invite Admin", icon: "UserPlus" },
  { id: "admins", label: "Admin Management", icon: "Users" },
  { id: "products", label: "Products", icon: "Package" },
  { id: "orders", label: "Orders", icon: "ShoppingCart" },
  { id: "banners", label: "Banners", icon: "ImageIcon" },
  { id: "contacts", label: "Contacts", icon: "MessageSquare" },
];

export const TABS_SUB: { id: TabId; label: string; icon: string }[] = [
  { id: "products", label: "Products", icon: "Package" },
  { id: "orders", label: "Orders", icon: "ShoppingCart" },
];