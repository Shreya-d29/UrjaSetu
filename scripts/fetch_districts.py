#!/usr/bin/env python3
"""
Fetch district boundaries from GeoBoundaries API for India (ADM2),
assign each district to a state (ADM1), and write GeoJSON files.

Standard library only. No external dependencies.
"""

import json
import urllib.request
import urllib.error
import subprocess
import sys
import ssl
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

# ============================================================================
# Configuration
# ============================================================================

ADM1_FILE = Path("public/india-states.geojson")
API_URL = "https://www.geoboundaries.org/api/current/gbOpen/IND/ADM2/"
OUTPUT_DIR = Path("public/geo/districts")
COORD_PRECISION = 4


# ============================================================================
# SSL context (macOS certificate handling)
# ============================================================================

def create_ssl_context():
    """Create SSL context for HTTPS requests."""
    ctx = ssl.create_default_context()
    # On macOS, this should use the system certificate store automatically
    return ctx


# ============================================================================
# Geometry utilities
# ============================================================================

def round_coords(coord: List[float], precision: int = 4) -> List[float]:
    """Round coordinates to given precision."""
    return [round(c, precision) for c in coord]


def round_geometry(geom: Dict[str, Any], precision: int = 4) -> Dict[str, Any]:
    """Recursively round all coordinates in a geometry."""
    geom_type = geom.get("type")
    
    if geom_type == "Point":
        geom["coordinates"] = round_coords(geom["coordinates"], precision)
    elif geom_type == "LineString":
        geom["coordinates"] = [round_coords(c, precision) for c in geom["coordinates"]]
    elif geom_type == "Polygon":
        geom["coordinates"] = [
            [round_coords(c, precision) for c in ring]
            for ring in geom["coordinates"]
        ]
    elif geom_type == "MultiPoint":
        geom["coordinates"] = [round_coords(c, precision) for c in geom["coordinates"]]
    elif geom_type == "MultiLineString":
        geom["coordinates"] = [
            [round_coords(c, precision) for c in line]
            for line in geom["coordinates"]
        ]
    elif geom_type == "MultiPolygon":
        geom["coordinates"] = [
            [
                [round_coords(c, precision) for c in ring]
                for ring in poly
            ]
            for poly in geom["coordinates"]
        ]
    
    return geom


def point_in_polygon(point: Tuple[float, float], polygon: List[List[Tuple[float, float]]]) -> bool:
    """
    Ray casting algorithm for point-in-polygon test.
    Point is (lon, lat). Polygon is list of rings with coordinates [(lon, lat), ...].
    """
    x, y = point
    inside = False
    
    # Test against outer ring (first ring)
    if not polygon:
        return False
    
    ring = polygon[0]
    p1x, p1y = ring[0]
    
    for i in range(1, len(ring)):
        p2x, p2y = ring[i]
        
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        
        p1x, p1y = p2x, p2y
    
    return inside


def get_centroid(geometry: Dict[str, Any]) -> Optional[Tuple[float, float]]:
    """
    Get approximate centroid of a geometry.
    For Point: return the point.
    For Polygon/MultiPolygon: compute centroid of first polygon's outer ring.
    """
    geom_type = geometry.get("type")
    
    if geom_type == "Point":
        coords = geometry.get("coordinates", [])
        if len(coords) >= 2:
            return (coords[0], coords[1])
    
    elif geom_type == "Polygon":
        coords = geometry.get("coordinates", [])
        if coords and coords[0]:
            # Centroid of outer ring
            ring = coords[0]
            if ring:
                avg_lon = sum(c[0] for c in ring) / len(ring)
                avg_lat = sum(c[1] for c in ring) / len(ring)
                return (avg_lon, avg_lat)
    
    elif geom_type == "MultiPolygon":
        coords = geometry.get("coordinates", [])
        if coords and coords[0] and coords[0][0]:
            # Centroid of first polygon's outer ring
            ring = coords[0][0]
            if ring:
                avg_lon = sum(c[0] for c in ring) / len(ring)
                avg_lat = sum(c[1] for c in ring) / len(ring)
                return (avg_lon, avg_lat)
    
    return None


# ============================================================================
# API fetching
# ============================================================================

def fetch_json(url: str) -> Dict[str, Any]:
    """Fetch JSON from URL using urllib with error handling."""
    try:
        # Try using urllib first
        ctx = create_ssl_context()
        with urllib.request.urlopen(url, timeout=30, context=ctx) as response:
            data = response.read()
            return json.loads(data)
    except Exception as e1:
        # Fallback to curl if urllib fails (handles macOS SSL issues)
        try:
            print(f"  (urllib failed, trying curl...)", file=sys.stderr)
            result = subprocess.run(
                ["curl", "-sL", url],
                capture_output=True,
                timeout=30,
                text=False,
            )
            if result.returncode != 0:
                raise Exception(f"curl failed with code {result.returncode}")
            return json.loads(result.stdout)
        except Exception as e2:
            print(f"ERROR: Failed to fetch {url}", file=sys.stderr)
            print(f"  urllib error: {e1}", file=sys.stderr)
            print(f"  curl error: {e2}", file=sys.stderr)
            sys.exit(1)


def get_districts_geojson() -> Dict[str, Any]:
    """
    Fetch district GeoJSON from GeoBoundaries API.
    Try simplifiedGeometryGeoJSON first, fall back to gjDownloadURL.
    """
    print(f"Fetching district metadata from {API_URL}...")
    
    metadata = fetch_json(API_URL)
    
    # Try simplified geometry first
    simplified_url = metadata.get("simplifiedGeometryGeoJSON")
    if simplified_url:
        print(f"Downloading simplified geometry from {simplified_url}...")
        return fetch_json(simplified_url)
    
    # Fall back to full geometry
    full_url = metadata.get("gjDownloadURL")
    if full_url:
        print(f"Downloading full geometry from {full_url}...")
        return fetch_json(full_url)
    
    print("ERROR: No geometry URLs found in API response", file=sys.stderr)
    sys.exit(1)


# ============================================================================
# State/district matching
# ============================================================================

def build_state_polygons(adm1_geojson: Dict[str, Any]) -> Dict[str, List[List[Tuple[float, float]]]]:
    """
    Build a map of state name -> list of polygon rings.
    For Polygon: one entry per ring.
    For MultiPolygon: one entry per polygon's outer ring.
    """
    state_polys = {}
    
    for feature in adm1_geojson.get("features", []):
        props = feature.get("properties", {})
        state_name = props.get("cleanName") or props.get("name")
        
        if not state_name:
            continue
        
        geom = feature.get("geometry", {})
        geom_type = geom.get("type")
        coords = geom.get("coordinates", [])
        
        if geom_type == "Polygon" and coords:
            # Store outer ring
            state_polys[state_name] = [coords[0]]
        
        elif geom_type == "MultiPolygon" and coords:
            # Store outer ring of each polygon
            state_polys[state_name] = [poly[0] for poly in coords if poly]
    
    return state_polys


def assign_district_to_state(
    district_centroid: Tuple[float, float],
    state_polygons: Dict[str, List[List[Tuple[float, float]]]],
) -> Optional[str]:
    """
    Find which state contains the district centroid.
    Returns state name or None if not found.
    """
    for state_name, poly_rings in state_polygons.items():
        for ring in poly_rings:
            if point_in_polygon(district_centroid, [ring]):
                return state_name
    
    return None


def state_name_to_slug(state_name: str) -> str:
    """Convert state name to slug for filename."""
    return (
        state_name.lower()
        .replace(" and ", "-")
        .replace(" ", "-")
        .replace("ā", "a")
        .replace("ī", "i")
        .replace("ū", "u")
        .replace("ē", "e")
        .replace("ō", "o")
        .replace("ç", "c")
        .replace("ü", "u")
        .replace("í", "i")
        .replace("ô", "o")
        .replace("š", "s")
        .replace("ž", "z")
        .replace("&", "and")
        .replace("(", "")
        .replace(")", "")
        .replace(",", "")
        .replace("'", "")
    )


# ============================================================================
# Main
# ============================================================================

def main():
    """Main entry point."""
    
    # Check ADM1 file exists
    if not ADM1_FILE.exists():
        print(f"ERROR: ADM1 file not found: {ADM1_FILE}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Loading ADM1 boundaries from {ADM1_FILE}...")
    with open(ADM1_FILE) as f:
        adm1_geojson = json.load(f)
    
    # Build state polygon map
    state_polygons = build_state_polygons(adm1_geojson)
    print(f"Loaded {len(state_polygons)} states from ADM1 file")
    print(f"States: {', '.join(sorted(state_polygons.keys()))}\n")
    
    # Fetch districts
    districts_geojson = get_districts_geojson()
    districts = districts_geojson.get("features", [])
    print(f"Fetched {len(districts)} districts\n")
    
    # Assign districts to states
    state_districts: Dict[str, List[Dict[str, Any]]] = {}
    unmatched_districts = []
    
    for i, feature in enumerate(districts):
        props = feature.get("properties", {})
        district_name = props.get("shapeName") or props.get("name", f"District_{i}")
        geom = feature.get("geometry", {})
        
        # Get centroid
        centroid = get_centroid(geom)
        if not centroid:
            print(f"WARNING: Could not compute centroid for {district_name}")
            unmatched_districts.append(district_name)
            continue
        
        # Find matching state
        state = assign_district_to_state(centroid, state_polygons)
        
        if not state:
            unmatched_districts.append(district_name)
            continue
        
        # Add to state
        if state not in state_districts:
            state_districts[state] = []
        
        # Round geometry and add to collection
        rounded_geom = round_geometry(geom, COORD_PRECISION)
        state_districts[state].append({
            "type": "Feature",
            "properties": {
                "name": district_name,
                "state": state,
            },
            "geometry": rounded_geom,
        })
    
    # Write GeoJSON files per state
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("Writing district GeoJSON files:")
    print("-" * 60)
    
    for state_name in sorted(state_districts.keys()):
        features = state_districts[state_name]
        slug = state_name_to_slug(state_name)
        output_file = OUTPUT_DIR / f"{slug}.json"
        
        geojson = {
            "type": "FeatureCollection",
            "features": features,
        }
        
        with open(output_file, "w") as f:
            json.dump(geojson, f, separators=(",", ":"))
        
        print(f"{state_name:40s} {len(features):3d} districts  →  {output_file.name}")
    
    print("-" * 60)
    print(f"Total: {sum(len(f) for f in state_districts.values())} districts written\n")
    
    # Report unmatched
    if unmatched_districts:
        print(f"WARNING: {len(unmatched_districts)} districts not matched to any state:")
        for district in sorted(unmatched_districts):
            print(f"  - {district}")
    else:
        print("✓ All districts successfully matched to states")


if __name__ == "__main__":
    main()
