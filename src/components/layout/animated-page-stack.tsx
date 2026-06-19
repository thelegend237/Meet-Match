"use client";

import { PageStack } from "@/components/layout/page-header";
import { Stagger } from "@/components/motion/motion";

export function AnimatedPageStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PageStack className={className}>
      <Stagger stagger={70}>{children}</Stagger>
    </PageStack>
  );
}
