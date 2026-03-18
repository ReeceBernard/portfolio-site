import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

import React, { useEffect, useRef } from 'react';
import type { ResolvedAddress, RentalComp, SalesComp } from '../types';

const subjectIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#16a34a;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
  iconAnchor: [10, 10],
  popupAnchor: [0, -14],
});

const rentalIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#60a5fa;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

const salesIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#a78bfa;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

interface Props {
  subject: ResolvedAddress;
  comps: RentalComp[];
  salesComps: SalesComp[];
}

export const CompsMap: React.FC<Props> = ({ subject, comps, salesComps }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy any existing instance before creating a new one
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current).setView([subject.lat, subject.lon], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const subjectMarker = L.marker([subject.lat, subject.lon], { icon: subjectIcon })
      .addTo(map)
      .bindPopup(`<strong>Subject Property</strong><br>${subject.displayName}`);
    subjectMarker.on('mouseover', () => subjectMarker.openPopup());
    subjectMarker.on('mouseout', () => subjectMarker.closePopup());

    comps.forEach((comp) => {
      const marker = L.marker([comp.lat, comp.lon], { icon: rentalIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-size:13px">
            <div style="font-weight:600;margin-bottom:4px">${comp.address}</div>
            <div>${comp.bedrooms}bd / ${comp.bathrooms}ba${comp.squareFeet ? ` · ${comp.squareFeet.toLocaleString()} sqft` : ''}</div>
            <div style="color:#2563eb;font-weight:700;margin-top:4px">$${comp.monthlyRent.toLocaleString()}/mo rent</div>
            ${comp.listingDate ? `<div style="color:#9ca3af;font-size:11px;margin-top:2px">Listed ${comp.listingDate}</div>` : ''}
          </div>
        `);
      marker.on('mouseover', () => marker.openPopup());
      marker.on('mouseout', () => marker.closePopup());
    });

    salesComps.forEach((comp) => {
      const marker = L.marker([comp.lat, comp.lon], { icon: salesIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-size:13px">
            <div style="font-weight:600;margin-bottom:4px">${comp.address}</div>
            <div>${comp.bedrooms}bd / ${comp.bathrooms}ba${comp.squareFeet ? ` · ${comp.squareFeet.toLocaleString()} sqft` : ''}</div>
            <div style="color:#7c3aed;font-weight:700;margin-top:4px">$${comp.salePrice.toLocaleString()} sold</div>
            ${comp.saleDate ? `<div style="color:#9ca3af;font-size:11px;margin-top:2px">Sold ${comp.saleDate}</div>` : ''}
          </div>
        `);
      marker.on('mouseover', () => marker.openPopup());
      marker.on('mouseout', () => marker.closePopup());
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [subject.lat, subject.lon]);

  return <div ref={containerRef} style={{ height: '400px', width: '100%' }} className="rounded-md" />;
};
