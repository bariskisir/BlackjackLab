import type { PropsWithChildren } from "react";
import "./Hero.scss";

export function Hero({ children }: PropsWithChildren) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="eyebrow-line" aria-hidden="true" />
          MONTE CARLO TABLE EXPERIMENT
        </p>
        <h1>
          Let the table
          <br />
          <span>write itself.</span>
        </h1>
        <p className="hero-lede">
          Deal thousands of hands. Measure every decision. Watch the most profitable action claim
          each cell as real outcomes replace intuition.
        </p>
      </div>
      <div className="hero-controls">{children}</div>
    </section>
  );
}
