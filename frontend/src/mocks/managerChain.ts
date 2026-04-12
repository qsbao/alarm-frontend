/**
 * Manager chain for all users who can be issue owners.
 * Maps UserId → { l5: UserId (Layer 5 manager), l4: UserId (Layer 4 manager) }.
 */
export const MANAGER_CHAIN: Record<string, { l5: string; l4: string }> = {
  // Litho engineers → Litho managers
  'user-tanaka': { l5: 'user-yamamoto', l4: 'user-nakamura' },
  'user-rossi': { l5: 'user-yamamoto', l4: 'user-nakamura' },
  'user-garcia': { l5: 'user-yamamoto', l4: 'user-nakamura' },
  // Etch engineers → Etch managers
  'user-chen': { l5: 'user-lee', l4: 'user-wang' },
  'user-patel': { l5: 'user-lee', l4: 'user-wang' },
  'user-kim': { l5: 'user-lee', l4: 'user-wang' },
  'user-park': { l5: 'user-lee', l4: 'user-wang' },
  // Facilities engineers → Facilities managers
  'user-muller': { l5: 'user-hoffman', l4: 'user-anderson' },
  'user-smith': { l5: 'user-hoffman', l4: 'user-anderson' },
};
