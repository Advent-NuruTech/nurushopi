export type AdminRole = "senior" | "sub";
export type TabId = "invite" | "admins" | "products" | "orders" | "banners" | "contacts" | "categories" | "messages";

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
  { id: "categories", label: "Categories", icon: "Tags" },
  { id: "products", label: "Products", icon: "Package" },
  { id: "orders", label: "Orders", icon: "ShoppingCart" },
  { id: "banners", label: "Banners", icon: "ImageIcon" },
  { id: "contacts", label: "Contacts", icon: "MessageSquare" },
  { id: "messages", label: "Messages", icon: "MessageSquare" },
];

export const TABS_SUB: { id: TabId; label: string; icon: string }[] = [
  { id: "products", label: "Products", icon: "Package" },
  { id: "orders", label: "Orders", icon: "ShoppingCart" },
  { id: "messages", label: "Messages", icon: "MessageSquare" },
];
