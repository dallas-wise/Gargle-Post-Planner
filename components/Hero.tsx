import React from 'react';

export const Hero: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-7xl">
        Gargle's Post Planner
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-gray-600 mx-auto">
        Enter your practice details and choose a start date to generate a professional, 12-week social media plan in seconds.
      </p>
    </div>
  );
};