export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mm-landing-page min-h-screen">{children}</div>;
}
