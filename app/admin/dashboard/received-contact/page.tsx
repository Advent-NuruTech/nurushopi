import { redirect } from "next/navigation";

export default function ReceivedContactPageRedirect() {
  redirect("/admin/dashboard");
}
