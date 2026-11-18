import { Icon } from '../icons/Icon.jsx';

/** A platform's mark: its colour and initial (or the icon chosen for a custom platform). */
export function PlatformMark({ platform, size = 22, className }) {
  if (!platform) return null;
  const style = {
    width: size, height: size, borderRadius: Math.round(size * 0.28), background: platform.color,
    color: '#fffaf0', display: 'inline-grid', placeItems: 'center', flexShrink: 0,
    fontSize: Math.round(size * 0.52), fontWeight: 720, letterSpacing: '-0.02em', lineHeight: 1,
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)',
  };
  return (
    <span className={className} style={style} aria-hidden="true">
      {platform.icon ? <Icon name={platform.icon} size={Math.round(size * 0.62)} stroke={1.9} /> : platform.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
