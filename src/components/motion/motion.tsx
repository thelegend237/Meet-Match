"use client";

import {
  Children,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const MotionContext = createContext(false);

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
  as?: ElementType;
};

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  duration = 600,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const parentVisible = useContext(MotionContext);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(parentVisible || reduced);

  useEffect(() => {
    if (parentVisible || reduced) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [parentVisible, reduced]);

  const style = {
    "--motion-delay": `${delay}ms`,
    "--motion-duration": `${duration}ms`,
  } as CSSProperties;

  return (
    <Tag
      ref={ref as never}
      className={cn(
        "mm-motion-reveal",
        direction !== "none" && `mm-motion-from-${direction}`,
        visible && "mm-motion-visible",
        className
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}

export function Stagger({
  children,
  className,
  stagger = 80,
  initialDelay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  initialDelay?: number;
}) {
  const items = Children.toArray(children);

  return (
    <MotionContext.Provider value={true}>
      <div className={className}>
        {items.map((child, index) => (
          <Reveal key={index} delay={initialDelay + index * stagger} direction="up">
            {child}
          </Reveal>
        ))}
      </div>
    </MotionContext.Provider>
  );
}

export function StepTransition({
  stepKey,
  children,
  className,
}: {
  stepKey: string | number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div key={stepKey} className={cn("mm-motion-step", className)}>
      {children}
    </div>
  );
}

export function Float({
  children,
  className,
  slow = false,
}: {
  children: ReactNode;
  className?: string;
  slow?: boolean;
}) {
  return (
    <div className={cn(slow ? "mm-motion-float-slow" : "mm-motion-float", className)}>
      {children}
    </div>
  );
}

export function ScaleHover({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mm-motion-scale-hover", className)}>{children}</div>;
}

export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mm-motion-collapse grid transition-[grid-template-rows,opacity] duration-300 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
