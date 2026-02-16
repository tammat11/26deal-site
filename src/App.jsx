import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import StatsStrip from './components/StatsStrip';
import EventsMarquee from './components/EventsMarquee';
import Benefits from './components/Benefits';
import ResidentsGrid from './components/ResidentsGrid';
import AdmissionSteps from './components/AdmissionSteps';
import ApplicationForm from './components/ApplicationForm';
import Admin from './components/Admin';
import EventsPage from './components/EventsPage';
import { stats } from './data/stats';
import './index.css';

const Hero = () => (
  <section className="section" style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div className="hero-logo-container reveal-entry-logo" style={{ position: 'relative', zIndex: 1, marginBottom: '0px' }}>
      <img
        src="/logo_26_business_club_silver_invert.png"
        alt="26 Business Club"
        style={{
          filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.2))',
          cursor: 'pointer'
        }}
      />
    </div>

    <div className="text-center reveal-entry-text" style={{
      marginTop: '0px',
      maxWidth: '1000px',
      padding: '0 20px',
      zIndex: 2
    }}>
      <h1 className="hero-title" style={{
        fontSize: 'clamp(2.5rem, 6vw, 4rem)',
        lineHeight: '1.2',
        marginBottom: '40px',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }}>
        Закрытый клуб для <br />
        <span style={{ fontFamily: 'Trajan Pro 3, serif', fontWeight: 400 }}> high-impact</span> предпринимателей и лидеров, создающих новую бизнес-культуру.
      </h1>

      <a href="#apply" className="btn" style={{
        minWidth: '200px',
        boxShadow: '0 0 30px rgba(255,255,255,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        ВСТУПИТЬ
      </a>
    </div>


    <style>{`

            @keyframes heroFadeInUp {
                from { opacity: 0; transform: translateY(40px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .reveal-entry-logo {
                animation: heroFadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }
            .reveal-entry-text {
                animation: heroFadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s forwards;
            }
        `}</style>
  </section>
);

const AboutClub = () => (
  <section className="section" id="about" style={{ padding: '200px 0 100px', background: 'transparent' }}>
    <div className="container">
      <div className="reveal-hidden">
        <h2 className="section-title text-center" style={{ color: '#fff', marginBottom: '80px', fontSize: '5rem' }}>
          СООБЩЕСТВО <br />
          <span style={{ opacity: 0.3 }}>НОВОГО ПОКОЛЕНИЯ</span>
        </h2>
      </div>

      <div className="grid-2" style={{ gap: '40px' }}>
        <div className="liquid-glass reveal-hidden" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '2.5rem', marginBottom: '30px', letterSpacing: '-0.02em' }}>
            МЫ ОБЪЕДИНЯЕМ <br />
            <span style={{ opacity: 0.4 }}>СИЛЬНЫХ</span>
          </h3>
          <p style={{ color: '#888', fontSize: '1.1rem', lineHeight: '1.7', maxWidth: '450px' }}>
            Место, где масштаб личности определяет масштаб бизнеса. Здесь нет конкуренции, есть только синергия лидеров, готовых менять среду вокруг себя.
          </p>
        </div>

        <div className="reveal-hidden delay-200" style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '40px' }}>
          <div className="liquid-glass" style={{ padding: '50px', background: 'rgba(255,255,255,0.02)' }}>
            <h4 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '15px' }}>Миссия</h4>
            <p style={{ color: '#666', lineHeight: '1.6' }}>Создать экосистему для роста high-impact предпринимателей через обмен опытом и ресурсами.</p>
          </div>
          <div className="liquid-glass" style={{ padding: '50px', background: 'rgba(255,255,255,0.02)' }}>
            <h4 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '15px' }}>Ценности</h4>
            <p style={{ color: '#666', lineHeight: '1.6' }}>Честность, масштаб, вклад в общество и непрерывное развитие.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer style={{ padding: '60px 0', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#000', position: 'relative', zIndex: 10 }}>
    <div className="container text-center">
      <p style={{ color: '#aaa', fontSize: '12px', letterSpacing: '0.05em' }}>© 2026 BUSINESS CLUB. ALL RIGHTS RESERVED.</p>
    </div>
  </footer>
);

const AppContent = () => {
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="app" style={{ position: 'relative', minHeight: '100vh' }}>
      {!isAdminPage && <Navbar />}

      <Routes>
        <Route path="/" element={
          <>
            <Hero />
            <AboutClub />
            <StatsStrip stats={stats} />
            <div className="silk-background-section">
              <div className="stars-to-black"></div>
              <EventsMarquee />
              <div className="section-divider" />
              <Benefits />
              <div className="section-divider" />
              <ResidentsGrid />
              <div className="section-divider" />
              <AdmissionSteps />
              <div className="section-divider" />
              <ApplicationForm />
            </div>
          </>
        } />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {!isAdminPage && <Footer />}
    </div>
  );
};

function App() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-hidden').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
