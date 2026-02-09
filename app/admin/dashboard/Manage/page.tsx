import { redirect } from "next/navigation";

export default function ManagementPageRedirect() {
  redirect("/admin/dashboard");
}
