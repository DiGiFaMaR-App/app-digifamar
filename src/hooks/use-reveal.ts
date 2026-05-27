import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type RevealOptions = {
  selector?: string;
  y?: number;
  stagger?: number;
  duration?: number;
  scale?: number;
  rotate?: number;
  start?: string;
};

/** Animates `selector` children inside the returned ref with a staggered fade-up reveal on scroll. */
export function useReveal<T extends HTMLElement = HTMLDivElement>(opts: RevealOptions = {}) {
  const ref = useRef<T | null>(null);
  const {
    selector = "[data-reveal]",
    y = 28,
    stagger = 0.06,
    duration = 0.7,
    scale = 0.98,
    rotate = 0,
    start = "top 88%",
  } = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = el.querySelectorAll<HTMLElement>(selector);
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { y, opacity: 0, scale, rotate },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotate: 0,
          duration,
          ease: "power3.out",
          stagger,
          scrollTrigger: {
            trigger: el,
            start,
            toggleActions: "play none none none",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [selector, y, stagger, duration, scale, rotate, start]);

  return ref;
}

/** Parallax translate on scroll. Attach to any element ref. */
export function useParallax<T extends HTMLElement = HTMLDivElement>(distance = 60) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.to(el, {
        yPercent: -distance / 4,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, el);
    return () => ctx.revert();
  }, [distance]);

  return ref;
}
