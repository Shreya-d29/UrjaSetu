import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { UrjaSetuLogo } from '../common/UrjaSetuLogo';
import { CinematicEarth, type CinematicEarthHandle } from './CinematicEarth';
import { HowItWorksModal } from './HowItWorksModal';
import { PrivacyModal } from './PrivacyModal';

interface LandingPageProps {
  onExplore: () => void;
}

// Animated orbital ring drawn with CSS custom properties
// Slow-spinning ring + entry glow on hover without excessive neon
const EnterGridButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
  isEntering: boolean;
}> = ({ onClick, disabled, isEntering }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* The orbital portal */}
      <button
        id="enter-grid-btn"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label="Enter the Grid — open the UrjaSetu intelligence dashboard"
        className="group relative flex items-center justify-center w-[132px] h-[132px] rounded-full outline-none select-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* ── Outermost slow-spin orbital ring (CSS animation) ── */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-[#38BDF8]/30"
          style={{
            animation: 'orbit-spin 18s linear infinite',
            background: 'transparent',
          }}
        >
          {/* Orbital particle — single bright cyan dot on the ring */}
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#38BDF8]"
            style={{
              boxShadow: '0 0 6px 2px rgba(56,189,248,0.7)',
              opacity: hovered || isEntering ? 1 : 0.6,
              transition: 'opacity 0.4s',
            }}
          />
          {/* Second particle — lime, 180° offset */}
          <span
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full bg-[#B8FF65]"
            style={{
              boxShadow: '0 0 5px 1px rgba(184,255,101,0.6)',
              opacity: hovered || isEntering ? 0.9 : 0.35,
              transition: 'opacity 0.4s',
            }}
          />
        </span>

        {/* Second ring — counter-spin, slightly smaller */}
        <span
          aria-hidden="true"
          className="absolute rounded-full border border-[#38BDF8]/15"
          style={{
            inset: '10px',
            animation: 'orbit-spin-reverse 28s linear infinite',
          }}
        />

        {/* Glass disk surface */}
        <span
          className="absolute rounded-full transition-all duration-500"
          style={{
            inset: '16px',
            background: hovered || isEntering
              ? 'radial-gradient(circle, rgba(6,30,56,0.97) 0%, rgba(4,18,36,0.99) 100%)'
              : 'radial-gradient(circle, rgba(5,18,34,0.92) 0%, rgba(3,11,22,0.97) 100%)',
            border: hovered || isEntering
              ? '1px solid rgba(56,189,248,0.45)'
              : '1px solid rgba(56,189,248,0.18)',
            boxShadow: hovered || isEntering
              ? '0 0 28px 4px rgba(56,189,248,0.14), inset 0 0 18px rgba(56,189,248,0.06)'
              : '0 0 12px rgba(56,189,248,0.06)',
          }}
        />

        {/* Icon + arrow inside */}
        <span className="relative z-10 flex flex-col items-center gap-1.5">
          {isEntering ? (
            /* Loading spinner during transition */
            <span
              className="w-5 h-5 rounded-full border-2 border-[#1E3A5F] border-t-[#38BDF8]"
              style={{ animation: 'spin 0.7s linear infinite' }}
            />
          ) : (
            <>
              {/* Grid/globe icon — inline SVG for precision */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                aria-hidden="true"
                style={{
                  color: hovered ? '#38BDF8' : '#5BA8CE',
                  transition: 'color 0.35s, filter 0.35s',
                  filter: hovered
                    ? 'drop-shadow(0 0 4px rgba(56,189,248,0.5))'
                    : 'none',
                }}
              >
                <circle cx="11" cy="11" r="9.5" stroke="currentColor" strokeWidth="1.2" />
                <ellipse cx="11" cy="11" rx="4" ry="9.5" stroke="currentColor" strokeWidth="0.9" />
                <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="0.9" />
                <line x1="4" y1="6.5" x2="18" y2="6.5" stroke="currentColor" strokeWidth="0.75" />
                <line x1="4" y1="15.5" x2="18" y2="15.5" stroke="currentColor" strokeWidth="0.75" />
              </svg>
              {/* Small directional arrow */}
              <ArrowRight
                className="w-3 h-3 transition-all duration-300"
                style={{
                  color: hovered ? '#38BDF8' : 'rgba(56,189,248,0.45)',
                  transform: hovered ? 'translateX(2px)' : 'translateX(0)',
                }}
              />
            </>
          )}
        </span>
      </button>

      {/* Label below the ring */}
      <div className="flex flex-col items-center gap-1 pointer-events-none select-none">
        <span
          className="font-mono text-[11px] tracking-[0.22em] uppercase transition-colors duration-300"
          style={{ color: hovered || isEntering ? '#38BDF8' : '#64748B' }}
        >
          {isEntering ? 'ENTERING...' : "Explore India's Grid"}
        </span>
        {/* Thin underline energy trail */}
        <span
          className="h-px rounded-full transition-all duration-500"
          style={{
            width: hovered || isEntering ? '80px' : '32px',
            background: hovered || isEntering
              ? 'linear-gradient(90deg, transparent, #38BDF8, transparent)'
              : 'rgba(56,189,248,0.2)',
          }}
        />
      </div>
    </div>
  );
};

// Secondary editorial link — "Discover the Mission"
const MissionLink: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      id="discover-mission-btn"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="group flex items-center gap-2 py-1 outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8] rounded"
      aria-label="Discover the mission — learn how UrjaSetu works"
    >
      <Info
        className="w-3.5 h-3.5 transition-colors duration-300 flex-shrink-0"
        style={{ color: hovered ? '#38BDF8' : '#475569' }}
      />
      <span className="relative font-sans text-sm">
        <span
          className="transition-colors duration-300"
          style={{ color: hovered ? '#94A3B8' : '#64748B' }}
        >
          Discover the Mission
        </span>
        {/* Restrained cyan underline animation */}
        <span
          className="absolute bottom-0 left-0 h-px bg-[#38BDF8] rounded-full transition-all duration-400"
          style={{ width: hovered ? '100%' : '0%', opacity: 0.6 }}
        />
      </span>
      <ArrowRight
        className="w-3 h-3 transition-all duration-300 flex-shrink-0"
        style={{
          color: hovered ? '#38BDF8' : 'transparent',
          transform: hovered ? 'translateX(2px)' : 'translateX(-4px)',
          opacity: hovered ? 1 : 0,
        }}
      />
    </button>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onExplore }) => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const earthRef = useRef<CinematicEarthHandle>(null);

  // Track reduced motion preference reactively
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleEnterGrid = useCallback(() => {
    if (isEntering) return; // prevent double-fire
    setIsEntering(true);

    const doExplore = () => {
      // Small breathe before switching route so the overlay is fully opaque
      setTimeout(onExplore, 80);
    };

    if (earthRef.current) {
      earthRef.current.enterGrid(doExplore);
    } else {
      // No globe ref — graceful fallback (crossfade)
      if (prefersReducedMotion) {
        doExplore();
      } else {
        setTimeout(doExplore, 500);
      }
    }
  }, [isEntering, onExplore, prefersReducedMotion]);

  // Keyboard shortcut — Enter/Space on the page if button is focused via keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.id === 'enter-grid-btn') {
        e.preventDefault();
        handleEnterGrid();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleEnterGrid]);

  return (
    <>
      <div className="relative min-h-screen w-full bg-[#030712] text-slate-100 overflow-x-hidden flex flex-col justify-between selection:bg-[#38BDF8] selection:text-slate-950 font-sans">
        {/* Background atmosphere gradients */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.10),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_60%_at_80%_60%,rgba(56,189,248,0.05),rgba(0,0,0,0))]" />

        {/* ── Top Navigation ─────────────────────────────────────────────── */}
        <header className="relative z-30 w-full max-w-7xl mx-auto px-6 sm:px-8 py-5 flex items-center justify-between">
          <UrjaSetuLogo
            size="md"
            showDescriptor={false}
            className="cursor-pointer"
            onClick={() => {}}
          />

          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setShowHowItWorks(true)}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8] rounded px-2 py-1"
            >
              How It Works
            </button>
            <button
              onClick={() => setShowPrivacy(true)}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8] rounded px-2 py-1"
            >
              Privacy by Design
            </button>
            <div className="w-px h-4 bg-[#14263E]" />
            {/* Nav-level enter button — subtle, for desktop users who want quick access */}
            <button
              onClick={handleEnterGrid}
              disabled={isEntering}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1828] hover:bg-[#0E2240] border border-[#1E3A5F] hover:border-[#38BDF8]/40 text-xs font-mono font-medium text-[#38BDF8] transition-all shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </nav>

          {/* Mobile header CTA */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={handleEnterGrid}
              disabled={isEntering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-mono font-semibold disabled:opacity-50"
            >
              <span>Enter</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </header>

        {/* ── Hero Section ──────────────────────────────────────────────────── */}
        <main className="relative z-20 flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-6 sm:px-8 py-4 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center min-h-[620px]">

            {/* ── Left: Hero copy + CTAs ──────────────────────────────────── */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-8 text-left">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#071324] border border-[#162C4A] shadow-sm">
                <span className="flex h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                <span className="text-[10px] font-mono font-semibold tracking-wider text-[#38BDF8] uppercase">
                  Privacy-Preserving Grid Intelligence
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.08]">
                  India's Power Grid. Smarter Together.
                </h1>
                <p className="font-sans text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl font-normal">
                  Explore grid intelligence, detect anomalies, and understand how federated learning helps protect electricity infrastructure — while keeping regional data local.
                </p>
              </div>

              {/* ── Primary CTA: Enter the Grid ── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 pt-2">
                <EnterGridButton
                  onClick={handleEnterGrid}
                  disabled={isEntering}
                  isEntering={isEntering}
                />

                {/* ── Secondary CTA: Discover the Mission ── */}
                <MissionLink onClick={() => setShowHowItWorks(true)} />
              </div>

              {/* Value indicators */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#12233A] max-w-lg">
                <div>
                  <div className="font-mono text-xs font-bold text-[#B8FF65]">5 GRIDS</div>
                  <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Synchronous Mesh
                  </div>
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-[#38BDF8]">ε = 1.28</div>
                  <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                    DP Privacy Budget
                  </div>
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-white">0 RAW DATA</div>
                  <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Local-Only Compute
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Cinematic Earth Globe ──────────────────────────── */}
            <div className="lg:col-span-7 relative h-[440px] sm:h-[540px] lg:h-[640px] w-full flex items-center justify-center">
              {/* Ambient glow behind Earth */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] rounded-full blur-3xl transition-all duration-700"
                  style={{
                    background: isEntering
                      ? 'rgba(56,189,248,0.22)'
                      : 'rgba(2,132,199,0.12)',
                  }}
                />
              </div>

              <div className="relative w-full h-full z-10">
                <CinematicEarth
                  ref={earthRef}
                  onEnterComplete={() => {
                    // onEnterComplete fires just before the route switch
                    // We already handle timing in handleEnterGrid via earthRef.current.enterGrid
                  }}
                />
              </div>
            </div>
          </div>
        </main>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="relative z-30 w-full max-w-7xl mx-auto px-6 sm:px-8 py-5 border-t border-[#0F1E33] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-devanagari text-xs text-[#38BDF8]">ऊर्जा</span>
            <span>INDIA · DISTRIBUTED INTELLIGENCE · PRIVACY BY DESIGN</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPrivacy(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Privacy Architecture
            </button>
            <span>•</span>
            <span>ACADEMIC EVALUATION SANDBOX</span>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
        onExplore={handleEnterGrid}
      />

      <PrivacyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        onExplore={handleEnterGrid}
      />
    </>
  );
};
