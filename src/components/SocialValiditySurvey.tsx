'use client';

import { useState } from 'react';

interface SocialValiditySurveyProps {
  onComplete: (responses: SurveyResponses) => void;
  participantId?: string;
}

export interface SurveyResponses {
  participantId: string;
  date: string;
  q1_helpfulness: number;
  q2_engagement: number;
  q3_easeOfUse: number;
  q4_wouldRecommend: number;
  q5_improvements: string;
  q6_liked: string;
  q7_difficulties: string;
}

interface RatingScaleProps {
  question: string;
  label: string;
  currentValue: number | undefined;
  onRatingChange: (question: string, value: number) => void;
}

function RatingScale({ question, label, currentValue, onRatingChange }: RatingScaleProps) {
  return (
    <div className="mb-6">
      <p className="font-semibold text-gray-700 mb-3">{label}</p>
      <div className="flex gap-2 justify-between">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => onRatingChange(question, value)}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
              currentValue === value
                ? 'bg-purple-600 text-white transform scale-105'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Strongly Disagree</span>
        <span>Strongly Agree</span>
      </div>
    </div>
  );
}

export default function SocialValiditySurvey({ onComplete, participantId = '' }: SocialValiditySurveyProps) {
  const [responses, setResponses] = useState<Partial<SurveyResponses>>({
    participantId,
    q5_improvements: '',
    q6_liked: '',
    q7_difficulties: '',
  });

  const handleRatingChange = (question: string, value: number) => {
    setResponses({ ...responses, [question]: value });
  };

  const handleTextChange = (question: string, value: string) => {
    setResponses({ ...responses, [question]: value });
  };

  const handleSubmit = () => {
    if (
      responses.q1_helpfulness &&
      responses.q2_engagement &&
      responses.q3_easeOfUse &&
      responses.q4_wouldRecommend
    ) {
      const completedResponses: SurveyResponses = {
        participantId: responses.participantId || '',
        date: new Date().toISOString(),
        q1_helpfulness: responses.q1_helpfulness,
        q2_engagement: responses.q2_engagement,
        q3_easeOfUse: responses.q3_easeOfUse,
        q4_wouldRecommend: responses.q4_wouldRecommend,
        q5_improvements: responses.q5_improvements || '',
        q6_liked: responses.q6_liked || '',
        q7_difficulties: responses.q7_difficulties || '',
      };
      onComplete(completedResponses);
    } else {
      alert('Please answer all rating questions (1-4) before submitting.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-purple-600 mb-2">Social Validity Survey</h2>
        <p className="text-gray-600">Please rate your experience with the Ausum Academic Activities intervention</p>
      </div>

      {/* Participant ID */}
      <div className="mb-6">
        <label className="block font-semibold text-gray-700 mb-2">Participant ID (Optional)</label>
        <input
          type="text"
          value={responses.participantId}
          onChange={(e) => handleTextChange('participantId', e.target.value)}
          placeholder="Enter participant ID"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Rating Questions */}
      <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
        <RatingScale
          question="q1_helpfulness"
          label="1. This intervention was helpful in improving sight word recognition."
          currentValue={responses.q1_helpfulness}
          onRatingChange={handleRatingChange}
        />

        <RatingScale
          question="q2_engagement"
          label="2. The intervention was engaging and maintained my/the participant's attention."
          currentValue={responses.q2_engagement}
          onRatingChange={handleRatingChange}
        />

        <RatingScale 
          question="q3_easeOfUse" 
          label="3. The app was easy to use and navigate."
          currentValue={responses.q3_easeOfUse}
          onRatingChange={handleRatingChange}
        />

        <RatingScale
          question="q4_wouldRecommend"
          label="4. I would recommend this intervention to others working on sight words."
          currentValue={responses.q4_wouldRecommend}
          onRatingChange={handleRatingChange}
        />
      </div>

      {/* Open-Ended Questions */}
      <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
        <div className="mb-6">
          <label className="block font-semibold text-gray-700 mb-2">
            5. What did you like most about the intervention?
          </label>
          <textarea
            value={responses.q6_liked}
            onChange={(e) => handleTextChange('q6_liked', e.target.value)}
            rows={3}
            placeholder="Your response..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="block font-semibold text-gray-700 mb-2">
            6. Were there any difficulties or challenges with the intervention?
          </label>
          <textarea
            value={responses.q7_difficulties}
            onChange={(e) => handleTextChange('q7_difficulties', e.target.value)}
            rows={3}
            placeholder="Your response..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="block font-semibold text-gray-700 mb-2">
            7. What improvements or changes would you suggest?
          </label>
          <textarea
            value={responses.q5_improvements}
            onChange={(e) => handleTextChange('q5_improvements', e.target.value)}
            rows={3}
            placeholder="Your response..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-12 rounded-lg transition-all transform hover:scale-105 text-lg"
        >
          Submit Survey
        </button>
      </div>
    </div>
  );
}
