import {
  BLACKJACK_PAYOUT_OPTIONS,
  DOUBLE_RULE_OPTIONS,
  INSURANCE_OPTIONS,
  SPLIT_LIMIT_OPTIONS,
} from "../simulation/rules";
import type { GameRules } from "../simulation/types";
import "./RulesPanel.scss";

interface RulesPanelProps {
  rules: GameRules;
  disabled: boolean;
  onChange: (patch: Partial<GameRules>) => void;
  onReset: () => void;
}

export function RulesPanel({ rules, disabled, onChange, onReset }: RulesPanelProps) {
  return (
    <section className="rules-panel" aria-labelledby="house-rules-title">
      <header className="rules-panel-head">
        <div>
          <span className="panel-kicker">TABLE SETUP</span>
          <h2 id="house-rules-title">House rules</h2>
        </div>
        <button type="button" className="rules-reset" onClick={onReset} disabled={disabled}>
          Reset
        </button>
      </header>

      <div className="rules-grid">
        <label className="rule-field">
          <span>Blackjack pays</span>
          <select
            value={rules.blackjackPayout}
            onChange={(event) => onChange({ blackjackPayout: Number(event.target.value) })}
            disabled={disabled}
          >
            {BLACKJACK_PAYOUT_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="rule-field">
          <span>Dealer soft 17</span>
          <select
            value={rules.dealerHitsSoft17 ? "hit" : "stand"}
            onChange={(event) => onChange({ dealerHitsSoft17: event.target.value === "hit" })}
            disabled={disabled}
          >
            <option value="stand">Stands</option>
            <option value="hit">Hits</option>
          </select>
        </label>

        <label className="rule-field">
          <span>Dealer peek</span>
          <select
            value={rules.dealerPeek ? "peek" : "no-peek"}
            onChange={(event) => onChange({ dealerPeek: event.target.value === "peek" })}
            disabled={disabled}
          >
            <option value="peek">Peeks</option>
            <option value="no-peek">No peek</option>
          </select>
        </label>

        <label className="rule-field">
          <span>Double rule</span>
          <select
            value={rules.doubleRule}
            onChange={(event) =>
              onChange({ doubleRule: event.target.value as GameRules["doubleRule"] })
            }
            disabled={disabled}
          >
            {DOUBLE_RULE_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="rule-field">
          <span>Double after split</span>
          <select
            value={rules.doubleAfterSplit ? "allowed" : "blocked"}
            onChange={(event) => onChange({ doubleAfterSplit: event.target.value === "allowed" })}
            disabled={disabled}
          >
            <option value="allowed">Allowed</option>
            <option value="blocked">Not allowed</option>
          </select>
        </label>

        <label className="rule-field">
          <span>Split limit</span>
          <select
            value={rules.maxSplitHands}
            onChange={(event) => onChange({ maxSplitHands: Number(event.target.value) })}
            disabled={disabled}
          >
            {SPLIT_LIMIT_OPTIONS.map((value) => (
              <option value={value} key={value}>
                {value} hands
              </option>
            ))}
          </select>
        </label>

        <label className="rule-field">
          <span>Split aces</span>
          <select
            value={rules.splitAcesOneCard ? "one-card" : "play-on"}
            onChange={(event) =>
              onChange({ splitAcesOneCard: event.target.value === "one-card" })
            }
            disabled={disabled}
          >
            <option value="one-card">One card</option>
            <option value="play-on">Play on</option>
          </select>
        </label>

        <label className="rule-field">
          <span>Insurance</span>
          <select
            value={rules.insurance}
            onChange={(event) =>
              onChange({ insurance: event.target.value as GameRules["insurance"] })
            }
            disabled={disabled}
          >
            {INSURANCE_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
