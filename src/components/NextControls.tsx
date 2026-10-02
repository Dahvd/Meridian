interface Props {
  nextAction: (() => void) | null;
  autoNext: boolean;
  toggle: () => void;
}

export default function NextControls({ nextAction, autoNext, toggle }: Props) {
  return (
    <div className="game-footer">
      <button className="next-btn" onClick={nextAction ?? undefined} disabled={!nextAction || autoNext}>
        Next →
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={autoNext}
        className={`auto-switch${autoNext ? ' on' : ''}`}
        onClick={toggle}
      >
        <span className="auto-switch-track"><span className="auto-switch-knob" /></span>
        Auto continue
      </button>
    </div>
  );
}
