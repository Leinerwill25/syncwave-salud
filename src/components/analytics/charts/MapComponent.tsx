'use client';

import React from 'react';

interface MapComponentProps {
  data: { region: string; value: number }[];
  title: string;
  subtitle?: string;
}

export function MapComponent({ data, title, subtitle }: MapComponentProps) {
  // Placeholder for map component - would integrate with a mapping library like Leaflet or Google Maps
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-500 mb-4">Mapa geográfico</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {data.map((item, idx) => (
            <div key={idx} className="bg-white rounded p-3 shadow">
              <p className="font-medium text-gray-900">{item.region}</p>
              <p className="text-sm text-gray-600">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

