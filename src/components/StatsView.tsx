import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppState, Mode } from "../types";
import { accuracyTimeSeries, daysUntil, modeStats } from "../utils";

interface Props {
  state: AppState;
}

const MODES: { id: Mode; label: string; color: string }[] = [
  { id: "say", label: "Say", color: "#f43f5e" },
  { id: "hear", label: "Hear", color: "#3b82f6" },
  { id: "read", label: "Read", color: "#10b981" },
];

export function StatsView({ state }: Props) {
  const days = daysUntil(state.settings.tripDate);

  // Build a merged time series for all modes.
  const series = (() => {
    const sayS = accuracyTimeSeries(state, "say");
    const hearS = accuracyTimeSeries(state, "hear");
    const readS = accuracyTimeSeries(state, "read");
    return sayS.map((row, i) => ({
      date: row.date,
      Say: row.accuracy,
      Hear: hearS[i].accuracy,
      Read: readS[i].accuracy,
    }));
  })();

  return (
    <div className="p-4 space-y-6">
      {/* Countdown */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
          Countdown
        </p>
        <p className="text-3xl font-bold">
          {days >= 0 ? `${days} days` : "—"}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          until {state.settings.tripDate}
        </p>
      </section>

      {/* Coverage */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">
          Coverage
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400 text-left">
              <th className="font-normal pb-2">Mode</th>
              <th className="font-normal pb-2 text-right">Mastered</th>
              <th className="font-normal pb-2 text-right">Seen</th>
              <th className="font-normal pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {MODES.map((m) => {
              const s = modeStats(state, m.id);
              return (
                <tr key={m.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="py-2 font-medium">{m.label}</td>
                  <td className="py-2 text-right tabular-nums">{s.mastered}</td>
                  <td className="py-2 text-right tabular-nums">{s.seen}</td>
                  <td className="py-2 text-right tabular-nums">{s.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">
          Mastered = answered correctly in 2 of the last 3 attempts.
        </p>
      </section>

      {/* Current accuracy */}
      <section className="grid grid-cols-3 gap-3">
        {MODES.map((m) => {
          const s = modeStats(state, m.id);
          return (
            <div
              key={m.id}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 text-center"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {m.label}
              </p>
              <p className="text-2xl font-bold mt-1">
                {s.accuracy != null ? `${Math.round(s.accuracy * 100)}%` : "—"}
              </p>
            </div>
          );
        })}
      </section>

      {/* Accuracy chart */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">
          Accuracy (last 14 days)
        </p>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" fontSize={10} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} fontSize={10} stroke="#94a3b8" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {MODES.map((m) => (
                <Line
                  key={m.id}
                  type="monotone"
                  dataKey={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  connectNulls
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
