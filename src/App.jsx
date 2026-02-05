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
    <div className="nav-wrapper" style={{
      position: 'fixed',
      top: scrolled ? '12px' : '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      width: '95%',
      maxWidth: 'max-content',
      pointerEvents: 'none',
      transition: 'top 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <nav className="navbar" style={{
        pointerEvents: 'auto',
        background: scrolled ? 'rgba(10, 10, 10, 0.4)' : 'transparent',
        backdropFilter: scrolled ? 'blur(30px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(30px) saturate(180%)' : 'none',
        borderColor: scrolled ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '100px',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: scrolled ? '18px 80px' : '26px 110px',
        boxShadow: scrolled ? '0 15px 40px rgba(0,0,0,0.6)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scrolled ? '60px' : '80px',
      }}>
        <img src="/logo_26_business_club_silver_invert.png" alt="26 Logo" style={{
          height: scrolled ? '28px' : '38px',
          opacity: 0.9,
          flexShrink: 0,
          transition: 'all 0.6s ease'
        }} />
        <div className="nav-links" style={{
          display: 'flex',
          gap: scrolled ? '45px' : '65px',
          alignItems: 'center',
          transition: 'all 0.6s ease'
        }}>
          <a href="#about" className="mobile-nav-link" style={{ fontSize: scrolled ? '12px' : '13px' }}>Клуб</a>
          <a href="#benefits" className="mobile-nav-link" style={{ fontSize: scrolled ? '12px' : '13px' }}>Плюсы</a>
          <a href="#members" className="mobile-nav-link" style={{ fontSize: scrolled ? '12px' : '13px' }}>Лица</a>
          <a href="#apply" className="mobile-nav-link" style={{ fontSize: scrolled ? '12px' : '13px' }}>Вступить</a>
        </div>
      </nav>
      <style>{`
        @media (max-width: 768px) {
          .navbar {
            padding: ${scrolled ? '14px 35px' : '18px 40px'} !important;
            gap: ${scrolled ? '25px' : '30px'} !important;
          }
          .nav-links {
            gap: ${scrolled ? '20px' : '25px'} !important;
          }
          .mobile-nav-link {
            font-size: 12px !important;
            letter-spacing: 0.05em !important;
            font-weight: 500;
          }
          .navbar img {
            height: ${scrolled ? '22px' : '26px'} !important;
          }
        }
      `}</style>
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
      padding: '0 20px',
      opacity: 0
    }}>
      <h1 className="hero-title" style={{
        fontSize: 'clamp(1.2rem, 5vw, 2.5rem)',
        letterSpacing: '0.01em',
        textTransform: 'none',
        lineHeight: '1.2',
        background: 'linear-gradient(to right, #fff, #aaa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '20px',
        marginTop: '0'
      }}>
        Сообщество
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

function App() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalScroll > 0 ? window.scrollY / totalScroll : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Entries observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-hidden').forEach((el) => observer.observe(el));

    // Dynamic scale/shift for cards as they scroll
    const updateCards = () => {
      const cards = document.querySelectorAll('.liquid-glass');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const viewportCenter = window.innerHeight / 2;
        const cardCenter = rect.top + rect.height / 2;
        const distanceFromCenter = cardCenter - viewportCenter;
        const normalizedDistance = distanceFromCenter / viewportCenter;

        // Only apply if card is entry-visible
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          // Subtle shift and scale based on center position
          const scale = 1 - Math.abs(normalizedDistance) * 0.05;
          const translate = normalizedDistance * 20;
          card.style.transform = `translateY(${translate}px) scale(${scale})`;
          card.style.opacity = Math.min(1, 1.2 - Math.abs(normalizedDistance));
        }
      });
      requestAnimationFrame(updateCards);
    };

    const animationId = requestAnimationFrame(updateCards);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="app" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Background Parallax Glows */}
      <div className="scroll-glow-1" style={{
        position: 'fixed',
        width: '60vw',
        height: '60vw',
        top: '-10%',
        left: '-10%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
        transform: `translate(${scrollProgress * 50}px, ${scrollProgress * 100}px)`,
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(100px)'
      }} />
      <div className="scroll-glow-2" style={{
        position: 'fixed',
        width: '50vw',
        height: '50vw',
        bottom: '10%',
        right: '-5%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        transform: `translate(${-scrollProgress * 80}px, ${-scrollProgress * 120}px)`,
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(80px)'
      }} />

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
        <footer style={{ padding: '30px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="container text-center">
            <p style={{ color: '#aaa', fontSize: '12px', letterSpacing: '0.05em' }}>© 2026 BUSINESS CLUB. ALL RIGHTS RESERVED.</p>
            <div style={{ marginTop: '10px' }}>
              <a href="/policy" style={{ color: '#888', fontSize: '11px', textDecoration: 'none', transition: 'color 0.3s' }}>PRIVACY POLICY</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
