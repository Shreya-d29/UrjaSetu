import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Home,
} from 'lucide-react';
import type { NavItemId, NavSection } from '../../types';
import { NAV_ITEMS } from '../../constants/navigation';
import { UrjaSetuLogo } from '../common/UrjaSetuLogo';

interface SidebarProps {
  activeItem: NavItemId;
  onSelectItem: (id: NavItemId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onReturnToLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeItem,
  onSelectItem,
  isCollapsed,
  onToggleCollapse,
  onReturnToLanding,
}) => {
  const sections: NavSection[] = [
    'CORE',
    'INTELLIGENCE',
    'MONITORING',
    'SYSTEM',
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen border-r border-[#14243A] bg-[#050C16] transition-all duration-300 ease-in-out select-none z-30 shrink-0 ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
      aria-label="UrjaSetu Navigation Sidebar"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-3.5 border-b border-[#14243A] bg-[#060E1A]">
        {isCollapsed ? (
          <UrjaSetuLogo
            size="compact"
            onClick={onReturnToLanding}
            className="mx-auto"
          />
        ) : (
          <UrjaSetuLogo
            size="sm"
            showDescriptor={true}
            onClick={onReturnToLanding}
            className="cursor-pointer"
          />
        )}

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#0E1D30] border border-transparent hover:border-[#1E3352] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Landing Page Quick Back Link */}
      {onReturnToLanding && (
        <div className="px-2 pt-2">
          <button
            onClick={onReturnToLanding}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-[#38BDF8] hover:bg-[#081524] transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Return to UrjaSetu Landing Page"
          >
            <Home className="w-3.5 h-3.5 shrink-0 text-[#38BDF8]" />
            {!isCollapsed && <span className="truncate">Landing Overview</span>}
          </button>
        </div>
      )}

      {/* Categorized Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {sections.map((section) => {
          const sectionItems = NAV_ITEMS.filter((item) => item.section === section);
          if (sectionItems.length === 0) return null;

          return (
            <div key={section} className="space-y-0.5">
              {/* Section Header */}
              <div
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest text-slate-500 font-semibold ${
                  isCollapsed ? 'text-center' : ''
                }`}
              >
                {isCollapsed ? '•' : section}
              </div>

              {sectionItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    title={
                      isCollapsed
                        ? `${item.label} — ${item.description}`
                        : item.description
                    }
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full group relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8] ${
                      isActive
                        ? 'bg-[#0B1E34] text-white border-l-2 border-[#38BDF8] shadow-[inset_0_0_12px_rgba(56,189,248,0.08)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#071322] border-l-2 border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#38BDF8]'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />

                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full min-w-0">
                        <span className="truncate text-left">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`ml-1.5 px-1.5 py-0.5 text-[9px] font-mono rounded tracking-tight ${
                              isActive
                                ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-semibold'
                                : 'bg-[#0E1F33] text-slate-400 border border-[#162C48]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tooltip in collapsed mode */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 rounded-lg bg-[#071324] border border-[#173050] text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-2xl">
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal mt-0.5 max-w-[200px] truncate">
                          {item.description}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom Privacy & Security Status Badge */}
      <div className="p-3 border-t border-[#14243A] bg-[#060E1A]">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-lg border border-[#142842] bg-[#081525]">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="text-[11px] font-semibold tracking-wider text-slate-200">
                  DP-FEDERATED MESH
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#B8FF65] font-semibold">
                ε = 1.28
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight font-sans">
              Decentralized parameters active across 18 simulated DISCOM nodes.
            </p>
            <div className="mt-2 pt-1.5 border-t border-[#102238] flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span>ZERO RAW EXPOSURE</span>
              <span className="text-[#38BDF8]">SECURE AGG</span>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center p-2 rounded-lg border border-[#142842] bg-[#081525] text-center"
            title="UrjaSetu Privacy: Differential Privacy Active (ε = 1.28)"
          >
            <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[9px] font-mono text-[#B8FF65] mt-1 font-semibold">
              ε1.28
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
