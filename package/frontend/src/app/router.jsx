// Hash routing: #/ · #/author/:id · #/post/:id
// Works from any folder the Go service serves the build from, and keeps back/forward native.
import { startTransition, useEffect, useState } from 'react';

function parse(hash) {
  const [a, b] = hash.replace(/^#\/?/, '').split('/');
  if (a === 'author' && b) return { name: 'author', id: decodeURIComponent(b) };
  if (a === 'post' && b) return { name: 'post', id: decodeURIComponent(b) };
  return { name: 'home' };
}
const keyOf = (r) => (r.name === 'home' ? 'home' : `${r.name}:${r.id}`);

// Scroll positions per entry: a new navigation starts at the top, back/forward returns where you were.
const scrolls = new Map();
let pushing = false;
let current = location.hash || '#/';

export function navigate(path) {
  const next = `#${path}`;
  if (next === current) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  scrolls.set(current, window.scrollY);
  pushing = true;
  location.hash = path;
}

export function useRoute() {
  const [route, setRoute] = useState(() => ({ ...parse(location.hash), key: keyOf(parse(location.hash)), scroll: 0 }));
  useEffect(() => {
    const onChange = () => {
      if (!pushing) scrolls.set(current, window.scrollY);
      const scroll = pushing ? 0 : scrolls.get(location.hash || '#/') ?? 0;
      pushing = false;
      current = location.hash || '#/';
      const r = parse(location.hash);
      startTransition(() => setRoute({ ...r, key: keyOf(r), scroll }));
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const paths = {
  home: () => '/',
  author: (id) => `/author/${encodeURIComponent(id)}`,
  post: (id) => `/post/${encodeURIComponent(id)}`,
};

/** An in-app link. Modified clicks fall through to the browser. */
export function Link({ to, children, onClick, ref, ...rest }) {
  return (
    <a
      ref={ref}
      href={`#${to}`}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
