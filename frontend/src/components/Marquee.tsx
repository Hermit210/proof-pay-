import type { ReactNode } from "react";

export interface MarqueeItem {
  icon: ReactNode;
  label: string;
}

// Standard marquee technique: render the item list twice back-to-back inside
// a flex track, then animate the whole track by exactly -50% so the seam
// between the two copies is invisible and the loop reads as continuous.
// `prefers-reduced-motion` is handled in CSS (index.css): the animation is
// removed, the duplicate copy is hidden, and the track wraps as a static row.
export function Marquee({ items, ariaLabel }: { items: MarqueeItem[]; ariaLabel: string }) {
  return (
    <div className="marquee" role="list" aria-label={ariaLabel}>
      <div className="marquee-track">
        <div className="marquee-group">
          {items.map((item, i) => (
            <span className="marquee-card" role="listitem" key={`a-${i}`}>
              {item.icon}
              {item.label}
            </span>
          ))}
        </div>
        <div className="marquee-group marquee-group-copy" aria-hidden="true">
          {items.map((item, i) => (
            <span className="marquee-card" key={`b-${i}`}>
              {item.icon}
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
