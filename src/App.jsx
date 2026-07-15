import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import AboutClub from './components/AboutClub';
import StatsStrip from './components/StatsStrip';
import Benefits from './components/Benefits';
import ResidentsGrid from './components/ResidentsGrid';
import AdmissionSteps from './components/AdmissionSteps';
import ApplicationForm from './components/ApplicationForm';
import EventsMarquee from './components/EventsMarquee';
import { CONTACTS } from './components/ContactsBlock';
import { stats } from './data/stats';
import './index.css';

const Admin = lazy(() => import('./components/Admin'));
const EventsPage = lazy(() => import('./components/EventsPage'));

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isAdminPage) return null;

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
          <Link to="/" className="mobile-nav-link" style={{ fontSize: scrolled ? '12px' : '13px', textDecoration: 'none', color: 'inherit' }}>Главная</Link>
          <Link to="/events" className="mobile-nav-link" style={{ fontSize: scrolled ? '12px' : '13px', textDecoration: 'none', color: 'inherit' }}>Мероприятия</Link>
          <a href="#footer-contacts" className="mobile-nav-link" style={{ fontSize: scrolled ? '12px' : '13px', textDecoration: 'none', color: 'inherit' }}>Контакты</a>
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
      padding: '0 20px'
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
                opacity: 0;
                animation: heroFadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }
            .reveal-entry-text {
                opacity: 0;
                animation: heroFadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s forwards;
            }
        `}</style>
  </section>
);

const Footer = () => {
  const location = useLocation();
  if (location.pathname === '/admin') return null;
  return (
    <footer id="footer-contacts" style={{ paddingTop: '80px', borderTop: '1px solid rgba(255,255,255,0.1)', scrollMarginTop: '120px' }}>
      <div className="container footer-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1.3fr 0.7fr 1.3fr',
        gap: '40px',
        paddingBottom: '50px',
      }}>
        <div>
          <img src="/logo_26_business_club_silver_invert.png" alt="26 Business Club" style={{ height: '32px', opacity: 0.9, marginBottom: '18px' }} />
          <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6, maxWidth: '320px' }}>
            Сообщество high-impact предпринимателей и лидеров, создающих новую бизнес-культуру.
          </p>
        </div>

        <div>
          <p style={{ color: '#fff', fontSize: '12px', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '16px' }}>НАВИГАЦИЯ</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>Главная</Link>
            <Link to="/events" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>Мероприятия</Link>
            <a href="/#apply" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>Вступить</a>
            <a href="/policy" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>Политика конфиденциальности</a>
          </div>
        </div>

        <div>
          <p style={{ color: '#fff', fontSize: '12px', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '16px' }}>КОНТАКТЫ</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {CONTACTS.map((c, i) => {
              const Icon = c.icon;
              return (
                <a
                  key={i}
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="footer-contact-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#888',
                    fontSize: '13px',
                    textDecoration: 'none',
                    transition: 'color 0.2s ease',
                  }}
                >
                  <Icon />
                  <span>{c.text}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="container text-center" style={{ padding: '22px 0' }}>
          <p style={{ color: '#666', fontSize: '11px', letterSpacing: '0.05em' }}>© 2026 BUSINESS CLUB. ALL RIGHTS RESERVED.</p>
        </div>
      </div>

      <style>{`
        .footer-contact-link:hover { color: #fff !important; }
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            text-align: center;
          }
          .footer-grid > div:first-child img { margin-left: auto; margin-right: auto; }
          .footer-grid > div:first-child p { margin-left: auto; margin-right: auto; }
          .footer-grid a { justify-content: center; }
        }
      `}</style>
    </footer>
  );
};

const AppContent = () => {
  const location = useLocation();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal-hidden').forEach((el) => observer.observe(el));

    // Content that loads asynchronously (e.g. residents fetched from
    // Supabase after mount) doesn't exist yet during the pass above, so it
    // would never receive `.reveal-visible` and stay invisible forever.
    // Watch for newly-added `.reveal-hidden` nodes and observe those too.
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('.reveal-hidden')) observer.observe(node);
          node.querySelectorAll?.('.reveal-hidden').forEach((el) => observer.observe(el));
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="app" style={{
      position: 'relative',
      minHeight: '100vh'
    }}>
      <Navbar />
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
        <Route path="/events" element={<Suspense fallback={null}><EventsPage /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
