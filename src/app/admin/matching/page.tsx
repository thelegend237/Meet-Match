import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ user?: string }>;
}

export default async function AdminMatchingRedirect({ searchParams }: PageProps) {
  const { user } = await searchParams;
  const query = user
    ? `?tab=proposer&queue=manual&user=${encodeURIComponent(user)}`
    : "?tab=proposer";
  redirect(`/admin/matchs${query}`);
}
