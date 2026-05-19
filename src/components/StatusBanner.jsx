export function StatusBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="status-banner">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss status banner">
        x
      </button>
    </div>
  );
}
