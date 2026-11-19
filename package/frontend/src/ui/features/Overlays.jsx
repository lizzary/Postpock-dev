// Every overlay of the app, loaded on first use.
import { Component, Suspense, lazy, useEffect } from 'react';
import { useOverlays } from '../../app/shell.jsx';

const load = {
  search: () => import('./search/SearchPalette.jsx'),
  export: () => import('./export/ExportSheet.jsx'),
  sync: () => import('./sync/SyncSheet.jsx'),
  settings: () => import('./settings/SettingsDialog.jsx'),
  newAuthor: () => import('./editors/AuthorDialog.jsx'),
  newPlatform: () => import('./editors/PlatformDialog.jsx'),
  editPlatform: () => import('./editors/PlatformDialog.jsx'),
  addPost: () => import('./editors/PostComposer.jsx'),
  backup: () => import('./backup/BackupSheet.jsx'),
  mcp: () => import('./mcp/McpSheet.jsx'),
  welcome: () => import('./welcome/WelcomeDialog.jsx'),
};
const PANELS = Object.fromEntries(Object.entries(load).map(([k, fn]) => [k, lazy(() => fn().then((m) => ({ default: m.default })))]));

export function Overlays() {
  const { stack, close } = useOverlays();
  // warm the chunks once the page has settled, so the first open is instant
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
    const id = idle(() => Object.values(load).forEach((fn) => fn()));
    return () => (window.cancelIdleCallback ?? clearTimeout)(id);
  }, []);
  return Object.entries(stack).map(([name, entry]) => {
    const Panel = PANELS[name];
    return (
      <OverlayBoundary key={name} onError={() => close(name)} resetKey={entry.nonce}>
        <Suspense fallback={null}>
          <Panel open={entry.open} onClose={() => close(name)} {...entry.props} nonce={entry.nonce} />
        </Suspense>
      </OverlayBoundary>
    );
  });
}

/** A failing overlay closes itself instead of taking the page down with it. */
class OverlayBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error(error); this.props.onError(); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false }); }
  render() { return this.state.failed ? null : this.props.children; }
}
