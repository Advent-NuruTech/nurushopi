import { redirect } from "next/navigation";

export default function ControlPageRedirect() {
  redirect("/admin/dashboard");
}
