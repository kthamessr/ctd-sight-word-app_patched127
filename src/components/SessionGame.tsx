'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPromptConfig, playAudioPrompt, createSessionData } from './sessionUtils';
import { getRandomWords, getSightWords } from './sightWordsData';

interface GameCompleteResult {
  correct: number;
  assisted: number;
  noAnswer: number;
  total: number;
  newStreak: number;
  responsesTimes: number[];
  wordsAsked: string[];
  responseTypes: ('correct' | 'assisted' | 'no-answer' | 'incorrect')[];
  points?: number;
  maxPoints?: number;
  weightedAccuracy?: number;
}

interface GameProps {
  level: number;
  sessionNumber: number;
  targetWords?: string[];
  baselineMode?: boolean;
  onGameComplete: (result: GameCompleteResult) => void;
  onCancel: () => void;
}

interface Question {
  word: string;
  options: string[];
}

type TrialOutcome = 'correct' | 'assisted' | 'no-answer' | 'incorrect';

export default function SessionGame({
  level,
  sessionNumber,
  targetWords,
  baselineMode = false,
  onGameComplete,
  onCancel,
}: GameProps) {
  // Ref to skip timer reset after correct answer in intervention
  const skipTimerResetRef = useRef(false);
  // Track last played word to prevent repeat audio
  const lastPlayedWordRef = useRef<string | null>(null);
  const isBaseline = baselineMode || level === 4;
  const promptConfig = useMemo(() => getPromptConfig(sessionNumber), [sessionNumber]);

  // ----------------------------
  // Core session state
  // ----------------------------

  const [noAnswer, setNoAnswer] = useState(0);
  const [incorrect, setIncorrect] = useState(0);

  const [responseTypes, setResponseTypes] = useState<TrialOutcome[]>([]);
  const [responsesTimes, setResponsesTimes] = useState<number[]>([]);

  // ----------------------------
  // UI / trial state
  // ----------------------------
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false); // finalized for current trial (locks buttons)
  const [showRetry, setShowRetry] = useState(false);


  const [timeLeft, setTimeLeft] = useState(10);
  const [timeExpired, setTimeExpired] = useState(false);

  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | 'Go!' | null>(3);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [assisted, setAssisted] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);


  // Warn/block user from leaving or using back button during session
  const sessionCompleteRef = useRef(false);
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameStarted && !sessionCompleteRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameStarted]);

  // ----------------------------
  // Core session state
  // ----------------------------

  // ----------------------------
  // Refs for determinism / safety
  // ----------------------------
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baselineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trialFinalizedRef = useRef(false);
  const trialStartMsRef = useRef<number>(Date.now());

  const currentWord = questions[currentQuestion]?.word ?? '';
  const allOptions = questions[currentQuestion]?.options ?? [];

  // ----------------------------
  // Utilities
  // ----------------------------
  const clearAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
    if (baselineTimeoutRef.current) {
      clearTimeout(baselineTimeoutRef.current);
      baselineTimeoutRef.current = null;
    }
  }, []);

  const finalizeTrial = useCallback((outcome: TrialOutcome, seconds: number) => {
    if (trialFinalizedRef.current) return;
    trialFinalizedRef.current = true;

    // Only set answered true for correct/assisted/no-answer, not for incorrect
    if (outcome === 'correct' || outcome === 'assisted' || outcome === 'no-answer') {
      setAnswered(true);
    }
    setIsTimerRunning(false);

    setResponseTypes((prev) => [...prev, outcome]);
    setResponsesTimes((prev) => [...prev, seconds]);

    if (outcome === 'correct') setCorrect((c) => c + 1);
    if (outcome === 'assisted') setAssisted((a) => a + 1);
    if (outcome === 'no-answer') setNoAnswer((n) => n + 1);
    if (outcome === 'incorrect') setIncorrect((i) => i + 1);
  }, []);

  const finishSession = useCallback(() => {
    if (sessionCompleteRef.current) return;
    sessionCompleteRef.current = true;

    clearAllTimers();
    setIsTimerRunning(false);
    setAnswered(true);

    const wordsAsked = questions.map((q) => q.word);
    const total = questions.length;

    if (isBaseline) {
      // For baseline, count correct and incorrect only
      const baselineResponseTypes = responseTypes.map(rt => (rt === 'correct' ? 'correct' : 'incorrect'));
      const correctCount = baselineResponseTypes.filter(rt => rt === 'correct').length;
      const incorrectCount = baselineResponseTypes.filter(rt => rt === 'incorrect').length;
      const sessionData = {
        correct: correctCount,
        incorrect: incorrectCount,
        total,
        responsesTimes,
        wordsAsked,
        responseTypes: baselineResponseTypes,
      };
      onGameComplete({
        correct: correctCount,
        incorrect: incorrectCount,
        noAnswer,
        assisted,
        total,
        newStreak: 0,
        responsesTimes,
        wordsAsked,
        responseTypes: baselineResponseTypes,
      });
      return;
    }

    // Intervention: half credit for assisted
    const points = correct * 10 + assisted * 5;
    const maxPoints = total * 10;
    const weightedAccuracy = maxPoints > 0 ? (points / maxPoints) * 100 : 0;

    onGameComplete({
      correct,
      assisted,
      noAnswer,
      total,
      newStreak: correct === total ? 1 : 0,
      responsesTimes,
      wordsAsked,
      responseTypes: responseTypes as any,
      points,
      maxPoints,
      weightedAccuracy,
    });
  }, [
    assisted,
    baselineMode,
    clearAllTimers,
    correct,
    isBaseline,
    level,
    noAnswer,
    onGameComplete,
    questions,
    responseTypes,
    responsesTimes,
    sessionNumber,
  ]);

  const nextTrial = useCallback(() => {
    if (sessionCompleteRef.current) return;

    setCurrentQuestion((q) => {
      const next = q + 1;
      if (next < questions.length) return next;
      // End of session
      finishSession();
      return q;
    });
  }, [finishSession, questions.length]);

  const startTrial = useCallback(() => {
    if (!gameStarted) return;
    if (questions.length === 0) return;
    if (sessionCompleteRef.current) return;

    // Reset per-trial deterministic flags
    trialFinalizedRef.current = false;
    trialStartMsRef.current = Date.now();

    // Clear per-trial UI state
    setAnswered(false);
    setSelectedAnswer(null);
    setShowRetry(false);
    setTimeExpired(false);
    setShowPrompt(false);

    // Only reset timer if not skipping and not after timeExpired
    if (!skipTimerResetRef.current && !timeExpired) {
      setTimeLeft(10);
      setIsTimerRunning(!isBaseline);
    } else if (timeExpired) {
      // If timeExpired, do not reset UI or timer; just advance to next question
      return;
    } else {
      skipTimerResetRef.current = false;
    }

    // Clear leftover timers from prior trial
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
    if (baselineTimeoutRef.current) {
      clearTimeout(baselineTimeoutRef.current);
      baselineTimeoutRef.current = null;
    }

    const word = questions[currentQuestion]?.word;
    if (!word) return;

    // Only play audio if this is a new question (not after answering)
    if (lastPlayedWordRef.current !== word) {
      playAudioPrompt(word);
      lastPlayedWordRef.current = word;
    }

    if (isBaseline) {
      // Baseline/target: auto-advance after 10s if no response
      baselineTimeoutRef.current = setTimeout(() => {
        if (trialFinalizedRef.current) return;
        if (sessionCompleteRef.current) return;

        finalizeTrial("no-answer", 10);

        const isLast = currentQuestion >= questions.length - 1;
        if (isLast) {
          // lock completion so nothing else can schedule
          sessionCompleteRef.current = true;
          setTimeout(() => finishSession(), 0);
        } else {
          setTimeout(() => nextTrial(), 200);
        }
      }, 10000);
      return;
    }

    // Intervention prompt schedule
    if (promptConfig.immediate) {
      setShowPrompt(true);
    } else {
      promptTimerRef.current = setTimeout(() => {
        if (trialFinalizedRef.current) return;
        setShowPrompt(true);
      }, promptConfig.delay);
    }
  }, [
    currentQuestion,
    finalizeTrial,
    gameStarted,
    isBaseline,
    nextTrial,
    promptConfig.delay,
    promptConfig.immediate,
    questions,
  ]);

  // ----------------------------
  // Build questions when level/targets change
  // ----------------------------
  useEffect(() => {
    // Reset session when core inputs change
    sessionCompleteRef.current = false;
    trialFinalizedRef.current = false;
    clearAllTimers();

    setQuestions([]);
    setCurrentQuestion(0);
    setCorrect(0);
    setAssisted(0);
    setNoAnswer(0);
    setResponseTypes([]);
    setResponsesTimes([]);

    setSelectedAnswer(null);
    setAnswered(false);
    setShowRetry(false);
    setGameStarted(false);
    setCountdown(3);

    setTimeLeft(10);
    setIsTimerRunning(false);
    setTimeExpired(false);
    setShowPrompt(false);

    const gradeLevel = level;
    const gradeWordList = getSightWords(gradeLevel);

    let words: string[] = [];

    if (baselineMode) {
      // Baseline: prefer targetWords filtered to grade-level list; fallback to grade list
      let filtered: string[] = [];
      if (targetWords && targetWords.length > 0) {
        filtered = targetWords.filter((w) => gradeWordList.includes(w));
      }
      if (filtered.length === 0) filtered = [...gradeWordList];

      // Fill to 10
      let baselineWords = [...filtered];
      while (baselineWords.length < 10 && baselineWords.length > 0) {
        baselineWords = [...baselineWords, ...filtered];
      }
      words = baselineWords.slice(0, 10);
    } else if (targetWords && targetWords.length > 0) {
      const filtered = targetWords.filter((w) => gradeWordList.includes(w));
      let shuffled = [...filtered].sort(() => Math.random() - 0.5);
      if (shuffled.length < 10) {
        const missing = 10 - shuffled.length;
        const fillWords = gradeWordList
          .filter((w) => !shuffled.includes(w))
          .sort(() => Math.random() - 0.5)
          .slice(0, missing);
        shuffled = [...shuffled, ...fillWords];
      }
      words = shuffled.slice(0, 10);
    } else {
      words = getRandomWords(gradeLevel, 10);
    }

    const questionsData: Question[] = words.map((word) => {
      let distractors: string[];
      if (baselineMode) {
        distractors = gradeWordList.filter(
          (w) => w !== word && !(targetWords && targetWords.includes(w))
        );
      } else {
        distractors = gradeWordList.filter((w) => w !== word);
      }
      const shuffledDistractors = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [word, ...shuffledDistractors].sort(() => Math.random() - 0.5);
      return { word, options };
    });

    setQuestions(questionsData);
  }, [baselineMode, clearAllTimers, level, targetWords]);

  // ----------------------------
  // Countdown to start
  // ----------------------------
  useEffect(() => {
    if (questions.length === 0) return;
    if (gameStarted) return;

    if (countdown === null) {
      setGameStarted(true);
      return;
    }

    const t = setTimeout(() => {
      if (countdown === 3) setCountdown(2);
      else if (countdown === 2) setCountdown(1);
      else if (countdown === 1) setCountdown('Go!');
      else if (countdown === 'Go!') setCountdown(null);
    }, 1000);

    return () => clearTimeout(t);
  }, [countdown, gameStarted, questions.length]);

  // When game starts or question index changes, start trial
  useEffect(() => {
    if (!gameStarted) return;
    if (questions.length === 0) return;
    startTrial();
  }, [currentQuestion, gameStarted, questions.length, startTrial]);

  // Reset lastPlayedWordRef only when session resets (not on every question)
  useEffect(() => {
    if (!gameStarted) {
      lastPlayedWordRef.current = null;
    }
  }, [gameStarted]);

  // ----------------------------
  // Intervention countdown timer (visible)
  // ----------------------------
  useEffect(() => {
    // Baseline/target uses its own 10s timeout (no visible timer)
    if (isBaseline) return;
    if (!gameStarted) return;
    if (questions.length === 0) return;
    if (!isTimerRunning) return;
    if (answered) return;
    if (timeExpired) return;

    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time-up: finalize as no-answer and force "this one" click to proceed
          clearAllTimers();
          setTimeExpired(true);
          setIsTimerRunning(false);
          setShowPrompt(false);
          setShowRetry(false);
          setSelectedAnswer(null);
          // Do not set answered=true; allow user to tap correct answer to advance

          if (!trialFinalizedRef.current) {
            finalizeTrial('no-answer', 10);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    answered,
    clearAllTimers,
    finalizeTrial,
    gameStarted,
    isBaseline,
    isTimerRunning,
    questions.length,
    timeExpired,
  ]);

  // ----------------------------
  // Answer handler
  // ----------------------------
  const handleAnswer = (answer: string) => {

    if (!gameStarted) return;
    if (sessionCompleteRef.current) return;
    if (questions.length === 0) return;

    // Prevent multiple answers per trial, except when timeExpired (for tap-to-advance)
    // Only block if correct/assisted or timeExpired and not correct
    if ((answered && !showRetry && !timeExpired) || (timeExpired && answered)) return;

    // If time is up, require user to tap correct answer to advance (no scoring)
    if (timeExpired) {
      if (answer !== currentWord) return;
      setSelectedAnswer(answer);
      setAnswered(true);
      setShowRetry(false);
      // Auto-advance after short delay, but keep highlight and 'This one' visible
      setTimeout(() => {
        nextTrial();
      }, 1200);
      return;
    }

    // Baseline/target: advance after 2s pause on correct, immediately on incorrect
    if (isBaseline) {
      setSelectedAnswer(answer);
      setAnswered(true);
      const ms = Date.now() - trialStartMsRef.current;
      const seconds = Math.min(10, Math.max(0, Math.round(ms / 1000)));
      const isCorrect = answer === currentWord;
      const outcome = isCorrect ? 'correct' : 'incorrect';

      // If this is the last question, pass the updated responseTypes directly to finishSession
      if (currentQuestion === questions.length - 1) {
        const updatedResponseTypes = [...responseTypes, outcome];
        const correctCount = updatedResponseTypes.filter(rt => rt === 'correct').length;
        const incorrectCount = updatedResponseTypes.filter(rt => rt === 'incorrect').length;
        const wordsAsked = questions.map((q) => q.word);
        const total = questions.length;
        onGameComplete({
          correct: correctCount,
          incorrect: incorrectCount,
          noAnswer,
          assisted,
          total,
          newStreak: 0,
          responsesTimes: [...responsesTimes, seconds],
          wordsAsked,
          responseTypes: updatedResponseTypes,
        });
        return;
      }

      finalizeTrial(outcome, seconds);
      setTimeout(() => nextTrial(), 200); // Always short delay for UI update
      return;
    }

    // Intervention: retry on incorrect; finalize on correct
    if (answer === currentWord) {
      setSelectedAnswer(answer);
      setAnswered(true);
      const ms = Date.now() - trialStartMsRef.current;
      const seconds = Math.min(10, Math.max(0, Math.round(ms / 1000)));

      const assistedNow = showPrompt; // visual prompt currently visible before time-up
      const outcome = assistedNow ? 'assisted' : 'correct';

      // If this is the last question, pass the updated responseTypes directly to onGameComplete
      if (currentQuestion === questions.length - 1) {
        const updatedResponseTypes = [...responseTypes, outcome];
        const correctCount = updatedResponseTypes.filter(rt => rt === 'correct').length;
        const assistedCount = updatedResponseTypes.filter(rt => rt === 'assisted').length;
        const noAnswerCount = updatedResponseTypes.filter(rt => rt === 'no-answer').length;
        const wordsAsked = questions.map((q) => q.word);
        const total = questions.length;
        onGameComplete({
          correct: correctCount,
          assisted: assistedCount,
          noAnswer: noAnswerCount,
          total,
          newStreak: correctCount === total ? 1 : 0,
          responsesTimes: [...responsesTimes, seconds],
          wordsAsked,
          responseTypes: updatedResponseTypes,
        });
        return;
      }

      finalizeTrial(outcome, seconds);
      setShowRetry(false);
      setIsTimerRunning(false); // Pause timer to show time taken
      skipTimerResetRef.current = true;
      setTimeout(() => nextTrial(), 2000);
    } else {
      // Incorrect: allow retry, show feedback, keep timer running
      setSelectedAnswer(answer);
      setAnswered(false); // allow more answers
      setShowRetry(true);
      // Remove red highlight after short delay
      setTimeout(() => setSelectedAnswer(null), 400);
    }
  };

  // ----------------------------
  // Derived display values
  // ----------------------------
  const trialsFinalized = responseTypes.length;
  const pointsSoFar = correct * 10 + assisted * 5;

  // ----------------------------
  // Render
  // ----------------------------
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-2xl font-bold">Loading session…</div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-gradient-to-b from-blue-700 to-blue-900">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between text-white mb-4">
          <button
            onClick={() => {
              clearAllTimers();
              onCancel();
            }}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-semibold"
          >
            {'<'} Back
          </button>
          <div className="text-lg font-bold">
            Question {Math.min(currentQuestion + 1, questions.length)}/{questions.length}
          </div>
          {!isBaseline ? (
            <div className="text-lg font-bold">
              Accuracy: {correct}/{trialsFinalized}
            </div>
          ) : (
            <div className="text-lg font-bold">Baseline</div>
          )}
        </div>

        {/* Countdown overlay before starting */}
        {!gameStarted && countdown !== null && (
          <div className="bg-white rounded-2xl shadow-2xl p-10 text-center mb-6">
            <div className="text-6xl font-extrabold text-blue-700">{countdown}</div>
            <div className="mt-2 text-lg font-semibold text-gray-600">Get ready…</div>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Timer / score row */}
          <div className="flex items-center justify-between mb-6">
            {!isBaseline ? (
              <div className="text-xl font-extrabold">
                Time: <span className={timeLeft <= 3 ? 'text-red-600' : 'text-gray-800'}>{timeLeft}</span>
              </div>
            ) : (
              <div className="text-xl font-extrabold text-gray-700">&nbsp;</div>
            )}
            {!isBaseline ? (
              <div className="text-xl font-extrabold text-gray-800">Coins: {pointsSoFar}</div>
            ) : (
              <div className="text-xl font-extrabold text-gray-800">&nbsp;</div>
            )}
          </div>

          {/* Prompt / time-up messaging */}
          {!isBaseline && timeExpired && (
            <div className="flex flex-col items-center justify-center gap-1 mb-5">
              <div className="text-2xl font-extrabold">Time is up!</div>
              <div className="text-lg font-semibold opacity-80">Tap the correct answer to continue.</div>
            </div>
          )}

          {!isBaseline && !timeExpired && showPrompt && (
            <div className="flex flex-col items-center justify-center gap-1 mb-5">
              <div className="text-xl font-bold text-gray-700">Visual prompt shown</div>
            </div>
          )}

          {/* Retry feedback */}
          {!isBaseline && !answered && showRetry && !timeExpired && (
            <div className="flex items-center justify-center gap-2 mb-4 text-xl font-bold text-red-700">
              <span>Try again</span>
              <span aria-hidden>🔄</span>
            </div>
          )}

          {/* Centered visual prompt (if enabled) */}
          {/* Always show prompt if timeExpired or showPrompt is true */}
          {!isBaseline && (showPrompt || timeExpired) && (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-700 mb-6">
              <div className="text-sm uppercase tracking-wide font-semibold">Prompt</div>
              <div className="text-3xl font-extrabold mt-1">{currentWord}</div>
            </div>
          )}

          {/* Answer options */}
          <div className="grid grid-cols-2 gap-6 mb-6 w-full max-w-2xl mx-auto">
            {allOptions.map((option, idx) => {
              let buttonClass = "bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-900";
              // Time-up highlighting (ONLY time we reveal the correct answer)
              if (!isBaseline && timeExpired) {
                if (option === currentWord) {
                  buttonClass = "bg-green-100 border-2 border-green-500 text-green-900";
                } else {
                  buttonClass = "bg-gray-50 border-2 border-gray-200 text-gray-400";
                }
              }
              // Retry highlighting (optional flash red on the wrong choice)
              if (!isBaseline && showRetry && !timeExpired) {
                if (selectedAnswer && option === selectedAnswer && selectedAnswer !== currentWord) {
                  buttonClass = "bg-red-100 border-2 border-red-500 text-red-900";
                }
              }
              // ONLY disable wrong answers when time is up
              let disabled = false;
              if (!isBaseline && timeExpired) {
                disabled = option !== currentWord;
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  disabled={disabled}
                  className={`p-8 rounded-xl font-bold text-2xl transition-all transform hover:scale-105 ${buttonClass} ${
                    disabled ? "cursor-default" : "cursor-pointer hover:shadow-xl"
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <div>{option}</div>
                    {!isBaseline && timeExpired && option === currentWord && (
                      <div className="mt-2 text-sm font-extrabold uppercase tracking-wide">
                        This one
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
