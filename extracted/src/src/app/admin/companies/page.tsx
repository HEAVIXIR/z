import CompaniesAdminClient from "./CompaniesAdminClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "شرکت‌ها — هویکس" };

export default function AdminCompaniesPage() {
  return <CompaniesAdminClient />;
}
