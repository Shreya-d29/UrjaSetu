import React, { useState, useMemo, useRef } from 'react';
import { AlertCircle, Map, TrendingUp, Scale, ZoomIn } from 'lucide-react';
import { STATE_TO_REGION_MAP } from '../../constants/gridData';
import cityStreamData from '../../data/cityStream.json';
import districtStreamData from '../../data/districtStream.json';

// Module-level cache for loaded GeoJSON files
const geoJsonCache: Record<string, GeoJSONData> = {};

type MetricType = 'score' | 'anomalyRate' | 'flaggedCount' | 'estimatedLoss';

interface DistrictStats {
  n: number;
  flagged: number;
  trueAnomalies: number;
  avgScore: number;
}

interface DistrictMetrics extends DistrictStats {
  district: string;
  state: string;
  smoothedMetric: number;
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: { name: string; state: string };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Compute flagThreshold once globally
const computeFlagThreshold = (): number => {
  const scores = (cityStreamData.stream as any[]).map((m: any) => m.score);
  scores.sort((a, b) => a - b);
  const n = scores.length;
  return scores[Math.floor(n * 0.85)];
};

const FLAG_THRESHOLD = computeFlagThreshold();

const projectToSVG = (
  lon: number,
  lat: number,
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  width: number,
  height: number
): [number, number] => {
  const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width;
  const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
  return [x, y];
};

const computeBounds = (coords: number[][]): { minLon: number; maxLon: number; minLat: number; maxLat: number } => {
  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  coords.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  return { minLon, maxLon, minLat, maxLat };
};

const flattenCoordinates = (coords: number[][][] | number[][][][] | number[][]): number[][] => {
  const result: number[][] = [];
  const process = (c: any) => {
    if (Array.isArray(c[0])) {
      if (typeof c[0][0] === 'number') {
        result.push(...(c as number[][]));
      } else {
        c.forEach(process);
      }
    }
  };
  process(coords);
  return result;
};

export const StateDeepDive: React.FC<{ preselectedState?: string }> = ({ preselectedState }) => {
  const allStates = Object.keys(STATE_TO_REGION_MAP).sort();
  const [selectedState, setSelectedState] = useState<string>(
    preselectedState && STATE_TO_REGION_MAP[preselectedState]
      ? preselectedState
      : allStates[0]
  );
  const [metric, setMetric] = useState<MetricType>('score');
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Load and parse district stream data
  const districtData = useMemo(() => {
    const stateData = (districtStreamData.data as any)[selectedState];
    if (!stateData) return { districts: [], stateRate: 0 };

    const districts: DistrictMetrics[] = [];

    Object.entries(stateData).forEach(([districtName, stats]: [string, any]) => {
      districts.push({
        district: districtName,
        state: selectedState,
        n: stats.n,
        flagged: stats.flagged,
        trueAnomalies: stats.trueAnomalies,
        avgScore: stats.avgScore,
        smoothedMetric: 0, // will be computed after shrinkage
      });
    });

    // Compute shrinkage: (flagged + 10*stateRate) / (n + 10)
    const stateStats = districts.reduce(
      (acc, d) => ({
        totalFlagged: acc.totalFlagged + d.flagged,
        totalMeters: acc.totalMeters + d.n,
      }),
      { totalFlagged: 0, totalMeters: 0 }
    );
    const stateRate = stateStats.totalMeters > 0 ? stateStats.totalFlagged / stateStats.totalMeters : 0;

    // Apply shrinkage
    districts.forEach((d) => {
      const metric_val =
        metric === 'score'
          ? d.avgScore
          : metric === 'anomalyRate'
            ? (d.trueAnomalies / d.n) * 100
            : metric === 'flaggedCount'
              ? (d.flagged / d.n) * 100
              : d.flagged > 0
                ? (d.flagged * 10) / d.n
                : 0;

      d.smoothedMetric = (metric_val + 10 * stateRate) / (1 + 10 / d.n);
    });

    return { districts, stateRate };
  }, [selectedState, metric]);

  // Load district GeoJSON with proper caching and error handling
  const { districtGeoJSON } = useMemo(() => {
    const slug = selectedState
      .toLowerCase()
      .replace(/ and /g, '-')
      .replace(/ /g, '-')
      .replace(/[āīūēōç]/g, (c) => ({ ā: 'a', ī: 'i', ū: 'u', ē: 'e', ō: 'o', ç: 'c' }[c] || c))
      .replace(/[^a-z0-9-]/g, '');

    // Check module-level cache
    if (slug in geoJsonCache) {
      return { districtGeoJSON: geoJsonCache[slug] };
    }

    return { districtGeoJSON: null };
  }, [selectedState]);

  // Load GeoJSON files with proper error handling
  React.useEffect(() => {
    const slug = selectedState
      .toLowerCase()
      .replace(/ and /g, '-')
      .replace(/ /g, '-')
      .replace(/[āīūēōç]/g, (c) => ({ ā: 'a', ī: 'i', ū: 'u', ē: 'e', ō: 'o', ç: 'c' }[c] || c))
      .replace(/[^a-z0-9-]/g, '');

    // If already cached, use it
    if (slug in geoJsonCache) {
      setLoadError(null);
      return;
    }

    // Fetch the GeoJSON
    fetch(`/geo/districts/${slug}.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        geoJsonCache[slug] = data;
        setLoadError(null);
      })
      .catch((error) => {
        console.error(`Failed to load district GeoJSON for ${selectedState}:`, error);
        setLoadError(`District map unavailable for this state (${error instanceof Error ? error.message : 'unknown error'})`);
      });
  }, [selectedState]);

  // Neighbor smoothing with centroid distance
  const smoothedDistricts = useMemo(() => {
    if (districtData.districts.length === 0 || !districtGeoJSON) return districtData.districts;

    // Compute centroids for all districts
    const centroids: Record<string, [number, number]> = {};
    districtGeoJSON.features.forEach((feature) => {
      const coords = flattenCoordinates(feature.geometry.coordinates);
      if (coords.length > 0) {
        const avgLon = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
        const avgLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
        centroids[feature.properties.name] = [avgLon, avgLat];
      }
    });

    // Compute pairwise distances
    const NEIGHBOR_DISTANCE = 0.5; // degrees (roughly 50 km at equator)
    const smoothed = districtData.districts.map((d) => {
      const centroid = centroids[d.district];
      if (!centroid) return d;

      const neighbors = districtData.districts.filter((other) => {
        const otherCentroid = centroids[other.district];
        if (!otherCentroid) return false;
        const dist = Math.sqrt(
          Math.pow(centroid[0] - otherCentroid[0], 2) + Math.pow(centroid[1] - otherCentroid[1], 2)
        );
        return dist < NEIGHBOR_DISTANCE && dist > 0;
      });

      const avgMetric =
        neighbors.length > 0
          ? (d.smoothedMetric + neighbors.reduce((sum, n) => sum + n.smoothedMetric, 0)) / (neighbors.length + 1)
          : d.smoothedMetric;

      return { ...d, smoothedMetric: avgMetric };
    });

    return smoothed;
  }, [districtData, districtGeoJSON]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalMeters = districtData.districts.reduce((sum, d) => sum + d.n, 0);
    const flaggedMeters = districtData.districts.reduce((sum, d) => sum + d.flagged, 0);
    const anomalies = districtData.districts.reduce((sum, d) => sum + d.trueAnomalies, 0);

    const nationalFlaggedMeters = (cityStreamData.stream as any[]).filter(
      (m: any) => m.score >= FLAG_THRESHOLD
    ).length;
    const nationalTotal = (cityStreamData.stream as any[]).length;

    return {
      totalMeters,
      flaggedMeters,
      flaggedPercent: totalMeters > 0 ? (flaggedMeters / totalMeters) * 100 : 0,
      anomalies,
      trueAnomalyPercent: totalMeters > 0 ? (anomalies / totalMeters) * 100 : 0,
      nationalFlaggedPercent: nationalTotal > 0 ? (nationalFlaggedMeters / nationalTotal) * 100 : 0,
    };
  }, [districtData]);

  // Color mapping
  const getMetricColor = (smoothedValue: number): string => {
    if (metric === 'score') {
      if (smoothedValue >= 0.7) return '#EF4444';
      if (smoothedValue >= 0.5) return '#F59E0B';
      if (smoothedValue >= 0.3) return '#FBBF24';
      return '#10B981';
    } else {
      // For percentages
      if (smoothedValue >= 20) return '#EF4444';
      if (smoothedValue >= 13) return '#F59E0B';
      if (smoothedValue >= 6) return '#FBBF24';
      return '#10B981';
    }
  };

  // Render SVG choropleth with memoized path strings
  const renderChoropleth = useMemo(() => {
    if (loadError) {
      return (
        <g>
          <text x="200" y="250" textAnchor="middle" dy="0.3em" fill="#ef4444" fontSize="13" fontWeight="bold">
            {loadError}
          </text>
        </g>
      );
    }

    if (!districtGeoJSON) {
      return (
        <g>
          <text x="200" y="250" textAnchor="middle" dy="0.3em" fill="#94a3b8" fontSize="12">
            Loading district map...
          </text>
        </g>
      );
    }

    const PADDING = 20;
    const svgWidth = 400;
    const svgHeight = 500;
    const mapWidth = svgWidth - 2 * PADDING;
    const mapHeight = svgHeight - 2 * PADDING;

    // Compute bounds
    const allCoords = districtGeoJSON.features.flatMap((f: GeoJSONFeature) => flattenCoordinates(f.geometry.coordinates));
    if (allCoords.length === 0) {
      return (
        <g>
          <text x="200" y="250" textAnchor="middle" dy="0.3em" fill="#94a3b8" fontSize="12">
            No boundary data
          </text>
        </g>
      );
    }

    const bounds = computeBounds(allCoords);
    const metricsMap: Record<string, DistrictMetrics> = {};
    smoothedDistricts.forEach((d) => {
      metricsMap[d.district] = d;
    });

    // Find min/max for color scaling
    const metricValues = smoothedDistricts.map((d) => d.smoothedMetric);
    const minMetric = Math.min(...metricValues);
    const maxMetric = Math.max(...metricValues);
    const metricRange = maxMetric - minMetric || 1;

    return (
      <g>
        {/* State outline and districts */}
        {districtGeoJSON.features.map((feature: GeoJSONFeature) => {
          const districtName = feature.properties.name;
          const metrics = metricsMap[districtName];
          const smoothedValue = metrics?.smoothedMetric ?? 0;

          // Normalize to [0, 1]
          const normalized = (smoothedValue - minMetric) / metricRange;

          // Green -> Amber -> Red scale
          let fillColor = '#10B981'; // green
          if (normalized > 0.66) {
            fillColor = '#EF4444'; // red
          } else if (normalized > 0.33) {
            fillColor = '#F59E0B'; // amber
          }

          const isSelected = selectedDistrict === districtName;
          const isHovered = hoveredDistrict === districtName;

          return (
            <g key={districtName}>
              {/* Render polygon(s) */}
              {(feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates).map(
                (ringSet: any, idx: number) => {
                  const rings = feature.geometry.type === 'Polygon' ? [ringSet as number[][]] : (ringSet as number[][][]);
                  return (
                    <g key={`${districtName}-${idx}`}>
                      {rings.map((ring, ringIdx) => {
                        const pathD = ring
                          .map((coord, i) => {
                            const [x, y] = projectToSVG(coord[0], coord[1], bounds, mapWidth, mapHeight);
                            return `${i === 0 ? 'M' : 'L'} ${PADDING + x} ${PADDING + y}`;
                          })
                          .join(' ');

                        return (
                          <path
                            key={`${districtName}-ring-${ringIdx}`}
                            d={pathD}
                            fill={fillColor}
                            fillOpacity={isSelected ? 0.9 : isHovered ? 0.8 : 0.7}
                            stroke="#38BDF8"
                            strokeWidth={isSelected ? 1.5 : 0.5}
                            strokeOpacity={0.5}
                            style={{ cursor: 'pointer', transition: 'all 150ms' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDistrict(districtName);
                            }}
                            onMouseEnter={() => setHoveredDistrict(districtName)}
                            onMouseLeave={() => setHoveredDistrict(null)}
                          />
                        );
                      })}
                    </g>
                  );
                }
              )}

              {/* District label (if not too small) */}
              {(() => {
                const ringCoords = (
                  feature.geometry.type === 'Polygon'
                    ? (feature.geometry.coordinates[0] as number[][])
                    : (feature.geometry.coordinates[0][0] as number[][])
                ) || [];
                if (ringCoords.length === 0) return null;

                const bounds_local = computeBounds(ringCoords);
                const centerLon = (bounds_local.minLon + bounds_local.maxLon) / 2;
                const centerLat = (bounds_local.minLat + bounds_local.maxLat) / 2;
                const [cx, cy] = projectToSVG(centerLon, centerLat, bounds, mapWidth, mapHeight);

                const width_deg = bounds_local.maxLon - bounds_local.minLon;
                const height_deg = bounds_local.maxLat - bounds_local.minLat;
                const area_deg2 = width_deg * height_deg;

                // Only show label for larger districts or on hover
                if (area_deg2 < 0.05 && !isHovered) return null;

                return (
                  <text
                    key={`${districtName}-label`}
                    x={PADDING + cx}
                    y={PADDING + cy}
                    textAnchor="middle"
                    dy="0.3em"
                    fontSize={isHovered ? '11' : '9'}
                    fill="#e2e8f0"
                    fontWeight={isSelected ? '600' : '400'}
                    style={{
                      pointerEvents: 'none',
                      textShadow: '0 0 2px rgba(5, 11, 20, 0.8)',
                      transition: 'font-size 150ms',
                    }}
                  >
                    {districtName.length > 20 ? districtName.substring(0, 17) + '...' : districtName}
                  </text>
                );
              })()}
            </g>
          );
        })}
      </g>
    );
  }, [districtGeoJSON, smoothedDistricts, selectedDistrict, hoveredDistrict, loadError]);

  const districtRowData = smoothedDistricts.sort((a, b) => b.smoothedMetric - a.smoothedMetric);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#050B14] text-slate-100 p-6 gap-4">
      {/* Banner */}
      <div className="rounded-lg bg-[#38BDF8]/5 border border-[#38BDF8]/20 p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-[#38BDF8] flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate-400">
            District boundaries are real; meter placement is simulated; scores come from the DP-FedAvg model.
          </p>
          <p className="text-[10px] text-slate-500">
            Flagged = top 15% of all scores (score ≥ {FLAG_THRESHOLD.toFixed(4)})
          </p>
        </div>
      </div>

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[#0A1422] border border-[#14263D]">
          <div className="text-xs font-mono text-slate-400 mb-1">STATE FLAGGED %</div>
          <div className="text-2xl font-bold text-white">
            {stats.flaggedPercent.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.flaggedMeters} of {stats.totalMeters}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#0A1422] border border-[#14263D]">
          <div className="text-xs font-mono text-slate-400 mb-1">NATIONAL FLAGGED %</div>
          <div className="text-2xl font-bold text-[#38BDF8]">
            {stats.nationalFlaggedPercent.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">All 36 states (top 15%)</div>
        </div>

        <div className="p-4 rounded-lg bg-[#0A1422] border border-[#14263D]">
          <div className="text-xs font-mono text-slate-400 mb-1">TRUE ANOMALY %</div>
          <div className="text-2xl font-bold text-[#F59E0B]">
            {stats.trueAnomalyPercent.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.anomalies} labeled anomalies
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 items-center flex-wrap">
        <label className="text-xs font-mono text-slate-400">STATE:</label>
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-3 py-1.5 text-sm bg-[#0A1422] border border-[#14263D] rounded text-white font-mono focus:outline-none focus:border-[#38BDF8]"
        >
          {allStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        <label className="text-xs font-mono text-slate-400">METRIC:</label>
        <div className="flex gap-1">
          {(['score', 'anomalyRate', 'flaggedCount', 'estimatedLoss'] as MetricType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2.5 py-1.5 text-xs font-mono rounded transition-all ${
                metric === m
                  ? 'bg-[#38BDF8] text-[#050B14]'
                  : 'bg-[#0A1422] border border-[#14263D] text-slate-400 hover:border-[#38BDF8]'
              }`}
            >
              {m === 'score' ? 'Score' : m === 'anomalyRate' ? 'Anom %' : m === 'flaggedCount' ? 'Flagged' : 'Loss'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`px-2.5 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1 ${
            compareMode
              ? 'bg-[#B8FF65]/20 border border-[#B8FF65]/40 text-[#B8FF65]'
              : 'bg-[#0A1422] border border-[#14263D] text-slate-400 hover:border-[#38BDF8]'
          }`}
        >
          <Scale className="w-3 h-3" />
          Compare
        </button>
      </div>

      {/* Map + Table */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* District Choropleth */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Map className="w-3.5 h-3.5" />
              {selectedState} Choropleth
            </h3>
            <div className="text-[10px] text-slate-500 flex gap-2">
              <span>● Green (Low)</span>
              <span>● Amber (Mid)</span>
              <span>● Red (High)</span>
            </div>
          </div>
          <div className="flex-1 bg-[#0A1422] rounded-lg border border-[#14263D] p-3 overflow-hidden relative flex items-center justify-center">
            <svg
              ref={svgRef}
              viewBox="0 0 400 500"
              className="w-full h-full"
              style={{ display: 'block' }}
            >
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {renderChoropleth}
            </svg>
          </div>
        </div>

        {/* Table */}
        <div className="flex flex-col min-h-0">
          <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Districts (Ranked)
          </h3>
          <div className="flex-1 bg-[#0A1422] rounded-lg border border-[#14263D] overflow-hidden flex flex-col">
            <div className="grid grid-cols-5 gap-2 p-3 bg-[#050B14] border-b border-[#14263D] flex-shrink-0 sticky top-0">
              <div className="text-[10px] font-mono font-semibold text-slate-400 uppercase">District</div>
              <div className="text-[10px] font-mono font-semibold text-slate-400 uppercase text-right">Meters</div>
              <div className="text-[10px] font-mono font-semibold text-slate-400 uppercase text-right">
                {metric === 'score' ? 'Score' : 'Rate %'}
              </div>
              <div className="text-[10px] font-mono font-semibold text-slate-400 uppercase text-right">Flagged</div>
              <div className="text-[10px] font-mono font-semibold text-slate-400 uppercase text-right">Info</div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {districtRowData.map((district) => {
                const isSelected = selectedDistrict === district.district;
                const metricVal =
                  metric === 'score'
                    ? district.avgScore
                    : metric === 'anomalyRate'
                      ? (district.trueAnomalies / district.n) * 100
                      : metric === 'flaggedCount'
                        ? (district.flagged / district.n) * 100
                        : district.flagged > 0
                          ? (district.flagged * 10) / district.n
                          : 0;
                const color = getMetricColor(district.smoothedMetric);

                return (
                  <div
                    key={`${district.district}-row`}
                    data-district={district.district}
                    onClick={() => setSelectedDistrict(district.district)}
                    className={`grid grid-cols-5 gap-2 p-2.5 border-b border-[#14263D] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#38BDF8]/20 border-l-2 border-l-[#38BDF8]'
                        : 'hover:bg-[#0E2036]'
                    }`}
                  >
                    <div className="font-mono text-slate-300 truncate text-xs">{district.district}</div>
                    <div className="text-right font-mono text-slate-400 text-xs">{district.n}</div>
                    <div className="text-right font-mono font-semibold text-xs" style={{ color }}>
                      {metricVal.toFixed(2)}
                    </div>
                    <div className="text-right text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                          district.flagged > 0
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}
                      >
                        {district.flagged}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDistrict(district.district);
                      }}
                      className="text-[#38BDF8] hover:text-[#B8FF65] transition-colors justify-self-end"
                      title="View details"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
