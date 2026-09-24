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

/* ── Skeleton loader ──────────────────────────────────────── */
function SkeletonCards() {
    return (
        <div className="grid-cards">
            {[1, 2, 3].map(i => (
                <div key={i} className="card">
                    <div className="skeleton skeleton-line med" style={{ marginBottom: 12 }} />
                    <div className="skeleton skeleton-line full" />
                    <div className="skeleton skeleton-line short" />
                    <div className="skeleton skeleton-line full" style={{ marginTop: 16, height: 36, borderRadius: 8 }} />
                </div>
            ))}
        </div>
    );
}

/* ── Helpers ──────────────────────────────────────────────── */
const todayMin = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
};

/* ── Component ───────────────────────────────────────────── */
export default function Events({ currentUser }) {
    const [events, setEvents]           = useState([]);
    const [userCircles, setUserCircles] = useState([]);
    const [searchTerm, setSearchTerm]   = useState('');
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [toast, setToast]             = useState(null);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        circle_id: '', title: '', description: '',
        event_date: '', location: currentUser.location || 'Community Center'
    });
    const [createError, setCreateError]   = useState('');
    const [dateError, setDateError]       = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    const currentUserId = currentUser._id || currentUser.id;

    useEffect(() => { fetchEventsData(); }, [currentUser]);

    const fetchEventsData = async () => {
        setLoading(true);
        setError('');
        try {
            const [eventsData, circlesData] = await Promise.all([
                api.getEvents(),
                api.getCircles(currentUserId)
            ]);

            setEvents(eventsData);

            const joined = circlesData.filter(c =>
                c.is_member ||
                String(c.created_by?._id || c.created_by) === String(currentUserId)
            );
            setUserCircles(joined);

            if (joined.length > 0) {
                setNewEvent(prev => ({ ...prev, circle_id: joined[0]._id || joined[0].id }));
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch events.');
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e) => {
        const val = e.target.value;
        setNewEvent(prev => ({ ...prev, event_date: val }));
        if (val && new Date(val) <= new Date()) {
            setDateError('Event date must be in the future.');
        } else {
            setDateError('');
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setCreateError('');

        if (!newEvent.circle_id) { setCreateError('Please select a circle for this event.'); return; }
        if (!newEvent.title.trim()) { setCreateError('Event title is required.'); return; }
        if (!newEvent.event_date) { setCreateError('Event date is required.'); return; }
        if (new Date(newEvent.event_date) <= new Date()) { setCreateError('Event date must be in the future.'); return; }
        if (!newEvent.location.trim()) { setCreateError('Location is required.'); return; }

        setCreateLoading(true);
        try {
            await api.createEvent({ ...newEvent, created_by: currentUserId });
            setShowCreateModal(false);
            setNewEvent({
                circle_id: userCircles.length > 0 ? (userCircles[0]._id || userCircles[0].id) : '',
                title: '', description: '', event_date: '',
                location: currentUser.location || 'Community Center'
            });
            setCreateError('');
            setDateError('');
            setToast({ message: 'Event published successfully! 🎉', type: 'success' });
            fetchEventsData();
        } catch (err) {
            setCreateError(err.message || 'Error creating event');
        } finally {
            setCreateLoading(false);
        }
    };

    const filteredEvents = events.filter(ev => {
        const term = searchTerm.toLowerCase();
        return (
            (ev.title || '').toLowerCase().includes(term) ||
            (ev.description || '').toLowerCase().includes(term) ||
            (ev.location || '').toLowerCase().includes(term) ||
            (ev.circle_name || '').toLowerCase().includes(term)
        );
    });

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Community Events & Meetups</h2>
                    <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                        Attend local workshops, discussions, and neighborhood gatherings.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Host an Event
                </button>
            </div>

            {error && <div className="alert alert-danger">⚠️ {error}</div>}

            {/* Search Bar */}
            <div style={{ marginBottom: '24px' }}>
                <input
                    type="text" className="form-input"
                    placeholder="🔍 Search events by title, description, circle, or location…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? <SkeletonCards /> : (
                <div className="grid-cards">
                    {filteredEvents.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-emoji">📅</div>
                            <p>No events found matching your search.</p>
                            <small>Be the first to host one in your community!</small>
                        </div>
                    ) : (
                        filteredEvents.map((event) => (
                            <div key={event._id || event.id} className="card">
                                <div className="card-header">
                                    <h3 className="card-title">{event.title}</h3>
                                    <span className="badge badge-blue">{event.circle_name}</span>
                                </div>

                                <div className="card-body">{event.description}</div>

                                <div className="card-meta">
                                    <div className="meta-item">
                                        📅 <strong>Date:</strong>{' '}
                                        {new Date(event.event_date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                                    </div>
                                    <div className="meta-item">📍 <strong>Location:</strong> {event.location}</div>
                                    <div className="meta-item">👤 <strong>Host:</strong> {event.creator_name}</div>
                                </div>

                                <div className="card-footer">
                                    <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>
                                        Open to Circle Members
                                    </span>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => setToast({ message: `RSVP recorded for "${event.title}"! See you there! 🎊`, type: 'success' })}
                                    >
                                        RSVP / Attend
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
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

            {/* Create Event Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Host a Community Event</h3>
                            <button className="close-btn" onClick={() => { setShowCreateModal(false); setCreateError(''); setDateError(''); }}>✕</button>
                        </div>

                        {createError && <div className="alert alert-danger">⚠️ {createError}</div>}

                        {userCircles.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔗</div>
                                <p>You must be a member of at least one circle to host an event.</p>
                                <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => setShowCreateModal(false)}>
                                    Go to Circles
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateEvent}>
                                <div className="form-group">
                                    <label>Host Circle <span className="required-star">*</span></label>
                                    <select
                                        className="form-select"
                                        value={newEvent.circle_id}
                                        onChange={(e) => setNewEvent({ ...newEvent, circle_id: e.target.value })}
                                    >
                                        <option value="">Select a circle…</option>
                                        {userCircles.map(c => (
                                            <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Event Title <span className="required-star">*</span></label>
                                    <input
                                        type="text" className="form-input"
                                        placeholder="e.g. Weekend Book Discussion"
                                        value={newEvent.title}
                                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Date & Time <span className="required-star">*</span></label>
                                    <input
                                        type="datetime-local" className={`form-input ${dateError ? 'error' : ''}`}
                                        value={newEvent.event_date}
                                        min={todayMin()}
                                        onChange={handleDateChange}
                                    />
                                    {dateError && <span className="field-error">⚠ {dateError}</span>}
                                    <span className="form-hint">Event must be scheduled in the future</span>
                                </div>

                                <div className="form-group">
                                    <label>Location / Venue <span className="required-star">*</span></label>
                                    <input
                                        type="text" className="form-input"
                                        placeholder="e.g. Downtown Public Library Room 201"
                                        value={newEvent.location}
                                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        className="form-textarea" rows="3"
                                        placeholder="Details about what will take place during this meetup…"
                                        value={newEvent.description}
                                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                    <button type="button" className="btn btn-outline" onClick={() => { setShowCreateModal(false); setCreateError(''); setDateError(''); }}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={createLoading || !!dateError}>
                                        {createLoading ? <><span className="spinner" /> Publishing…</> : 'Publish Event'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
