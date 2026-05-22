export function StatusBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="status-signal" role="status" aria-live="polite">
      <span className="signal-orb" aria-hidden="true" />
      <div className="signal-copy">
        <b>Provider signal</b>
        <span>{message}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss provider signal">
        x
      </button>
    </div>
  );
}
