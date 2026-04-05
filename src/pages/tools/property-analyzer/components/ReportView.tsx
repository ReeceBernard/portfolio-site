import React, { useRef, useEffect } from 'react';
import type { Scenario, ResolvedAddress, RentalComp, SalesComp } from '../types';
import { MetricsGrid } from './MetricsGrid';
import { ThirtyYearTable } from './ThirtyYearTable';

interface Props {
  scenarios: Scenario[];
  subjectAddress: string;
  subject: ResolvedAddress;
  comps: RentalComp[];
  salesComps: SalesComp[];
}

function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

const TILE_SIZE = 256;
function lonToPixelX(lon: number, zoom: number) {
  return ((lon + 180) / 360) * Math.pow(2, zoom) * TILE_SIZE;
}
function latToPixelY(lat: number, zoom: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, zoom) * TILE_SIZE;
}

function CompsSvgMap({ subject, comps, salesComps }: { subject: ResolvedAddress; comps: RentalComp[]; salesComps: SalesComp[] }) {
  const W = 1104;
  const H = 300;
  const PAD = 12;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const validSales = salesComps.filter((c) => c.lat != null && c.lon != null);

    // Pick zoom so all points fit with padding
    const allLons = [subject.lon, ...validSales.map((c) => c.lon as number)];
    const lonSpan = Math.max(...allLons) - Math.min(...allLons);
    let zoom = 14;
    for (let z = 16; z >= 11; z--) {
      if (lonSpan * (Math.pow(2, z) * TILE_SIZE / 360) < W * 0.7) { zoom = z; break; }
    }

    const centerPx = lonToPixelX(subject.lon, zoom);
    const centerPy = latToPixelY(subject.lat, zoom);
    const originPx = centerPx - W / 2;
    const originPy = centerPy - H / 2;
    const toX = (lon: number) => lonToPixelX(lon, zoom) - originPx;
    const toY = (lat: number) => latToPixelY(lat, zoom) - originPy;

    const tileCount = 1 << zoom;
    const startTX = Math.floor(originPx / TILE_SIZE);
    const endTX = Math.ceil((originPx + W) / TILE_SIZE);
    const startTY = Math.floor(originPy / TILE_SIZE);
    const endTY = Math.ceil((originPy + H) / TILE_SIZE);

    // Gray fallback while tiles load
    ctx.fillStyle = '#e8e0d5';
    ctx.fillRect(0, 0, W, H);

    const tilePromises: Promise<void>[] = [];
    for (let tx = startTX; tx < endTX; tx++) {
      for (let ty = startTY; ty < endTY; ty++) {
        if (ty < 0 || ty >= tileCount) continue;
        const wtx = ((tx % tileCount) + tileCount) % tileCount;
        const dx = tx * TILE_SIZE - originPx;
        const dy = ty * TILE_SIZE - originPy;
        tilePromises.push(new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => { ctx.drawImage(img, dx, dy); resolve(); };
          img.onerror = () => resolve();
          img.src = `https://tile.openstreetmap.org/${zoom}/${wtx}/${ty}.png`;
        }));
      }
    }

    Promise.all(tilePromises).then(() => {
      const drawMarker = (cx: number, cy: number, fill: string, label: string, r = 11) => {
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fillStyle = fill; ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'white'; ctx.font = 'bold 10px system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
      };

      validSales.forEach((comp, i) => drawMarker(toX(comp.lon as number), toY(comp.lat as number), '#a78bfa', String(i + 1)));
      drawMarker(toX(subject.lon), toY(subject.lat), '#16a34a', 'S', 13);

      // Attribution + legend
      const legendW = 190, legendH = 20;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillRect(PAD, H - legendH - 4, legendW, legendH);
      ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 0.5;
      ctx.strokeRect(PAD, H - legendH - 4, legendW, legendH);
      const dot = (x: number, color: string) => {
        ctx.beginPath(); ctx.arc(x, H - 14, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
      };
      dot(PAD + 8, '#16a34a');
      ctx.fillStyle = '#374151'; ctx.font = '10px system-ui,sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('Subject', PAD + 16, H - 14);
      dot(PAD + 78, '#a78bfa');
      ctx.fillText('Sales comps', PAD + 86, H - 14);

      // OSM attribution (required)
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(W - 160, H - 16, 156, 14);
      ctx.fillStyle = '#555'; ctx.font = '9px system-ui,sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('© OpenStreetMap contributors', W - 4, H - 9);
    });
  }, [subject, comps, salesComps]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ border: '1px solid #e5e7eb', borderRadius: '6px', display: 'block' }}
    />
  );
}

export const ReportView = React.forwardRef<HTMLDivElement, Props>(
  ({ scenarios, subjectAddress, subject, comps, salesComps }, ref) => {
    return (
      <div
        ref={ref}
        style={{ width: '1200px', backgroundColor: '#fff', fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Page 1: Header + Comps */}
        <div data-pdf-page style={{ padding: '48px' }}>
        {/* Header */}
        <div style={{ borderBottom: '2px solid #16a34a', paddingBottom: '16px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Property Investment Analysis</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>{subjectAddress}</p>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
            Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Comps section */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>Comps</h2>

          {/* SVG map — full width */}
          <CompsSvgMap subject={subject} comps={comps} salesComps={salesComps} />

          {/* Rental comp list */}
          <div style={{ marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Address</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Beds/Baths</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Sqft</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Listed</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Monthly Rent</th>
                  </tr>
                </thead>
                <tbody>
                  {comps.map((comp, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px', color: '#6b7280', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '8px' }}>
                        <a
                          href={googleMapsUrl(comp.address)}
                          style={{ color: '#2563eb', textDecoration: 'underline' }}
                        >
                          {comp.address}
                        </a>
                      </td>
                      <td style={{ padding: '8px', color: '#374151' }}>{comp.bedrooms}bd / {comp.bathrooms}ba</td>
                      <td style={{ padding: '8px', color: '#374151' }}>{comp.squareFeet ? comp.squareFeet.toLocaleString() : '—'}</td>
                      <td style={{ padding: '8px', color: comp.listingDate ? '#374151' : '#9ca3af' }}>{comp.listingDate ?? '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                        ${comp.monthlyRent.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </div>

        {/* Sales comps table */}
        {salesComps.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Recent Sales</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f3ff', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Address</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Beds/Baths</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Sqft</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Sold</th>
                  <th style={{ padding: '8px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Sale Price</th>
                </tr>
              </thead>
              <tbody>
                {salesComps.map((comp, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px', color: '#7c3aed', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <a href={googleMapsUrl(comp.address)} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        {comp.address}
                      </a>
                    </td>
                    <td style={{ padding: '8px', color: '#374151' }}>{comp.bedrooms != null ? `${comp.bedrooms}bd` : '—'} / {comp.bathrooms != null ? `${comp.bathrooms}ba` : '—'}</td>
                    <td style={{ padding: '8px', color: '#374151' }}>{comp.squareFeet ? comp.squareFeet.toLocaleString() : '—'}</td>
                    <td style={{ padding: '8px', color: comp.saleDate ? '#374151' : '#9ca3af' }}>{comp.saleDate ?? '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#7c3aed', fontWeight: 700 }}>${comp.salePrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        </div>{/* end page 1 */}

        {/* Scenarios — one page each */}
        {scenarios.map((scenario) => (
          <div key={scenario.id} data-pdf-page style={{ padding: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{scenario.name}</h2>
              <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#166534' }}>
                {scenario.tier} · ${scenario.params.monthlyGrossRent.toLocaleString()}/mo
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <MetricsGrid metrics={scenario.metrics} />
            </div>

            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>30-Year Projection</h3>
            <ThirtyYearTable projection={scenario.projection} />
          </div>
        ))}
      </div>
    );
  }
);

ReportView.displayName = 'ReportView';
