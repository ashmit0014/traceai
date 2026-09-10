"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Metric } from "@/data/scenarios";
export function MetricChart({
  data,
  metric,
  title,
  unit = "",
  compact = false,
}: {
  data: Metric[];
  metric: string;
  title: string;
  unit?: string;
  compact?: boolean;
}) {
  const points = data
    .filter((m) => m.metric === metric)
    .map((m) => ({ time: m.timestamp.slice(11, 16), value: m.value }));
  const color =
    metric === "p95_latency"
      ? "#7ae2be"
      : metric === "db_queries"
        ? "#a7a2ff"
        : "#78a9e9";
  return (
    <section className="chart-card">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <small>
            {metric === "p95_latency"
              ? "Checkout API · 95th percentile"
              : metric === "db_queries"
                ? "Order service · queries per request"
                : "Checkout service · incoming traffic"}
          </small>
        </div>
        <span className="chart-unit">{unit}</span>
      </div>
      <div style={{ height: compact ? 170 : 220, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 16, right: 20, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#252b33"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "#77828f", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={35}
            />
            <YAxis
              tick={{ fill: "#77828f", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#171c23",
                border: "1px solid #343e49",
                borderRadius: 8,
                color: "#edf2f5",
              }}
            />
            <ReferenceLine
              x="10:00"
              stroke="#a89bf0"
              strokeDasharray="4 4"
              label={{
                value: "v1.42",
                fill: "#b2a5fa",
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name={title}
              stroke={color}
              strokeWidth={2}
              fill={`url(#fill-${metric})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
