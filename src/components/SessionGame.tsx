"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPromptConfig, playAudioPrompt } from "./sessionUtils";
import { getRandomWords, getSightWords } from "./sightWordsData";

// --- Types ---
type TrialOutcome = "correct" | "assisted" | "no-answer" | "incorrect";

interface GameProps {
  level: number;
  sessionNumber: number;
  targetWords: string[];
  baselineMode?: boolean;
  onGameComplete: (result: {
    correct: number;
    assisted: number;
    noAnswer: number;
    total?: number;
    newStreak?: number;
    responsesTimes: number[];
    responseTypes: TrialOutcome[];
  }) => void;
  onCancel: () => void;
}


function SessionGame({
  level,
  sessionNumber,
  targetWords,
  baselineMode = false,
  onGameComplete,
  onCancel,
}: GameProps) {
  // --- Refs ---
  const sessionCompleteRef = useRef(false);
  const trialFinalizedRef = useRef(false);
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const baselineTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipTimerResetRef = useRef(false);
  const lastPlayedWordRef = useRef<string | null>(null);
  const trialStartMsRef = useRef<number>(0);
  // Prevent double nextTrial calls
  const autoAdvanceRef = useRef(false);
  // Timer interval ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);



// Define Question type
interface Question {
  word: string;
  options: string[];
}

  // --- Derived config ---
  const isBaseline = baselineMode || level === 4;
  const promptConfig = useMemo(() => getPromptConfig(sessionNumber), [sessionNumber]);

  // --- Core session state ---
  const [noAnswer, setNoAnswer] = useState(0);
  // Removed unused 'incorrect' state
  const [responseTypes, setResponseTypes] = useState<TrialOutcome[]>([]);
  const [responsesTimes, setResponsesTimes] = useState<number[]>([]);

  // --- UI/trial state ---
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
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

  // --- Derived values ---
  const currentWord = questions[currentQuestion]?.word ?? '';
  const allOptions = questions[currentQuestion]?.options ?? [];

  // --- Utilities ---
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
    // Always mark as answered for no-answer to allow UI to update
    if (outcome === 'correct' || outcome === 'assisted' || outcome === 'no-answer') setAnswered(true);
    setIsTimerRunning(false);
    setResponseTypes((prev) => [...prev, outcome]);
    setResponsesTimes((prev) => [...prev, seconds]);
    if (outcome === 'correct') setCorrect((c) => c + 1);
    if (outcome === 'assisted') setAssisted((a) => a + 1);
    if (outcome === 'no-answer') setNoAnswer((n) => n + 1);
  }, []);

  const finishSession = useCallback(() => {
    if (sessionCompleteRef.current) return;
    sessionCompleteRef.current = true;
    clearAllTimers();
    setIsTimerRunning(false);
    setAnswered(true);
    // If the last trial was not finalized (e.g., time expired on last question), finalize as 'no-answer'
    let finalResponseTypes = responseTypes;
    let finalResponsesTimes = responsesTimes;
    const finalCorrect = correct;
    const finalAssisted = assisted;
    let finalNoAnswer = noAnswer;
    if (responseTypes.length < questions.length) {
      finalResponseTypes = [...responseTypes, 'no-answer'];
      finalResponsesTimes = [...responsesTimes, 10];
      finalNoAnswer = noAnswer + 1;
    }
    onGameComplete({
      correct: finalCorrect,
      assisted: finalAssisted,
      noAnswer: finalNoAnswer,
      total: questions.length,
      responseTypes: finalResponseTypes,
      responsesTimes: finalResponsesTimes,
    });
  }, [assisted, clearAllTimers, correct, noAnswer, onGameComplete, responseTypes, responsesTimes, questions.length]);

  const nextTrial = useCallback(() => {
    if (sessionCompleteRef.current) return;
    setCurrentQuestion((q) => {
      const next = q + 1;
      if (next < questions.length) return next;
      finishSession();
      return q;
    });
  }, [questions.length, finishSession]);

  const startTrial = useCallback(() => {
    if (!gameStarted || questions.length === 0 || sessionCompleteRef.current) return;
    trialFinalizedRef.current = false;
    trialStartMsRef.current = (typeof window !== 'undefined' ? Date.now() : 0);
    if (!timeExpired) {
      setAnswered(false);
      setSelectedAnswer(null);
      setShowRetry(false);
      setTimeExpired(false);
      setShowPrompt(false);
      setTimeLeft(10);
      setIsTimerRunning(!isBaseline);
      skipTimerResetRef.current = false;
    }
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
    if (lastPlayedWordRef.current !== word) {
      playAudioPrompt(word);
      lastPlayedWordRef.current = word;
    }
    if (isBaseline) {
      baselineTimeoutRef.current = setTimeout(() => {
        if (trialFinalizedRef.current || sessionCompleteRef.current) return;
        finalizeTrial("no-answer", 10);
        const isLast = currentQuestion >= questions.length - 1;
        if (isLast) {
          sessionCompleteRef.current = true;
          setTimeout(() => finishSession(), 0);
        } else {
          setTimeout(() => nextTrial(), 200);
        }
      }, 10000);
      return;
    }
    if (promptConfig.immediate) {
      setShowPrompt(true);
    } else {
      promptTimerRef.current = setTimeout(() => {
        if (trialFinalizedRef.current) return;
        setShowPrompt(true);
      }, promptConfig.delay);
    }
  }, [currentQuestion, finalizeTrial, gameStarted, isBaseline, nextTrial, promptConfig.delay, promptConfig.immediate, questions, timeExpired, finishSession]);

  // --- Build questions when level/targets change ---
  useEffect(() => {
    sessionCompleteRef.current = false;
    trialFinalizedRef.current = false;
    clearAllTimers();
    // Instead of calling setState synchronously, use a single state reset object
    const gradeLevel = level;
    const gradeWordList = getSightWords(gradeLevel);
    let words: string[] = [];
    if (baselineMode) {
      let filtered: string[] = [];
      if (targetWords && targetWords.length > 0) {
        filtered = targetWords.filter((w) => gradeWordList.includes(w));
      }
      if (filtered.length === 0) filtered = [...gradeWordList];
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
    // Use a microtask to avoid cascading renders for all setState calls
    Promise.resolve().then(() => {
      setQuestions(questionsData);
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
    });
  }, [baselineMode, clearAllTimers, level, targetWords]);

  // --- Countdown to start ---
  useEffect(() => {
    if (questions.length === 0 || gameStarted) return;
    if (countdown === null) {
      // Use a microtask to avoid cascading renders
      Promise.resolve().then(() => setGameStarted(true));
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

  // --- Start trial on game start or question change ---
  useEffect(() => {
    if (!gameStarted || questions.length === 0) return;
    // Use a microtask to avoid cascading renders
    Promise.resolve().then(() => startTrial());
  }, [currentQuestion, gameStarted, questions.length, startTrial]);

  // --- Reset lastPlayedWordRef only when session resets ---
  useEffect(() => {
    if (!gameStarted) lastPlayedWordRef.current = null;
  }, [gameStarted]);

  // --- Intervention countdown timer (visible) ---
  useEffect(() => {
    if (isBaseline || !gameStarted || questions.length === 0 || !isTimerRunning || answered || timeExpired) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setTimeExpired(true);
            setIsTimerRunning(false);
            setShowPrompt(true);
            setShowRetry(false);
            // Always finalize the trial as 'no-answer' if not already finalized
            if (!trialFinalizedRef.current) {
              // If user never answered, push a 'no-answer' and a time of 10s
              finalizeTrial("no-answer", 10);
            }
            if (!autoAdvanceRef.current) {
              autoAdvanceRef.current = true;
              setTimeout(() => {
                setTimeExpired(false); // Always reset before advancing
                if (currentQuestion === questions.length - 1) {
                  finishSession();
                } else {
                  nextTrial();
                }
                autoAdvanceRef.current = false;
              }, 5000);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [answered, clearAllTimers, gameStarted, isBaseline, isTimerRunning, questions.length, timeExpired, finalizeTrial, finishSession, nextTrial, currentQuestion]);

  // --- Answer handler ---
  const handleAnswer = (answer: string) => {
    if (!gameStarted || sessionCompleteRef.current || questions.length === 0) return;
    if (answered && !showRetry && !timeExpired) return;
    // Time is up: ignore answers, auto-advance now handled in timer effect
    if (timeExpired) {
      return;
    }
    // Baseline: advance after short delay
    if (isBaseline) {
      setSelectedAnswer(answer);
      setAnswered(true);
      setTimeout(() => {
        let ms = 0;
        if (typeof window !== 'undefined') {
          ms = Date.now() - trialStartMsRef.current;
        }
        const seconds = Math.min(10, Math.max(0, Math.round(ms / 1000)));
        const isCorrect = answer === currentWord;
        const outcome: TrialOutcome = isCorrect ? 'correct' : 'incorrect';
        finalizeTrial(outcome, seconds);
        if (currentQuestion === questions.length - 1) {
          const updatedResponseTypes = [...responseTypes, outcome];
          const correctCount = updatedResponseTypes.filter(rt => rt === 'correct').length;
          const total = questions.length;
          onGameComplete({
            correct: correctCount,
            noAnswer: noAnswer, // outcome can only be 'correct' or 'incorrect' here
            assisted: assisted, // outcome can only be 'correct' or 'incorrect' here
            total,
            newStreak: 0,
            responsesTimes: [...responsesTimes, seconds],
            responseTypes: updatedResponseTypes as ("correct" | "assisted" | "no-answer" | "incorrect")[],
          });
          return;
        }
        setTimeout(() => nextTrial(), 200);
      }, 0);
      return;
    }
    // Intervention: retry on incorrect, finalize on correct
    if (answer === currentWord) {
      setSelectedAnswer(answer);
      setAnswered(true);
      setTimeout(() => {
        let ms = 0;
        if (typeof window !== 'undefined') {
          ms = Date.now() - trialStartMsRef.current;
        }
        const seconds = Math.min(10, Math.max(0, Math.round(ms / 1000)));
        const assistedNow = showPrompt;
        const outcome = assistedNow ? 'assisted' : 'correct';
        finalizeTrial(outcome, seconds);
        if (currentQuestion === questions.length - 1) {
          const updatedResponseTypes = [...responseTypes, outcome];
          const correctCount = updatedResponseTypes.filter(rt => rt === 'correct').length;
          const assistedCount = updatedResponseTypes.filter(rt => rt === 'assisted').length;
          const noAnswerCount = updatedResponseTypes.filter(rt => rt === 'no-answer').length;
          const total = questions.length;
          onGameComplete({
            correct: correctCount,
            assisted: assistedCount,
            noAnswer: noAnswerCount,
            total,
            newStreak: correctCount === total ? 1 : 0,
            responsesTimes: [...responsesTimes, seconds],
            responseTypes: updatedResponseTypes as ("correct" | "assisted" | "no-answer" | "incorrect")[],
          });
          return;
        }
        setShowRetry(false);
        setIsTimerRunning(false);
        skipTimerResetRef.current = true;
        setTimeout(() => nextTrial(), 2000);
      }, 0);
    } else {
      setSelectedAnswer(answer);
      setAnswered(false);
      setShowRetry(true);
      setTimeout(() => setSelectedAnswer(null), 400);
    }
  };

  // --- Derived display values ---
  const trialsFinalized = responseTypes.length;
  const pointsSoFar = correct * 10 + assisted * 5;

  // --- Render ---
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-2xl font-bold">Loading session…</div>
        </div>
      </div>
    );
  }

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
              if (!isBaseline && timeExpired) {
                buttonClass = option === currentWord
                  ? "bg-green-400 border-2 border-green-600 text-white animate-pulse"
                  : "bg-gray-50 border-2 border-gray-200 text-gray-400";
              }
              if (!isBaseline && showRetry && !timeExpired) {
                if (selectedAnswer && option === selectedAnswer && selectedAnswer !== currentWord) {
                  buttonClass = "bg-red-100 border-2 border-red-500 text-red-900";
                }
              }
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
export default SessionGame;

