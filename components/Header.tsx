import React from 'react';
import GargleLogo from '../assets/Gargle-Logo.png';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="container mx-auto px-4 py-6 flex justify-center">
        <img src={GargleLogo} alt="Gargle" className="h-12 w-auto" />
      </div>
    </header>
  );
};