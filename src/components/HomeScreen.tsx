'use client';

import { useEffect, useState, startTransition } from 'react';
import { ParticipantInfo } from './ParticipantConfig';
import { SessionData } from './sessionUtils';
import { isModeAvailable } from './progressiveAvailability';

interface HomeScreenProps {
  onStartGame: (level: number) => void;
  participantId: string;
  onStartBaseline: () => void;
  onViewHistory?: () => void;
  levelMastery?: { level1: boolean; level2: boolean; level3: boolean };
  participantInfo?: ParticipantInfo | null;
}


export default function HomeScreen({ onStartGame, participantId, onStartBaseline, onViewHistory, levelMastery }: HomeScreenProps) {
  const [hasTargetWords, setHasTargetWords] = useState(false);
  const [targetWordsCompleted, setTargetWordsCompleted] = useState(false);
  const [baselineAvailable, setBaselineAvailable] = useState(true);
  const [level1Available, setLevel1Available] = useState(false);
  // Track mastery for each level (persistent check mark)
  const [level1Mastered, setLevel1Mastered] = useState(false);
  const [level2Mastered, setLevel2Mastered] = useState(false);
  const [level3Mastered, setLevel3Mastered] = useState(false);

  useEffect(() => {
    const storageKey = `${participantId}::targetWords`;
    const savedWords = localStorage.getItem(storageKey);
    const hasWords = !!savedWords && JSON.parse(savedWords).length > 0;

    // Check session data for progress
    const sessionsKey = `${participantId}::sightWordsSessions`;
    const baselineKey = `${participantId}::baselineSessions`;
    const savedSessions = localStorage.getItem(sessionsKey);
    const savedBaseline = localStorage.getItem(baselineKey);
    const sessions: SessionData[] = savedSessions ? JSON.parse(savedSessions) : [];
    const baselineSessions: SessionData[] = savedBaseline ? JSON.parse(savedBaseline) : [];
    // Only mark target words as completed if a level 4 session exists AND is completed (e.g., has a date and totalQuestions > 0)
    const targetWordsCompleted = sessions.some((s) => s.level === 4 && s.totalQuestions > 0 && s.date);
    // Use unlock rules for progressive availability
    const baselineAvailable = isModeAvailable('baseline', sessions, baselineSessions);
    const level1AvailableCalc = isModeAvailable('level1', sessions, baselineSessions);
    const level1Mastered = sessions.some((s) => s.level === 1 && s.masteryAchieved);
    const level2Mastered = sessions.some((s) => s.level === 2 && s.masteryAchieved);
    const level3Mastered = sessions.some((s) => s.level === 3 && s.masteryAchieved);

    startTransition(() => {
      setHasTargetWords(hasWords);
      setTargetWordsCompleted(targetWordsCompleted);
      setBaselineAvailable(baselineAvailable);
      setLevel1Available(level1AvailableCalc);
      setLevel1Mastered(level1Mastered);
      setLevel2Mastered(level2Mastered);
      setLevel3Mastered(level3Mastered);
    });
  }, [participantId]);

  return (
    <div className="text-center flex flex-col items-center justify-center min-h-[500px]">
      <div className="mb-8">
        <p className="text-lg text-gray-600 mb-6">
          Master sight words through interactive games and challenges!
        </p>
      </div>

      <div className="space-y-4 w-full max-w-3xl px-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-6 uppercase text-center">Select Game Mode</h3>
          <div className="space-y-32 max-w-4xl mx-auto">
            {/* Baseline Mode - Move above levels */}
            <button
              onClick={onStartBaseline}
              disabled={!hasTargetWords || !baselineAvailable}
              className={`w-full font-bold py-6 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg text-white ${
                !baselineAvailable
                  ? 'bg-gray-300 cursor-not-allowed opacity-60 relative'
                  : hasTargetWords
                    ? 'bg-gradient-to-b from-slate-500 to-slate-700 hover:from-slate-600 hover:to-slate-800 cursor-pointer'
                    : 'bg-gray-300 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="text-3xl mb-1">🧪</div>
              <div className="text-lg">Baseline Mode</div>
              <div className="text-xs opacity-90">No prompts · No timer</div>
              {!baselineAvailable && (
                <div className="flex flex-col items-center mt-2">
                  <span className="text-green-600 text-xl">✔️</span>
                  <span className="text-xs text-green-700 font-semibold">Baseline Established</span>
                </div>
              )}
            </button>

            {/* Top Row - Levels 1, 2, 3 */}
            <div className="grid grid-cols-3 gap-10">
              {/* Level 1 - Always available */}
              <button
                onClick={() => onStartGame(1)}
                disabled={!hasTargetWords || !level1Available || level1Mastered}
                className={`font-bold py-8 px-6 rounded-xl transition-all transform shadow-lg text-white ${
                  level1Mastered
                    ? 'bg-gray-300 cursor-not-allowed opacity-60 relative'
                    : hasTargetWords && level1Available
                      ? 'bg-gradient-to-b from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 hover:scale-105 cursor-pointer'
                      : 'bg-gray-300 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="text-4xl mb-2">🌱</div>
                <div className="text-lg">Easy</div>
                <div className="text-sm opacity-90">Level 1</div>
                {!hasTargetWords && <div className="text-xs mt-2">Set target words first</div>}
                {hasTargetWords && baselineAvailable && <div className="text-xs mt-2">Complete baseline first</div>}
                {level1Mastered && (
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-green-600 text-xl">✔️</span>
                    <span className="text-xs text-green-700 font-semibold">Mastery Achieved</span>
                  </div>
                )}
              </button>
              
              {/* Level 2 - Unlocked after Level 1 mastery */}
              <button
                onClick={() => onStartGame(2)}
                disabled={!level1Mastered || level2Mastered}
                className={`font-bold py-8 px-6 rounded-xl transition-all transform shadow-lg text-white ${
                  level2Mastered
                    ? 'bg-gray-300 cursor-not-allowed opacity-60 relative'
                    : level1Mastered
                      ? 'bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 hover:scale-105 cursor-pointer'
                      : 'bg-gray-300 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="text-4xl mb-2">🌿</div>
                <div className="text-lg">Medium</div>
                <div className="text-sm opacity-90">Level 2</div>
                {!level1Mastered && <div className="text-xs mt-2">Master Level 1 first</div>}
                {level2Mastered && (
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-green-600 text-xl">✔️</span>
                    <span className="text-xs text-green-700 font-semibold">Mastery Achieved</span>
                  </div>
                )}
              </button>
              
              {/* Level 3 - Unlocked after Level 2 mastery */}
              <button
                onClick={() => onStartGame(3)}
                disabled={!level2Mastered || level3Mastered}
                className={`font-bold py-8 px-6 rounded-xl transition-all transform shadow-lg text-white ${
                  level3Mastered
                    ? 'bg-gray-300 cursor-not-allowed opacity-60 relative'
                    : level2Mastered
                      ? 'bg-gradient-to-b from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 hover:scale-105 cursor-pointer'
                      : 'bg-gray-300 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="text-4xl mb-2">🔥</div>
                <div className="text-lg">Hard</div>
                <div className="text-sm opacity-90">Level 3</div>
                {!level2Mastered && <div className="text-xs mt-2">Master Level 2 first</div>}
                {level3Mastered && (
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-green-600 text-xl">✔️</span>
                    <span className="text-xs text-green-700 font-semibold">Mastery Achieved</span>
                  </div>
                )}
              </button>
            </div>

            {/* Bottom Row - Targeted Words (Full Width) - Level 4 */}
            <button
              onClick={() => onStartGame(4)}
              disabled={!hasTargetWords || !levelMastery?.level3 || targetWordsCompleted}
              className={`w-full font-bold py-8 px-6 rounded-xl transition-all transform shadow-lg text-white ${
                hasTargetWords && levelMastery?.level3 && !targetWordsCompleted
                  ? 'bg-gradient-to-b from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 hover:scale-105 cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="text-4xl mb-2">{targetWordsCompleted ? '✅' : !levelMastery?.level3 ? '🔒' : '🎯'}</div>
              <div className="text-lg">Targeted Words</div>
              <div className="text-sm opacity-90">Audio only · No prompts · No timer</div>
              {targetWordsCompleted && <div className="text-xs mt-2">Completed (1 session limit)</div>}
              {!targetWordsCompleted && !levelMastery?.level3 && <div className="text-xs mt-2">Master Level 3 to unlock</div>}
            </button>

            {!hasTargetWords && (
              <p className="text-sm text-orange-600 text-center">Set target words in Manage Target Words to enable this mode</p>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-10 pt-8 border-t border-gray-200 w-full">
          <h3 className="text-lg font-semibold text-gray-600 mb-6 uppercase text-center">Features</h3>
          <div className="flex justify-center">
            <div className="grid grid-cols-4 gap-8 text-center max-w-4xl">
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">📚</span>
                <span className="text-gray-700 font-medium">Learn sight words</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">🎯</span>
                <span className="text-gray-700 font-medium">Quiz gameplay</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">⭐</span>
                <span className="text-gray-700 font-medium">Earn points</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">🏆</span>
                <span className="text-gray-700 font-medium">Build streaks</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Score Card Button */}
        {onViewHistory && (
          <div className="mt-8 text-center">
            <button
              onClick={onViewHistory}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              📊 View Score Card
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
