// src/components/ui/stacked-bar-chart.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { useTheme } from "next-themes";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export type MesCrecimiento = {
  mes_num: number;
  mes_text?: string;
  contado: number;
  credito: number;
  utilidad: number;
  operacion: number;
};

type Props = {
  data: MesCrecimiento[];
  height?: number;
  title?: string;
  showLegend?: boolean;
};

/* -------------------------
   Paletas para light / dark
   ------------------------- */
const LIGHT = {
  contado: "#9AD3FF",
  credito: "#2F8BFF",
  utilidad: "#7B61FF",
  operacion: "#E6D8FF",
  grid: "#EEF2FF",
  text: "#0f172a",
  subText: "#475569",
  tooltipBg: "#ffffff",
  tooltipText: "#0f172a",
  cardBg: "#ffffff",
  border: "rgba(2,6,23,0.06)",
};

const DARK = {
  contado: "#4fb3ff",
  credito: "#1e6fff",
  utilidad: "#8b6bff",
  operacion: "#5a3f7a",
  grid: "rgba(255,255,255,0.04)",
  text: "#e6eef8",
  subText: "#c9d6ef",
  tooltipBg: "#0b1220",
  tooltipText: "#e6eef8",
  cardBg: "#071126",
  border: "rgba(255,255,255,0.06)",
};

/* -------------------------
   Utilidades de formato
   ------------------------- */
const numberFormatter = new Intl.NumberFormat("es-ES");

function formatNumber(v: number) {
  return Number.isFinite(v) ? numberFormatter.format(Math.round(v)) : "0";
}

/** Abrevia miles/millones (ej: 1.2K, 3.4M) para ejes */
function compactNumber(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

/* -------------------------
   Componente principal
   ------------------------- */
function StackedBarChartInner({
  data,
  height = 320,
  title = "Crecimiento total",
  showLegend = true,
}: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isXSmall, setIsXSmall] = useState(false); // <= 360px (ej: iPhone SE)

  // evitar parpadeo en SSR
  useEffect(() => setMounted(true), []);

  // responsive simple
  useEffect(() => {
    function check() {
      const w = typeof window !== "undefined" ? window.innerWidth : 1024;
      setIsMobile(w <= 640);
      setIsXSmall(w <= 360); // detectamos pantallas extra-pequeñas
    }
    check();
    let t: number | undefined;
    const onResize = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(check, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (t) window.window?.clearTimeout?.(t);
    };
  }, []);

  const theme = mounted ? (resolvedTheme ?? "light") : "light";
  const colors = theme === "dark" ? DARK : LIGHT;

  // normalizar 12 meses (agregamos mes_full para tooltip si queremos)
  const chartData = useMemo(() => {
    const monthsShort = [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ];
    const monthsFull = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const map = new Map<number, MesCrecimiento>();
    (data ?? []).forEach((d) => map.set(Number(d.mes_num), d));
    return new Array(12).fill(0).map((_, idx) => {
      const m = map.get(idx + 1);
      return {
        mes_num: idx + 1,
        mes: monthsShort[idx],
        mes_full: monthsFull[idx] as string,
        contado: Number(m?.contado ?? 0),
        credito: Number(m?.credito ?? 0),
        utilidad: Number(m?.utilidad ?? 0),
        operacion: Number(m?.operacion ?? 0),
      } as any;
    });
  }, [data]);

  // totales
  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, r) => {
        acc.contado += r.contado;
        acc.credito += r.credito;
        acc.utilidad += r.utilidad;
        acc.operacion += r.operacion;
        return acc;
      },
      { contado: 0, credito: 0, utilidad: 0, operacion: 0 },
    );
  }, [chartData]);

  const grandTotal =
    totals.contado + totals.credito + totals.utilidad + totals.operacion;

  /* -------------------------
	   Tooltip personalizado (ahora usa mes_full si existe)
	   ------------------------- */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    // buscar mes_full desde chartData (label es el short mes)
    const entry = chartData.find(
      (c) => String(c.mes).toUpperCase() === String(label).toUpperCase(),
    );
    const monthLabel = entry?.mes_full ?? String(label);

    const monthTotal = payload.reduce(
      (s: number, p: any) => s + (Number(p.value) || 0),
      0,
    );

    return (
      <div
        role="tooltip"
        className="rounded-lg shadow-lg p-3 text-sm max-w-xs"
        style={{
          background: colors.tooltipBg,
          color: colors.tooltipText,
          border: `1px solid ${colors.border ?? "transparent"}`,
        }}
      >
        <div
          className="text-[11px] font-semibold tracking-wider mb-2"
          style={{ color: colors.subText }}
        >
          {String(monthLabel).toUpperCase()} — Total: {formatNumber(monthTotal)}
        </div>

        {payload
          .slice()
          .reverse()
          .map((p: any) => {
            const pct =
              grandTotal > 0
                ? ((Number(p.value) / grandTotal) * 100).toFixed(1)
                : "0.0";
            return (
              <div
                key={p.name}
                className="flex items-center justify-between gap-3 text-xs mb-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    style={{
                      width: 12,
                      height: 12,
                      background: p.color,
                      display: "inline-block",
                      borderRadius: 3,
                    }}
                  />
                  <span style={{ color: colors.text, fontWeight: 700 }}>
                    {p.name}
                  </span>
                </div>
                <div
                  className="text-right"
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco",
                  }}
                >
                  <div>{formatNumber(p.value)}</div>
                  <div style={{ fontSize: 10, color: colors.subText }}>
                    {pct}% del total
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  /* -------------------------
	   Leyenda estilizada (sin cambios)
	   ------------------------- */
  const Legend2x2 = () => {
    const items = [
      {
        key: "contado",
        label: "Contado",
        color: colors.contado,
        value: totals.contado,
      },
      {
        key: "credito",
        label: "Crédito",
        color: colors.credito,
        value: totals.credito,
      },
      {
        key: "utilidad",
        label: "Utilidad",
        color: colors.utilidad,
        value: totals.utilidad,
      },
      {
        key: "operacion",
        label: "Operación",
        color: colors.operacion,
        value: totals.operacion,
      },
    ];

    return (
      <div className="grid grid-cols-2 gap-3 w-full" aria-hidden>
        {items.map((it) => {
          const pct = grandTotal > 0 ? (it.value / grandTotal) * 100 : 0;
          return (
            <div key={it.key} className="flex items-center gap-3">
              <span
                style={{
                  width: 14,
                  height: 14,
                  background: it.color,
                  display: "inline-block",
                  borderRadius: 4,
                  boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.03)`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-semibold truncate"
                  style={{ color: colors.text }}
                >
                  {it.label}
                </div>
                <div
                  className="text-[12px] truncate"
                  style={{ color: colors.subText }}
                >
                  {formatNumber(it.value)} · {pct.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* -------------------------
	   Caso sin datos
	   ------------------------- */
  if (!chartData || chartData.length === 0 || grandTotal === 0) {
    return (
      <Card
        className="w-full bg-background"
        style={{
          border: `1px solid ${colors.border}`,
        }}
      >
        <CardHeader className="py-3">
          <CardTitle
            style={{ fontSize: 15, fontWeight: 700, color: colors.text }}
          >
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-3">
            <div
              className="text-sm font-medium"
              style={{ color: colors.subText }}
            >
              No hay datos suficientes para mostrar el gráfico.
            </div>
            <div className="text-xs" style={{ color: colors.subText }}>
              Verifica el rango seleccionado o espera a que se acumulen los
              datos.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* -------------------------
	   Render
	   ------------------------- */

  // interval inteligente en pantallas muy pequeñas: mostramos menos etiquetas (cada N meses)
  const xInterval = isXSmall
    ? Math.ceil(chartData.length / 6)
    : isMobile
      ? 0
      : "preserveStartEnd";

  // tickFormatter: si es extra-pequeño usamos solo la primera letra para evitar solapamiento
  const xTickFormatter = (t: any) => {
    if (isXSmall && typeof t === "string") {
      return String(t).charAt(0).toUpperCase();
    }
    return String(t).toUpperCase();
  };

  return (
    <Card
      className="w-full bg-background"
      style={{
        border: `1px solid ${colors.border}`,
      }}
    >
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3">
        <div>
          <CardTitle
            style={{ fontSize: 15, fontWeight: 700, color: colors.text }}
          >
            {title}
          </CardTitle>
          <div className="mt-1 text-xs" style={{ color: colors.subText }}>
            Visión anual — total:{" "}
            <span style={{ fontWeight: 700, color: colors.text }}>
              {formatNumber(grandTotal)}
            </span>
          </div>
        </div>

        {showLegend && (
          <div className="w-full sm:w-72">
            <Legend2x2 />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-3">
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 8,
                right: 12,
                left: 0,
                bottom: isXSmall ? 28 : isMobile ? 12 : 0,
              }}
              role="img"
              aria-label={`${title} — gráfico de barras apiladas`}
            >
              <CartesianGrid
                stroke={colors.grid}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="mes"
                stroke={colors.subText}
                tickLine={false}
                axisLine={false}
                interval={xInterval as any}
                tick={{
                  fontSize: isXSmall ? 10 : isMobile ? 11 : 12,
                  fill: colors.subText,
                  fontWeight: 600,
                }}
                tickFormatter={xTickFormatter}
                minTickGap={6}
                // rotamos ligeramente en pantallas extra-pequeñas para mejorar legibilidad
                angle={isXSmall ? -30 : 0}
                textAnchor={isXSmall ? "end" : "middle"}
              />
              <YAxis
                stroke={colors.subText}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => compactNumber(Number(v))}
                tick={{ fontSize: 11, fill: colors.subText }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              {/* barras: look moderno */}
              <Bar
                dataKey="contado"
                stackId="a"
                name="Contado"
                fill={colors.contado}
                radius={[0, 0, 0, 0]}
                isAnimationActive
              />
              <Bar
                dataKey="credito"
                stackId="a"
                name="Crédito"
                fill={colors.credito}
                radius={[0, 0, 0, 0]}
                isAnimationActive
              />
              <Bar
                dataKey="utilidad"
                stackId="a"
                name="Utilidad"
                fill={colors.utilidad}
                radius={[0, 0, 0, 0]}
                isAnimationActive
              />
              <Bar
                dataKey="operacion"
                stackId="a"
                name="Operación"
                fill={colors.operacion}
                radius={[0, 0, 0, 0]}
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default React.memo(StackedBarChartInner);
