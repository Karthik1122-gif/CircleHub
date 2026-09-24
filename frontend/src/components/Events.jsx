import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Events({ currentUser }) {
    const [events, setEvents] = useState([]);
    const [userCircles, setUserCircles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state for Create Event
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        circle_id: '',
        title: '',
        description: '',
        event_date: '',
        location: currentUser.location || 'Community Center'
    });

    useEffect(() => {
        fetchEventsData();
    }, [currentUser]);

    const fetchEventsData = async () => {
        try {
            setLoading(true);
            const eventsData = await api.getEvents();
            const circlesData = await api.getCircles(currentUser ? currentUser.id : '');
            
            setEvents(eventsData);
            setUserCircles(circlesData.filter(c => c.is_member || c.created_by === currentUser.id));

            if (circlesData.length > 0 && !newEvent.circle_id) {
                setNewEvent(prev => ({ ...prev, circle_id: circlesData[0].id }));
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch events.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        if (!newEvent.circle_id) {
            alert('Please select a circle for this event.');
            return;
        }

        try {
            await api.createEvent({
                ...newEvent,
                created_by: currentUser.id
            });
            setShowCreateModal(false);
            setNewEvent({
                circle_id: userCircles.length > 0 ? userCircles[0].id : '',
                title: '',
                description: '',
                event_date: '',
                location: currentUser.location || 'Community Center'
            });
            fetchEventsData();
        } catch (err) {
            alert(err.message || 'Error creating event');
        }
    };

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.circle_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
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

            {error && <div className="alert alert-danger">{error}</div>}

            {/* Search Bar */}
            <div style={{ marginBottom: '24px' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Search events by title, description, circle, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading events...</div>
            ) : (
                <div className="grid-cards">
                    {filteredEvents.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            No events found matching your search. Be the first to host one!
                        </div>
                    ) : (
                        filteredEvents.map((event) => (
                            <div key={event.id} className="card">
                                <div className="card-header">
                                    <h3 className="card-title">{event.title}</h3>
                                    <span className="badge badge-blue">{event.circle_name}</span>
                                </div>

                                <div className="card-body">
                                    {event.description}
                                </div>

                                <div className="card-meta">
                                    <div className="meta-item">
                                        📅 <strong>Date:</strong> {new Date(event.event_date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                                    </div>
                                    <div className="meta-item">
                                        📍 <strong>Location:</strong> {event.location}
                                    </div>
                                    <div className="meta-item">
                                        👤 <strong>Host:</strong> {event.creator_name}
                                    </div>
                                </div>

                                <div className="card-footer">
                                    <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>
                                        Open to Circle Members
                                    </span>
                                    <button 
                                        className="btn btn-outline btn-sm"
                                        onClick={() => alert(`RSVP recorded for ${event.title}! See you there!`)}
                                    >
                                        RSVP / Attend
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create Event Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Host a Community Event</h3>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateEvent}>
                            <div className="form-group">
                                <label>Host Circle</label>
                                <select
                                    className="form-select"
                                    value={newEvent.circle_id}
                                    onChange={(e) => setNewEvent({ ...newEvent, circle_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select a circle...</option>
                                    {userCircles.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Event Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Weekend Book Discussion"
                                    value={newEvent.title}
                                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Date & Time</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={newEvent.event_date}
                                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Location / Venue</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Downtown Public Library Room 201"
                                    value={newEvent.location}
                                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    className="form-textarea"
                                    rows="3"
                                    placeholder="Details about what will take place during this meetup..."
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    required
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Publish Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
