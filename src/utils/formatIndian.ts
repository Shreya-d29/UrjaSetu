/**
 * Centralized India-specific formatting utilities for UrjaSetu.
 * 
 * Ensures consistent:
 * - Currency (INR with Indian digit grouping)
 * - Energy and Power units (kWh, MWh, GWh, kW, MW)
 * - Dates and timestamps (IST, DD MMM YYYY)
 * - Geographic coordinates
 * - Proper unit conversion with mathematical correctness
 * 
 * CRITICAL: Never confuse power (kW/MW) with energy (kWh/MWh).
 */

// ━━━ Currency ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format currency in Indian Rupees with Indian digit grouping (lakhs, crores).
 * Example: 12500000 → "₹1.25 Cr"
 */
export function formatINR(value: number, options?: { compact?: boolean; decimals?: number }): string {
  const { compact = false, decimals = 2 } = options || {};

  if (compact) {
    // Crore (1,00,00,000)
    if (Math.abs(value) >= 10000000) {
      return `₹${(value / 10000000).toFixed(decimals)} Cr`;
    }
    // Lakh (1,00,000)
    if (Math.abs(value) >= 100000) {
      return `₹${(value / 100000).toFixed(decimals)} L`;
    }
    // Thousand
    if (Math.abs(value) >= 1000) {
      return `₹${(value / 1000).toFixed(decimals)} K`;
    }
    return `₹${value.toFixed(decimals)}`;
  }

  // Full Indian number formatting with proper grouping
  return value.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ━━━ Energy & Power ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format energy in kWh with automatic unit scaling.
 * IMPORTANT: This is for ENERGY (kWh), not POWER (kW).
 * Example: 1500000 kWh → "1.50 MWh"
 */
export function formatEnergy(kWh: number, options?: { decimals?: number; showUnit?: boolean }): string {
  const { decimals = 2, showUnit = true } = options || {};

  // GWh (1,000,000 kWh)
  if (Math.abs(kWh) >= 1000000) {
    const val = (kWh / 1000000).toFixed(decimals);
    return showUnit ? `${val} GWh` : val;
  }
  // MWh (1,000 kWh)
  if (Math.abs(kWh) >= 1000) {
    const val = (kWh / 1000).toFixed(decimals);
    return showUnit ? `${val} MWh` : val;
  }
  // kWh
  const val = kWh.toFixed(decimals);
  return showUnit ? `${val} kWh` : val;
}

/**
 * Format power in kW with automatic unit scaling.
 * IMPORTANT: This is for POWER (kW), not ENERGY (kWh).
 * Example: 15000 kW → "15.00 MW"
 */
export function formatPower(kW: number, options?: { decimals?: number; showUnit?: boolean }): string {
  const { decimals = 2, showUnit = true } = options || {};

  // GW (1,000,000 kW)
  if (Math.abs(kW) >= 1000000) {
    const val = (kW / 1000000).toFixed(decimals);
    return showUnit ? `${val} GW` : val;
  }
  // MW (1,000 kW)
  if (Math.abs(kW) >= 1000) {
    const val = (kW / 1000).toFixed(decimals);
    return showUnit ? `${val} MW` : val;
  }
  // kW
  const val = kW.toFixed(decimals);
  return showUnit ? `${val} kW` : val;
}

/**
 * Format "units" — user-friendly label for kWh used in consumer billing.
 * Example: 250.5 → "250.5 units"
 */
export function formatUnits(kWh: number, decimals: number = 1): string {
  return `${kWh.toFixed(decimals)} units`;
}

// ━━━ Dates & Time ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format date in Indian standard: DD MMM YYYY
 * Example: 2026-10-20 → "20 Oct 2026"
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Format timestamp with IST time.
 * Example: "20 Oct 2026, 14:30 IST"
 */
export function formatTimestamp(date: Date | string | number, options?: { showSeconds?: boolean }): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const { showSeconds = false } = options || {};

  const dateStr = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });

  return `${dateStr}, ${timeStr} IST`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  return formatDate(d);
}

// ━━━ Geographic ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format geographic coordinates.
 * Example: (28.6139, 77.2090) → "28.61°N, 77.21°E"
 */
export function formatCoordinates(lat: number, lng: number, decimals: number = 2): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(decimals)}°${latDir}, ${Math.abs(lng).toFixed(decimals)}°${lngDir}`;
}

// ━━━ Numbers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format percentage with Indian conventions.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with Indian digit grouping (lakhs, crores).
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ━━━ Temperature ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format temperature in Celsius.
 */
export function formatTemperature(celsius: number, decimals: number = 1): string {
  return `${celsius.toFixed(decimals)}°C`;
}

// ━━━ Distance ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format distance in kilometers.
 */
export function formatDistance(km: number, decimals: number = 1): string {
  return `${km.toFixed(decimals)} km`;
}

// ━━━ Differential Privacy ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format epsilon (ε) for differential privacy budget.
 */
export function formatEpsilon(epsilon: number, decimals: number = 2): string {
  return `ε = ${epsilon.toFixed(decimals)}`;
}

/**
 * Format delta (δ) for differential privacy.
 */
export function formatDelta(delta: number): string {
  if (delta >= 0.0001) {
    return `δ = ${delta.toFixed(6)}`;
  }
  // Scientific notation for very small deltas
  return `δ = ${delta.toExponential(0)}`;
}
