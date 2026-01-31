
"use client";

import { useState, useEffect, useCallback } from 'react';
import SessionGame from '@/components/SessionGame';
import HomeScreen from '@/components/HomeScreen';
import SessionHistory from '@/components/SessionHistory';
import ProgressTracker from '@/components/ProgressTracker';
import WordListManager from '@/components/WordListManager';
import ParticipantConfig, { ParticipantInfo } from '@/components/ParticipantConfig';
import SocialValiditySurvey, { SurveyResponses } from '@/components/SocialValiditySurvey';
import DataExport from '@/components/DataExport';
import Logo from '@/components/Logo';
import { createSessionData, SessionData, calculateMasteryPerLevel } from '@/components/sessionUtils';

export default function Page() {
  // Main state declarations
  const [participantId, setParticipantId] = useState('P1');
  const storageKey = useCallback((name: string) => `${participantId || 'default'}::${name}`,[participantId]);
  const [participantInput, setParticipantInput] = useState('');
  const [existingParticipants, setExistingParticipants] = useState<string[]>([]);
  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
  const [gameState, setGameState] = useState<'config' | 'home' | 'playing' | 'history' | 'wordManager' | 'survey' | 'export'>('config');
  const [level, setLevel] = useState(1);
  const [gameMode, setGameMode] = useState(1); // Track game mode (1, 2, 3, or 0) separately
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [totalWordsLearned, setTotalWordsLearned] = useState(0);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponses[]>([]);
  const [displayScore, setDisplayScore] = useState(0);
  const [showCoinOverlay, setShowCoinOverlay] = useState<{ active: boolean; amount: number } | null>(null);
  const [baselineSessions, setBaselineSessions] = useState<SessionData[]>([]);
  const [baselineMode, setBaselineMode] = useState(false);
  const [levelSessionNumbers, setLevelSessionNumbers] = useState<Record<number, number>>({ 4: 1, 1: 1, 2: 1, 3: 1 }); // Track session number per level (4=target words)
  const [gradeCongrats, setGradeCongrats] = useState<number | null>(null);
  const [baselineEstablished, setBaselineEstablished] = useState(false);
  const [showBaselineOverlay, setShowBaselineOverlay] = useState(false);
  const [showMasteryOverlay, setShowMasteryOverlay] = useState<{ level: number } | null>(null);
  const [masteryCelebrated, setMasteryCelebrated] = useState<{ [level: number]: boolean }>({});
  // Target completion overlay state (must be after all main state declarations)
  const [showTargetCompleteOverlay, setShowTargetCompleteOverlay] = useState(false);
  const [targetCompleteCelebrated, setTargetCompleteCelebrated] = useState(false);

  // New: Hold game result to process after render
  const [pendingGameResult, setPendingGameResult] = useState<any>(null);

  // New: Effect to process game result after render
  useEffect(() => {
    if (!pendingGameResult) return;
    const result = pendingGameResult;
    // Baseline runs are recorded separately and do not advance intervention session count
    if (baselineMode) {
      // Baseline sessions should have their own incrementing session numbers
      const nextBaselineSessionNumber = (baselineSessions?.length || 0) + 1;
      // Filter out 'incorrect' from responseTypes for baseline session data
      const filteredResponseTypes = result.responseTypes.filter((rt: string) => rt !== 'incorrect');
      // Remove promptType for baseline sessions (always empty)
      const baselineSessionRaw = createSessionData(
        nextBaselineSessionNumber,
        result.correct,
        result.assisted,
        result.noAnswer,
        result.total,
        result.responsesTimes,
        result.wordsAsked,
        filteredResponseTypes,
        'baseline',
        gameMode
      );
      const baselineEntry = {
        ...baselineSessionRaw,
        promptType: undefined,
      };
      const updatedBaseline = [...baselineSessions, baselineEntry];
      localStorage.setItem(storageKey('baselineSessions'), JSON.stringify(updatedBaseline));
      setBaselineSessions(updatedBaseline);
      // If the last two baseline sessions are both 100%, congratulate and suggest a higher grade level
      if (updatedBaseline.length >= 2) {
        const lastTwo = updatedBaseline.slice(-2);
        const bothPerfect = lastTwo.every((s) => s.accuracy >= 100);
        if (bothPerfect) {
          const currentGrade = participantInfo?.gradeLevel || 1;
          const suggested = Math.min(currentGrade + 1, 8);
          setGradeCongrats(suggested);
        }
      }
      // Baseline/target word count starts on first session (already handled by session count logic)
      setGameState('history');
      setPendingGameResult(null);
      return;
    }

    // --- Intervention/mastery logic ---
    // Filter out 'incorrect' from responseTypes for intervention session data to match expected type
    const filteredResponseTypes = result.responseTypes.filter((rt: string) => rt !== 'incorrect');
    const newSession = createSessionData(
      levelSessionNumbers[gameMode] || 1,
      result.correct,
      result.assisted,
      result.noAnswer,
      result.total,
      result.responsesTimes,
      result.wordsAsked,
      filteredResponseTypes,
      'intervention',
      gameMode
    );
    const updatedSessions = [...sessions, newSession];

    // Check for mastery (consecutive unprompted sessions only, after first 2 prompted)
    const masteryAchieved = calculateMasteryPerLevel(updatedSessions, gameMode);
    // Mark session as mastery if achieved
    if (masteryAchieved) {
      // Mark the last session as masteryAchieved
      updatedSessions[updatedSessions.length - 1] = { ...updatedSessions[updatedSessions.length - 1], masteryAchieved: true };
      // Save to localStorage
      localStorage.setItem(storageKey('sightWordsSessions'), JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
      setShowMasteryOverlay({ level: gameMode });
      // Points: 10 per unprompted correct, 5 per assisted
      const sessionPoints = result.sessionPoints ?? (result.correct * 10 + result.assisted * 5);
      const finalScore = totalScore + sessionPoints;
      setTotalScore(finalScore);
      localStorage.setItem(storageKey('totalScore'), JSON.stringify(finalScore));
      setShowCoinOverlay({ active: true, amount: sessionPoints });
      // Animate displayScore count-up to finalScore
      const startScore = totalScore;
      const diff = finalScore - startScore;
      const steps = 30;
      const increment = Math.max(1, Math.floor(diff / steps));
      let current = startScore;
      const timer = setInterval(() => {
        current += increment;
        if (current >= finalScore) {
          current = finalScore;
          clearInterval(timer);
          setTimeout(() => setShowCoinOverlay(null), 400);
        }
        setDisplayScore(current);
      }, 30);
      setTotalWordsLearned(totalWordsLearned + (typeof result.total === 'number' && !isNaN(result.total) ? result.total : 0));
      // Show mastery overlay but allow further sessions
      // Do not return here; allow session progression
    }

    // Save to localStorage
    localStorage.setItem(storageKey('sightWordsSessions'), JSON.stringify(updatedSessions));
    setSessions(updatedSessions);

    // Increment the session number for this specific game mode
    setLevelSessionNumbers(prev => ({
      ...prev,
      [gameMode]: (prev[gameMode] || 1) + 1
    }));

    // Points: 10 per unprompted correct, 5 per assisted
    const sessionPoints = result.sessionPoints ?? (result.correct * 10 + result.assisted * 5);
    const finalScore = totalScore + sessionPoints;
    setTotalScore(finalScore);
    localStorage.setItem(storageKey('totalScore'), JSON.stringify(finalScore));
    setShowCoinOverlay({ active: true, amount: sessionPoints });
    // Animate displayScore count-up to finalScore
    const startScore = totalScore;
    const diff = finalScore - startScore;
    const steps = 30;
    const increment = Math.max(1, Math.floor(diff / steps));
    let current = startScore;
    const timer = setInterval(() => {
      current += increment;
      if (current >= finalScore) {
        current = finalScore;
        clearInterval(timer);
        setTimeout(() => setShowCoinOverlay(null), 400);
      }
      setDisplayScore(current);
    }, 30);
    setTotalWordsLearned(totalWordsLearned + (typeof result.total === 'number' && !isNaN(result.total) ? result.total : 0));
    setGameState('history');
    setPendingGameResult(null);
  }, [pendingGameResult]);

  // Load targetCompleteCelebrated from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey('targetCompleteCelebrated'));
    if (stored === 'true') {
      setTargetCompleteCelebrated(true);
    }
  }, [storageKey]);

  // Watch for target completion and show overlay if not already celebrated
  useEffect(() => {
    if (
      targetWords.length > 0 &&
      sessions.length > 0 &&
      !targetCompleteCelebrated
    ) {
      // Check if all target words have been answered correctly at least once in any session
      const mastered = targetWords.every(word =>
        sessions.some(session =>
          session.wordsAsked?.includes(word) &&
          session.responseTypes?.[session.wordsAsked.indexOf(word)] === 'correct'
        )
      );
      if (mastered) {
        setShowTargetCompleteOverlay(true);
      }
    }
  }, [sessions, targetWords, targetCompleteCelebrated]);

  // Handler to dismiss target completion overlay and persist
  const handleDismissTargetCompleteOverlay = () => {
    setTargetCompleteCelebrated(true);
    localStorage.setItem(storageKey('targetCompleteCelebrated'), 'true');
    setShowTargetCompleteOverlay(false);
  };


  // Load masteryCelebrated from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey('masteryCelebrated'));
    if (stored) {
      try {
        setMasteryCelebrated(JSON.parse(stored));
      } catch {}
    }
  }, [storageKey]);

  // Watch for mastery achievement and show overlay if not already celebrated
  useEffect(() => {
    [1, 2, 3].forEach(levelNum => {
      const achieved = calculateMasteryPerLevel(sessions, levelNum);
      if (achieved && !masteryCelebrated[levelNum]) {
        setShowMasteryOverlay({ level: levelNum });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  // Handler to dismiss mastery overlay and persist
  const handleDismissMasteryOverlay = (level: number) => {
    const updated = { ...masteryCelebrated, [level]: true };
    setMasteryCelebrated(updated);
    localStorage.setItem(storageKey('masteryCelebrated'), JSON.stringify(updated));
    setShowMasteryOverlay(null);
  };
  // (Removed duplicate declarations)

  // Load list of all participants


  // Baseline establishment effect (avoid direct setState in render)
  useEffect(() => {
    // Establish baseline after any 4 consecutive baseline sessions with accuracy range ≤ 10%
    if (!baselineEstablished && baselineSessions.length >= 4) {
      for (let i = 0; i <= baselineSessions.length - 4; i++) {
        const four = baselineSessions.slice(i, i + 4);
        if (four.length === 4) {
          const accs = four.map(s => s.accuracy);
          const min = Math.min(...accs);
          const max = Math.max(...accs);
          if (max - min <= 10) {
            setBaselineEstablished(true);
            setShowBaselineOverlay(true);
            localStorage.setItem(storageKey('baselineEstablished'), 'true');
            setBaselineMode(false); // Lock out further baseline sessions
            break;
          }
        }
      }
    }
  }, [baselineSessions, baselineEstablished, storageKey]);

  // Load baseline established from storage (only on mount)
  useEffect(() => {
    const stored = localStorage.getItem(storageKey('baselineEstablished'));
    if (stored === 'true' && !baselineEstablished) {
      setBaselineEstablished(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load list of all participants
  useEffect(() => {
    const allParticipants = localStorage.getItem('allParticipants');
    if (allParticipants) {
      try {
        Promise.resolve().then(() => {
          setExistingParticipants(JSON.parse(allParticipants));
        });
      } catch (e) {
        console.error('Failed to load participants list:', e);
      }
    }
  }, []);

  // Load participant-specific data
  useEffect(() => {
    const savedSessions = localStorage.getItem(storageKey('sightWordsSessions'));
    const savedBaseline = localStorage.getItem(storageKey('baselineSessions'));
    const savedWords = localStorage.getItem(storageKey('targetWords'));
    const savedSurveys = localStorage.getItem(storageKey('socialValiditySurveys'));
    const savedConfig = localStorage.getItem(storageKey('participantConfig'));
    
    let loadedSessions: SessionData[] = [];
    let loadedTotalScore = 0;
    let loadedTotalWordsLearned = 0;

    // Load config first (needed for migration)
    let loadedConfig: ParticipantInfo | null = null;
    if (savedConfig) {
      try {
        loadedConfig = JSON.parse(savedConfig);
      } catch (e) {
        console.error('Failed to load participant config:', e);
      }
    }

    if (savedSessions) {
      try {
        loadedSessions = JSON.parse(savedSessions);
        
        // Migration: Fix old sessions where level was actual grade (not gameMode)
        // If we find sessions with level > 3 (game modes are only 0, 1, 2, 3), assume they need migration
        const needsMigration = loadedSessions.some((s: SessionData) => s.level > 3);
        if (needsMigration && loadedConfig) {
          console.log('Migrating old session data to use game modes instead of grade levels');
          loadedSessions = loadedSessions.map((s: SessionData) => {
            // If level is the reading level, it's game mode 1
            if (s.level === loadedConfig.readingLevel) {
              return { ...s, level: 1 };
            }
            // If level is midway, it's game mode 2
            const midway = Math.floor((loadedConfig.readingLevel + loadedConfig.gradeLevel) / 2);
            if (s.level === midway) {
              return { ...s, level: 2 };
            }
            // If level is grade level, it's game mode 3
            if (s.level === loadedConfig.gradeLevel) {
              return { ...s, level: 3 };
            }
            // Otherwise leave as is (might be 0 for target words or already correct)
            return s;
          });
          // Save migrated data
          localStorage.setItem(storageKey('sightWordsSessions'), JSON.stringify(loadedSessions));
        }
        
        loadedTotalScore = loadedSessions.reduce((sum: number, s: SessionData) => sum + (s.correctAnswers * 10 + (s.assistedAnswers || 0) * 5), 0);
        loadedTotalWordsLearned = loadedSessions.reduce((sum: number, s: SessionData) => sum + s.totalQuestions, 0);
        if (isNaN(loadedTotalWordsLearned)) loadedTotalWordsLearned = 0;
      } catch (e) {
        console.error('Failed to load sessions:', e);
      }
    }

    // Check if there's a saved total score (takes precedence)
    const savedTotalScore = localStorage.getItem(storageKey('totalScore'));
    if (savedTotalScore) {
      try {
        loadedTotalScore = JSON.parse(savedTotalScore);
      } catch (e) {
        console.error('Failed to load saved total score:', e);
      }
    }

    let loadedWords: string[] = [];
    if (savedWords) {
      try {
        loadedWords = JSON.parse(savedWords);
      } catch (e) {
        console.error('Failed to load target words:', e);
      }
    }

    let loadedBaseline: SessionData[] = [];
    if (savedBaseline) {
      try {
        loadedBaseline = JSON.parse(savedBaseline);
      } catch (e) {
        console.error('Failed to load baseline sessions:', e);
      }
    }

    let loadedSurveys: SurveyResponses[] = [];
    if (savedSurveys) {
      try {
        loadedSurveys = JSON.parse(savedSurveys);
      } catch (e) {
        console.error('Failed to load surveys:', e);
      }
    }

    // Calculate session numbers per level
    const levelSessionNums: Record<number, number> = { 0: 1, 1: 1, 2: 1, 3: 1 };
    loadedSessions.forEach(session => {
      levelSessionNums[session.level] = (levelSessionNums[session.level] || 1) + 1;
    });

    Promise.resolve().then(() => {
      setSessions(loadedSessions);
      setLevelSessionNumbers(levelSessionNums);
      setTotalScore(loadedTotalScore);
      setDisplayScore(loadedTotalScore);
      setTotalWordsLearned(isNaN(loadedTotalWordsLearned) ? 0 : loadedTotalWordsLearned);
      setTargetWords(loadedWords);
      setBaselineSessions(loadedBaseline);
      setSurveyResponses(loadedSurveys);
      setParticipantInfo(loadedConfig);
      
      // If no config exists, show config screen; otherwise show home
      if (loadedConfig) {
        setGameState('home');
      } else {
        setGameState('config');
      }
    });
  }, [storageKey]);

  const handleSaveParticipantConfig = (info: ParticipantInfo) => {
    localStorage.setItem(storageKey('participantConfig'), JSON.stringify(info));
    setParticipantInfo(info);
    
    // Add to existing participants list if not already there
    if (!existingParticipants.includes(participantId)) {
      const updatedParticipants = [...existingParticipants, participantId];
      setExistingParticipants(updatedParticipants);
      localStorage.setItem('allParticipants', JSON.stringify(updatedParticipants));
    }
    
    setGameState('home');
  };

  const getActualLevel = (selectedLevel: number): number => {
    if (!participantInfo || selectedLevel === 4) return selectedLevel;
    
    // Level 1 = reading level, Level 2 = midway, Level 3 = grade level
    if (selectedLevel === 1) return participantInfo.readingLevel;
    if (selectedLevel === 2) return Math.floor((participantInfo.readingLevel + participantInfo.gradeLevel) / 2);
    if (selectedLevel === 3) return participantInfo.gradeLevel;
    
    return selectedLevel;
  };

  const handleStartGame = (selectedLevel: number) => {
    setBaselineMode(false);
    if (selectedLevel === 4 && targetWords.length < 10) {
      alert('Please set up at least 10 target words first!');
      setGameState('wordManager');
      return;
    }
    
    const actualLevel = getActualLevel(selectedLevel);
    setLevel(actualLevel);
    setGameMode(selectedLevel); // Store the game mode (1, 2, 3, or 0)
    setGameState('playing');
  };

  const handleStartBaseline = () => {
    // Always allow entering baseline mode, regardless of previous sessions
    if (targetWords.length < 10) {
      alert('Please set up at least 10 target words first!');
      setGameState('wordManager');
      return;
    }
    setBaselineMode(true);
    // Use participant's actual grade level for baseline
    setLevel(participantInfo?.gradeLevel || 1);
    setGameMode(0);
    setGameState('playing');
  };

  const handleGameComplete = (result: {
    correct: number;
    assisted: number;
    noAnswer: number;
    total: number;
    newStreak: number;
    responsesTimes: number[];
    wordsAsked: string[];
    responseTypes: ('correct' | 'incorrect' | 'assisted' | 'no-answer')[];
    sessionPoints?: number;
  }) => {
    // Baseline runs are recorded separately and do not advance intervention session count
    if (baselineMode) {
      // Baseline sessions should have their own incrementing session numbers
      const nextBaselineSessionNumber = (baselineSessions?.length || 0) + 1;
      // Filter out 'incorrect' from responseTypes for baseline session data
      const filteredResponseTypes = result.responseTypes.filter(rt => rt !== 'incorrect') as ('correct' | 'assisted' | 'no-answer')[];
      // Remove promptType for baseline sessions (always empty)
      const baselineSessionRaw = createSessionData(
        nextBaselineSessionNumber,
        result.correct,
        result.assisted,
        result.noAnswer,
        result.total,
        result.responsesTimes,
        result.wordsAsked,
        filteredResponseTypes,
        'baseline',
        gameMode
      );
      // Override accuracy for baseline: correct/total*100 (not weighted)
      const baselineEntry = {
        ...baselineSessionRaw,
        accuracy: result.total > 0 ? (result.correct / result.total) * 100 : 0,
        promptType: undefined,
      };
      const updatedBaseline = [...baselineSessions, baselineEntry];
      localStorage.setItem(storageKey('baselineSessions'), JSON.stringify(updatedBaseline));
      setBaselineSessions(updatedBaseline);
      // If the last two baseline sessions are both 100%, congratulate and suggest a higher grade level
      if (updatedBaseline.length >= 2) {
        const lastTwo = updatedBaseline.slice(-2);
        const bothPerfect = lastTwo.every((s) => s.accuracy >= 100);
        if (bothPerfect) {
          const currentGrade = participantInfo?.gradeLevel || 1;
          const suggested = Math.min(currentGrade + 1, 8);
          setGradeCongrats(suggested);
        }
      }
      // Baseline/target word count starts on first session (already handled by session count logic)
      setGameState('history');
      return;
    }

    // --- Intervention/mastery logic ---
    // Filter out 'incorrect' from responseTypes for intervention session data to match expected type
    const filteredResponseTypes = result.responseTypes.filter(rt => rt !== 'incorrect') as ('correct' | 'assisted' | 'no-answer')[];
    const newSession = createSessionData(
      levelSessionNumbers[gameMode] || 1,
      result.correct,
      result.assisted,
      result.noAnswer,
      result.total,
      result.responsesTimes,
      result.wordsAsked,
      filteredResponseTypes,
      'intervention',
      gameMode
    );
    const updatedSessions = [...sessions, newSession];

    // Check for mastery (consecutive unprompted sessions only, after first 2 prompted)
    const masteryAchieved = calculateMasteryPerLevel(updatedSessions, gameMode);
    // Mark session as mastery if achieved
    if (masteryAchieved) {
      // Mark the last session as masteryAchieved
      updatedSessions[updatedSessions.length - 1] = { ...updatedSessions[updatedSessions.length - 1], masteryAchieved: true };
      // Save to localStorage
      localStorage.setItem(storageKey('sightWordsSessions'), JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
      setShowMasteryOverlay({ level: gameMode });
      // Do NOT increment session number or allow further sessions for this level
      // Points: 10 per unprompted correct, 5 per assisted
      const sessionPoints = result.sessionPoints ?? (result.correct * 10 + result.assisted * 5);
      const finalScore = totalScore + sessionPoints;
      setTotalScore(finalScore);
      localStorage.setItem(storageKey('totalScore'), JSON.stringify(finalScore));
      setShowCoinOverlay({ active: true, amount: sessionPoints });
      // Animate displayScore count-up to finalScore
      const startScore = totalScore;
      const diff = finalScore - startScore;
      const steps = 30;
      const increment = Math.max(1, Math.floor(diff / steps));
      let current = startScore;
      const timer = setInterval(() => {
        current += increment;
        if (current >= finalScore) {
          current = finalScore;
          clearInterval(timer);
          setTimeout(() => setShowCoinOverlay(null), 400);
        }
        setDisplayScore(current);
      }, 30);
      setTotalWordsLearned(totalWordsLearned + (typeof result.total === 'number' && !isNaN(result.total) ? result.total : 0));
      // Stay on overlay until user dismisses
      return;
    }

    // Save to localStorage
    localStorage.setItem(storageKey('sightWordsSessions'), JSON.stringify(updatedSessions));
    setSessions(updatedSessions);

    // Increment the session number for this specific game mode
    setLevelSessionNumbers(prev => ({
      ...prev,
      [gameMode]: (prev[gameMode] || 1) + 1
    }));

    // Points: 10 per unprompted correct, 5 per assisted
    const sessionPoints = result.sessionPoints ?? (result.correct * 10 + result.assisted * 5);
    const finalScore = totalScore + sessionPoints;
    setTotalScore(finalScore);
    localStorage.setItem(storageKey('totalScore'), JSON.stringify(finalScore));
    setShowCoinOverlay({ active: true, amount: sessionPoints });
    // Animate displayScore count-up to finalScore
    const startScore = totalScore;
    const diff = finalScore - startScore;
    const steps = 30;
    const increment = Math.max(1, Math.floor(diff / steps));
    let current = startScore;
    const timer = setInterval(() => {
      current += increment;
      if (current >= finalScore) {
        current = finalScore;
        clearInterval(timer);
        setTimeout(() => setShowCoinOverlay(null), 400);
      }
      setDisplayScore(current);
    }, 30);
    setTotalWordsLearned(totalWordsLearned + (typeof result.total === 'number' && !isNaN(result.total) ? result.total : 0));
    setGameState('history');
  };

  const handlePlayAgain = () => {
    setBaselineMode(false);
    setGameState('home');
  };


  const handleOpenParticipantSetup = () => {
    if (participantInfo) {
      const proceed = window.confirm(
        'This profile is already configured. Changing it will recalibrate word selection. Continue to edit?'
      );
      if (!proceed) return;
    }
    setGameState('config');
  };

  const handleSaveWords = (words: string[]) => {
    localStorage.setItem(storageKey('targetWords'), JSON.stringify(words));
    setTargetWords(words);
    setGameState('home');
  };

  const handleSurveyComplete = (responses: SurveyResponses) => {
    const updatedSurveys = [...surveyResponses, responses];
    localStorage.setItem(storageKey('socialValiditySurveys'), JSON.stringify(updatedSurveys));
    setSurveyResponses(updatedSurveys);
    alert('Thank you! Your survey responses have been saved.');
    setGameState('home');
  };

  return (
    <>
      {/* Target Words Completion Overlay */}
      {showTargetCompleteOverlay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[95%] max-w-md text-center">
            <div className="text-5xl mb-3">🌟</div>
            <h2 className="text-2xl font-bold mb-2">All Target Words Mastered!</h2>
            <div>
              <p>Congratulations! You have mastered all your target words.</p>
              <p>You may now update your word list or continue practicing.</p>
            </div>
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg mt-2"
              onClick={handleDismissTargetCompleteOverlay}
            >
              OK
            </button>
          </div>
        </div>
      )}
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-300 to-blue-300 p-4 flex items-center justify-center">
      <div className="max-w-4xl w-full flex flex-col items-center text-center mx-auto">
        {/* Header */}
        <div className="mb-8 w-full flex justify-center">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 max-w-3xl w-full mx-auto">
            <div className="flex items-center gap-4">
              <Logo size={80} className="drop-shadow-lg" />
              <h1 className="text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
                AUSUM<br />Academic<br />Activities
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 justify-center text-xl text-white drop-shadow-md">
              <p>When instruction is engineered,</p>
              <p>failure becomes unnecessary.</p>
            </div>
          </div>
        </div>

        {/* Participant Switcher */}
        <div className="bg-white/80 rounded-xl shadow-lg p-4 mb-6 w-full max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-center text-center">
            <div className="text-sm font-semibold text-gray-700">
              Current Participant: <span className="text-purple-700">{participantId}</span>
            </div>
            <div className="flex gap-2 items-center w-full md:w-auto justify-center">
              {/* Existing Participants Dropdown */}
              {existingParticipants.length > 0 && (
                <select
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 md:flex-none"
                >
                  {existingParticipants.map((pid) => (
                    <option key={pid} value={pid}>
                      {pid}
                    </option>
                  ))}
                </select>
              )}
              
              {/* New Participant Input */}
              <input
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value.trim())}
                placeholder="New participant ID"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 md:flex-none"
                suppressHydrationWarning
              />
              <button
                onClick={() => {
                  if (participantInput.trim()) {
                    setParticipantId(participantInput);
                    setParticipantInput('');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2 rounded-lg whitespace-nowrap"
                suppressHydrationWarning
              >
                New Profile
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="relative w-full flex justify-center">
          <div className="w-full max-w-3xl mx-auto">
            <ProgressTracker score={displayScore} level={level} streak={sessions.length} wordsLearned={totalWordsLearned} />
          </div>
          {showCoinOverlay?.active && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 bg-yellow-100/90 border border-yellow-300 rounded-xl px-4 py-2 shadow-lg animate-bounce">
                <span className="text-2xl">🪙🪙🪙</span>
                <span className="text-lg font-bold text-yellow-700">+{showCoinOverlay.amount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Congrats Overlay for Grade Level Suggestion */}
        {gradeCongrats !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-[95%] max-w-md text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Amazing Baseline Performance!</h2>
              <p className="text-gray-700 mb-4">
                Two consecutive 100% baseline sessions — you’re reading at grade level.
                Would you like to try Grade {gradeCongrats}?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-lg border border-gray-300"
                  onClick={() => setGradeCongrats(null)}
                >
                  Keep Current Grade
                </button>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg"
                  onClick={() => {
                    if (!participantInfo) { setGradeCongrats(null); return; }
                    const updated = { ...participantInfo, gradeLevel: gradeCongrats! };
                    localStorage.setItem(storageKey('participantConfig'), JSON.stringify(updated));
                    setParticipantInfo(updated);
                    setGradeCongrats(null);
                  }}
                >
                  Increase to Grade {gradeCongrats}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Baseline Established Overlay */}
        {showBaselineOverlay && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-[95%] max-w-md text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Baseline Established!</h2>
              <div className="text-gray-700 mb-4">
                <div>
                  <p>Thank you for completing the baseline sessions.</p>
                  <p>You may now begin intervention sessions.</p>
                </div>
              </div>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg mt-2"
                onClick={() => setShowBaselineOverlay(false)}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Mastery Celebration Overlay */}
        {showMasteryOverlay && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-[95%] max-w-md text-center">
              <div className="text-5xl mb-3">🏆</div>
              <h2 className="text-2xl font-bold mb-2">Level {showMasteryOverlay.level} Mastery Achieved!</h2>
              <div className="text-gray-700 mb-4">
                <div>
                  <p>Congratulations! You have mastered Level {showMasteryOverlay.level}.</p>
                  <p>The next level is now unlocked.</p>
                </div>
              </div>
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg mt-2"
                onClick={() => handleDismissMasteryOverlay(showMasteryOverlay.level)}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Target Words Completion Overlay */}
        {showTargetCompleteOverlay && (
        <div>
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-[95%] max-w-md text-center">
              <div className="text-5xl mb-3">🌟</div>
              <h2 className="text-2xl font-bold mb-2">All Target Words Mastered!</h2>
              <div>
                <p>Congratulations! You have mastered all your target words.</p>
                <p>You may now update your word list or continue practicing.</p>
              </div>
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg mt-2"
                onClick={handleDismissTargetCompleteOverlay}
              >
                OK
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Target Words Completion Overlay */}
        {showTargetCompleteOverlay && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-[95%] max-w-md text-center">
              <div className="text-5xl mb-3">🌟</div>
              <h2 className="text-2xl font-bold mb-2">All Target Words Mastered!</h2>
              <div className="text-gray-700 mb-4">
                <div>
                  <p>Congratulations! You have mastered all your target words.</p>
                  <p>You may now update your word list or continue practicing.</p>
                </div>
              </div>
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg mt-2"
                onClick={handleDismissTargetCompleteOverlay}
              >
                OK
              </button>
            </div>
          </div>
        )}


        {/* Target Words Completion Overlay */}
        {showTargetCompleteOverlay && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-[95%] max-w-md text-center">
              <div className="text-5xl mb-3">🌟</div>
              <h2 className="text-2xl font-bold mb-2">All Target Words Mastered!</h2>
              <div className="text-gray-700 mb-4">
                <p>Congratulations! You have mastered all your target words.</p>
                <p>You may now update your word list or continue practicing.</p>
              </div>
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg mt-2"
                onClick={handleDismissTargetCompleteOverlay}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 max-w-2xl mx-auto w-full">
          {gameState === 'config' && (
            <ParticipantConfig
              participantId={participantId}
              onSave={handleSaveParticipantConfig}
              currentInfo={participantInfo || undefined}
            />
          )}
          {gameState === 'home' && <HomeScreen onStartGame={handleStartGame} onStartBaseline={handleStartBaseline} participantId={participantId} onViewHistory={() => setGameState('history')} levelMastery={{ level1: calculateMasteryPerLevel(sessions, 1), level2: calculateMasteryPerLevel(sessions, 2), level3: calculateMasteryPerLevel(sessions, 3) }} participantInfo={participantInfo} />}
          {gameState === 'playing' && (
            <SessionGame
              level={level}
              sessionNumber={levelSessionNumbers[gameMode] || 1}
              onGameComplete={setPendingGameResult}
              onCancel={() => setGameState('history')}
              targetWords={baselineMode || level === 4 ? targetWords : undefined}
              baselineMode={baselineMode}
            />
          )}
          {gameState === 'history' && <SessionHistory sessions={sessions} baselineSessions={baselineSessions} onNewSession={handlePlayAgain} onExportData={() => setGameState('export')} />}
          {gameState === 'wordManager' && (
            <WordListManager
              currentWords={targetWords}
              onSave={handleSaveWords}
              onCancel={() => setGameState('home')}
              gradeLevel={participantInfo?.gradeLevel || 1}
            />
          )}
          {gameState === 'survey' && <SocialValiditySurvey onComplete={handleSurveyComplete} />}
          {gameState === 'export' && <DataExport onBack={() => setGameState('home')} participantId={participantId} />}
        </div>

        {/* Quick Action Buttons */}
        {gameState === 'home' && (
          <div className="flex gap-4 justify-center mb-8 flex-wrap w-full max-w-3xl mx-auto">
            <button
              onClick={handleOpenParticipantSetup}
              className="bg-white hover:bg-gray-50 text-blue-600 font-bold py-3 px-6 rounded-lg shadow-lg transition-all border-2 border-blue-300"
            >
              ⚙️ Participant Setup
              {participantInfo && (
                <span className="text-xs block mt-1">
                  Grade {participantInfo.gradeLevel} · Reading Lvl {participantInfo.readingLevel}
                </span>
              )}
            </button>
            <button
              onClick={() => setGameState('wordManager')}
              className="bg-white hover:bg-gray-50 text-purple-600 font-bold py-3 px-6 rounded-lg shadow-lg transition-all border-2 border-purple-300"
            >
              📝 Manage Target Words {targetWords.length > 0 && `(${targetWords.length})`}
            </button>
            <button
              onClick={() => setGameState('survey')}
              className="bg-white hover:bg-gray-50 text-pink-600 font-bold py-3 px-6 rounded-lg shadow-lg transition-all border-2 border-pink-300"
            >
              📊 Social Validity Survey
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center text-white text-sm mt-8 opacity-90 w-full">
          <p>PhD Dissertation - ABA-Based Sight Word Intervention for Adolescents with Autism</p>
          <p className="text-xs mt-2">Sessions 1-2: Immediate audible prompt | Sessions 3+: 3-second constant time delay</p>
        </div>
      </div>
    </div>
  </>
  );
}