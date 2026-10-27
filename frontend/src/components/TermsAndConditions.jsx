import React, { useEffect } from 'react';

export default function TermsAndConditions({ onBack, setActiveTab }) {
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.title = 'Terms & Conditions | CircleHub';
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
                    <span className="policy-badge">Community Agreement</span>
                </div>
                <h1 className="policy-title">Terms &amp; Conditions</h1>
                <p className="policy-subtitle">
                    Last Updated: October 27, 2026 • Effective Date: January 1, 2026
                </p>
                <div className="policy-highlight-box">
                    <span className="policy-highlight-icon">🤝</span>
                    <div>
                        <strong>Neighborhood Code of Honor:</strong> CircleHub is built upon kindness, mutual respect, and neighborly collaboration. By using our platform, you agree to treat every neighbor with dignity and help create safe community spaces.
                    </div>
                </div>
            </div>

            {/* Content body */}
            <div className="policy-body-card">
                <section className="policy-section">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using the CircleHub platform, websites, or services (collectively, the "Services"), you confirm that you have read, understood, and agreed to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please refrain from using CircleHub.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>2. User Accounts &amp; Neighborhood Registration</h2>
                    <p>To access CircleHub's community features, you must register for an account:</p>
                    <ul className="policy-list">
                        <li>You must provide accurate, current, and complete registration information.</li>
                        <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                        <li>You agree to notify us immediately of any unauthorized access or security breach.</li>
                        <li>Each individual may maintain only one active personal account.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2>3. Neighborhood Code of Conduct</h2>
                    <p>Every member of CircleHub plays a role in fostering an inclusive, welcoming community. You agree NOT to:</p>
                    <div className="policy-grid">
                        <div className="policy-item-card danger-card">
                            <div className="policy-item-icon">🚫</div>
                            <h3>Harassment &amp; Bullying</h3>
                            <p>Threaten, stalk, demean, or harass any neighbor, or promote hate speech based on identity, race, religion, gender, or background.</p>
                        </div>
                        <div className="policy-item-card danger-card">
                            <div className="policy-item-icon">📢</div>
                            <h3>Spam &amp; Solicitation</h3>
                            <p>Post unsolicited marketing, multi-level marketing pitches, chain messages, or spam commercial products across circle boards.</p>
                        </div>
                        <div className="policy-item-card danger-card">
                            <div className="policy-item-icon">🎭</div>
                            <h3>Impersonation</h3>
                            <p>Falsely claim association with a community leader, organization, or impersonate another neighborhood resident.</p>
                        </div>
                        <div className="policy-item-card danger-card">
                            <div className="policy-item-icon">⚠️</div>
                            <h3>Unlawful Activities</h3>
                            <p>Organize activities violating local municipal laws, promote hazardous substances, or host dangerous gatherings.</p>
                        </div>
                    </div>
                </section>

                <section className="policy-section">
                    <h2>4. Circles &amp; Event Hosting Guidelines</h2>
                    <p>
                        When creating an interest circle or publishing a community event:
                    </p>
                    <ul className="policy-list">
                        <li><strong>Accurate Details:</strong> Provide genuine meeting dates, times, locations, and descriptions.</li>
                        <li><strong>Venue Appropriateness:</strong> Ensure public park reservations, community hall bookings, or private meetup venues comply with local municipal codes and safety regulations.</li>
                        <li><strong>Open &amp; Transparent:</strong> CircleHub events must be transparent regarding requirements, material fees (if any), or skill levels.</li>
                        <li><strong>Host Cancellation Notice:</strong> If an event must be rescheduled or cancelled, notify RSVP attendees promptly via platform announcements.</li>
                    </ul>
                </section>

                <section className="policy-section">
                    <h2>5. Offline Gatherings &amp; Assumption of Risk</h2>
                    <div className="policy-disclaimer-box">
                        <strong>⚠️ Notice Regarding In-Person Meetups:</strong><br />
                        CircleHub provides the digital coordination software connecting neighbors. We do not supervise, operate, or control offline events, workshops, or gatherings organized by community members. You choose to attend in-person meetups voluntarily and at your own sole risk. Always exercise common-sense safety measures when meeting new neighbors.
                    </div>
                </section>

                <section className="policy-section">
                    <h2>6. User-Submitted Content &amp; Photos</h2>
                    <p>
                        You retain full ownership of any photos, text, or resources you upload to CircleHub. By posting content to public circles or event galleries, you grant CircleHub a non-exclusive, royalty-free license to display that content within the platform solely to facilitate community interaction.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>7. Limitation of Liability</h2>
                    <p>
                        To the fullest extent permitted by applicable law, CircleHub and its creators, contributors, and hosting providers shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the platform, or any interaction between neighbors.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>8. Termination &amp; Moderation</h2>
                    <p>
                        We reserve the right to suspend or terminate accounts, remove circles, or delete event listings that violate these Terms or threaten the safety and well-being of the neighborhood community.
                    </p>
                </section>

                <section className="policy-section">
                    <h2>9. Contact &amp; Reporting</h2>
                    <p>
                        To report a community violation, dispute content, or inquire about these Terms, please contact our community team:
                    </p>
                    <div className="policy-contact-box">
                        <p><strong>Email:</strong> legal@circlehub.local</p>
                        <p><strong>Community Trust &amp; Safety:</strong> safety@circlehub.local</p>
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
