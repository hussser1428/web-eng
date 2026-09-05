import { auth } from "@/lib/auth";
import { logoutAction } from "@/app/(auth)/actions";
import { NavBar, type NavUser } from "./NavBar";

export async function SiteHeader() {
  const session = await auth();
  const u = session?.user;
  const user: NavUser | null = u?.id
    ? { name: u.name ?? null, email: u.email ?? "", role: u.role === "ADMIN" ? "ADMIN" : "USER" }
    : null;
  return <NavBar user={user} signOutAction={logoutAction} />;
}
