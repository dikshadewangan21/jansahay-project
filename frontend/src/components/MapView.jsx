import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * MapView — Leaflet-powered complaint map.
 * Uses dynamic import to avoid SSR issues with Leaflet.
 *
 * Props:
 *   points: Array<{ lat, lng, category, urgencyScore, title, id, slaStatus }>
 *   height: CSS height string (default '400px')
 *   showHeatmap: boolean
 *
 * Color coding:
 *   urgencyScore >= 75 → red (critical/high)
 *   urgencyScore >= 55 → orange (medium)
 *   urgencyScore  < 55 → teal (low)
 *   completed          → green
 */

const URGENCY_COLOR = (score, slaStatus) => {
  if (slaStatus === 'resolved') return '#22c55e';
  if (score >= 75)  return '#ef4444';
  if (score >= 55)  return '#f59e0b';
  return '#06b6d4';
};

const CATEGORY_ICON = {
  water:         '💧', electricity: '⚡', roads: '🛣️',
  sanitation:    '🗑️', health: '🏥', food: '🌾',
  shelter:       '🏠', infrastructure: '🔧', air: '💨',
};

export default function MapView({ points = [], height = '420px', center = [21.2514, 81.6296] }) {
  const mapRef    = useRef(null);
  const mapInst   = useRef(null);
  const markersRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let L;
    let isMounted = true;

    async function initMap() {
      try {
        // Dynamically import Leaflet (avoids window-not-defined in SSR)
        L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        if (!isMounted || !mapRef.current) return;

        // Only initialize once
        if (mapInst.current) {
          mapInst.current.remove();
          mapInst.current = null;
        }

        const map = L.map(mapRef.current, {
          center,
          zoom: 12,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map);

        LRef.current   = L;
        mapInst.current = map;
        if (isMounted) setLoading(false);
      } catch (err) {
        console.error('Map init error:', err);
        if (isMounted) {
          setError('Map failed to load. Is leaflet installed?');
          setLoading(false);
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, []);

  // Store L module in a ref so the marker effect can use it without re-importing
  const LRef = useRef(null);

  // Update markers when points change
  useEffect(() => {
    if (!mapInst.current || loading || !LRef.current) return;

    const L = LRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    points.forEach((p) => {
      if (!p.lat || !p.lng) return;

      const color = URGENCY_COLOR(p.urgencyScore, p.slaStatus);
      const emoji = CATEGORY_ICON[p.category] || '📍';

      // Custom circle marker with colour-coded urgency
      const marker = L.circleMarker([p.lat, p.lng], {
        radius:      p.urgencyScore >= 75 ? 10 : 7,
        fillColor:   color,
        color:       '#0e1117',
        weight:      1.5,
        opacity:     1,
        fillOpacity: 0.85,
      });

      marker.bindPopup(`
        <div style="min-width:180px;font-family:sans-serif">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="font-size:16px">${emoji}</span>
            <strong style="font-size:13px">${p.title || 'Complaint'}</strong>
          </div>
          <div style="font-size:11px;color:#555;margin-bottom:4px">
            📍 ${p.area || p.lat.toFixed(4) + ', ' + p.lng.toFixed(4)}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span style="background:${color}22;color:${color};border:1px solid ${color}44;padding:1px 7px;border-radius:99px;font-size:11px;font-weight:600">
              ${p.urgencyScore}/100
            </span>
            <span style="background:#f3f4f6;color:#374151;padding:1px 7px;border-radius:99px;font-size:11px">
              ${p.category}
            </span>
          </div>
          ${p.voteCount ? `<div style="font-size:11px;color:#888;margin-top:4px">👍 ${p.voteCount} votes</div>` : ''}
        </div>
      `, { maxWidth: 240 });

      marker.addTo(mapInst.current);
      markersRef.current.push(marker);
    });

    // Fit bounds if there are markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInst.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [points, loading]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-pulse-border" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-pulse-surface z-10">
          <Loader2 size={24} className="animate-spin text-pulse-teal" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-pulse-surface z-10">
          <p className="text-sm text-pulse-muted">{error}</p>
        </div>
      )}
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

      {/* Legend */}
      {!loading && !error && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-pulse-surface/90 backdrop-blur border border-pulse-border rounded-lg px-3 py-2">
          <p className="text-[10px] text-pulse-muted font-medium uppercase tracking-wider mb-1.5">Urgency</p>
          {[
            { color: '#ef4444', label: 'Critical / High (75+)' },
            { color: '#f59e0b', label: 'Medium (55–74)' },
            { color: '#06b6d4', label: 'Low (<55)' },
            { color: '#22c55e', label: 'Resolved' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 mb-0.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-pulse-muted">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
