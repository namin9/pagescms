import { getServerSession } from "@/lib/session-server";
import { redirect } from "next/navigation";
import { getTenantsAction, getUsersAction } from "@/lib/actions/super-admin";
import { SuperAdminContent } from "./content";

export default async function SuperAdminPage() {
  const session = await getServerSession();
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());

  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    redirect("/");
  }

  const [tenants, users] = await Promise.all([
    getTenantsAction(),
    getUsersAction(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">슈퍼 어드민 대시보드</h2>
      </div>
      <SuperAdminContent initialTenants={tenants} initialUsers={users as any} />
    </div>
  );
}
