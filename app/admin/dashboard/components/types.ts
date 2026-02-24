export type AdminRole = "senior" | "sub";
export type TabId =
  | "overview"
  | "invite"
  | "admins"
  | "products"
  | "orders"
  | "banners"
  | "contacts"
  | "categories"
  | "hero"
  | "messages"
  | "users"
  | "reviews"
  | "redemptions"
  | "wholesale";

export interface Admin {
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
}

// Removed JSX elements - they'll be created in the components
export const TABS_SENIOR: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "invite", label: "Invite Admin", icon: "UserPlus" },
  { id: "admins", label: "Admin Management", icon: "Users" },
  { id: "categories", label: "Categories", icon: "Tags" },
  { id: "hero", label: "Hero Colors", icon: "Palette" },
  { id: "products", label: "Products", icon: "Package" },
  { id: "orders", label: "Orders", icon: "ShoppingCart" },
  { id: "wholesale", label: "Wholesale", icon: "Warehouse" },
  { id: "reviews", label: "Reviews", icon: "MessageSquare" },
  { id: "redemptions", label: "Redemptions", icon: "Wallet" },
  { id: "users", label: "Users", icon: "Users" },
  { id: "banners", label: "Banners", icon: "ImageIcon" },
  { id: "contacts", label: "Contacts", icon: "MessageSquare" },
  { id: "messages", label: "Messages", icon: "MessageSquare" },
];

export const TABS_SUB: { id: TabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "products", label: "Products", icon: "Package" },
  { id: "orders", label: "Orders", icon: "ShoppingCart" },
  { id: "messages", label: "Messages", icon: "MessageSquare" },
];
