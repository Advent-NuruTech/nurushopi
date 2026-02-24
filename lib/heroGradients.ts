export const HERO_GRADIENT_PRESETS = [
  "from-rose-500 via-pink-500 to-purple-500",
  "from-fuchsia-500 via-indigo-500 to-blue-500",
  "from-teal-400 via-emerald-500 to-lime-400",
  "from-orange-400 via-yellow-400 to-amber-400",
  "from-cyan-400 via-sky-500 to-blue-400",
  "from-green-400 via-emerald-400 to-lime-300",
  "from-purple-500 via-pink-500 to-rose-400",
  "from-indigo-500 via-violet-500 to-fuchsia-400",
  "from-yellow-400 via-orange-400 to-red-400",
  "from-pink-400 via-rose-500 to-fuchsia-500",
  "from-sky-400 via-cyan-400 to-teal-400",
  "from-lime-400 via-green-400 to-emerald-400",
] as const;

export const HERO_DEFAULT_GRADIENT = HERO_GRADIENT_PRESETS[0];

export function resolveHeroGradient(value: string): string {
  return HERO_GRADIENT_PRESETS.includes(
    value as (typeof HERO_GRADIENT_PRESETS)[number]
  )
    ? value
    : HERO_DEFAULT_GRADIENT;
}

