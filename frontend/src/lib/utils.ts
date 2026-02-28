export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const NODE_COLORS: Record<string, string> = {
  speaker: '#3B82F6',
  topic: '#22C55E',
  kpi: '#FA500F',
  slide: '#6B7280',
  decision: '#EAB308',
  claim: '#E5E7EB',
};

export const RELATION_COLORS: Record<string, string> = {
  contradicts: '#EF4444',
  mentioned: '#6B7280',
  said_by: '#3B82F6',
  shown_during: '#A855F7',
  decided: '#EAB308',
  committed_to: '#22C55E',
  related_to: '#6B7280',
};

export const SPEAKER_COLORS = [
  '#3B82F6', '#22C55E', '#A855F7', '#EAB308', '#EC4899', '#06B6D4',
];
