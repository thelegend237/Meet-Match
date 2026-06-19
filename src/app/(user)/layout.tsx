import { MemberChrome } from "@/components/user/member-chrome";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MemberChrome>{children}</MemberChrome>;
}
