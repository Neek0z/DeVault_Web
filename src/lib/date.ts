export function relativeDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 60) return "à l'instant";
  if (min < 60) return `${min}min`;
  if (hr < 24) return `${hr}h`;
  if (day === 1) return 'hier';
  if (day < 7) return `${day}j`;

  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
