import { redirect } from "next/navigation";

export default function ReceivedPageRedirect() {
  redirect("/admin/dashboard");
}
