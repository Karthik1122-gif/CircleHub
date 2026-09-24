import React, { useState } from 'react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onLogout }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleNav = (tab) => {
        setActiveTab(tab);
        setMenuOpen(false);
    };

    const navItems = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'circles',   label: 'Circles'   },
        { id: 'events',    label: 'Events'     },
        { id: 'profile',   label: 'My Profile' },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                {/* Brand */}
                <div className="brand" onClick={() => handleNav('dashboard')}>
                    <div className="brand-icon">CH</div>
                    <span>CircleHub</span>
                </div>

                {/* Desktop nav links */}
                {currentUser && (
                    <ul className="nav-links desktop-nav">
                        {navItems.map(item => (
                            <li
                                key={item.id}
                                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => handleNav(item.id)}
                            >
                                {item.label}
                            </li>
                        ))}
                    </ul>
                )}

                {/* Desktop user status */}
                {currentUser && (
                    <div className="user-status desktop-user">
                        <div className="user-badge">
                            <div className="avatar">
                                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span>{currentUser.name}</span>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={onLogout}>
                            Logout
                        </button>
                    </div>
                )}

                {/* Hamburger (mobile only) */}
                {currentUser && (
                    <button
                        className={`hamburger ${menuOpen ? 'open' : ''}`}
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="Toggle menu"
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                )}
            </div>

            {/* Mobile dropdown menu */}
            {currentUser && (
                <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
                    <ul className="nav-links">
                        {navItems.map(item => (
                            <li
                                key={item.id}
                                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => handleNav(item.id)}
                            >
                                {item.label}
                            </li>
                        ))}
                    </ul>
                    <div className="mobile-user-section">
                        <div className="user-badge">
                            <div className="avatar">
                                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
                        </div>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => { setMenuOpen(false); onLogout(); }}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
