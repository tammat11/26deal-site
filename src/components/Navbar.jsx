import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <nav className="nav-wrapper" style={{
            position: 'fixed',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            pointerEvents: 'auto'
        }}>
            <div className="liquid-glass" style={{
                padding: '10px 30px',
                borderRadius: '100px',
                display: 'flex',
                gap: '40px',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                background: 'rgba(0,0,0,0.3)'
            }}>
                <Link to="/" style={{
                    color: isHome ? '#fff' : '#aaa',
                    textDecoration: 'none',
                    fontSize: '12px',
                    letterSpacing: '0.2em',
                    fontWeight: isHome ? 'bold' : 'normal',
                    textTransform: 'uppercase'
                }}>
                    Клуб
                </Link>
                <Link to="/events" style={{
                    color: location.pathname === '/events' ? '#fff' : '#aaa',
                    textDecoration: 'none',
                    fontSize: '12px',
                    letterSpacing: '0.2em',
                    fontWeight: location.pathname === '/events' ? 'bold' : 'normal',
                    textTransform: 'uppercase'
                }}>
                    Мероприятия
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;
