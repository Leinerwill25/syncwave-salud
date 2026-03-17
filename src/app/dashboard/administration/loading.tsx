import React from 'react';
import { Activity } from 'lucide-react';

export default function AdministrationLoading() {
  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-screen overflow-x-hidden">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-xl" />
          <div className="h-4 w-48 bg-slate-100 animate-pulse rounded-lg" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100 h-40 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-50 animate-pulse rounded" />
                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg" />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-50">
              <div className="h-4 w-24 bg-slate-50 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 h-64 animate-pulse" />
        <div className="bg-slate-200 rounded-3xl p-8 shadow-sm h-64 animate-pulse" />
      </div>
    </div>
  );
}
