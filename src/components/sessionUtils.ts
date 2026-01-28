'use client';

export interface SessionData {
  sessionNumber: number;
  level: number; // Which level (1, 2, 3, or 0 for target words)
  date: string;
  correctAnswers: number;
  assistedAnswers: number;
  noAnswers: number;
  totalQuestions: number;
  accuracy: number;
  timeToRespond: number[];
  wordsAsked: string[];
  responseTypes: ('correct' | 'assisted' | 'no-answer')[]; // Track response type for each question
  phase?: 'baseline' | 'intervention';
  promptType?: 'immediate' | 'delay'; // Track whether immediate prompt or constant time delay
  masteryAchieved?: boolean; // Mark if this session achieved mastery
}

interface AudioPromptConfig {
  immediate: boolean; // Sessions 1-2
  delay: number; // Sessions 3+: 3000ms delay
}

export function getPromptConfig(sessionNumber: number): AudioPromptConfig {
  if (sessionNumber <= 2) {
    return { immediate: true, delay: 0 };
  }
  return { immediate: false, delay: 3000 }; // 3 second delay
}

export function playAudioPrompt(word: string) {
  // Use Web Speech API for text-to-speech
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.cancel(); // Cancel any pending speech
    window.speechSynthesis.speak(utterance);
  }
}

export function createSessionData(
  sessionNumber: number,
  correct: number,
  assisted: number,
  noAnswer: number,
  total: number,
  responsesTimes: number[],
  wordsAsked: string[],
  responseTypes: ('correct' | 'assisted' | 'no-answer')[],
  phase: 'baseline' | 'intervention' = 'intervention',
  level: number = 1
): SessionData {
  const promptConfig = getPromptConfig(sessionNumber);
  // After session 2, count prompted responses as 50% of full value (0.5 weight)
  const assistedWeight = sessionNumber <= 2 ? 1.0 : 0.5;
  const weightedScore = correct + (assisted * assistedWeight);
  // Clamp to 0 if total is 0 to avoid NaN
  const accuracy = total > 0 ? (weightedScore / total) * 100 : 0;
  return {
    sessionNumber,
    level,
    date: new Date().toISOString(),
    correctAnswers: correct,
    assistedAnswers: assisted,
    noAnswers: noAnswer,
    totalQuestions: total,
    accuracy,
    timeToRespond: responsesTimes,
    wordsAsked,
    responseTypes,
    phase,
    promptType: phase === 'baseline' ? undefined : (promptConfig.immediate ? 'immediate' : 'delay'),
  };
}

export function calculateMasteryPerLevel(sessions: SessionData[], level: number): boolean {
  const levelSessions = sessions.filter(s => s.level === level);
  
  if (levelSessions.length === 0) return false;
  
  // Filter unprompted sessions (constant time delay) for this level
  const unpromptedSessions = levelSessions.filter(s => s.promptType === 'delay');
  
  // Mastery criteria:
  // - Two consecutive unprompted sessions >= 90%
  // - OR average >= 80% over the last three consecutive unprompted sessions
  if (unpromptedSessions.length < 2) return false;

  const lastIdx = unpromptedSessions.length - 1;
  const lastTwo90 = unpromptedSessions.length >= 2 &&
    unpromptedSessions[lastIdx].accuracy >= 90 &&
    unpromptedSessions[lastIdx - 1].accuracy >= 90;

  const lastThreeAvg80 = unpromptedSessions.length >= 3 && (
    unpromptedSessions.slice(-3).reduce((sum, s) => sum + s.accuracy, 0) / 3
  ) >= 80;

  return lastTwo90 || lastThreeAvg80;
}

export function calculateMastery(sessions: SessionData[]): { 
  achieved: boolean; 
  accuracy: number;
  promptedAccuracy: number;
  unpromptedAccuracy: number;
  promptedSessions: number;
  unpromptedSessions: number;
} {
  // Separate tracking: Prompted (immediate) vs Unprompted (constant time delay)
  if (sessions.length === 0) {
    return { 
      achieved: false, 
      accuracy: 0,
      promptedAccuracy: 0,
      unpromptedAccuracy: 0,
      promptedSessions: 0,
      unpromptedSessions: 0,
    };
  }

  // Filter sessions by prompt type
  const promptedSessions = sessions.filter(s => s.promptType === 'immediate');
  const unpromptedSessions = sessions.filter(s => s.promptType === 'delay');

  // Calculate accuracies
  const promptedAccuracy = promptedSessions.length > 0 
    ? promptedSessions.reduce((sum, s) => sum + s.accuracy, 0) / promptedSessions.length
    : 0;

  const unpromptedAccuracy = unpromptedSessions.length > 0
    ? unpromptedSessions.slice(-3).reduce((sum, s) => sum + s.accuracy, 0) / Math.min(unpromptedSessions.length, 3)
    : 0;

  // Mastery achieved when:
  // - Two consecutive unprompted sessions >= 90%
  // - OR average >= 80% over the last three consecutive unprompted sessions
  const lastIdx = unpromptedSessions.length - 1;
  const lastTwo90 = unpromptedSessions.length >= 2 &&
    unpromptedSessions[lastIdx].accuracy >= 90 &&
    unpromptedSessions[lastIdx - 1].accuracy >= 90;

  const lastThreeAvg80 = unpromptedSessions.length >= 3 && (
    unpromptedSessions.slice(-3).reduce((sum, s) => sum + s.accuracy, 0) / 3
  ) >= 80;

  const unpromptedMastery = lastTwo90 || lastThreeAvg80;

  return {
    achieved: unpromptedMastery,
    accuracy: sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length,
    promptedAccuracy,
    unpromptedAccuracy,
    promptedSessions: promptedSessions.length,
    unpromptedSessions: unpromptedSessions.length,
  };
}
