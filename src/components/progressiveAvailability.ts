// src/components/progressiveAvailability.ts
// Config-driven unlock logic for research-grade progressive availability
import { SessionData } from './sessionUtils';

export type UnlockRule = (sessions: SessionData[], baselineSessions: SessionData[]) => boolean;

export const unlockRules: Record<string, UnlockRule> = {
  baseline: (sessions, baselineSessions) => {
    // Baseline is available until established (4 consecutive within 10% accuracy)
    if (baselineSessions.length < 4) return true;
    for (let i = 0; i <= baselineSessions.length - 4; i++) {
      const four = baselineSessions.slice(i, i + 4);
      const accs = four.map(s => s.accuracy);
      const min = Math.min(...accs);
      const max = Math.max(...accs);
      if (max - min <= 10) return false; // Baseline established, unavailable
    }
    return true;
  },
  level1: (sessions, baselineSessions) => {
    // Level 1 is available only if baseline is established
    if (baselineSessions.length < 4) return false;
    for (let i = 0; i <= baselineSessions.length - 4; i++) {
      const four = baselineSessions.slice(i, i + 4);
      const accs = four.map(s => s.accuracy);
      const min = Math.min(...accs);
      const max = Math.max(...accs);
      if (max - min <= 10) return true;
    }
    return false;
  },
  // Add further levels as needed, e.g.:
  // level2: (sessions, baselineSessions) => isLevelMastered(sessions, 1),
  // ...
};

export function isModeAvailable(mode: 'baseline' | 'level1', sessions: SessionData[], baselineSessions: SessionData[]) {
  return unlockRules[mode](sessions, baselineSessions);
}
