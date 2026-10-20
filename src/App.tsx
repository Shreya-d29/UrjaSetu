import { useState, useRef, useCallback, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/landing/LandingPage';
import { NAV_ITEMS, ROUTE_ALIASES } from './constants/navigation';
import type { NavItemId } from './types';

/**
 * App — top-level router and transition orchestrator with browser hash history support.
 *
 * Supports:
 *  - Direct dashboard deep-linking (e.g. /#/india-grid-explorer) and page refresh preservation
 *  - Native browser Back and Forward navigation via hashchange events
 *  - High-performance cinematic transition from Landing to Dashboard using an overlay veil
 *  - Route aliases for backward compatibility
 */

function parseRoute(): { view: 'landing' | 'app'; activeItem: NavItemId } {
  if (typeof window === 'undefined') {
    return { view: 'landing', activeItem: 'india-grid-explorer' };
  }
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
  if (!rawHash || rawHash === 'landing') {
    return { view: 'landing', activeItem: 'india-grid-explorer' };
  }

  // Check if it's a valid nav ID
  const validNavIds = NAV_ITEMS.map((item) => item.id);
  if (validNavIds.includes(rawHash as NavItemId)) {
    return { view: 'app', activeItem: rawHash as NavItemId };
  }

  // Check route aliases for backward compatibility
  if (ROUTE_ALIASES[rawHash]) {
    return { view: 'app', activeItem: ROUTE_ALIASES[rawHash] as NavItemId };
  }

  // Legacy 'dashboard' route → map to explorer
  if (rawHash === 'dashboard') {
    return { view: 'app', activeItem: 'india-grid-explorer' };
  }

  return { view: 'landing', activeItem: 'india-grid-explorer' };
}

export function App() {
  const [routeState, setRouteState] = useState(parseRoute);
  const { view, activeItem } = routeState;

  // DOM ref for the full-viewport veil element — updated via className, never via React state,
  // so the transition never triggers an extra re-render at a critical moment.
  const veilRef = useRef<HTMLDivElement>(null);

  // Synchronize route changes from browser navigation (Back / Forward)
  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = parseRoute();
      setRouteState(nextRoute);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleExplore = useCallback(() => {
    const veil = veilRef.current;

    // 1. Activate the veil (CSS transition handles the opacity animation)
    if (veil) {
      veil.classList.add('visible');
    }

    // 2. Switch view after one rAF so the veil paint lands before the DOM swap
    requestAnimationFrame(() => {
      setRouteState({ view: 'app', activeItem: 'india-grid-explorer' });
      window.location.hash = '#/india-grid-explorer';

      // 3. Lift the veil once the dashboard has mounted (two frames + small buffer)
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (veil) veil.classList.remove('visible');
        }, 180);
      });
    });
  }, []);

  const handleSelectItem = useCallback((id: NavItemId) => {
    setRouteState({ view: 'app', activeItem: id });
    window.location.hash = `#/${id}`;
  }, []);

  const handleReturnToLanding = useCallback(() => {
    setRouteState((prev) => ({ ...prev, view: 'landing' }));
    window.location.hash = '#/';
  }, []);

  return (
    <>
      {/* Full-viewport dark cinematic veil — sits above everything during transition */}
      <div ref={veilRef} className="cinematic-veil" aria-hidden="true" />

      {view === 'landing' ? (
        <LandingPage onExplore={handleExplore} />
      ) : (
        <AppShell
          activeItem={activeItem}
          onSelectItem={handleSelectItem}
          onReturnToLanding={handleReturnToLanding}
        />
      )}
    </>
  );
}

export default App;
