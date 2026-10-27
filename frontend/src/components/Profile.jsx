import React, { useState, useEffect } from 'react';
import { api } from '../api';

/* ── Avatar gradient by first letter ─────────────────────── */
const AVATAR_COLORS = [
    'linear-gradient(135deg,#10b981,#047857)',
    'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    'linear-gradient(135deg,#ef4444,#b91c1c)',
    'linear-gradient(135deg,#ec4899,#be185d)',
];

function avatarGradient(name = '') {
    const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
}

/* ── Component ───────────────────────────────────────────── */
export default function Profile({ currentUser, onUserUpdated }) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name:          currentUser.name          || '',
        location:      currentUser.location      || '',
        bio:           currentUser.bio           || '',
        interests:     currentUser.interests     || '',
        skills:        currentUser.skills        || '',
        phone:         currentUser.phone         || '',
        phone_privacy: currentUser.phone_privacy || 'Circle Members',
        avatar:        currentUser.avatar        || ''
    });
    const [message, setMessage] = useState('');
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);

    const currentUserId = currentUser._id || currentUser.id;

    // Keep form data in sync if currentUser prop updates
    useEffect(() => {
        setFormData({
            name:          currentUser.name          || '',
            location:      currentUser.location      || '',
            bio:           currentUser.bio           || '',
            interests:     currentUser.interests     || '',
            skills:        currentUser.skills        || '',
            phone:         currentUser.phone         || '',
            phone_privacy: currentUser.phone_privacy || 'Circle Members',
            avatar:        currentUser.avatar        || ''
        });
    }, [currentUser]);

    // Auto-dismiss success message after 3 s
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(''), 3000);
        return () => clearTimeout(t);
    }, [message]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Client-side image compression helper
    const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) => {
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

    const handleAvatarFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            setError('Image file size must be less than 20MB.');
            return;
        }
        setError('');
        try {
            const compressed = await compressImage(file);
            setFormData(prev => ({ ...prev, avatar: compressed }));
        } catch (err) {
            setError('Failed to process avatar image.');
        }
    };

    const handleRemoveAvatar = () => {
        setFormData(prev => ({ ...prev, avatar: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        const trimmedName = formData.name.trim();
        if (!trimmedName || trimmedName.length < 2) { setError('Name must be at least 2 characters long.'); return; }
        if (formData.phone && formData.phone.trim() && !/^[0-9+()\- ]{7,20}$/.test(formData.phone.trim())) {
            setError('Please enter a valid phone number format (digits, plus sign, hyphens) or leave blank.');
            return;
        }
        if (formData.bio && formData.bio.length > 300) {
            setError('Bio cannot exceed 300 characters.');
            return;
        }
        setLoading(true);

        try {
            const res = await api.updateUserProfile(currentUserId, formData);
            setMessage('Profile updated successfully! ✅');
            onUserUpdated(res.user);
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Error updating profile.');
        } finally {
            setLoading(false);
        }
    };

    const memberSince = currentUser.createdAt
        ? new Date(currentUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
        : null;

    const privacyLabelMap = {
        'Everyone': '🌐 Visible to Everyone',
        'Circle Members': '👥 Visible to Circle Members Only',
        'Nobody': '🔒 Private (Only You)'
    };

    return (
        <div className="page-enter" style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div className="page-header">
                <h2 className="page-title">My Profile</h2>
                {!isEditing && (
                    <button className="btn btn-outline" onClick={() => setIsEditing(true)}>
                        ✏️ Edit Profile
                    </button>
                )}
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error   && <div className="alert alert-danger">⚠️ {error}</div>}

            <div className="card">
                {isEditing ? (
                    <form onSubmit={handleSubmit}>
                        {/* 📸 Profile Photo Upload / Remove Section */}
                        <div className="form-group" style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                            <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Profile Photo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #10b981', flexShrink: 0, background: avatarGradient(formData.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '1.8rem', fontWeight: 700 }}>
                                    {formData.avatar ? (
                                        <img src={formData.avatar} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async" />
                                    ) : (
                                        formData.name ? formData.name.charAt(0).toUpperCase() : 'U'
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                                            📷 Choose Photo
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarFileSelect}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                        {formData.avatar && (
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={handleRemoveAvatar}
                                            >
                                                🗑️ Remove Photo
                                            </button>
                                        )}
                                    </div>
                                    <span className="form-hint" style={{ marginTop: '4px' }}>
                                        Upload a profile photo or keep the gradient initials avatar.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Full Name */}
                        <div className="form-group">
                            <label>Full Name <span className="required-star">*</span></label>
                            <input
                                type="text" name="name" className="form-input"
                                value={formData.name} onChange={handleChange}
                                placeholder="Your full name"
                            />
                            <span className="form-hint">This will be displayed across the app</span>
                        </div>

                        {/* Mobile Number & Privacy Dropdown */}
                        <div className="form-group" style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                            <label style={{ fontWeight: 600, color: '#0f172a' }}>📱 Mobile / Phone Number</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '6px' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Phone Number</label>
                                    <input
                                        type="tel" name="phone" className="form-input"
                                        value={formData.phone} onChange={handleChange}
                                        placeholder="e.g. +1 234 567 8900"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Who can see your number?</label>
                                    <select
                                        name="phone_privacy" className="form-select"
                                        value={formData.phone_privacy} onChange={handleChange}
                                    >
                                        <option value="Everyone">Everyone</option>
                                        <option value="Circle Members">Circle Members Only</option>
                                        <option value="Nobody">Nobody (Private)</option>
                                    </select>
                                </div>
                            </div>
                            <span className="form-hint" style={{ marginTop: '6px', display: 'block' }}>
                                Control who can view your mobile number on CircleHub.
                            </span>
                        </div>

                        {/* Location */}
                        <div className="form-group">
                            <label>Neighborhood / Location</label>
                            <input
                                type="text" name="location" className="form-input"
                                value={formData.location} onChange={handleChange}
                                placeholder="e.g. Downtown Heights"
                            />
                            <span className="form-hint">Your local area or neighborhood</span>
                        </div>

                        {/* Bio */}
                        <div className="form-group">
                            <label>Bio</label>
                            <textarea
                                name="bio" className="form-textarea" rows="3"
                                value={formData.bio} onChange={handleChange}
                                placeholder="Tell the community a little about yourself…"
                            />
                        </div>

                        {/* Interests */}
                        <div className="form-group">
                            <label>Interests</label>
                            <input
                                type="text" name="interests" className="form-input"
                                value={formData.interests} onChange={handleChange}
                                placeholder="Reading, Gardening, Tech"
                            />
                            <span className="form-hint">Comma-separated list of your interests</span>
                        </div>

                        {/* Skills */}
                        <div className="form-group">
                            <label>Skills to Share</label>
                            <input
                                type="text" name="skills" className="form-input"
                                value={formData.skills} onChange={handleChange}
                                placeholder="Yoga, Coding, Cooking"
                            />
                            <span className="form-hint">Comma-separated skills you can share with the community</span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                type="button" className="btn btn-outline"
                                onClick={() => { setIsEditing(false); setError(''); }}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        {/* Avatar + basic info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                            <div
                                className="profile-avatar"
                                style={{
                                    width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden',
                                    background: avatarGradient(currentUser.name), display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', color: '#ffffff',
                                    fontSize: '2rem', fontWeight: 700, border: '2px solid #10b981'
                                }}
                            >
                                {currentUser.avatar ? (
                                    <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async" />
                                ) : (
                                    currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'
                                )}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{currentUser.name}</h3>
                                <p style={{ color: '#64748b' }}>✉️ {currentUser.email}</p>
                                {currentUser.phone && (
                                    <p style={{ color: '#0f172a', fontSize: '0.92rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📱 <strong>{currentUser.phone}</strong>
                                        <span className="badge badge-emerald" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                                            {privacyLabelMap[currentUser.phone_privacy] || currentUser.phone_privacy}
                                        </span>
                                    </p>
                                )}
                                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '2px' }}>
                                    📍 {currentUser.location || 'Urban Neighborhood'}
                                </p>
                                {memberSince && (
                                    <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 2 }}>
                                        🗓 Member since {memberSince}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Detail sections */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                            <div>
                                <strong style={{ color: '#0f172a' }}>About / Bio:</strong>
                                <p style={{ color: '#475569', marginTop: '4px' }}>
                                    {currentUser.bio || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No bio added yet. Click Edit Profile to add one.</span>}
                                </p>
                            </div>

                            <div>
                                <strong style={{ color: '#0f172a' }}>Interests:</strong>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {(currentUser.interests || 'Community, Events')
                                        .split(',')
                                        .map((item, idx) => (
                                            <span key={idx} className="badge badge-emerald">{item.trim()}</span>
                                        ))}
                                </div>
                            </div>

                            <div>
                                <strong style={{ color: '#0f172a' }}>Skills to Share:</strong>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                    {(currentUser.skills || 'Networking')
                                        .split(',')
                                        .map((item, idx) => (
                                            <span key={idx} className="badge badge-blue">{item.trim()}</span>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
