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

export default function Events({ currentUser, onStatsChange }) {
    const [events, setEvents]           = useState([]);
    const [userCircles, setUserCircles] = useState([]);
    const [searchTerm, setSearchTerm]   = useState('');
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [toast, setToast]             = useState(null);

    // Create Event Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        circle_id: '', title: '', description: '',
        event_date: '', location: currentUser.location || 'Community Center'
    });
    const [createError, setCreateError]     = useState('');
    const [dateError, setDateError]         = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // View Event Modal state
    const [viewingEvent, setViewingEvent]   = useState(null);
    const [deletingEvent, setDeletingEvent] = useState(false);

    // Photo Gallery & Lightbox Modal state
    const [galleryEvent, setGalleryEvent]     = useState(null);
    const [lightboxPhoto, setLightboxPhoto]   = useState(null);
    const [photoUploadType, setPhotoUploadType] = useState('url'); // 'url' | 'file'
    const [photoUrlInput, setPhotoUrlInput]   = useState('');
    const [photoCaptionInput, setPhotoCaptionInput] = useState('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError]         = useState('');

    const currentUserId = currentUser._id || currentUser.id;

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Are you sure you want to remove this event?')) return;
        setDeletingEvent(true);
        try {
            await api.deleteEvent(eventId, currentUserId);
            setToast({ message: 'Event removed successfully.', type: 'info' });
            setViewingEvent(null);
            onStatsChange?.();
            fetchEventsData(true);
        } catch (err) {
            setToast({ message: err.message || 'Failed to remove event', type: 'error' });
        } finally {
            setDeletingEvent(false);
        }
    };

    useEffect(() => { fetchEventsData(); }, [currentUser]);

    const fetchEventsData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        setError('');
        try {
            const [eventsData, circlesData] = await Promise.all([
                api.getEvents(currentUserId),
                api.getCircles(currentUserId)
            ]);

            setEvents(eventsData || []);

            const joined = (circlesData || []).filter(c =>
                c.is_member ||
                String(c.created_by?._id || c.created_by) === String(currentUserId)
            );
            setUserCircles(joined);

            if (joined.length > 0) {
                setNewEvent(prev => ({
                    ...prev,
                    circle_id: prev.circle_id || joined[0]._id || joined[0].id
                }));
            }
        } catch (err) {
            if (!isBackground) setError(err.message || 'Failed to fetch events.');
        } finally {
            if (!isBackground) setLoading(false);
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

        const trimmedTitle = newEvent.title.trim();
        const trimmedLoc = newEvent.location.trim();
        const trimmedDesc = newEvent.description.trim();

        if (!newEvent.circle_id) { setCreateError('Please select a circle for this event.'); return; }
        if (!trimmedTitle || trimmedTitle.length < 3) { setCreateError('Event title must be at least 3 characters long.'); return; }
        if (trimmedTitle.length > 80) { setCreateError('Event title cannot exceed 80 characters.'); return; }
        if (!newEvent.event_date) { setCreateError('Event date and time is required.'); return; }
        if (new Date(newEvent.event_date) <= new Date()) { setCreateError('Event date must be scheduled in the future.'); return; }
        if (!trimmedLoc || trimmedLoc.length < 3) { setCreateError('Please provide a specific venue address or online meetup link.'); return; }
        if (trimmedDesc.length > 0 && trimmedDesc.length < 10) { setCreateError('Description should be at least 10 characters long.'); return; }

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
            onStatsChange?.();
            fetchEventsData(true);
        } catch (err) {
            setCreateError(err.message || 'Error creating event');
        } finally {
            setCreateLoading(false);
        }
    };

    // 💬 WhatsApp Share Handler
    const shareEventWhatsApp = (event) => {
        const dateStr = new Date(event.event_date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });
        const appUrl = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost'))
            ? window.location.origin
            : 'https://frontend-seven-black-12.vercel.app';

        const message =
            `🎉 *CircleHub Community Event Invite* 🎉\n\n` +
            `📌 *Event:* ${event.title}\n` +
            `🌐 *Circle:* ${event.circle_name}\n` +
            `📅 *Date & Time:* ${dateStr}\n` +
            `📍 *Location:* ${event.location}\n` +
            `📝 *Details:* ${event.description || 'Join us for this exciting meetup!'}\n\n` +
            `👉 *Click to View & Join Event:* ${appUrl}\n\n` +
            `See you there! Connect on CircleHub 🌿`;

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
    };

    // 🗺️ Open Google Maps Directions
    const openGoogleMaps = (location) => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    };

    // 📸 Client-side Image Compression Helper
    const compressImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.85) => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        if (width / height > maxWidth / maxHeight) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                    resolve(canvas.toDataURL(mimeType, quality));
                };
                img.onerror = () => resolve(e.target.result);
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    // 📸 Handle Local Image File Upload with Auto-Compression
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
            setPhotoError('Image file size must be less than 25MB.');
            return;
        }
        setPhotoError('');
        try {
            const compressed = await compressImage(file);
            setPhotoUrlInput(compressed);
        } catch (err) {
            setPhotoError('Failed to process image file.');
        }
    };

    // 📸 Submit Photo to Gallery
    const handleUploadPhoto = async (e) => {
        e.preventDefault();
        setPhotoError('');
        if (!photoUrlInput.trim()) {
            setPhotoError('Please provide an image URL or choose a photo file.');
            return;
        }

        setUploadingPhoto(true);
        try {
            const eventId = galleryEvent._id || galleryEvent.id;
            const res = await api.uploadEventPhoto(eventId, {
                url: photoUrlInput.trim(),
                caption: photoCaptionInput.trim(),
                uploaded_by_name: currentUser.name || 'Community Member'
            });

            const updatedPhotos = res.photos || [];

            // Update modal state
            setGalleryEvent(prev => ({ ...prev, photos: updatedPhotos }));

            // Update main events list state
            setEvents(prev => prev.map(ev => (
                (ev._id || ev.id) === eventId ? { ...ev, photos: updatedPhotos } : ev
            )));

            setPhotoUrlInput('');
            setPhotoCaptionInput('');
            setToast({ message: 'Game photo shared with circle participants! 📸', type: 'success' });
        } catch (err) {
            setPhotoError(err.message || 'Failed to upload photo.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const [rsvpBusy, setRsvpBusy] = useState(null);

    const handleRSVP = async (eventId) => {
        setRsvpBusy(eventId);
        try {
            const res = await api.rsvpEvent(eventId, currentUserId);
            setToast({ message: res.message, type: 'success' });
            onStatsChange?.();
            fetchEventsData(true);
        } catch (err) {
            setToast({ message: err.message || 'Failed to RSVP', type: 'error' });
        } finally {
            setRsvpBusy(null);
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
                        Attend local games, workshops, discussions, and neighborhood gatherings.
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
                    placeholder="🔍 Search events by title, description, circle, or full address…"
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
                        filteredEvents.map((event) => {
                            const isUpcoming = new Date(event.event_date) >= new Date();
                            const photoCount = event.photos?.length || 0;

                            return (
                                <div key={event._id || event.id} className="card card-hover-effect">
                                    <div className="card-header">
                                        <h3 className="card-title">{event.title}</h3>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <span className="badge badge-blue">{event.circle_name}</span>
                                            {isUpcoming ? (
                                                <span className="badge badge-success">🟢 Upcoming</span>
                                            ) : (
                                                <span className="badge badge-gray">🏁 Past Event</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-body">{event.description}</div>

                                    <div className="card-meta">
                                        <div className="meta-item">
                                            📅 <strong>Date & Time:</strong>{' '}
                                            {new Date(event.event_date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                                        </div>
                                        <div className="meta-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span>📍 <strong>Location:</strong> {event.location}</span>
                                            <button
                                                className="btn-link-map"
                                                onClick={() => openGoogleMaps(event.location)}
                                                title="Open location in Google Maps"
                                            >
                                                🗺️ Directions / Map
                                            </button>
                                        </div>
                                        <div className="meta-item">👤 <strong>Host:</strong> {event.creator_name}</div>
                                    </div>

                                    {/* Action Bar */}
                                    <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => setViewingEvent(event)}
                                        >
                                            View Details
                                        </button>

                                        <button
                                            className="btn btn-whatsapp btn-sm"
                                            onClick={() => shareEventWhatsApp(event)}
                                            title="Share event details via WhatsApp"
                                        >
                                            💬 Share on WhatsApp
                                        </button>

                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setGalleryEvent(event)}
                                        >
                                            📸 Photos {photoCount > 0 && <span className="photo-pill-count">{photoCount}</span>}
                                        </button>

                                        <button
                                            className={`btn btn-sm ${event.is_attending ? 'btn-success' : 'btn-outline'}`}
                                            onClick={() => handleRSVP(event._id || event.id)}
                                            disabled={rsvpBusy === (event._id || event.id)}
                                        >
                                            {rsvpBusy === (event._id || event.id) ? (
                                                <><span className="spinner" style={{ width: 14, height: 14 }} /> RSVPing…</>
                                            ) : event.is_attending ? (
                                                `✅ Attending (${event.attendees_count || 1})`
                                            ) : (
                                                `RSVP / Attend ${event.attendees_count ? `(${event.attendees_count})` : ''}`
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
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

                                <div className={`form-group ${newEvent.title.trim().length >= 3 ? 'has-success' : ''}`}>
                                    <label htmlFor="create-event-title">Event Title <span className="required-star">*</span></label>
                                    <input
                                        id="create-event-title"
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Weekend Badminton Tournament / Neighborhood Book Discussion"
                                        maxLength={80}
                                        value={newEvent.title}
                                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                        required
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="form-field-hint">Min 3 characters</span>
                                        <span className="form-char-counter">{newEvent.title.length}/80</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="create-event-date">Date &amp; Time <span className="required-star">*</span></label>
                                    <input
                                        id="create-event-date"
                                        type="datetime-local"
                                        className={`form-input ${dateError ? 'error' : ''}`}
                                        value={newEvent.event_date}
                                        min={todayMin()}
                                        onChange={handleDateChange}
                                        required
                                    />
                                    {dateError && <span className="form-field-error">⚠ {dateError}</span>}
                                    <span className="form-field-hint">Event must be scheduled in the future</span>
                                </div>

                                <div className={`form-group ${newEvent.location.trim().length >= 3 ? 'has-success' : ''}`}>
                                    <label htmlFor="create-event-location">Accurate Full Address &amp; Venue <span className="required-star">*</span></label>
                                    <input
                                        id="create-event-location"
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Downtown Sports Club, Plot 42, Jubilee Hills"
                                        value={newEvent.location}
                                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                        required
                                    />
                                    <span className="form-field-hint">Provide full address so participants can locate it on Google Maps.</span>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="create-event-desc">Description (Optional)</label>
                                    <textarea
                                        id="create-event-desc"
                                        className="form-textarea"
                                        rows="3"
                                        maxLength={500}
                                        placeholder="Details about what will take place during this meetup, workshop, or game..."
                                        value={newEvent.description}
                                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <span className="form-char-counter">{newEvent.description.length}/500</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                    <button type="button" className="btn btn-outline" onClick={() => { setShowCreateModal(false); setCreateError(''); setDateError(''); }}>
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={createLoading || !!dateError || newEvent.title.trim().length < 3 || !newEvent.event_date || newEvent.location.trim().length < 3}
                                        id="btn-publish-event-submit"
                                    >
                                        {createLoading ? <><span className="spinner" /> Publishing…</> : 'Publish Event ✨'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* 📸 Game Photo Sharing Gallery Modal */}
            {galleryEvent && (
                <div className="modal-overlay">
                    <div className="modal-content modal-large">
                        <div className="modal-header">
                            <div>
                                <h3>📸 Photo Gallery: {galleryEvent.title}</h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    Share & view game photos uploaded by event participants
                                </p>
                            </div>
                            <button className="close-btn" onClick={() => { setGalleryEvent(null); setPhotoError(''); }}>✕</button>
                        </div>

                        {/* Upload Section */}
                        <div className="gallery-upload-box">
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                                📤 Share a Game Photo
                            </h4>

                            {photoError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>⚠️ {photoError}</div>}

                            <form onSubmit={handleUploadPhoto}>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${photoUploadType === 'url' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => { setPhotoUploadType('url'); setPhotoUrlInput(''); }}
                                    >
                                        Image URL
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${photoUploadType === 'file' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => { setPhotoUploadType('file'); setPhotoUrlInput(''); }}
                                    >
                                        Upload Device File
                                    </button>
                                </div>

                                {photoUploadType === 'url' ? (
                                    <input
                                        type="url" className="form-input" style={{ marginBottom: '10px' }}
                                        placeholder="Paste image web link (e.g. https://images.unsplash.com/...)"
                                        value={photoUrlInput}
                                        onChange={(e) => setPhotoUrlInput(e.target.value)}
                                    />
                                ) : (
                                    <input
                                        type="file" accept="image/*" className="form-input" style={{ marginBottom: '10px' }}
                                        onChange={handleFileSelect}
                                    />
                                )}

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text" className="form-input" style={{ flex: 1 }}
                                        placeholder="Add a caption (e.g. Winning match point! 🎾)"
                                        value={photoCaptionInput}
                                        onChange={(e) => setPhotoCaptionInput(e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-primary" disabled={uploadingPhoto || !photoUrlInput}>
                                        {uploadingPhoto ? <><span className="spinner" /> Uploading...</> : 'Upload Photo'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Gallery Grid */}
                        <div style={{ marginTop: '20px' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                                Shared Photos ({galleryEvent.photos?.length || 0})
                            </h4>

                            {(!galleryEvent.photos || galleryEvent.photos.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📷</div>
                                    <p>No photos uploaded for this event yet.</p>
                                    <small>Be the first participant to upload a game photo above!</small>
                                </div>
                            ) : (
                                <div className="photo-gallery-grid">
                                    {galleryEvent.photos.map((photo, idx) => (
                                        <div key={idx} className="photo-card" onClick={() => setLightboxPhoto(photo)}>
                                            <div className="photo-img-wrapper">
                                                <img src={photo.url} alt={photo.caption || 'Event photo'} loading="lazy" decoding="async" />
                                                <div className="photo-overlay-zoom">🔍 Click to Expand</div>
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
                                                            const msg = `Check out this photo from ${galleryEvent.title}: ${photo.caption || ''} 📷\n\n👉 *View on CircleHub:* ${appUrl}\n\nConnect on CircleHub 🌿`;
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
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 📋 Event Details Modal */}
            {viewingEvent && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div>
                                <h3>{viewingEvent.title}</h3>
                                <span className="badge badge-blue" style={{ marginTop: 4, display: 'inline-block' }}>{viewingEvent.circle_name}</span>
                            </div>
                            <button className="close-btn" onClick={() => setViewingEvent(null)}>✕</button>
                        </div>

                        <div style={{ marginTop: 14 }}>
                            <p style={{ color: '#475569', marginBottom: 16 }}>{viewingEvent.description}</p>
                            
                            <div className="card-meta" style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 16 }}>
                                <div className="meta-item">
                                    📅 <strong>Date & Time:</strong> {new Date(viewingEvent.event_date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                                </div>
                                <div className="meta-item" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span>📍 <strong>Location:</strong> {viewingEvent.location}</span>
                                    <button className="btn-link-map" onClick={() => openGoogleMaps(viewingEvent.location)}>
                                        🗺️ Directions / Map
                                    </button>
                                </div>
                                <div className="meta-item">👤 <strong>Host:</strong> {viewingEvent.creator_name}</div>
                                <div className="meta-item">👥 <strong>Attendees:</strong> {viewingEvent.attendees_count || 1} Participant(s)</div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                                <button className="btn btn-whatsapp btn-sm" onClick={() => shareEventWhatsApp(viewingEvent)}>
                                    💬 Share on WhatsApp
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => { const ev = viewingEvent; setViewingEvent(null); setGalleryEvent(ev); }}>
                                    📸 Photo Gallery ({viewingEvent.photos?.length || 0})
                                </button>
                                <button
                                    className={`btn btn-sm ${viewingEvent.is_attending ? 'btn-success' : 'btn-outline'}`}
                                    onClick={() => handleRSVP(viewingEvent._id || viewingEvent.id)}
                                >
                                    {viewingEvent.is_attending ? '✅ Attending' : 'RSVP / Attend'}
                                </button>
                            </div>

                            {String(viewingEvent.created_by?._id || viewingEvent.created_by) === String(currentUserId) && (
                                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>⭐ You are the host of this event</span>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDeleteEvent(viewingEvent._id || viewingEvent.id)}
                                        disabled={deletingEvent}
                                    >
                                        {deletingEvent ? <><span className="spinner" style={{ borderTopColor: 'white', width: 14, height: 14 }} /> Removing…</> : '🗑️ Remove Event'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 🔍 Photo Lightbox Fullscreen Modal */}
            {lightboxPhoto && (
                <div className="lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button className="lightbox-close" onClick={() => setLightboxPhoto(null)}>✕</button>
                        <img src={lightboxPhoto.url} alt={lightboxPhoto.caption} className="lightbox-img" loading="lazy" decoding="async" />
                        <div className="lightbox-caption-bar">
                            <p style={{ fontWeight: 600, fontSize: '1rem', color: '#ffffff' }}>{lightboxPhoto.caption || 'Game Photo'}</p>
                            <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Shared by {lightboxPhoto.uploaded_by_name}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
