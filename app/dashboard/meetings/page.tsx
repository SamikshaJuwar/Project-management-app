import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MeetingsDashboard } from "./MeetingsDashboard";

export const metadata = {
  title: "Meetings | PerfTrack",
  description: "Manage weekly project meetings, agendas, attendees, and minutes of meeting.",
};

export default async function MeetingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Only fetch team members server-side (stable data for attendee picker).
  // Projects are fetched dynamically client-side so the dropdown is always fresh.
  const teamMembers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, avatarUrl: true, role: true },
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return <MeetingsDashboard teamMembers={teamMembers} />;
}
