// components/ui/kpi-card.tsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: string | number;
  description?: string;
  /** número de decimales por defecto 2 (solo para valores numéricos) */
  decimals?: number;
  /** compact: 1.2K / 3.4M */
  compact?: boolean;
  className?: string;
};

function compactNumber(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

export function KpiCard({
  title,
  value,
  description,
  decimals = 2,
  compact = false,
  className = "",
}: KpiCardProps) {
  const formattedValue =
    typeof value === "number"
      ? compact
        ? compactNumber(value)
        : new Intl.NumberFormat(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(value)
      : value;

  return (
    <Card
      className={`w-full ${className}`}
      role="region"
      aria-label={`${title} KPI`}
    >
      {/* Header pequeño: solo título */}
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs font-medium tracking-wide text-slate-600 dark:text-slate-300">
          {title}
        </CardTitle>
      </CardHeader>

      {/* Content: número centrado vertical y horizontalmente */}
      <CardContent className="px-3 pb-3 pt-0">
        <div
          className="flex flex-col items-center justify-center text-center w-full"
          style={{ minHeight: 64 }} /* compact base height */
        >
          <div className="font-extrabold truncate" style={{ lineHeight: 1 }}>
            <span className="block text-lg sm:text-2xl md:text-3xl lg:text-4xl">
              {formattedValue}
            </span>
          </div>

          {description && (
            <p className="mt-1 text-[12px] sm:text-sm text-slate-500 dark:text-slate-300 max-w-[16rem]">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
