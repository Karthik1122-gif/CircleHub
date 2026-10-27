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

/* ── Component ───────────────────────────────────────────── */
export default function Circles({ currentUser, onStatsChange }) {
    const [circles, setCircles]             = useState([]);
    const [searchTerm, setSearchTerm]       = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState('');
    const [actionError, setActionError]     = useState('');
    const [toast, setToast]                 = useState(null);   // { message, type }
    const [busyCircle, setBusyCircle]       = useState(null);   // circleId being processed

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCircle, setNewCircle] = useState({
        name: '', description: '', category: 'Hobbies',
        location: currentUser.location || 'Downtown Heights'
    });
    const [createError, setCreateError]   = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // View modal
    const [viewingCircle, setViewingCircle]   = useState(null);
    const [circleMembers, setCircleMembers]   = useState([]);

    // Resources state inside View Circle Details modal
    const [circleResources, setCircleResources]     = useState([]);
    const [loadingResources, setLoadingResources]   = useState(false);
    const [showAddResource, setShowAddResource]     = useState(false);
    const [newResource, setNewResource]             = useState({ title: '', url: '', file_type: 'file', file_name: '' });
    const [uploadingResource, setUploadingResource] = useState(false);
    const [resourceError, setResourceError]         = useState('');

    const currentUserId = currentUser._id || currentUser.id;

    useEffect(() => { fetchCircles(); }, [currentUser]);

    const fetchCircles = async (isBackground = false) => {
        if (!isBackground && circles.length === 0) setLoading(true);
        setError('');
        try {
            const data = await api.getCircles(currentUserId);
            setCircles(data);
        } catch (err) {
            if (!isBackground) setError(err.message || 'Failed to fetch circles.');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleJoin = async (circleId) => {
        setBusyCircle(circleId);
        setActionError('');
        try {
            await api.joinCircle(circleId, currentUserId);
            showToast('Successfully joined the circle! 🎉');
            onStatsChange?.();
            fetchCircles();
        } catch (err) {
            setActionError(err.message || 'Error joining circle');
        } finally {
            setBusyCircle(null);
        }
    };

    const handleLeave = async (circleId) => {
        setBusyCircle(circleId);
        setActionError('');
        try {
            await api.leaveCircle(circleId, currentUserId);
            showToast('You have left the circle.', 'info');
            onStatsChange?.();
            fetchCircles();
        } catch (err) {
            setActionError(err.message || 'Error leaving circle');
        } finally {
            setBusyCircle(null);
        }
    };

    const handleCreateCircle = async (e) => {
        e.preventDefault();
        setCreateError('');
        const trimmedName = newCircle.name.trim();
        const trimmedDesc = newCircle.description.trim();
        const trimmedLoc = newCircle.location.trim();

        if (!trimmedName || trimmedName.length < 3) {
            setCreateError('Circle name must be at least 3 characters long.');
            return;
        }
        if (trimmedName.length > 60) {
            setCreateError('Circle name cannot exceed 60 characters.');
            return;
        }
        if (!trimmedLoc || trimmedLoc.length < 2) {
            setCreateError('Please specify a valid neighborhood location.');
            return;
        }
        if (!trimmedDesc || trimmedDesc.length < 10) {
            setCreateError('Description must be at least 10 characters long to help neighbors understand your circle.');
            return;
        }

        setCreateLoading(true);
        try {
            await api.createCircle({ ...newCircle, name: trimmedName, description: trimmedDesc, location: trimmedLoc, created_by: currentUserId });
            setShowCreateModal(false);
            setNewCircle({ name: '', description: '', category: 'Hobbies', location: currentUser.location || 'Downtown Heights' });
            showToast('Circle created successfully! 🌟');
            onStatsChange?.();
            fetchCircles();
        } catch (err) {
            setCreateError(err.message || 'Error creating circle');
        } finally {
            setCreateLoading(false);
        }
    };

    const [deletingCircle, setDeletingCircle] = useState(false);

    const handleDeleteCircle = async (circleId) => {
        if (!window.confirm('Are you sure you want to remove this circle? This will also remove any associated events.')) return;
        setDeletingCircle(true);
        setActionError('');
        try {
            await api.deleteCircle(circleId, currentUserId);
            showToast('Circle removed successfully.', 'info');
            setViewingCircle(null);
            onStatsChange?.();
            fetchCircles();
        } catch (err) {
            setActionError(err.message || 'Failed to remove circle');
        } finally {
            setDeletingCircle(false);
        }
    };

    const openCircleDetails = async (circle) => {
        setViewingCircle(circle);
        setCircleMembers([]);
        setCircleResources(circle.resources || []);
        setShowAddResource(false);
        setResourceError('');
        setNewResource({ title: '', url: '', file_type: 'file', file_name: '' });

        const cId = circle._id || circle.id;
        try {
            const members = await api.getCircleMembers(cId);
            setCircleMembers(members);
        } catch (err) {
            console.error('Error fetching members:', err);
        }

        setLoadingResources(true);
        try {
            const resources = await api.getCircleResources(cId);
            setCircleResources(resources || []);
        } catch (err) {
            console.error('Error fetching resources:', err);
        } finally {
            setLoadingResources(false);
        }
    };

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

    const handleResourceFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
            setResourceError('File size must be less than 25MB.');
            return;
        }
        setResourceError('');
        const fileName = file.name;
        let fileType = 'file';
        if (file.type.startsWith('image/')) {
            fileType = 'image';
        } else if (fileName.endsWith('.pdf')) {
            fileType = 'pdf';
        } else if (fileName.match(/\.(doc|docx|txt|rtf|xls|xlsx|csv|ppt|pptx)$/i)) {
            fileType = 'document';
        }

        const autoTitle = newResource.title.trim() || fileName.replace(/\.[^/.]+$/, '');

        try {
            const dataUrl = await compressImage(file);
            setNewResource({
                title: autoTitle,
                url: dataUrl,
                file_type: fileType,
                file_name: fileName
            });
        } catch (err) {
            setResourceError('Failed to process file.');
        }
    };

    const handleUploadResource = async (e) => {
        e.preventDefault();
        setResourceError('');
        if (!newResource.title.trim()) {
            setResourceError('Please provide a title for the resource.');
            return;
        }
        if (!newResource.url.trim()) {
            setResourceError('Please choose a file/photo or provide a file URL.');
            return;
        }

        setUploadingResource(true);
        const cId = viewingCircle._id || viewingCircle.id;
        try {
            const res = await api.uploadCircleResource(cId, {
                title: newResource.title.trim(),
                url: newResource.url.trim(),
                file_type: newResource.file_type || 'file',
                file_name: newResource.file_name || 'shared-resource',
                uploaded_by_name: currentUser.name || 'Community Member'
            });

            const updatedList = res.resources || [];
            setCircleResources(updatedList);
            setNewResource({ title: '', url: '', file_type: 'file', file_name: '' });
            setShowAddResource(false);
            showToast('Resource shared with circle members! 📁', 'success');

            setCircles(prev => prev.map(c => (c._id || c.id) === cId ? { ...c, resources: updatedList } : c));
        } catch (err) {
            setResourceError(err.message || 'Failed to upload resource.');
        } finally {
            setUploadingResource(false);
        }
    };

    const handleDeleteResource = async (resourceId) => {
        if (!window.confirm('Are you sure you want to remove this resource?')) return;
        const cId = viewingCircle._id || viewingCircle.id;
        try {
            const res = await api.deleteCircleResource(cId, resourceId);
            const updatedList = res.resources || [];
            setCircleResources(updatedList);
            showToast('Resource removed.', 'info');
            setCircles(prev => prev.map(c => (c._id || c.id) === cId ? { ...c, resources: updatedList } : c));
        } catch (err) {
            showToast(err.message || 'Failed to delete resource.', 'error');
        }
    };

    const downloadResource = async (url, fileName) => {
        if (!url) return;
        const name = fileName || 'circle-resource';
        if (url.startsWith('data:')) {
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const filteredCircles = circles.filter(c => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (c.name || '').toLowerCase().includes(term) ||
            (c.description || '').toLowerCase().includes(term) ||
            (c.location || '').toLowerCase().includes(term);
        const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Interest Circles</h2>
                    <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                        Discover, join, or create hyper-local communities in your area.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Create New Circle
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {actionError && <div className="alert alert-danger">⚠️ {actionError}</div>}

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <input
                    type="text" className="form-input"
                    placeholder="🔍 Search circles by name, description, or location…"
                    style={{ flex: 1, minWidth: '240px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="form-select" style={{ width: '180px' }}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="All">All Categories</option>
                    <option value="Hobbies">Hobbies</option>
                    <option value="Environment">Environment</option>
                    <option value="Technology">Technology</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Arts">Arts & Culture</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            {loading ? <SkeletonCards /> : (
                <div className="grid-cards">
                    {filteredCircles.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-emoji">🔍</div>
                            <p>No circles found matching your criteria.</p>
                            <small>Try adjusting your search or category filter!</small>
                        </div>
                    ) : (
                        filteredCircles.map((circle) => {
                            const cId = circle._id || circle.id;
                            const createdBy = circle.created_by?._id || circle.created_by;
                            const isOwner = String(createdBy) === String(currentUserId);
                            const isBusy = busyCircle === cId;

                            return (
                                <div key={cId} className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">{circle.name}</h3>
                                        <span className="badge badge-emerald">{circle.category}</span>
                                    </div>

                                    <div className="card-body">{circle.description}</div>

                                    <div className="card-meta">
                                        <div className="meta-item">📍 {circle.location}</div>
                                        <div className="meta-item">👥 {circle.member_count} Members</div>
                                        <div className="meta-item">👤 Created by {circle.creator_name || 'Community Member'}</div>
                                    </div>

                                    <div className="card-footer">
                                        <button className="btn btn-outline btn-sm" onClick={() => openCircleDetails(circle)}>
                                            View Details
                                        </button>

                                        <button
                                            className="btn btn-whatsapp btn-sm"
                                            onClick={() => {
                                                const appUrl = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost'))
                                                    ? window.location.origin
                                                    : 'https://frontend-seven-black-12.vercel.app';
                                                const text = `🌐 *Join CircleHub Community: ${circle.name}*\n🏷️ Category: ${circle.category}\n📍 Location: ${circle.location}\n📝 ${circle.description}\n\n👉 *Direct Link to Join Circle:* ${appUrl}\n\nConnect with members in our neighborhood on CircleHub! 🌿`;
                                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
                                            }}
                                            title="Share circle on WhatsApp"
                                        >
                                            💬 Share
                                        </button>

                                        {isOwner ? (
                                            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>⭐ Your Circle</span>
                                        ) : circle.is_member ? (
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleLeave(cId)}
                                                disabled={isBusy}
                                            >
                                                {isBusy ? <><span className="spinner" style={{ borderTopColor: 'white', width: 14, height: 14 }} /> Leaving…</> : 'Leave Circle'}
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleJoin(cId)}
                                                disabled={isBusy}
                                            >
                                                {isBusy ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Joining…</> : 'Join Circle'}
                                            </button>
                                        )}
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

            {/* Create Circle Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Create a New Interest Circle</h3>
                            <button className="close-btn" onClick={() => { setShowCreateModal(false); setCreateError(''); }}>✕</button>
                        </div>

                        {createError && <div className="alert alert-danger">⚠️ {createError}</div>}

                        <form onSubmit={handleCreateCircle}>
                            <div className={`form-group ${newCircle.name.trim().length >= 3 ? 'has-success' : ''}`}>
                                <label htmlFor="create-circle-name">Circle Name <span className="required-star">*</span></label>
                                <input
                                    id="create-circle-name"
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Neighborhood Book Club, Gardeners Guild"
                                    maxLength={60}
                                    value={newCircle.name}
                                    onChange={(e) => setNewCircle({ ...newCircle, name: e.target.value })}
                                    required
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="form-field-hint">Min 3 characters</span>
                                    <span className="form-char-counter">{newCircle.name.length}/60</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="create-circle-category">Category</label>
                                <select
                                    id="create-circle-category"
                                    className="form-select"
                                    value={newCircle.category}
                                    onChange={(e) => setNewCircle({ ...newCircle, category: e.target.value })}
                                >
                                    <option value="Hobbies">Hobbies</option>
                                    <option value="Environment">Environment</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Fitness">Fitness</option>
                                    <option value="Arts">Arts &amp; Culture</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="create-circle-loc">Neighborhood / Location <span className="required-star">*</span></label>
                                <input
                                    id="create-circle-loc"
                                    type="text"
                                    className="form-input"
                                    value={newCircle.location}
                                    onChange={(e) => setNewCircle({ ...newCircle, location: e.target.value })}
                                    required
                                />
                                <span className="form-field-hint">Where does your circle gather?</span>
                            </div>

                            <div className={`form-group ${newCircle.description.trim().length >= 10 ? 'has-success' : ''}`}>
                                <label htmlFor="create-circle-desc">Description <span className="required-star">*</span></label>
                                <textarea
                                    id="create-circle-desc"
                                    className="form-textarea"
                                    rows="3"
                                    maxLength={500}
                                    placeholder="What is this circle about? Who should join? What activities are planned?"
                                    value={newCircle.description}
                                    onChange={(e) => setNewCircle({ ...newCircle, description: e.target.value })}
                                    required
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="form-field-hint">Min 10 characters</span>
                                    <span className="form-char-counter">{newCircle.description.length}/500</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => { setShowCreateModal(false); setCreateError(''); }}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={createLoading || newCircle.name.trim().length < 3 || newCircle.description.trim().length < 10}
                                    id="btn-submit-create-circle"
                                >
                                    {createLoading ? <><span className="spinner" /> Creating…</> : 'Create Circle ✨'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Circle Details Modal */}
            {viewingCircle && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{viewingCircle.name}</h3>
                            <button className="close-btn" onClick={() => setViewingCircle(null)}>✕</button>
                        </div>
                        <div>
                            <span className="badge badge-emerald" style={{ marginBottom: '12px', display: 'inline-block' }}>
                                {viewingCircle.category}
                            </span>
                            <p style={{ color: '#475569', margin: '10px 0' }}>{viewingCircle.description}</p>
                            <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '16px' }}>
                                📍 <strong>Location:</strong> {viewingCircle.location}<br />
                                👤 <strong>Created By:</strong> {viewingCircle.creator_name}
                            </div>

                            {/* 📁 Circle Shared Resources & Files */}
                            <div className="resources-section" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                    <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>
                                        📁 Shared Resources & Photos ({circleResources.length})
                                    </h4>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => { setShowAddResource(!showAddResource); setResourceError(''); }}
                                        style={{ fontSize: '0.82rem', padding: '4px 10px' }}
                                    >
                                        {showAddResource ? '✕ Cancel' : '+ Share File / Photo'}
                                    </button>
                                </div>

                                {/* Resource Upload Form */}
                                {showAddResource && (
                                    <form onSubmit={handleUploadResource} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                                        {resourceError && <div className="alert alert-danger" style={{ fontSize: '0.82rem', padding: '6px 10px', marginBottom: '10px' }}>⚠️ {resourceError}</div>}
                                        
                                        <div className="form-group" style={{ marginBottom: '10px' }}>
                                            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Resource Title / Caption *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. Presentation Deck, Event Photo, Guidelines"
                                                value={newResource.title}
                                                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '10px' }}>
                                            <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Choose File or Photo from Device</label>
                                            <input
                                                type="file"
                                                className="form-input"
                                                onChange={handleResourceFileSelect}
                                                accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar,.ppt,.pptx,.xls,.xlsx"
                                            />
                                        </div>

                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 10px', textAlign: 'center' }}>— OR enter File / Image URL —</div>

                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                            <input
                                                type="url"
                                                className="form-input"
                                                placeholder="https://example.com/document.pdf or image link"
                                                value={newResource.url.startsWith('data:') ? '' : newResource.url}
                                                onChange={(e) => setNewResource({ ...newResource, url: e.target.value, file_name: newResource.file_name || 'external-resource' })}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddResource(false)}>Cancel</button>
                                            <button type="submit" className="btn btn-primary btn-sm" disabled={uploadingResource}>
                                                {uploadingResource ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Uploading…</> : '📤 Share Resource'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Resources List */}
                                {loadingResources ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.88rem' }}>Loading resources…</p>
                                ) : circleResources.length === 0 ? (
                                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem', border: '1px dashed #cbd5e1' }}>
                                        📁 No shared files or photos yet.<br />
                                        <small style={{ color: '#64748b' }}>Be the first to share a file or photo with circle members!</small>
                                    </div>
                                ) : (
                                    <div className="resources-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {circleResources.map((res, index) => {
                                            const isImage = res.file_type === 'image' || res.url?.startsWith('data:image/') || res.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)/i);
                                            const isPdf = res.file_type === 'pdf' || res.file_name?.endsWith('.pdf');
                                            const isDoc = res.file_type === 'document' || res.file_name?.match(/\.(doc|docx|txt)/i);
                                            const icon = isImage ? '🖼️' : isPdf ? '📄' : isDoc ? '📝' : '📁';

                                            return (
                                                <div key={res._id || index} className="resource-item-card" style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                                                    {isImage ? (
                                                        <img
                                                            src={res.url}
                                                            alt={res.title}
                                                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                            loading="lazy"
                                                            decoding="async"
                                                        />
                                                    ) : (
                                                        <div style={{ width: '48px', height: '48px', background: '#ecfdf5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                                                            {icon}
                                                        </div>
                                                    )}

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {res.title}
                                                        </div>
                                                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                                            👤 {res.uploaded_by_name} • {new Date(res.created_at || Date.now()).toLocaleDateString()}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button
                                                            className="btn btn-outline btn-sm"
                                                            onClick={() => downloadResource(res.url, res.file_name || `${res.title.replace(/\s+/g, '_')}`)}
                                                            title="Download file or photo"
                                                            style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#059669', borderColor: '#10b981' }}
                                                        >
                                                            ⬇️ Download
                                                        </button>
                                                        {(res.uploaded_by_name === currentUser.name || String(viewingCircle.created_by?._id || viewingCircle.created_by) === String(currentUserId)) && (
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleDeleteResource(res._id)}
                                                                title="Delete resource"
                                                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <h4 style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '16px' }}>
                                Members ({circleMembers.length})
                            </h4>
                            {circleMembers.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: 8 }}>Loading members…</p>
                            ) : (
                                <ul className="member-list">
                                    {circleMembers.map(m => {
                                        const isSelf = String(m._id || m.id) === String(currentUserId);
                                        const canSeePhone = m.phone && (
                                            m.phone_privacy === 'Everyone' ||
                                            m.phone_privacy === 'Circle Members' ||
                                            isSelf
                                        );

                                        return (
                                            <li key={m._id || m.id} className="member-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                <div className="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700 }}>
                                                    {m.avatar ? (
                                                        <img
                                                            src={m.avatar}
                                                            alt={m.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            loading="lazy"
                                                            decoding="async"
                                                        />
                                                    ) : (
                                                        m.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                                        {m.name} {isSelf && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>(You)</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <span>📍 {m.location || 'Member'}</span>
                                                        {canSeePhone && (
                                                            <span style={{ color: '#059669', fontWeight: 500 }}>
                                                                📱 {m.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {String(viewingCircle.created_by?._id || viewingCircle.created_by) === String(currentUserId) && (
                            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>⭐ You are the host of this circle</span>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDeleteCircle(viewingCircle._id || viewingCircle.id)}
                                    disabled={deletingCircle}
                                >
                                    {deletingCircle ? <><span className="spinner" style={{ borderTopColor: 'white', width: 14, height: 14 }} /> Removing…</> : '🗑️ Remove Circle'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
