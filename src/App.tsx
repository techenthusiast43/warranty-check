import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { VerifyPage } from './pages/VerifyPage';
import { BusinessDashboard } from './pages/BusinessDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'verify' | 'business' | 'admin'>('home');
  const [searchId, setSearchId] = useState<string | undefined>(undefined);

  // Check URL parameters for direct verification links (e.g. from scanned QR codes)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) {
      setSearchId(idParam);
      setActiveTab('verify');
    }
  }, []);

  const handleNavigate = (
    tab: 'home' | 'verify' | 'business' | 'admin',
    newSearchId?: string
  ) => {
    if (newSearchId) {
      setSearchId(newSearchId);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080d1a] text-slate-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'home' && <HomePage onNavigate={handleNavigate} />}
        {activeTab === 'verify' && <VerifyPage initialProductId={searchId} />}
        {activeTab === 'business' && <BusinessDashboard />}
        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      <Footer />
    </div>
  );
}

export default App;

