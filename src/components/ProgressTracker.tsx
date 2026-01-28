'use client';

interface ProgressTrackerProps {
  score: number;
  level: number;
  streak: number;
  wordsLearned: number;
}

export default function ProgressTracker({ score, level, streak, wordsLearned }: ProgressTrackerProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-4 text-white shadow-lg">
        <div className="text-sm font-semibold opacity-90">Score</div>
        <div className="text-3xl font-bold">{score}</div>
      </div>
      <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-4 text-white shadow-lg">
        <div className="text-sm font-semibold opacity-90">Reading Level</div>
        <div className="text-3xl font-bold">{level}</div>
      </div>
      <div className="bg-gradient-to-br from-orange-400 to-red-600 rounded-lg p-4 text-white shadow-lg">
        <div className="text-sm font-semibold opacity-90">🔥 Streak</div>
        <div className="text-3xl font-bold">{streak}</div>
      </div>
      <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-4 text-white shadow-lg">
        <div className="text-sm font-semibold opacity-90">Words Learned</div>
        <div className="text-3xl font-bold">{wordsLearned}</div>
      </div>
    </div>
  );
}
