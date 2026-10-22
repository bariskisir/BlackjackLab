import "./TopBar.scss";

export function TopBar() {
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Blackjack Lab home">
        <span className="brand-mark" aria-hidden="true">
          <span className="brand-mark-spade">♠</span>
          <span className="brand-mark-card">A</span>
        </span>
        <span className="brand-copy">
          <strong>Blackjack Lab</strong>
        </span>
      </a>
    </header>
  );
}
