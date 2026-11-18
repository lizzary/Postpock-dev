import { useLayoutEffect, useRef, useState } from 'react';
import { useHome } from '../../../bridge/index.js';
import { usePageMeta } from '../../../app/shell.jsx';
import { HomeHero } from './HomeHero.jsx';
import { Library } from './Library.jsx';

export function HomePage() {
  const home = useHome();
  const hero = useRef(null);
  const [artHeight, setArtHeight] = useState(720);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setArtHeight(e.contentRect.height));
    ro.observe(hero.current);
    return () => ro.disconnect();
  }, []);
  usePageMeta({ scope: 'home', overArt: true, artHeight });
  return (
    <>
      <HomeHero home={home} heroRef={hero} />
      <Library home={home} />
    </>
  );
}
