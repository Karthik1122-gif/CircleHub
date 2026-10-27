import React, { useState, useEffect } from 'react';
import { api } from '../api';

/* ── Toast ────────────────────────────────────────────────── */
function Toast({ message, type, onDone }) {
    useEffect(() => {
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, []);
    return <div className={`toast ${type}`}>{type === 'success' ? '✅' : '❌'} {message}</div>;
}

/* ── Skeleton placeholder ─────────────────────────────────── */
function SkeletonGrid() {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {[1, 2, 3].map(i => (
                <div key={i} className="card">
                    <div className="skeleton skeleton-line med" style={{ marginBottom: 12 }} />
                    <div className="skeleton skeleton-line full" />
                    <div className="skeleton skeleton-line short" />
                </div>
            ))}
        </div>
    );
}

/* ── Animated stat number ─────────────────────────────────── */
function AnimatedStat({ target }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!target) { setCount(0); return; }
        let start = 0;
        const step = Math.max(1, Math.ceil(target / 25));
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(start);
        }, 30);
        return () => clearInterval(timer);
    }, [target]);

    return <div className="stat-number">{count}</div>;
}

/* ── Component ───────────────────────────────────────────── */
export default function Dashboard({ currentUser, setActiveTab, refreshKey }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState('');
    const [toast, setToast]                 = useState(null);
    const [joiningCircle, setJoiningCircle] = useState(null);
    const [lightboxPhoto, setLightboxPhoto] = useState(null);

    const userId = currentUser?._id || currentUser?.id;

    useEffect(() => {
        if (userId) fetchDashboard(false);

        const handleFocus = () => {
            if (userId) fetchDashboard(true);
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [currentUser, refreshKey]);

    const fetchDashboard = async (isBackground = false) => {
        if (!isBackground && !dashboardData) setLoading(true);
        setError('');
        try {
            const data = await api.getDashboard(userId);
            setDashboardData(data);
        } catch (err) {
            if (!isBackground) setError(err.message || 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRecommended = async (circleId) => {
        setJoiningCircle(circleId);
        try {
            await api.joinCircle(circleId, userId);
            setToast({ message: 'Successfully joined circle! 🎉', type: 'success' });
            fetchDashboard();
        } catch (err) {
            setToast({ message: err.message || 'Failed to join circle.', type: 'error' });
        } finally {
            setJoiningCircle(null);
        }
    };

    if (loading) return (
        <div className="page-enter">
            <div className="welcome-banner" style={{ marginBottom: 24 }}>
                <div className="skeleton skeleton-line med" style={{ height: 28, marginBottom: 10 }} />
                <div className="skeleton skeleton-line short" style={{ height: 16 }} />
            </div>
            <SkeletonGrid />
        </div>
    );

    if (error) return (
        <div className="page-enter" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>😕</div>
            <div className="alert alert-danger" style={{ maxWidth: 480, margin: '0 auto 16px' }}>{error}</div>
            <button className="btn btn-primary" onClick={fetchDashboard}>🔄 Retry Dashboard</button>
        </div>
    );

    const {
        user: dbUser,
        joinedCircles      = [],
        createdCircles     = [],
        recommendedCircles = [],
        upcomingEvents     = [],
        recentPhotos       = [],
        stats              = { totalJoined: 0, totalCreated: 0, totalEvents: 0, totalPhotos: 0 }
    } = dashboardData || {};

    const displayUser = dbUser || currentUser;

    return (
        <div className="page-enter">
            {/* Dynamic Welcome Banner */}
            <div className="welcome-banner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1>Hello, {displayUser.name}! 👋</h1>
                        <p>
                            Welcome back to CircleHub! Here is what's happening dynamically in{' '}
                            <strong>{displayUser.location || 'your neighborhood'}</strong>.
                        </p>
                    </div>
                    {displayUser.interests && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {displayUser.interests.split(',').map((tag, idx) => (
                                <span key={idx} className="badge badge-emerald" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>
                                    ✨ {tag.trim()}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Real-time Database Stats Grid */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="stat-card">
                    <AnimatedStat target={stats.circlesJoined ?? stats.totalJoined ?? 0} />
                    <div className="stat-label">Circles Joined</div>
                </div>
                <div className="stat-card">
                    <AnimatedStat target={stats.circlesCreated ?? stats.totalCreated ?? 0} />
                    <div className="stat-label">Circles Created</div>
                </div>
                <div className="stat-card">
                    <AnimatedStat target={stats.eventsCreated ?? 0} />
                    <div className="stat-label">Events Created</div>
                </div>
                <div className="stat-card">
                    <AnimatedStat target={stats.eventsJoined ?? 0} />
                    <div className="stat-label">Events Joined</div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>

                {/* My Joined Circles */}
                <div className="card" style={{ justifyContent: 'flex-start' }}>
                    <div className="card-header">
                        <h3 className="card-title">My Joined Circles</h3>
                        <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('circles')}>
                            Explore All
                        </button>
                    </div>

                    <div className="card-body">
                        {joinedCircles.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🌐</div>
                                <p style={{ fontStyle: 'italic', marginBottom: 4 }}>
                                    You haven't joined any circles yet.
                                </p>
                                <small>Check out the recommended circles below or click 'Explore All'!</small>
                            </div>
                        ) : (
                            joinedCircles.map((circle) => (
                                <div key={circle._id || circle.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{circle.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                                            {circle.category} • 👥 {circle.member_count} members • 📍 {circle.location}
                                        </div>
                                    </div>
                                    <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>Active Member</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming Meetups & Events */}
                <div className="card" style={{ justifyContent: 'flex-start' }}>
                    <div className="card-header">
                        <h3 className="card-title">Upcoming Meetups & Events</h3>
                        <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('events')}>
                            View All Events
                        </button>
                    </div>

                    <div className="card-body">
                        {upcomingEvents.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📅</div>
                                <p style={{ fontStyle: 'italic' }}>
                                    No upcoming events hosted yet.
                                </p>
                                <small>Host the first event from the Events tab!</small>
                            </div>
                        ) : (
                            upcomingEvents.map((event) => {
                                const appUrl = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost'))
                                    ? window.location.origin
                                    : 'https://frontend-seven-black-12.vercel.app';
                                const shareText = `🎉 *CircleHub Event: ${event.title}*\n📅 ${new Date(event.event_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}\n📍 Location: ${event.location}\nCircle: ${event.circle_name}\n\n👉 *Click to View & Join Event:* ${appUrl}\n\nJoin on CircleHub 🌿`;
                                return (
                                    <div key={event._id || event.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontWeight: '600', color: '#10b981', fontSize: '0.98rem' }}>{event.title}</div>
                                            <button
                                                className="btn btn-whatsapp btn-xs"
                                                onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer')}
                                                title="Share on WhatsApp"
                                            >
                                                💬 Share
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span>📍 {event.location}</span>
                                            <button
                                                className="btn-link-map"
                                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`, '_blank', 'noopener,noreferrer')}
                                            >
                                                🗺️ Directions
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                            📅 {new Date(event.event_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} • Circle: <strong>{event.circle_name}</strong>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>

            {/* Recommended Circles Section (if available) */}
            {recommendedCircles.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Recommended Interest Circles Nearby</h3>
                            <p style={{ fontSize: '0.88rem', color: '#64748b' }}>Connect with local groups in your community.</p>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('circles')}>View All Circles</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {recommendedCircles.map((circle) => {
                            const cId = circle._id || circle.id;
                            const isBusy = joiningCircle === cId;
                            return (
                                <div key={cId} className="card card-hover-effect" style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{circle.name}</h4>
                                        <span className="badge badge-emerald">{circle.category}</span>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {circle.description}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                                        <span>👥 {circle.member_count} Members</span>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleJoinRecommended(cId)}
                                            disabled={isBusy}
                                        >
                                            {isBusy ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Joining…</> : '+ Join Circle'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Dynamic Recent Game Photos Gallery */}
            {recentPhotos.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>📸 Recent Community Game Photos</h3>
                            <p style={{ fontSize: '0.88rem', color: '#64748b' }}>Moments shared by participants after games & meetups.</p>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('events')}>Go to Events</button>
                    </div>

                    <div className="photo-gallery-grid" style={{ maxHeight: 'none' }}>
                        {recentPhotos.map((photo, idx) => (
                            <div key={idx} className="photo-card" onClick={() => setLightboxPhoto(photo)}>
                                <div className="photo-img-wrapper">
                                    <img src={photo.url} alt={photo.caption || 'Game photo'} loading="lazy" decoding="async" />
                                    <div className="photo-overlay-zoom">🔍 Expand</div>
                                </div>
                                <div className="photo-info">
                                    <p className="photo-caption">{photo.caption || 'Game Photo'}</p>
                                    <div className="photo-meta">
                                        <span>👤 {photo.uploaded_by_name}</span>
                                        <button
                                            className="btn-whatsapp-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const appUrl = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost'))
                                                    ? window.location.origin
                                                    : 'https://frontend-seven-black-12.vercel.app';
                                                const msg = `Check out this photo from ${photo.event_title}: ${photo.caption || ''} 📷\n\n👉 *View on CircleHub:* ${appUrl}\n\nConnect on CircleHub 🌿`;
                                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                                            }}
                                            title="Share photo via WhatsApp"
                                        >
                                            💬
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type || 'success'}
                    onDone={() => setToast(null)}
                />
            )}

            {/* Lightbox Modal */}
            {lightboxPhoto && (
                <div className="lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button className="lightbox-close" onClick={() => setLightboxPhoto(null)}>✕</button>
                        <img src={lightboxPhoto.url} alt={lightboxPhoto.caption} className="lightbox-img" loading="lazy" decoding="async" />
                        <div className="lightbox-caption-bar">
                            <p style={{ fontWeight: 600, fontSize: '1rem', color: '#ffffff' }}>{lightboxPhoto.caption || 'Game Photo'}</p>
                            <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Shared by {lightboxPhoto.uploaded_by_name} • {lightboxPhoto.event_title}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
