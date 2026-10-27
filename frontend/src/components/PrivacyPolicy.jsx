import React, { useEffect } from 'react';

export default function PrivacyPolicy({ onBack, setActiveTab }) {
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.title = 'Privacy Policy | CircleHub';
    }, []);

    const handleReturn = () => {
        if (onBack) onBack();
        else if (setActiveTab) setActiveTab('dashboard');
        else window.location.hash = '#dashboard';
    };

    return (
        <div className="policy-container page-enter">
            {/* Header bar */}
            <div className="policy-header-card">
                <div className="policy-breadcrumb">
                    <button className="btn btn-outline btn-sm" onClick={handleReturn} aria-label="Go Back">
                        ← Back to CircleHub
                    </button>
                    <span className="policy-badge">Legal Documentation</span>
                </div>
                <h1 className="policy-title">CircleHub Privacy Policy</h1>
                <p className="policy-subtitle">
                    Last Updated: October 27, 2026 • Effective Date: January 1, 2026
                </p>
                <div className="policy-highlight-box">
                    <span className="policy-highlight-icon">🔒</span>
                    <div>
                        <strong>Your Privacy Matters:</strong> At CircleHub, we believe strong local communities require absolute trust. We do not sell your personal data to advertisers. You control your neighborhood visibility and contact sharing at all times.
                    </div>
                </div>
            </div>

            {/* Content body */}
            <div className="policy-body-card">
                <section className="policy-section">
                    <h2>1. Introduction</h2>
                    <p>
                        Welcome to <strong>CircleHub</strong> ("CircleHub", "we", "our", or "us"). We provide a hyper-local neighborhood platform that connects neighbors through shared interest circles, community events, and skill sharing. This Privacy Policy explains how we collect, store, process, and protect your information when you visit our website (<code>https://frontend-seven-black-12.vercel.app</code>) or utilize our community platform services.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>2. Information We Collect</h2>
                    <p>To enable genuine, trusted local neighborhood interactions, we collect the following categories of information:</p>
                    
                    <div className="policy-grid">
                        <div className="policy-item-card">
                            <div className="policy-item-icon">👤</div>
                            <h3>Account Information</h3>
                            <p>When creating an account, you provide your full name, email address, hashed password, and local neighborhood/city area.</p>
                        </div>
                        <div className="policy-item-card">
                            <div className="policy-item-icon">🏡</div>
                            <h3>Neighborhood &amp; Profile Data</h3>
                            <p>Optional details you choose to share: short bio, personal interests, skills you can teach or share, and profile avatar.</p>
                        </div>
                        <div className="policy-item-card">
                            <div className="policy-item-icon">🌿</div>
                            <h3>Circle &amp; Event Activity</h3>
                            <p>Information generated from your participation, including circles you create or join, events you organize, and RSVPs you submit.</p>
                        </div>
                        <div className="policy-item-card">
                            <div className="policy-item-icon">📸</div>
                            <h3>Shared Media &amp; Resources</h3>
                            <p>Photos, documents, or external resource links uploaded to event memory galleries or circle study materials.</p>
                        </div>
                    </div>
                </section>

                <section className="policy-section">
                    <h2>3. How We Use Your Information</h2>
                    <p>We use your information exclusively to provide a safe, vibrant neighborhood network:</p>
                    <ul className="policy-list">
                        <li><strong>Neighborhood Circle Discovery:</strong> Matching you with nearby neighbors who share common passions (gardening, tech, fitness, crafts).</li>
                        <li><strong>Event Coordination:</strong> Managing attendee lists, notifying organizers of RSVP counts, and displaying local meetup coordinates.</li>
                        <li><strong>Profile Privacy Guard:</strong> Enforcing your custom contact visibility preferences so your contact number is only shown according to your rules.</li>
                        <li><strong>Platform Safety &amp; Trust:</strong> Preventing spam, impersonation, or unauthorized access to our community networks.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2>4. Granular Phone &amp; Contact Privacy Controls</h2>
                    <p>
                        CircleHub provides user-controlled privacy settings for sensitive information such as phone numbers:
                    </p>
                    <ul className="policy-list">
                        <li><strong>Everyone:</strong> Visible to all authenticated CircleHub members.</li>
                        <li><strong>Circle Members (Default):</strong> Visible only to verified members of circles you have both joined.</li>
                        <li><strong>Nobody:</strong> Strictly private; hidden from all community members and viewable only by yourself.</li>
                    </ul>
                    <p>You can adjust these settings at any time in your <button className="policy-inline-link" onClick={() => setActiveTab?.('profile')}>Profile Settings</button>.</p>
                </section>

                <section className="policy-section">
                    <h2>5. Cookies &amp; Local Storage</h2>
                    <p>
                        CircleHub uses browser <code>localStorage</code> solely to securely persist your authenticated session token and basic UI preferences across page reloads. We do not use third-party tracking cookies or cross-site tracking pixels.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>6. Data Security &amp; Encryption</h2>
                    <p>
                        We employ multi-layer security protections, including HTTPS encryption in transit (TLS 1.3), HSTS headers, database field sanitation, password hashing with salt, and strict CORS policies. While no internet transmission is 100% immune, we apply industry-standard practices to safeguard your community data.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>7. Your Rights &amp; Data Control</h2>
                    <p>As a valued CircleHub neighbor, you maintain complete ownership of your data:</p>
                    <ul className="policy-list">
                        <li><strong>Access &amp; Edit:</strong> Update your profile, interests, and neighborhood at any time.</li>
                        <li><strong>Leave Circles:</strong> Withdraw your membership from any circle with one click.</li>
                        <li><strong>Delete Content:</strong> Remove circles, events, or gallery photos you have posted.</li>
                        <li><strong>Account Deletion:</strong> Request full erasure of your account and personal identifiers by contacting us.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2>8. Children's Privacy</h2>
                    <p>
                        CircleHub is intended for individuals aged 13 and older. We do not knowingly collect personal information from children under the age of 13. If you believe a child has provided us personal information, please contact us immediately.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>9. Contact Us</h2>
                    <p>
                        For any privacy-related inquiries, requests, or questions regarding this policy, please reach out to our Community Privacy Officer:
                    </p>
                    <div className="policy-contact-box">
                        <p><strong>Email:</strong> privacy@circlehub.local</p>
                        <p><strong>Community Support:</strong> support@circlehub.local</p>
                        <p><strong>Platform:</strong> CircleHub Hyper-Local Community Network</p>
                    </div>
                </section>

                <div className="policy-footer-action">
                    <button className="btn btn-primary" onClick={handleReturn}>
                        ← Return to CircleHub Platform
                    </button>
                </div>
            </div>
        </div>
    );
}
