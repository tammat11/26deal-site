import React, { useState, useEffect } from 'react';
import AboutClub from './components/AboutClub';
import StatsStrip from './components/StatsStrip';
import Benefits from './components/Benefits';
import ResidentsGrid from './components/ResidentsGrid';
import AdmissionSteps from './components/AdmissionSteps';
import ApplicationForm from './components/ApplicationForm';
import EventsMarquee from './components/EventsMarquee';
import Policy from './components/Policy';
import { stats } from './data/stats';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    // Initial check
    setScrolled(window.scrollY > 50);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="nav-wrapper">
      <nav className="navbar" style={{
        background: scrolled ? 'rgba(10, 10, 10, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderColor: scrolled ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: scrolled ? '10px 40px' : '10px 0px'
      }}>
        <img src="/logo_26_business_club_silver_invert.png" alt="26 Logo" style={{ height: '30px', opacity: 0.9 }} />
        <span style={{ fontSize: '8px', opacity: 0.3, color: '#fff', marginLeft: '5px' }}>v.1.0.4</span>
        <div className="nav-links">
          <a href="#about">О клубе</a>
          <a href="#benefits">Преимущества</a>
          <a href="#members">Резиденты</a>
          <a href="#apply">Вступить</a>
        </div>
      </nav>
    </div>
  );
};

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
      zIndex: 1,
      padding: '0 30px',
      opacity: 0
    }}>
      <h1 className="hero-title" style={{
        fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)',
        letterSpacing: '0.01em',
        textTransform: 'none',
        lineHeight: '1.1',
        background: 'linear-gradient(to right, #fff, #aaa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '30px',
        marginTop: '0'
      }}>
        Сообщество
        <span style={{ fontFamily: 'Trajan Pro 3, serif', fontWeight: 400 }}> high-impact</span> предпринимателей и лидеров, создающих новую бизнес-культуру. <br />
        и ролевых моделей
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

    <div style={{
      position: 'absolute',
      bottom: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      opacity: 0.7,
      animation: 'bounce 2s infinite'
    }}>
      <span style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px' }}>Scroll</span>
      <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, #fff, transparent)' }}></div>
    </div>
    <style>{`
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {transform: translateX(-50%) translateY(0);}
                40% {transform: translateX(-50%) translateY(-10px);}
                60% {transform: translateX(-50%) translateY(-5px);}
            }
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
    <div className="app" style={{ position: 'relative', minHeight: '100vh' }}>
      <Navbar />
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
        <footer style={{ padding: '60px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="container text-center">
            <p style={{ color: '#666', fontSize: '12px' }}>© 2026 Business Club. All rights reserved.</p>
            <div style={{ marginTop: '20px' }}>
              <a href="/policy" style={{ color: '#444', fontSize: '10px', textDecoration: 'none' }}>Privacy Policy</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
