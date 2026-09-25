interface FeedbackBannerProps {
  tone: 'success' | 'error' | 'info';
  message: string;
  details?: string[];
  onDismiss?: () => void;
}

export function FeedbackBanner({ tone, message, details = [], onDismiss }: FeedbackBannerProps) {
  return (
    <div className={`banner banner-${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
      <div>
        <p className="banner-message">{message}</p>
        {details.length > 0 ? (
          <ul className="banner-details">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {onDismiss ? (
        <button type="button" className="link-button" onClick={onDismiss} aria-label="Dismiss message">
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
