#!/usr/bin/env python3
"""
Simplify district GeoJSON files by rounding coordinates to 3 decimals
and dropping every second point for rings with >200 points.
Regenerates files over 500 KB.
"""

import json
import os
import sys
from pathlib import Path

def simplify_ring(ring, max_points=200):
    """Simplify a coordinate ring by dropping every second point if too long."""
    if len(ring) <= max_points:
        return ring
    
    # Keep first and last point, skip every other in the middle
    simplified = [ring[0]]
    for i in range(1, len(ring) - 1, 2):
        simplified.append(ring[i])
    simplified.append(ring[-1])
    return simplified

def round_coords(coords, decimals=3):
    """Recursively round all coordinates to N decimals."""
    if isinstance(coords, (int, float)):
        return round(coords, decimals)
    if isinstance(coords, list):
        if len(coords) == 2 and isinstance(coords[0], (int, float)):
            # This is a coordinate pair [lon, lat]
            return [round(coords[0], decimals), round(coords[1], decimals)]
        # Recursively process lists
        return [round_coords(c, decimals) for c in coords]
    return coords

def simplify_geometry(geometry):
    """Simplify a geometry object."""
    geom_type = geometry.get('type')
    coords = geometry.get('coordinates', [])
    
    if geom_type == 'Polygon':
        # coords = [ring1, ring2, ...]
        simplified_rings = []
        for ring in coords:
            ring = simplify_ring(ring)
            ring = round_coords(ring, 3)
            simplified_rings.append(ring)
        geometry['coordinates'] = simplified_rings
    
    elif geom_type == 'MultiPolygon':
        # coords = [[ring1, ring2, ...], [ring1, ring2, ...], ...]
        simplified_polygons = []
        for polygon_rings in coords:
            simplified_rings = []
            for ring in polygon_rings:
                ring = simplify_ring(ring)
                ring = round_coords(ring, 3)
                simplified_rings.append(ring)
            simplified_polygons.append(simplified_rings)
        geometry['coordinates'] = simplified_polygons
    
    return geometry

def simplify_geojson(geojson):
    """Simplify an entire GeoJSON FeatureCollection."""
    features = geojson.get('features', [])
    for feature in features:
        if 'geometry' in feature:
            feature['geometry'] = simplify_geometry(feature['geometry'])
    return geojson

def process_file(filepath, size_limit_kb=500):
    """Process a single GeoJSON file if it exceeds size limit."""
    size_kb = os.path.getsize(filepath) / 1024
    filename = os.path.basename(filepath)
    
    if size_kb <= size_limit_kb:
        print(f"✓ {filename:40s} {size_kb:7.1f} KB (OK)")
        return
    
    print(f"⚠ {filename:40s} {size_kb:7.1f} KB (simplifying...)")
    
    try:
        with open(filepath, 'r') as f:
            geojson = json.load(f)
        
        # Simplify
        simplified = simplify_geojson(geojson)
        
        # Write back
        with open(filepath, 'w') as f:
            json.dump(simplified, f, separators=(',', ':'))
        
        new_size_kb = os.path.getsize(filepath) / 1024
        reduction = ((size_kb - new_size_kb) / size_kb) * 100
        print(f"  → {new_size_kb:7.1f} KB (-{reduction:.1f}%)")
    
    except Exception as e:
        print(f"  ✗ ERROR: {e}")
        sys.exit(1)

def main():
    districts_dir = Path(__file__).parent.parent / 'public' / 'geo' / 'districts'
    
    if not districts_dir.exists():
        print(f"Error: Directory not found: {districts_dir}")
        sys.exit(1)
    
    print(f"\nSimplifying GeoJSON files in {districts_dir}")
    print(f"Size limit: 500 KB | Coordinate decimals: 3 | Skip points: every 2nd if >200\n")
    
    geojson_files = sorted(districts_dir.glob('*.json'))
    print(f"Processing {len(geojson_files)} files...\n")
    
    for filepath in geojson_files:
        process_file(str(filepath))
    
    print("\nDone!")

if __name__ == '__main__':
    main()
