import React, { useState } from 'react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onLogout }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleNav = (tab) => {
        setActiveTab(tab);
        setMenuOpen(false);
    };

    const authenticatedNavItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'circles',   label: 'Circles',   icon: '⭕' },
        { id: 'events',    label: 'Events',    icon: '📅' },
        { id: 'profile',   label: 'My Profile',icon: '👤' },
    ];

    const guestNavItems = [
        { id: 'dashboard', label: 'Home', icon: '🏡' },
        { id: 'privacy',   label: 'Privacy Policy', icon: '🔒' },
        { id: 'terms',     label: 'Terms of Service', icon: '📜' },
    ];

    const currentNavItems = currentUser ? authenticatedNavItems : guestNavItems;

    return (
        <nav className="navbar" role="navigation" aria-label="Main Navigation">
            <div className="navbar-inner">
                {/* Brand Logo */}
                <div
                    className="brand"
                    onClick={() => handleNav('dashboard')}
                    title="CircleHub - Home"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNav('dashboard'); }}
                    id="brand-logo"
                >
                    <div className="brand-logo-badge">
                        <span className="brand-leaf">🌿</span>
                    </div>
                    <div className="brand-text-container">
                        <span className="brand-title">CircleHub</span>
                        <span className="brand-tagline">COMMUNITY NETWORK</span>
                    </div>
                </div>

                {/* Desktop nav links */}
                <ul className="nav-links desktop-nav">
                    {currentNavItems.map(item => (
                        <li
                            key={item.id}
                            className={`nav-item ${activeTab === item.id ? 'active selected' : ''}`}
                            onClick={() => handleNav(item.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleNav(item.id); }}
                            id={`nav-item-${item.id}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </li>
                    ))}
                </ul>

                {/* Desktop user status */}
                {currentUser ? (
                    <div className="user-status desktop-user">
                        <div
                            className="user-badge"
                            onClick={() => handleNav('profile')}
                            style={{ cursor: 'pointer' }}
                            title="Go to profile"
                            id="desktop-user-profile-btn"
                        >
                            <div className="avatar" style={{ overflow: 'hidden' }}>
                                {currentUser.avatar ? (
                                    <img
                                        src={currentUser.avatar}
                                        alt={currentUser.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'
                                )}
                            </div>
                            <span className="user-name-text">{currentUser.name}</span>
                        </div>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={onLogout}
                            id="btn-desktop-logout"
                            aria-label="Logout of CircleHub"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="user-status desktop-user">
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleNav('dashboard')}
                            id="btn-desktop-signin"
                        >
                            Sign In / Register ✨
                        </button>
                    </div>
                )}

                {/* Hamburger (mobile only) */}
                <button
                    className={`hamburger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label="Toggle navigation menu"
                    aria-expanded={menuOpen}
                    id="mobile-hamburger-btn"
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            {/* Mobile dropdown menu */}
            <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} id="mobile-nav-drawer">
                <ul className="nav-links mobile-nav-links">
                    {currentNavItems.map(item => (
                        <li
                            key={item.id}
                            className={`nav-item ${activeTab === item.id ? 'active selected' : ''}`}
                            onClick={() => handleNav(item.id)}
                            role="button"
                            tabIndex={0}
                            id={`mobile-nav-${item.id}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </li>
                    ))}
                </ul>

                <div className="mobile-user-section">
                    {currentUser ? (
                        <>
                            <div
                                className="user-badge"
                                onClick={() => handleNav('profile')}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="avatar" style={{ overflow: 'hidden' }}>
                                    {currentUser.avatar ? (
                                        <img
                                            src={currentUser.avatar}
                                            alt={currentUser.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'
                                    )}
                                </div>
                                <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
                            </div>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => { setMenuOpen(false); onLogout(); }}
                                id="btn-mobile-logout"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            className="btn btn-primary btn-sm"
                            style={{ width: '100%' }}
                            onClick={() => handleNav('dashboard')}
                            id="btn-mobile-signin"
                        >
                            Sign In / Join Community 🚀
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
