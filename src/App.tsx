import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Simulator } from './pages/Simulator';
import { UnderstandingCNF } from './pages/UnderstandingCNF';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'understanding'>('simulator');
  const [resetKey, setResetKey] = useState<number>(0);

  const handleReset = () => {
    setActiveTab('simulator');
    setResetKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* App Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'simulator' ? (
          <Simulator key={resetKey} />
        ) : (
          <UnderstandingCNF />
        )}
      </main>

      {/* Academic Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">CFG → Chomsky Normal Form</span>
            <span>&bull;</span>
            <span>Theory of Computation Simulator</span>
          </div>
          <div className="text-slate-400">
            Rigorous Mathematical Transformations &bull; Dynamic Rule Diffing &bull; Formal Verification
          </div>
        </div>
      </footer>
    </div>
  );
}
