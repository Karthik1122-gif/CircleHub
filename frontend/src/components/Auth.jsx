import React, { useState, useEffect } from 'react';
import { api, wakeBackend } from '../api';

/* ── Helpers ─────────────────────────────────────────────── */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(pw) {
    if (!pw) return null;
    const hasUpper = /[A-Z]/.test(pw);
    const hasNum   = /\d/.test(pw);
    const hasSpec  = /[^A-Za-z0-9]/.test(pw);
    const long     = pw.length >= 10;
    const score    = [pw.length >= 6, hasUpper, hasNum, hasSpec, long].filter(Boolean).length;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
}

/* ── Component ───────────────────────────────────────────── */
export default function Auth({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '', email: '', password: '',
        location: 'Downtown Heights', bio: '', interests: '', skills: ''
    });
    const [touched, setTouched] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);
    const [successFlash, setSuccessFlash] = useState(false);
    const [serverReady, setServerReady]   = useState(false);
    const [warming, setWarming]           = useState(true);

    /* Pre-warm backend */
    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 12;

        const checkServer = async () => {
            try {
                const res = await fetch(
                    (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
                        .replace('/api', '') + '/ping'
                );
                if (res.ok) { setServerReady(true); setWarming(false); return; }
            } catch {}

            attempts++;
            if (attempts < maxAttempts) setTimeout(checkServer, 5000);
            else setWarming(false);
        };

        wakeBackend();
        setTimeout(checkServer, 2000);
    }, []);

    /* ── Validation ─────────────────────────────────────── */
    const validate = {
        name:     v => v.trim().length >= 2   ? '' : 'Name must be at least 2 characters',
        email:    v => emailRegex.test(v)      ? '' : 'Enter a valid email address',
        password: v => v.length >= 6           ? '' : 'Password must be at least 6 characters',
    };

    const fieldError = (field) => {
        if (!touched[field]) return '';
        return validate[field] ? validate[field](formData[field]) : '';
    };

    const isFieldValid = (field) => {
        if (!validate[field]) return true;
        return validate[field](formData[field]) === '';
    };

    const requiredFieldsOk = isLogin
        ? isFieldValid('email') && isFieldValid('password')
        : isFieldValid('name') && isFieldValid('email') && isFieldValid('password');

    /* ── Handlers ───────────────────────────────────────── */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleBlur = (e) => {
        setTouched(prev => ({ ...prev, [e.target.name]: true }));
    };

    const switchMode = (login) => {
        setIsLogin(login);
        setError('');
        setTouched({});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        // Mark all required fields touched
        const fields = isLogin ? ['email', 'password'] : ['name', 'email', 'password'];
        setTouched(prev => ({ ...prev, ...Object.fromEntries(fields.map(f => [f, true])) }));
        if (!requiredFieldsOk) return;

        setLoading(true);
        try {
            if (isLogin) {
                const res = await api.login({ email: formData.email, password: formData.password });
                setSuccessFlash(true);
                setTimeout(() => onLoginSuccess(res.user), 600);
            } else {
                const res = await api.register(formData);
                onLoginSuccess(res.user);
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /* ── Field status icon ──────────────────────────────── */
    const FieldIcon = ({ field }) => {
        if (!touched[field] || !validate[field]) return null;
        const err = validate[field](formData[field]);
        return (
            <span className="input-icon-right" style={{ pointerEvents: 'none' }}>
                {err ? '❌' : '✅'}
            </span>
        );
    };

    /* ── Password strength ──────────────────────────────── */
    const strength = getPasswordStrength(formData.password);

    return (
        <div className={`auth-wrapper ${successFlash ? 'success-flash' : ''}`}>
            <div className="auth-header">
                <h2>{isLogin ? 'Welcome Back! 👋' : 'Join CircleHub 🌿'}</h2>
                <p>
                    {isLogin
                        ? 'Connect with your hyper-local neighborhood community'
                        : 'Create your account to join nearby interest circles'}
                </p>
            </div>

            {/* Server warm-up banner */}
            {warming && !serverReady && (
                <div style={{
                    background: '#fffbeb', border: '1px solid #f59e0b',
                    borderRadius: '8px', padding: '10px 14px',
                    marginBottom: '16px', fontSize: '0.85rem', color: '#92400e',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                    <span><strong>Waking up server…</strong> This takes ~15 seconds on first load. Please wait.</span>
                </div>
            )}

            {serverReady && (
                <div style={{
                    background: '#f0fdf4', border: '1px solid #22c55e',
                    borderRadius: '8px', padding: '10px 14px',
                    marginBottom: '16px', fontSize: '0.85rem', color: '#166534',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    ✅ <span><strong>Server is ready!</strong> You can sign in now.</span>
                </div>
            )}

            {error && <div className="alert alert-danger">⚠️ {error}</div>}

            <form onSubmit={handleSubmit} noValidate>

                {/* ── Name (register only) ── */}
                {!isLogin && (
                    <div className="form-group">
                        <label>
                            Full Name <span className="required-star">*</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="text" name="name" className={`form-input ${fieldError('name') ? 'error' : touched.name && isFieldValid('name') ? 'valid' : ''}`}
                                placeholder="e.g. Sarah Jenkins"
                                value={formData.name} onChange={handleChange} onBlur={handleBlur}
                            />
                            <FieldIcon field="name" />
                        </div>
                        {fieldError('name')
                            ? <span className="field-error">⚠ {fieldError('name')}</span>
                            : <span className="form-hint">At least 2 characters required</span>}
                    </div>
                )}

                {/* ── Email ── */}
                <div className="form-group">
                    <label>
                        Email Address <span className="required-star">*</span>
                    </label>
                    <div className="input-wrapper">
                        <input
                            type="email" name="email" className={`form-input ${fieldError('email') ? 'error' : touched.email && isFieldValid('email') ? 'valid' : ''}`}
                            placeholder="name@example.com"
                            value={formData.email} onChange={handleChange} onBlur={handleBlur}
                        />
                        <FieldIcon field="email" />
                    </div>
                    {fieldError('email')
                        ? <span className="field-error">⚠ {fieldError('email')}</span>
                        : <span className="form-hint">Use a valid email address</span>}
                </div>

                {/* ── Password ── */}
                <div className="form-group">
                    <label>
                        Password <span className="required-star">*</span>
                    </label>
                    <div className="input-wrapper">
                        <input
                            type={showPassword ? 'text' : 'password'} name="password"
                            className={`form-input ${fieldError('password') ? 'error' : touched.password && isFieldValid('password') ? 'valid' : ''}`}
                            placeholder="••••••••"
                            value={formData.password} onChange={handleChange} onBlur={handleBlur}
                            style={{ paddingRight: '72px' }}
                        />
                        <button
                            type="button" className="input-toggle-btn"
                            onClick={() => setShowPassword(v => !v)}
                            tabIndex={-1}
                        >
                            {showPassword ? '🙈 Hide' : '👁 Show'}
                        </button>
                    </div>
                    {fieldError('password')
                        ? <span className="field-error">⚠ {fieldError('password')}</span>
                        : <span className="form-hint">Minimum 6 characters</span>}

                    {/* Password strength */}
                    {formData.password && (
                        <div className="pw-strength">
                            <div className="pw-strength-bar">
                                <div className={`pw-strength-fill ${strength}`} />
                            </div>
                            <span className={`pw-strength-label ${strength}`}>
                                {strength === 'weak' ? '🔴 Weak' : strength === 'medium' ? '🟡 Medium' : '🟢 Strong'}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Optional fields (register only) ── */}
                {!isLogin && (
                    <>
                        <div className="form-group">
                            <label>
                                Neighborhood / Location
                                <span className="optional-tag">(Optional)</span>
                            </label>
                            <input
                                type="text" name="location" className="form-input"
                                placeholder="e.g. Downtown Heights"
                                value={formData.location} onChange={handleChange}
                            />
                            <span className="form-hint">Your local neighborhood or city area</span>
                        </div>

                        <div className="form-group">
                            <label>
                                Short Bio
                                <span className="optional-tag">(Optional)</span>
                            </label>
                            <textarea
                                name="bio" className="form-textarea" rows="2"
                                placeholder="Share a few words about yourself…"
                                value={formData.bio} onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                Interests
                                <span className="optional-tag">(Optional)</span>
                            </label>
                            <input
                                type="text" name="interests" className="form-input"
                                placeholder="Reading, Gardening, Tech"
                                value={formData.interests} onChange={handleChange}
                            />
                            <span className="form-hint">Comma-separated list of your interests</span>
                        </div>

                        <div className="form-group">
                            <label>
                                Skills to Share
                                <span className="optional-tag">(Optional)</span>
                            </label>
                            <input
                                type="text" name="skills" className="form-input"
                                placeholder="Yoga, Coding, Cooking"
                                value={formData.skills} onChange={handleChange}
                            />
                            <span className="form-hint">Comma-separated list of skills you can offer</span>
                        </div>
                    </>
                )}

                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '4px' }}
                    disabled={loading || !requiredFieldsOk}
                >
                    {loading
                        ? <><span className="spinner" /> {isLogin ? 'Signing in…' : 'Creating account…'}</>
                        : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
            </form>

            <div className="auth-toggle">
                {isLogin ? (
                    <p>
                        Don't have an account?{' '}
                        <span onClick={() => switchMode(false)}>Register Now</span>
                    </p>
                ) : (
                    <p>
                        Already have an account?{' '}
                        <span onClick={() => switchMode(true)}>Sign In</span>
                    </p>
                )}
            </div>

            <div style={{
                marginTop: '20px', padding: '12px', background: '#f8fafc',
                borderRadius: '8px', fontSize: '0.82rem', color: '#64748b'
            }}>
                <strong>💡 Quick Demo Login:</strong><br />
                Email: <code>alex@example.com</code> | Password: <code>password123</code>
            </div>
        </div>
    );
}
