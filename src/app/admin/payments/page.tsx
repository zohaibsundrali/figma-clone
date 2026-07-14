import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/file-access";
import { isAdminEmail } from "@/lib/admin";
import { AdminPaymentsClient } from "./AdminPaymentsClient";

export default async function AdminPaymentsPage() {
  const me = await getCurrentUserContext();
  if (!me) redirect("/sign-in");
  if (!isAdminEmail(me.email)) redirect("/dashboard");

  return <AdminPaymentsClient />;
}
