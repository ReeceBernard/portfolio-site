import React from 'react';
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

function CompsSvgMap({ subject, comps, salesComps }: { subject: ResolvedAddress; comps: RentalComp[]; salesComps: SalesComp[] }) {
  const W = 1104;
  const H = 300;
  const PAD = 36;

  const allPts = [
    { lat: subject.lat, lon: subject.lon },
    ...comps.map((c) => ({ lat: c.lat, lon: c.lon })),
    ...salesComps.map((c) => ({ lat: c.lat, lon: c.lon })),
  ];

  const lats = allPts.map((p) => p.lat);
  const lons = allPts.map((p) => p.lon);

  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLon = Math.min(...lons);
  let maxLon = Math.max(...lons);

  const latSpan = Math.max(maxLat - minLat, 0.004);
  const lonSpan = Math.max(maxLon - minLon, 0.006);
  minLat -= latSpan * 0.3;
  maxLat += latSpan * 0.3;
  minLon -= lonSpan * 0.3;
  maxLon += lonSpan * 0.3;

  const toX = (lon: number) => PAD + ((lon - minLon) / (maxLon - minLon)) * (W - 2 * PAD);
  const toY = (lat: number) => PAD + (1 - (lat - minLat) / (maxLat - minLat)) * (H - 2 * PAD);

  const sx = toX(subject.lon);
  const sy = toY(subject.lat);

  return (
    <svg
      width={W}
      height={H}
      style={{ border: '1px solid #e5e7eb', borderRadius: '6px', display: 'block' }}
    >
      <rect width={W} height={H} fill="#eef2f7" rx="6" />

      {/* Crosshair lines at subject */}
      <line x1={sx} y1={PAD} x2={sx} y2={H - PAD} stroke="#d1d5db" strokeWidth="1" strokeDasharray="4 4" />
      <line x1={PAD} y1={sy} x2={W - PAD} y2={sy} stroke="#d1d5db" strokeWidth="1" strokeDasharray="4 4" />

      {/* Lines from subject to each comp */}
      {comps.map((comp, i) => (
        <line
          key={i}
          x1={sx}
          y1={sy}
          x2={toX(comp.lon)}
          y2={toY(comp.lat)}
          stroke="#9ca3af"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}

      {/* Rental comp markers (blue) */}
      {comps.map((comp, i) => {
        const cx = toX(comp.lon);
        const cy = toY(comp.lat);
        return (
          <g key={`r${i}`}>
            <circle cx={cx} cy={cy} r={12} fill="#60a5fa" stroke="white" strokeWidth="2" />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="bold">
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* Sales comp markers (purple) */}
      {salesComps.map((comp, i) => {
        const cx = toX(comp.lon);
        const cy = toY(comp.lat);
        return (
          <g key={`s${i}`}>
            <circle cx={cx} cy={cy} r={12} fill="#a78bfa" stroke="white" strokeWidth="2" />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="bold">
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* Subject marker (drawn on top) */}
      <circle cx={sx} cy={sy} r={13} fill="#16a34a" stroke="white" strokeWidth="2.5" />
      <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="bold">
        S
      </text>

      {/* Legend */}
      <rect x={PAD} y={H - 22} width={220} height={18} fill="white" fillOpacity="0.8" rx="3" />
      <circle cx={PAD + 10} cy={H - 13} r={6} fill="#16a34a" stroke="white" strokeWidth="1.5" />
      <text x={PAD + 20} y={H - 9} fontSize="10" fill="#374151">Subject</text>
      <circle cx={PAD + 78} cy={H - 13} r={6} fill="#60a5fa" stroke="white" strokeWidth="1.5" />
      <text x={PAD + 88} y={H - 9} fontSize="10" fill="#374151">Rental</text>
      <circle cx={PAD + 145} cy={H - 13} r={6} fill="#a78bfa" stroke="white" strokeWidth="1.5" />
      <text x={PAD + 155} y={H - 9} fontSize="10" fill="#374151">Sales</text>
    </svg>
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
                    <td style={{ padding: '8px', color: '#374151' }}>{comp.bedrooms}bd / {comp.bathrooms}ba</td>
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
