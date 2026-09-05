import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadDashboard } from "@/features/stats/load-dashboard";
import { LandingHero } from "@/components/home/LandingHero";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default async function Home() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <LandingHero />;

  const data = await loadDashboard(prisma, { userId, certificate: "toeic" });
  const name = session.user?.name || session.user?.email || "bạn";
  return <DashboardView name={name} data={data} />;
}
