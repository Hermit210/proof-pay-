// Lightweight browser-chrome wrapper: a rounded frame with a traffic-light
// header, styling a real product screenshot to read as "the actual app" --
// not a full mockup library, just the minimal wrapper the effect needs.
export function BrowserFrame({
  src,
  alt,
  urlLabel = "proofpay.app/dashboard",
}: {
  src: string;
  alt: string;
  urlLabel?: string;
}) {
  return (
    <div className="browser-frame">
      <div className="browser-frame-header">
        <span className="browser-frame-dot browser-frame-dot-red" />
        <span className="browser-frame-dot browser-frame-dot-yellow" />
        <span className="browser-frame-dot browser-frame-dot-green" />
        <span className="browser-frame-url">{urlLabel}</span>
      </div>
      <img className="browser-frame-image" src={src} alt={alt} loading="lazy" />
    </div>
  );
}
