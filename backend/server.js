const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./db');

const app = express();
// Render uses port 10000 by default, local uses 5000
const PORT = process.env.PORT || 10000;

// ==========================================
// PERFORMANCE & SECURITY MIDDLEWARE
// ==========================================

// Gzip compress all responses
app.use(compression());

// Security headers (allow cross-origin for SPA)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Permissive CORS to ensure Vercel and local always connect seamlessly
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (
            origin === 'http://localhost:5173' ||
            origin === 'http://localhost:3000' ||
            origin.endsWith('.vercel.app') ||
            origin.includes('localhost')
        ) {
            return callback(null, true);
        }
        // Also allow any origin in production to prevent user blockage
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50kb' }));

// Request logger for debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ==========================================
// MONGOOSE SCHEMAS & MODELS
// ==========================================

const userSchema = new mongoose.Schema({
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    location:  { type: String, default: 'Urban Neighborhood', trim: true },
    bio:       { type: String, default: '', trim: true },
    interests: { type: String, default: 'Community, Events', trim: true },
    skills:    { type: String, default: 'Networking', trim: true }
}, { timestamps: true });

const circleSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category:    { type: String, required: true, trim: true },
    location:    { type: String, required: true, trim: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

circleSchema.index({ created_by: 1 });
circleSchema.index({ createdAt: -1 });

const circleMemberSchema = new mongoose.Schema({
    circle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    user_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joined_at: { type: Date, default: Date.now }
});
circleMemberSchema.index({ circle_id: 1, user_id: 1 }, { unique: true });
circleMemberSchema.index({ user_id: 1 });
circleMemberSchema.index({ circle_id: 1 });

const eventSchema = new mongoose.Schema({
    circle_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    event_date:  { type: Date, required: true },
    location:    { type: String, required: true, trim: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

eventSchema.index({ circle_id: 1, event_date: 1 });
eventSchema.index({ event_date: 1 });

const User         = mongoose.models.User         || mongoose.model('User',         userSchema);
const Circle       = mongoose.models.Circle       || mongoose.model('Circle',       circleSchema);
const CircleMember = mongoose.models.CircleMember || mongoose.model('CircleMember', circleMemberSchema);
const Event        = mongoose.models.Event        || mongoose.model('Event',        eventSchema);

// Helper to format user payload with BOTH id and _id
const formatUser = (rawUser) => {
    const obj = rawUser.toObject ? rawUser.toObject() : { ...rawUser };
    const { password, __v, ...rest } = obj;
    const idStr = String(rest._id);
    return {
        ...rest,
        _id: idStr,
        id:  idStr
    };
};

// ==========================================
// ROUTES
// ==========================================

// Ping route (for keep-alive and health checks)
app.get('/ping', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
        ts: Date.now()
    });
});

// Root Health Check
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'CircleHub API is running smoothly!',
        database: mongoose.connection.readyState === 1 ? '✅ MongoDB Connected' : '⏳ Connecting to DB...',
        dbName: mongoose.connection.name || 'circlehub',
        port: PORT
    });
});

// ==========================================
// 1. AUTH ROUTES
// ==========================================

// Register
app.post('/api/register', async (req, res) => {
    console.log('📝 Register request received:', req.body?.email);
    const { name, email, password, location, bio, interests, skills } = req.body || {};

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Full Name is required.' });
    }
    if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email Address is required.' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    try {
        const cleanEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: cleanEmail }).select('_id').lean();
        if (existing) {
            return res.status(400).json({ error: 'This email is already registered. Please sign in instead.' });
        }

        const newUser = await User.create({
            name:      name.trim(),
            email:     cleanEmail,
            password:  password,
            location:  (location && location.trim())  || 'Urban Neighborhood',
            bio:       (bio && bio.trim())            || '',
            interests: (interests && interests.trim()) || 'Community, Events',
            skills:    (skills && skills.trim())       || 'Networking'
        });

        console.log('✅ User created successfully:', newUser._id);
        const formatted = formatUser(newUser);
        return res.status(201).json({
            message: 'User registered successfully!',
            user: formatted
        });
    } catch (err) {
        console.error('❌ Registration Error:', err);
        if (err.code === 11000) {
            return res.status(400).json({ error: 'This email is already registered.' });
        }
        return res.status(500).json({ error: err.message || 'Server error during registration.' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    console.log('🔐 Login request received:', req.body?.email);
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail }).lean();
        if (!user) {
            return res.status(404).json({ error: 'No account found with this email. Please register first.' });
        }
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
        }

        console.log('✅ Login successful:', user._id);
        const formatted = formatUser(user);
        return res.json({ message: 'Login successful!', user: formatted });
    } catch (err) {
        console.error('❌ Login Error:', err);
        return res.status(500).json({ error: 'Server error during login.' });
    }
});

// ==========================================
// 2. USER PROFILE ROUTES
// ==========================================

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -__v').lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });
        return res.json(formatUser(user));
    } catch (err) {
        console.error('Get Profile Error:', err);
        return res.status(500).json({ error: 'Server error fetching user profile.' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { name, location, bio, interests, skills } = req.body || {};
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, location, bio, interests, skills },
            { new: true, runValidators: true, select: '-password -__v', lean: true }
        );
        if (!updatedUser) return res.status(404).json({ error: 'User not found.' });
        return res.json({ message: 'Profile updated successfully!', user: formatUser(updatedUser) });
    } catch (err) {
        console.error('Update Profile Error:', err);
        return res.status(500).json({ error: 'Server error updating profile.' });
    }
});

// ==========================================
// 3. CIRCLE ROUTES
// ==========================================

app.get('/api/circles', async (req, res) => {
    const userId = req.query.userId || null;
    try {
        const circles = await Circle.find()
            .populate('created_by', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const circleIds = circles.map(c => c._id);

        const memberCounts = await CircleMember.aggregate([
            { $match: { circle_id: { $in: circleIds } } },
            { $group: { _id: '$circle_id', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        memberCounts.forEach(m => { countMap[m._id.toString()] = m.count; });

        let userMemberSet = new Set();
        if (userId) {
            const memberships = await CircleMember.find({ user_id: userId }).select('circle_id').lean();
            memberships.forEach(m => userMemberSet.add(m.circle_id.toString()));
        }

        const enriched = circles.map(c => ({
            ...c,
            id: c._id.toString(),
            _id: c._id.toString(),
            creator_name: c.created_by?.name || 'Community Member',
            member_count: countMap[c._id.toString()] || 0,
            is_member: userMemberSet.has(c._id.toString())
        }));

        return res.json(enriched);
    } catch (err) {
        console.error('Get Circles Error:', err);
        return res.status(500).json({ error: 'Server error fetching circles.' });
    }
});

app.post('/api/circles', async (req, res) => {
    const { name, description, category, location, created_by } = req.body || {};
    if (!name || !description || !category || !location || !created_by) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const circle = await Circle.create({ name, description, category, location, created_by });
        await CircleMember.create({ circle_id: circle._id, user_id: created_by });
        return res.status(201).json({
            message: 'Circle created successfully!',
            circleId: circle._id.toString(),
            id: circle._id.toString()
        });
    } catch (err) {
        console.error('Create Circle Error:', err);
        return res.status(500).json({ error: 'Server error creating circle.' });
    }
});

app.get('/api/circles/:id', async (req, res) => {
    try {
        const [circle, member_count] = await Promise.all([
            Circle.findById(req.params.id).populate('created_by', 'name').lean(),
            CircleMember.countDocuments({ circle_id: req.params.id })
        ]);
        if (!circle) return res.status(404).json({ error: 'Circle not found.' });
        return res.json({
            ...circle,
            id: circle._id.toString(),
            _id: circle._id.toString(),
            creator_name: circle.created_by?.name || 'Community Member',
            member_count
        });
    } catch (err) {
        console.error('Get Circle Details Error:', err);
        return res.status(500).json({ error: 'Server error fetching circle details.' });
    }
});

app.post('/api/circles/:id/join', async (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    try {
        await CircleMember.findOneAndUpdate(
            { circle_id: req.params.id, user_id: userId },
            { circle_id: req.params.id, user_id: userId },
            { upsert: true, new: true }
        );
        return res.json({ message: 'Successfully joined circle!' });
    } catch (err) {
        console.error('Join Circle Error:', err);
        return res.status(500).json({ error: 'Server error joining circle.' });
    }
});

app.post('/api/circles/:id/leave', async (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    try {
        await CircleMember.deleteOne({ circle_id: req.params.id, user_id: userId });
        return res.json({ message: 'Successfully left circle.' });
    } catch (err) {
        console.error('Leave Circle Error:', err);
        return res.status(500).json({ error: 'Server error leaving circle.' });
    }
});

app.get('/api/circles/:id/members', async (req, res) => {
    try {
        const members = await CircleMember.find({ circle_id: req.params.id })
            .populate('user_id', 'name email location')
            .sort({ joined_at: 1 })
            .lean();
        const result = members.map(m => ({
            id: m.user_id?._id ? m.user_id._id.toString() : String(m.user_id),
            _id: m.user_id?._id ? m.user_id._id.toString() : String(m.user_id),
            name: m.user_id?.name || 'Member',
            email: m.user_id?.email || '',
            location: m.user_id?.location || '',
            joined_at: m.joined_at
        }));
        return res.json(result);
    } catch (err) {
        console.error('Get Members Error:', err);
        return res.status(500).json({ error: 'Server error fetching members.' });
    }
});

// ==========================================
// 4. EVENT ROUTES
// ==========================================

app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find()
            .populate('circle_id', 'name')
            .populate('created_by', 'name')
            .sort({ event_date: 1 })
            .lean();
        const result = events.map(e => ({
            ...e,
            id: e._id.toString(),
            _id: e._id.toString(),
            circle_name:  e.circle_id?.name  || 'Community Circle',
            creator_name: e.created_by?.name || 'Community Member'
        }));
        return res.json(result);
    } catch (err) {
        console.error('Get Events Error:', err);
        return res.status(500).json({ error: 'Server error fetching events.' });
    }
});

app.post('/api/events', async (req, res) => {
    const { circle_id, title, description, event_date, location, created_by } = req.body || {};
    if (!circle_id || !title || !description || !event_date || !location || !created_by) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const event = await Event.create({ circle_id, title, description, event_date, location, created_by });
        return res.status(201).json({
            message: 'Event created successfully!',
            eventId: event._id.toString(),
            id: event._id.toString()
        });
    } catch (err) {
        console.error('Create Event Error:', err);
        return res.status(500).json({ error: 'Server error creating event.' });
    }
});

// ==========================================
// 5. DASHBOARD ROUTE
// ==========================================

app.get('/api/dashboard/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        let validUserObjectId = null;
        try {
            validUserObjectId = new mongoose.Types.ObjectId(userId);
        } catch {
            // If invalid id, return empty stats cleanly without crashing
            return res.json({
                joinedCircles: [], createdCircles: [], upcomingEvents: [],
                stats: { totalJoined: 0, totalCreated: 0, totalEvents: 0 }
            });
        }

        const memberships = await CircleMember.find({ user_id: validUserObjectId }).select('circle_id').lean();
        const joinedCircleIds = memberships.map(m => m.circle_id);

        const [joinedCirclesRaw, createdCirclesRaw, upcomingEventsRaw] = await Promise.all([
            Circle.find({ _id: { $in: joinedCircleIds } }).lean(),
            Circle.find({ created_by: validUserObjectId }).lean(),
            Event.find({ circle_id: { $in: joinedCircleIds }, event_date: { $gte: new Date() } })
                .populate('circle_id', 'name')
                .populate('created_by', 'name')
                .sort({ event_date: 1 })
                .limit(5)
                .lean()
        ]);

        const allCircleIds = [...new Set([
            ...joinedCirclesRaw.map(c => c._id),
            ...createdCirclesRaw.map(c => c._id)
        ])];
        const memberCounts = await CircleMember.aggregate([
            { $match: { circle_id: { $in: allCircleIds } } },
            { $group: { _id: '$circle_id', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        memberCounts.forEach(m => { countMap[m._id.toString()] = m.count; });

        const joinedCircles  = joinedCirclesRaw.map(c => ({
            ...c,
            id: c._id.toString(),
            _id: c._id.toString(),
            member_count: countMap[c._id.toString()] || 0
        }));
        const createdCircles = createdCirclesRaw.map(c => ({
            ...c,
            id: c._id.toString(),
            _id: c._id.toString(),
            member_count: countMap[c._id.toString()] || 0
        }));
        const upcomingEvents = upcomingEventsRaw.map(e => ({
            ...e,
            id: e._id.toString(),
            _id: e._id.toString(),
            circle_name:  e.circle_id?.name  || 'Community Circle',
            creator_name: e.created_by?.name || 'Community Member'
        }));

        return res.json({
            joinedCircles, createdCircles, upcomingEvents,
            stats: {
                totalJoined:  joinedCircles.length,
                totalCreated: createdCircles.length,
                totalEvents:  upcomingEvents.length
            }
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        return res.status(500).json({ error: 'Server error fetching dashboard data.' });
    }
});

// ==========================================
// START SERVER (BIND TO 0.0.0.0 IMMEDIATELY)
// ==========================================

// Connect DB in the background so HTTP server is IMMEDIATELY available for health checks
connectDB().catch(err => {
    console.error('Background DB connection failed:', err);
});

// Listen on 0.0.0.0 so Render load balancers can reach it
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CircleHub Backend actively listening on 0.0.0.0:${PORT}`);
});
