export const humanTime = (rawMs: number) => {
  const ms = Math.floor(rawMs);
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d) return `${d}d ${h % 24}h`;
  if (h) return `${h}h ${m % 60}min`;
  if (m) return `${m}min ${s % 60}s`;
  if (s) return `${s}s`;
  return `${ms}ms`;
};
