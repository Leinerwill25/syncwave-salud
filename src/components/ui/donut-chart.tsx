// src/components/ui/donut-chart.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Sector,
} from "recharts";
import { useTheme } from "next-themes";

// shadcn/ui card (ajusta la ruta si la tienes diferente)
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

type Slice = { label: string; value: number };

export interface DonutChartProps {
  data: Slice[];
  totalLabel?: string;
  totalValue?: string | number;
  height?: number | string; // px number or css string
  thickness?: number; // percent inner radius (0-100) default 56
  className?: string;
  maxLegendItems?: number;
}

const FALLBACK_PALETTE = [
  "#0f62fe",
  "#06b6d4",
  "#10b981",
  "#7c3aed",
  "#f59e0b",
  "#ef4444",
  "#7b61ff",
  "#06a7a4",
];
const FALLBACK_PALETTE_DARK = [
  "#8ab4ff",
  "#7fe7f2",
  "#7ef3c6",
  "#c8b8ff",
  "#ffd89a",
  "#ff9a9a",
  "#bda7ff",
  "#7fdede",
];

function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={1.5}
      />
    </g>
  );
}

export default function DonutChart({
  data,
  totalLabel = "Total",
  totalValue = "",
  height = 365, // <- altura reducida por defecto
  thickness = 56,
  className = "",
  maxLegendItems = 8,
}: DonutChartProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Función util para saber si el sistema prefiere dark (sólo cuando ya hay window)
  const systemPrefersDark = () =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;

  // Mientras no estamos montados, forzamos LIGHT para evitar flash de tema oscuro.
  // Cuando ya estamos montados, consideramos resolvedTheme y 'system'.
  const isDark = mounted
    ? resolvedTheme === "dark" ||
      (resolvedTheme === "system" && systemPrefersDark())
    : false;

  // Inicializamos en paleta CLARA para que el primer render sea light.
  const [colors, setColors] = useState<string[]>(FALLBACK_PALETTE);

  // Actualiza paleta cuando cambie isDark (esto se ejecuta ya en cliente)
  useEffect(() => {
    setColors(isDark ? FALLBACK_PALETTE_DARK : FALLBACK_PALETTE);
  }, [isDark]);

  // Leer variables CSS sólo cuando ya estemos montados (evita mismatch SSR)
  useEffect(() => {
    if (!mounted) return;

    try {
      const cs = getComputedStyle(document.documentElement);
      const arr: string[] = [];
      for (let i = 1; i <= 8; i++) {
        const raw = cs.getPropertyValue(`--chart-${i}`).trim();
        if (!raw) {
          arr.push(
            isDark ? FALLBACK_PALETTE_DARK[i - 1] : FALLBACK_PALETTE[i - 1],
          );
        } else {
          const v = raw.replace(/\s+/g, " ").trim();
          arr.push(/^\d+\s+\d+%?\s+\d+%?$/.test(v) ? `hsl(${v})` : v);
        }
      }
      setColors(arr);
    } catch {
      setColors(isDark ? FALLBACK_PALETTE_DARK : FALLBACK_PALETTE);
    }
  }, [mounted, isDark]);

  const sanitized = useMemo(
    () =>
      (data ?? []).map((d) => ({
        label: String(d.label ?? ""),
        value: Number(d.value ?? 0),
      })),
    [data],
  );

  const total = useMemo(
    () =>
      sanitized.reduce(
        (s, r) => s + (Number.isFinite(r.value) ? r.value : 0),
        0,
      ),
    [sanitized],
  );

  const chartData =
    sanitized.length > 0 && total > 0
      ? sanitized
      : [{ label: "Sin datos", value: 1 }];

  const h = typeof height === "number" ? `${height}px` : height;

  const textColor = isDark ? "rgba(255,255,255,0.95)" : "rgba(17,24,39,0.95)";
  const subText = isDark ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.6)";
  const cardBorder = isDark ? "rgba(255,255,255,0.72)" : "rgba(2,6,23,0.06)";

  const legend = chartData.map((d, i) => {
    const val = Number(d.value ?? 0);
    const pct = total > 0 ? (val / total) * 100 : 0;
    return { ...d, pct, color: colors[i % colors.length] };
  });

  const legendDisplayed = legend
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, maxLegendItems);

  return (
    <Card
      className={`${className} bg-background`}
      style={{ border: `1px solid ${cardBorder}` }}
    >
      <CardHeader style={{ paddingBottom: 6 }}>
        <CardTitle style={{ fontSize: 16, color: textColor, fontWeight: 700 }}>
          Distribución de ventas
        </CardTitle>
      </CardHeader>

      <CardContent style={{ paddingTop: 6, paddingBottom: 6 }}>
        <div
          style={{
            width: "100%",
            height: h,
            position: "relative",
            overflow: "visible",
          }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            style={{ overflow: "visible" }}
          >
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={`${thickness}%`}
                outerRadius="86%"
                paddingAngle={3}
                activeShape={ActiveShape}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={colors[i % colors.length]}
                    stroke={
                      isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
                    }
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <RechartsTooltip
                wrapperStyle={{ zIndex: 9999 }}
                contentStyle={{
                  background: isDark ? "#0b1220" : "#fff",
                  color: textColor,
                  border: `1px solid ${cardBorder}`,
                }}
                formatter={(value: number) => [
                  new Intl.NumberFormat().format(value),
                  "Ventas",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Overlay central */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center", color: textColor }}>
              <div style={{ fontSize: 12, letterSpacing: 1, color: subText }}>
                {totalLabel}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {totalValue !== ""
                  ? String(totalValue)
                  : new Intl.NumberFormat().format(total)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter
        style={{ display: "flex", justifyContent: "center", paddingTop: 6 }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 760,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
              alignItems: "center",
              padding: "8px 12px",
            }}
          >
            {legendDisplayed.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 140,
                  maxWidth: 220,
                  background: isDark ? "rgba(255,255,255,0.02)" : "transparent",
                  padding: "6px 8px",
                  borderRadius: 8,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    display: "inline-block",
                    background: item.color,
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    lineHeight: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: textColor,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 140,
                    }}
                  >
                    {item.label || "-"}
                  </div>
                  <div style={{ fontSize: 12, color: subText }}>
                    {item.value !== undefined
                      ? new Intl.NumberFormat().format(item.value)
                      : "-"}{" "}
                    •{" "}
                    {Number.isFinite(item.pct)
                      ? `${item.pct.toFixed(1)}%`
                      : "0%"}
                  </div>
                </div>
              </div>
            ))}

            {legend.length > maxLegendItems && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: subText,
                  fontSize: 13,
                }}
              >
                +{legend.length - maxLegendItems} más
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
