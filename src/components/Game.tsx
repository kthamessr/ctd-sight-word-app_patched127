'use client';

import { useState, useEffect, useMemo } from 'react';
import { getRandomWords } from './sightWordsData';

interface GameProps {
  level: number;
  onGameComplete: (result: { correct: number; total: number; newStreak: number }) => void;
  onCancel: () => void;
}

export default function Game({ level, onGameComplete, onCancel }: GameProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Memoize options to prevent re-rendering
  const currentWord = questions[currentQuestion];
  const allOptions = useMemo(
    () => {
      if (!currentWord) return [];
      return [currentWord, ...getRandomWords(level, 3).filter((w) => w !== currentWord)].sort(() => Math.random() - 0.5);
    },
    [currentQuestion, level, questions, currentWord]
  );

  // Initialize questions
  useEffect(() => {
    const words = getRandomWords(level, 10);
    setQuestions(words);
  }, [level]);

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning || answered || questions.length === 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setAnswered(true);
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isTimerRunning, answered, questions]);

  if (questions.length === 0) {
    return <div className="text-center text-gray-600">Loading...</div>;
  }

  const handleAnswer = (answer: string) => {
    if (answered) return;
    
    setSelectedAnswer(answer);
    setAnswered(true);
    setIsTimerRunning(false);

    if (answer === currentWord) {
      setCorrect(correct + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswered(false);
      setSelectedAnswer(null);
      setTimeLeft(10);
      setIsTimerRunning(true);
    } else {
      onGameComplete({ correct, total: questions.length, newStreak: correct === questions.length ? 1 : 0 });
    }
  };

  const isCorrect = selectedAnswer === currentWord;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
          <span>Question {currentQuestion + 1}/{questions.length}</span>
          <span>Score: {correct}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timer */}
      <div className="text-center mb-8">
        <div className={`text-6xl font-bold transition-all ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
          {timeLeft}s
        </div>
      </div>

      {/* Question */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Choose the correct word:</h2>
        <div className="text-6xl font-bold text-purple-600 mb-2">{currentWord}</div>
        <p className="text-gray-500 text-sm">Which option spells this word correctly?</p>
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {allOptions.map((option, index) => {
          let buttonClass = 'bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-800';

          if (answered) {
            if (option === currentWord) {
              buttonClass = 'bg-green-100 border-2 border-green-500 text-green-800';
            } else if (option === selectedAnswer && option !== currentWord) {
              buttonClass = 'bg-red-100 border-2 border-red-500 text-red-800';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              disabled={answered}
              className={`p-6 rounded-lg font-bold text-xl transition-all transform hover:scale-105 ${buttonClass} ${
                answered ? 'cursor-default' : 'cursor-pointer hover:shadow-lg'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {answered && (
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">{isCorrect ? '✅ Correct!' : '❌ Incorrect!'}</div>
          <p className="text-gray-700">The correct answer is: <span className="font-bold text-purple-600">{currentWord}</span></p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={onCancel}
          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg transition-all"
        >
          Exit
        </button>
        {answered && (
          <button
            onClick={handleNext}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105"
          >
            {currentQuestion + 1 === questions.length ? 'Finish' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  );
}
