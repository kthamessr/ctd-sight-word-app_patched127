'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionData } from './sessionUtils';
import { SurveyResponses } from './SocialValiditySurvey';

interface DataExportProps {
  onBack: () => void;
  participantId: string;
}

export default function DataExport({ onBack, participantId }: DataExportProps) {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [baselineSessions, setBaselineSessions] = useState<SessionData[]>([]);
  const [surveys, setSurveys] = useState<SurveyResponses[]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);

  const storageKey = useCallback((name: string) => `${participantId || 'default'}::${name}`,[participantId]);

  useEffect(() => {
    const savedSessions = localStorage.getItem(storageKey('sightWordsSessions'));
    const savedBaseline = localStorage.getItem(storageKey('baselineSessions'));
    const savedSurveys = localStorage.getItem(storageKey('socialValiditySurveys'));
    const savedWords = localStorage.getItem(storageKey('targetWords'));

    Promise.resolve().then(() => {
      setSessions(savedSessions ? JSON.parse(savedSessions) : []);
      setBaselineSessions(savedBaseline ? JSON.parse(savedBaseline) : []);
      setSurveys(savedSurveys ? JSON.parse(savedSurveys) : []);
      setTargetWords(savedWords ? JSON.parse(savedWords) : []);
    });
  }, [storageKey]);

  // Utility to sanitize session data for CSV export
  function sanitizeSessionField(val: unknown, isNumber = false, decimals = 2) {
    if (isNumber) {
      if (typeof val !== 'number' || isNaN(val) || val === null || val === undefined) return (0).toFixed(decimals);
      return val.toFixed ? val.toFixed(decimals) : Number(val).toFixed(decimals);
    }
    if (val === undefined || val === null) return '';
    return String(val);
  }

  const downloadSessionsCSV = () => {
    // Combine all sessions
    const allSessions = [
      ...baselineSessions.map(s => ({ ...s, sessionType: 'Baseline' })),
      ...sessions.map(s => (s.level === 4 ? { ...s, sessionType: 'Target Words' } : { ...s, sessionType: 'Intervention' }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const headers = [
      'Session Number',
      'Date',
      'Session Type',
      'Correct',
      'Incorrect',
      'Assisted',
      'No-Answer',
      'Total Questions',
      'Accuracy (%)',
      'Average Response Time (s)',
      'Prompt Type',
      'Words Tested',
      'Response Times (s)',
    ];

    const rows = allSessions.map((session) => {
      const avgResponseTime = (Array.isArray(session.timeToRespond) && session.timeToRespond.length > 0)
        ? sanitizeSessionField(session.timeToRespond.reduce((a, b) => a + b, 0) / session.timeToRespond.length, true, 2)
        : sanitizeSessionField('', false);
      const promptType = session.promptType === 'immediate' ? 'Immediate' : '3sec Delay';
      const isBaselineOrTarget = session.sessionType === 'Baseline' || session.sessionType === 'Target Words';
      const incorrect = isBaselineOrTarget ? sanitizeSessionField((Number(session.totalQuestions) || 0) - (Number(session.correctAnswers) || 0), true, 0) : '';
      return [
        sanitizeSessionField(session.sessionNumber, true, 0),
        sanitizeSessionField(new Date(session.date).toLocaleDateString()),
        sanitizeSessionField(session.sessionType),
        sanitizeSessionField(session.correctAnswers, true, 0),
        isBaselineOrTarget ? incorrect : '',
        !isBaselineOrTarget ? sanitizeSessionField(session.assistedAnswers, true, 0) : '',
        !isBaselineOrTarget ? sanitizeSessionField(session.noAnswers, true, 0) : '',
        sanitizeSessionField(session.totalQuestions, true, 0),
        sanitizeSessionField(session.accuracy, true, 2),
        avgResponseTime,
        sanitizeSessionField(promptType),
        Array.isArray(session.wordsAsked) ? session.wordsAsked.join('; ') : '',
        Array.isArray(session.timeToRespond) ? session.timeToRespond.map((t) => sanitizeSessionField(t, true, 2)).join('; ') : '',
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ctd-sessions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadBaselineCSV = () => {
    if (baselineSessions.length === 0) {
      alert('No baseline data available');
      return;
    }

    const headers = [
      'Baseline Session',
      'Date',
      'Correct Answers',
      'Total Questions',
      'Accuracy (%)',
      'Words Tested',
      'Response Times (s)',
    ];

    const rows = baselineSessions.map((session) => [
      session.sessionNumber,
      new Date(session.date).toLocaleDateString(),
      session.correctAnswers,
      session.totalQuestions,
      session.accuracy.toFixed(2),
      session.wordsAsked.join('; '),
      session.timeToRespond.map((t: number) => t.toFixed(2)).join('; '),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ctd-baseline-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadSurveysCSV = () => {
    if (surveys.length === 0) {
      alert('No survey data available');
      return;
    }

    const headers = [
      'Participant ID',
      'Date',
      'Q1: Helpfulness (1-5)',
      'Q2: Engagement (1-5)',
      'Q3: Ease of Use (1-5)',
      'Q4: Would Recommend (1-5)',
      'Q5: Liked Most',
      'Q6: Difficulties',
      'Q7: Improvements',
    ];

    const rows = surveys.map((survey) => [
      survey.participantId || 'N/A',
      new Date(survey.date).toLocaleDateString(),
      survey.q1_helpfulness,
      survey.q2_engagement,
      survey.q3_easeOfUse,
      survey.q4_wouldRecommend,
      survey.q6_liked,
      survey.q7_difficulties,
      survey.q5_improvements,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `social-validity-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadAllDataJSON = () => {
    const allData = {
      exportDate: new Date().toISOString(),
      participantId,
      targetWords,
      baselineSessions,
      sessions,
      surveys,
      summary: {
        totalBaselineSessions: baselineSessions.length,
        totalSessions: sessions.length,
        totalSurveys: surveys.length,
        overallAccuracy: sessions.length > 0 ? (sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length).toFixed(2) : 0,
      },
    };

    const jsonContent = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ctd-all-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const clearAllData = () => {
    if (confirm('⚠️ Are you sure you want to clear ALL data? This cannot be undone! Make sure you have exported your data first.')) {
      localStorage.removeItem(storageKey('sightWordsSessions'));
      localStorage.removeItem(storageKey('baselineSessions'));
      localStorage.removeItem(storageKey('socialValiditySurveys'));
      localStorage.removeItem(storageKey('targetWords'));
      alert('All data has been cleared.');
      setSessions([]);
      setBaselineSessions([]);
      setSurveys([]);
      setTargetWords([]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-purple-600 mb-6 text-center">Data Export & Analysis</h2>

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-semibold opacity-90">Total Sessions</div>
          <div className="text-4xl font-bold">{sessions.length}</div>
        </div>
        <div className="bg-gradient-to-br from-slate-400 to-slate-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-semibold opacity-90">Baseline Sessions</div>
          <div className="text-4xl font-bold">{baselineSessions.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-semibold opacity-90">Survey Responses</div>
          <div className="text-4xl font-bold">{surveys.length}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-semibold opacity-90">Target Words</div>
          <div className="text-4xl font-bold">{targetWords.length}</div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Export Options</h3>
        <div className="space-y-4">
          <button
            onClick={downloadSessionsCSV}
            disabled={sessions.length === 0}
            className={`w-full text-left p-4 rounded-lg transition-all ${
              sessions.length > 0
                ? 'bg-blue-50 hover:bg-blue-100 border-2 border-blue-300'
                : 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800">📊 Session Data (CSV)</div>
                <div className="text-sm text-gray-600">
                  Download all session data for statistical analysis in SPSS, Excel, or R
                </div>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </button>

          <button
            onClick={downloadBaselineCSV}
            disabled={baselineSessions.length === 0}
            className={`w-full text-left p-4 rounded-lg transition-all ${
              baselineSessions.length > 0
                ? 'bg-slate-50 hover:bg-slate-100 border-2 border-slate-300'
                : 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800">🧪 Baseline Data (CSV)</div>
                <div className="text-sm text-gray-600">Download baseline-only sessions (no prompts, no timer)</div>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </button>

          <button
            onClick={downloadSurveysCSV}
            disabled={surveys.length === 0}
            className={`w-full text-left p-4 rounded-lg transition-all ${
              surveys.length > 0
                ? 'bg-green-50 hover:bg-green-100 border-2 border-green-300'
                : 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800">📋 Social Validity Survey (CSV)</div>
                <div className="text-sm text-gray-600">
                  Download survey responses for social validity analysis
                </div>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </button>

          <button
            onClick={downloadAllDataJSON}
            disabled={sessions.length === 0 && surveys.length === 0}
            className={`w-full text-left p-4 rounded-lg transition-all ${
              sessions.length > 0 || surveys.length > 0
                ? 'bg-purple-50 hover:bg-purple-100 border-2 border-purple-300'
                : 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800">💾 Complete Data (JSON)</div>
                <div className="text-sm text-gray-600">
                  Download all data in JSON format for backup or custom analysis
                </div>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </button>
        </div>
      </div>

      {/* Analysis Tips */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-yellow-800 mb-3">📈 Dissertation Analysis Tips</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• <strong>Session CSV:</strong> Use for graphing accuracy trends, response times, and comparing baseline vs. intervention phases</li>
          <li>• <strong>Survey CSV:</strong> Calculate means, analyze Likert-scale responses, code qualitative feedback</li>
          <li>• <strong>Statistical Analysis:</strong> Import CSV files into SPSS, R, or Excel for t-tests, ANOVAs, effect size calculations</li>
          <li>• <strong>Graphs:</strong> Create line graphs showing accuracy improvement across sessions</li>
          <li>• <strong>Mastery Criteria:</strong> Track when 80%+ accuracy is achieved across 3 consecutive sessions</li>
        </ul>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-red-800 mb-3">⚠️ Danger Zone</h3>
        <p className="text-sm text-gray-700 mb-4">Clear all stored data. Make sure to export first!</p>
        <button
          onClick={clearAllData}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-all"
        >
          Clear All Data
        </button>
      </div>

      {/* Back Button */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg transition-all"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
