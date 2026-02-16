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
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>

    <div className="reveal-entry-text" style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginTop: '-40px' }}>
      <h1 className="hero-title" style={{
        fontSize: 'clamp(2.5rem, 10vw, 6rem)',
        letterSpacing: '0.15em',
        margin: 0,
        fontWeight: 400
      }}>
        BUSINESS CLUB
      </h1>

      <p className="manifesto-text" style={{
        fontSize: 'clamp(1rem, 3vw, 1.8rem)',
        marginTop: '20px',
        letterSpacing: '0.4em',
        opacity: 0.8,
        fontWeight: 300,
        textTransform: 'uppercase'
      }}>
        Almaty • International Community
      </p>

      <a href="#apply" className="liquid-glass" style={{
        display: 'inline-block',
        marginTop: '50px',
        padding: '18px 45px',
        fontSize: '14px',
        letterSpacing: '0.3em',
        color: '#fff',
        textDecoration: 'none',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '100px',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
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
  <section className="section" style={{ padding: '100px 0', position: 'relative' }}>
    <div className="container">
      <div className="grid-2" style={{ gap: '80px', alignItems: 'center' }}>
        <div className="reveal-hidden">
          <h2 style={{ fontSize: '3rem', marginBottom: '30px' }}>О КЛУБЕ</h2>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', color: '#ccc' }}>
            26 Business Club — это закрытое сообщество предпринимателей,
            объединенных общими ценностями и стремлением к росту.
            Мы создаем среду для обмена опытом, ресурсами и энергией.
          </p>
        </div>
        <div className="reveal-hidden delay-200">
          <div className="liquid-glass" style={{ padding: '40px', borderRadius: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div>
                <h4 style={{ color: '#fff', marginBottom: '10px' }}>Миссия</h4>
                <p style={{ fontSize: '0.9rem', color: '#888' }}>Развитие предпринимательской культуры и поддержка сильных.</p>
              </div>
              <div>
                <h4 style={{ color: '#fff', marginBottom: '10px' }}>Резиденты</h4>
                <p style={{ fontSize: '0.9rem', color: '#888' }}>Собственники бизнеса с оборотом от 100 млн тенге.</p>
              </div>
            </div>
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
