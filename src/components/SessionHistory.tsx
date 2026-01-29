'use client';

import { SessionData, calculateMastery } from './sessionUtils';


interface SessionHistoryProps {
  sessions: SessionData[];
  baselineSessions?: SessionData[];
  onNewSession: () => void;
  onExportData: () => void;
}

export default function SessionHistory({ sessions, baselineSessions = [], onNewSession, onExportData }: SessionHistoryProps) {
  // Combine baseline and intervention sessions, sort by date
  const allSessions = [...(baselineSessions || []), ...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const mastery = calculateMastery(sessions);

  // Helper for session type display
  function getSessionTypeInfo(session: SessionData) {
    if (session.phase === 'baseline') {
      return { label: 'Baseline', icon: '🧪', color: 'bg-slate-100' };
    }
    if (session.level === 1) {
      return { label: 'Level 1', icon: '🌱', color: 'bg-green-100' };
    }
    if (session.level === 2) {
      return { label: 'Level 2', icon: '🌿', color: 'bg-yellow-100' };
    }
    if (session.level === 3) {
      return { label: 'Level 3', icon: '🔥', color: 'bg-red-100' };
    }
    if (session.level === 4) {
      return { label: 'Target Words', icon: '🎯', color: 'bg-purple-100' };
    }
    // fallback for any other case
    return { label: 'Session', icon: '📝', color: 'bg-gray-100' };
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prompted Sessions */}
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-semibold opacity-90">Prompted Sessions (Immediate Prompt)</div>
          <div className="text-4xl font-bold">{mastery.promptedSessions}</div>
          <div className="text-lg mt-2">{(typeof mastery.promptedAccuracy === 'number' ? mastery.promptedAccuracy.toFixed(1) : '0.0')}% accuracy</div>
        </div>

        {/* Unprompted Sessions */}
        <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-semibold opacity-90">Unprompted Sessions (Constant Time Delay)</div>
          <div className="text-4xl font-bold">{mastery.unpromptedSessions}</div>
          <div className="text-lg mt-2">{(typeof mastery.unpromptedAccuracy === 'number' ? mastery.unpromptedAccuracy.toFixed(1) : '0.0')}% accuracy</div>
        </div>
      </div>

      {/* Mastery Status */}
      <div className={`bg-gradient-to-br ${mastery.achieved ? 'from-purple-400 to-purple-600' : 'from-orange-400 to-orange-600'} rounded-lg p-6 text-white shadow-lg`}>
        <div className="text-sm font-semibold opacity-90">🎯 Mastery Status (Based on Unprompted Performance)</div>
        <div className="text-2xl font-bold">{mastery.achieved ? '🏆 Achieved' : '📈 In Progress'}</div>
        <div className="text-sm mt-2 opacity-90">
          {mastery.achieved 
            ? 'Achieved: two consecutive unprompted sessions ≥90% or average ≥80% over last three unprompted sessions'
            : `Current (avg last 3): ${(typeof mastery.unpromptedAccuracy === 'number' ? mastery.unpromptedAccuracy.toFixed(1) : '0.0')}% — Target: two consecutive ≥90% or avg ≥80% over last 3`
          }
        </div>
      </div>

      {/* Sessions Table */}
      {allSessions.length > 0 ? (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Session</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                  {/* Baseline/Target: Correct/Incorrect; Intervention: Correct/Assisted/No-Answer */}
                  <th className="px-4 py-3 text-left text-sm font-semibold">Correct</th>
                  {allSessions.some(s => (s.phase === 'baseline' || s.level === 4)) && <th className="px-4 py-3 text-left text-sm font-semibold">Incorrect</th>}
                  {allSessions.some(s => !(s.phase === 'baseline' || s.level === 4)) && <th className="px-4 py-3 text-left text-sm font-semibold">Assisted</th>}
                  {allSessions.some(s => !(s.phase === 'baseline' || s.level === 4)) && <th className="px-4 py-3 text-left text-sm font-semibold">No-Answer</th>}
                  <th className="px-4 py-3 text-left text-sm font-semibold">% Correct</th>
                  {/* Only show Prompt Type column for intervention sessions */}
                  {allSessions.some(s => !(s.phase === 'baseline' || s.level === 4)) && (
                    <th className="px-4 py-3 text-left text-sm font-semibold">Prompt Type</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allSessions.map((session, index) => {
                  const promptType = session.promptType === 'immediate' ? 'Immediate Prompt' : 'Constant Time Delay';
                  const promptIcon = session.promptType === 'immediate' ? '⚡' : '⏱️';
                  const { label, icon, color } = getSessionTypeInfo(session);
                  const isBaselineOrTarget = session.phase === 'baseline' || session.level === 4;
                  const correct = session.correctAnswers;
                  const incorrect = isBaselineOrTarget ? (session.totalQuestions - session.correctAnswers) : '';
                  const assisted = !isBaselineOrTarget ? session.assistedAnswers : '';
                  const noAnswer = !isBaselineOrTarget ? session.noAnswers : '';
                  const total = session.totalQuestions;
                  const isIntervention = !isBaselineOrTarget;
                  const percent = isIntervention
                    ? ((correct + (session.assistedAnswers || 0)) / total) * 100
                    : (correct / total) * 100;
                  const percentColor = percent >= 80 ? 'bg-green-100 text-green-800' : percent >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
                  return (
                    <tr key={index} className={`${color} ${index % 2 === 0 ? '' : 'bg-opacity-80'}`}>
                      <td className="px-4 py-3 font-bold text-purple-600">{session.sessionNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(session.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm font-semibold flex items-center gap-2">
                        <span className="text-xl">{icon}</span> {label}
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-700">{correct}</td>
                      {/* Always render Incorrect, Assisted, No-Answer columns for alignment */}
                      <td className="px-4 py-3 font-semibold text-red-700">{isBaselineOrTarget ? incorrect : ''}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700">{!isBaselineOrTarget ? assisted : ''}</td>
                      <td className="px-4 py-3 font-semibold text-red-700">{!isBaselineOrTarget ? noAnswer : ''}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${percentColor}`}>
                          {total > 0 ? percent.toFixed(1) : '0.0'}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{!isBaselineOrTarget ? `${promptIcon} ${promptType}` : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No sessions yet. Start your first session!</p>
        </div>
      )}

      {/* Start New Session Button */}
      <div className="flex gap-4">
        <button
          onClick={onNewSession}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105 text-lg"
        >
          {sessions.length === 0 ? '🎮 Start Session 1' : `🎮 Start Session ${sessions.length + 1}`}
        </button>
        <button
          onClick={onExportData}
          className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105 text-lg"
        >
          💾 Export Data for Analysis
        </button>
      </div>
    </div>
  );
}
