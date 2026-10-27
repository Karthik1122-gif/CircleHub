import React from 'react';

export default function Footer({ currentUser, setActiveTab }) {
    const handleNav = (tab) => {
        if (setActiveTab) {
            setActiveTab(tab);
            window.location.hash = `#${tab}`;
        }
    };

    return (
        <footer className="footer">
            <div className="footer-inner">
                {/* Brand & Mission column */}
                <div className="footer-col brand-col">
                    <div className="brand" onClick={() => handleNav('dashboard')} title="CircleHub">
                        <div className="brand-logo-badge">
                            <span className="brand-leaf">🌿</span>
                        </div>
                        <div className="brand-text-container">
                            <span className="brand-title">CircleHub</span>
                            <span className="brand-tagline">COMMUNITY NETWORK</span>
                        </div>
                    </div>
                    <p className="footer-desc">
                        Fostering offline neighborhood connections through shared passions, community circles, skill-sharing workshops, and local events.
                    </p>
                    <div className="footer-security-pill">
                        <span className="security-icon">🔒</span>
                        <span>TLS Encrypted &amp; Neighborhood Verified</span>
                    </div>
                </div>

                {/* Platform Navigation */}
                <div className="footer-col">
                    <h4 className="footer-heading">Platform</h4>
                    <ul className="footer-links">
                        <li>
                            <button className="footer-link-btn" onClick={() => handleNav('dashboard')}>
                                Community Dashboard
                            </button>
                        </li>
                        <li>
                            <button className="footer-link-btn" onClick={() => handleNav('circles')}>
                                Interest Circles
                            </button>
                        </li>
                        <li>
                            <button className="footer-link-btn" onClick={() => handleNav('events')}>
                                Local Events &amp; Workshops
                            </button>
                        </li>
                        {currentUser && (
                            <li>
                                <button className="footer-link-btn" onClick={() => handleNav('profile')}>
                                    My Neighborhood Profile
                                </button>
                            </li>
                        )}
                    </ul>
                </div>

                {/* Legal & Governance */}
                <div className="footer-col">
                    <h4 className="footer-heading">Trust &amp; Legal</h4>
                    <ul className="footer-links">
                        <li>
                            <button className="footer-link-btn" onClick={() => handleNav('privacy')}>
                                Privacy Policy
                            </button>
                        </li>
                        <li>
                            <button className="footer-link-btn" onClick={() => handleNav('terms')}>
                                Terms &amp; Conditions
                            </button>
                        </li>
                        <li>
                            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="footer-link-anchor">
                                XML Sitemap
                            </a>
                        </li>
                        <li>
                            <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="footer-link-anchor">
                                Robots Directives
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Community guidelines & quick stats */}
                <div className="footer-col">
                    <h4 className="footer-heading">Neighborhood Safety</h4>
                    <p className="footer-safety-text">
                        Every circle is member-governed. Report unsafe behavior or spam directly to circle organizers or community administrators.
                    </p>
                    <div className="footer-badge-list">
                        <span className="pill-badge">🏡 Hyper-Local</span>
                        <span className="pill-badge">🤝 Skill Sharing</span>
                        <span className="pill-badge">🛡️ Zero Ads</span>
                    </div>
                </div>
            </div>

            {/* Bottom copyright bar */}
            <div className="footer-bottom">
                <div className="footer-bottom-inner">
                    <p>© 2026 CircleHub Community Network. All rights reserved.</p>
                    <div className="footer-bottom-links">
                        <button className="footer-sublink" onClick={() => handleNav('privacy')}>Privacy</button>
                        <span className="divider">•</span>
                        <button className="footer-sublink" onClick={() => handleNav('terms')}>Terms</button>
                        <span className="divider">•</span>
                        <a href="https://frontend-seven-black-12.vercel.app" className="footer-sublink" target="_blank" rel="noopener noreferrer">
                            Production Deployment
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
