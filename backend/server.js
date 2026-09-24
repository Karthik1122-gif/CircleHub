const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// PERFORMANCE MIDDLEWARE
// ==========================================

// Gzip compress ALL responses
app.use(compression());

// Security + cache headers
app.use(helmet({ contentSecurityPolicy: false }));

// Dynamic CORS
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    /\.vercel\.app$/
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(o =>
            o instanceof RegExp ? o.test(origin) : o === origin
        );
        if (isAllowed) return callback(null, true);
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
}));

app.use(express.json({ limit: '10kb' }));

// ==========================================
// MONGOOSE SCHEMAS & MODELS (with indexes)
// ==========================================

const userSchema = new mongoose.Schema({
    name:      { type: String, required: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    location:  { type: String, default: 'Urban Neighborhood' },
    bio:       { type: String, default: '' },
    interests: { type: String, default: 'Community, Events' },
    skills:    { type: String, default: 'Networking' }
}, { timestamps: true });

// 🔥 Performance indexes
userSchema.index({ email: 1 });

const circleSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    description: { type: String, required: true },
    category:    { type: String, required: true },
    location:    { type: String, required: true },
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
    title:       { type: String, required: true },
    description: { type: String, required: true },
    event_date:  { type: Date, required: true },
    location:    { type: String, required: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

eventSchema.index({ circle_id: 1, event_date: 1 });
eventSchema.index({ event_date: 1 });

const User         = mongoose.model('User',         userSchema);
const Circle       = mongoose.model('Circle',       circleSchema);
const CircleMember = mongoose.model('CircleMember', circleMemberSchema);
const Event        = mongoose.model('Event',        eventSchema);

// ==========================================
// KEEP-ALIVE SELF-PING (prevents Render cold start)
// ==========================================
const RENDER_URL = process.env.RENDER_URL || `http://localhost:${PORT}`;

const keepAlive = () => {
    setInterval(async () => {
        try {
            await fetch(`${RENDER_URL}/ping`);
            console.log('🏓 Keep-alive ping sent');
        } catch (err) {
            console.warn('⚠️  Keep-alive ping failed:', err.message);
        }
    }, 10 * 60 * 1000); // Every 10 minutes
};

// ==========================================
// ROUTES
// ==========================================

// Ping route (for keep-alive)
app.get('/ping', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Root Health Check
app.get('/', (req, res) => {
    res.json({
        message: 'CircleHub API is running!',
        database: mongoose.connection.readyState === 1 ? '✅ MongoDB Connected' : '❌ Disconnected',
        dbName: mongoose.connection.name
    });
});

// ==========================================
// 1. AUTH ROUTES
// ==========================================

// Register
app.post('/api/register', async (req, res) => {
    const { name, email, password, location, bio, interests, skills } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    try {
        // Use lean + select to minimize data transfer
        const existing = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
        if (existing) return res.status(400).json({ error: 'Email is already registered.' });

        const newUser = await User.create({
            name, email, password,
            location:  location  || 'Urban Neighborhood',
            bio:       bio       || '',
            interests: interests || 'Community, Events',
            skills:    skills    || 'Networking'
        });

        const { password: _, __v, ...userProfile } = newUser.toObject();
        res.status(201).json({ message: 'User registered successfully!', user: userProfile });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    try {
        // Lean query — skips Mongoose document overhead
        const user = await User.findOne({ email: email.toLowerCase() }).lean();
        if (!user) return res.status(404).json({ error: 'User with this email not found.' });
        if (user.password !== password) return res.status(401).json({ error: 'Invalid password.' });

        const { password: _, __v, ...userProfile } = user;
        res.json({ message: 'Login successful!', user: userProfile });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// ==========================================
// 2. USER PROFILE ROUTES
// ==========================================

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -__v').lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    } catch (err) {
        console.error('Get Profile Error:', err);
        res.status(500).json({ error: 'Server error fetching user profile.' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { name, location, bio, interests, skills } = req.body;
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, location, bio, interests, skills },
            { new: true, runValidators: true, select: '-password -__v', lean: true }
        );
        if (!updatedUser) return res.status(404).json({ error: 'User not found.' });
        res.json({ message: 'Profile updated successfully!', user: updatedUser });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Server error updating profile.' });
    }
});

// ==========================================
// 3. CIRCLE ROUTES
// ==========================================

app.get('/api/circles', async (req, res) => {
    const userId = req.query.userId || null;
    try {
        // Run circles fetch + member counts in parallel
        const circles = await Circle.find()
            .populate('created_by', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const circleIds = circles.map(c => c._id);

        // Batch count all memberships in ONE query
        const memberCounts = await CircleMember.aggregate([
            { $match: { circle_id: { $in: circleIds } } },
            { $group: { _id: '$circle_id', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        memberCounts.forEach(m => { countMap[m._id.toString()] = m.count; });

        // Get user's memberships in one query
        let userMemberSet = new Set();
        if (userId) {
            const memberships = await CircleMember.find({ user_id: userId }).select('circle_id').lean();
            memberships.forEach(m => userMemberSet.add(m.circle_id.toString()));
        }

        const enriched = circles.map(c => ({
            ...c,
            creator_name: c.created_by?.name || 'Unknown',
            member_count: countMap[c._id.toString()] || 0,
            is_member: userMemberSet.has(c._id.toString())
        }));

        res.json(enriched);
    } catch (err) {
        console.error('Get Circles Error:', err);
        res.status(500).json({ error: 'Server error fetching circles.' });
    }
});

app.post('/api/circles', async (req, res) => {
    const { name, description, category, location, created_by } = req.body;
    if (!name || !description || !category || !location || !created_by) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const [circle] = await Promise.all([
            Circle.create({ name, description, category, location, created_by })
        ]);
        await CircleMember.create({ circle_id: circle._id, user_id: created_by });
        res.status(201).json({ message: 'Circle created successfully!', circleId: circle._id });
    } catch (err) {
        console.error('Create Circle Error:', err);
        res.status(500).json({ error: 'Server error creating circle.' });
    }
});

app.get('/api/circles/:id', async (req, res) => {
    try {
        const [circle, member_count] = await Promise.all([
            Circle.findById(req.params.id).populate('created_by', 'name').lean(),
            CircleMember.countDocuments({ circle_id: req.params.id })
        ]);
        if (!circle) return res.status(404).json({ error: 'Circle not found.' });
        res.json({ ...circle, creator_name: circle.created_by?.name || 'Unknown', member_count });
    } catch (err) {
        console.error('Get Circle Details Error:', err);
        res.status(500).json({ error: 'Server error fetching circle details.' });
    }
});

app.post('/api/circles/:id/join', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    try {
        await CircleMember.findOneAndUpdate(
            { circle_id: req.params.id, user_id: userId },
            { circle_id: req.params.id, user_id: userId },
            { upsert: true, new: true }
        );
        res.json({ message: 'Successfully joined circle!' });
    } catch (err) {
        console.error('Join Circle Error:', err);
        res.status(500).json({ error: 'Server error joining circle.' });
    }
});

app.post('/api/circles/:id/leave', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    try {
        await CircleMember.deleteOne({ circle_id: req.params.id, user_id: userId });
        res.json({ message: 'Successfully left circle.' });
    } catch (err) {
        console.error('Leave Circle Error:', err);
        res.status(500).json({ error: 'Server error leaving circle.' });
    }
});

app.get('/api/circles/:id/members', async (req, res) => {
    try {
        const members = await CircleMember.find({ circle_id: req.params.id })
            .populate('user_id', 'name email location')
            .sort({ joined_at: 1 })
            .lean();
        const result = members.map(m => ({
            id: m.user_id._id, name: m.user_id.name,
            email: m.user_id.email, location: m.user_id.location,
            joined_at: m.joined_at
        }));
        res.json(result);
    } catch (err) {
        console.error('Get Members Error:', err);
        res.status(500).json({ error: 'Server error fetching members.' });
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
            circle_name:  e.circle_id?.name  || 'Unknown',
            creator_name: e.created_by?.name || 'Unknown'
        }));
        res.json(result);
    } catch (err) {
        console.error('Get Events Error:', err);
        res.status(500).json({ error: 'Server error fetching events.' });
    }
});

app.post('/api/events', async (req, res) => {
    const { circle_id, title, description, event_date, location, created_by } = req.body;
    if (!circle_id || !title || !description || !event_date || !location || !created_by) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const event = await Event.create({ circle_id, title, description, event_date, location, created_by });
        res.status(201).json({ message: 'Event created successfully!', eventId: event._id });
    } catch (err) {
        console.error('Create Event Error:', err);
        res.status(500).json({ error: 'Server error creating event.' });
    }
});

// ==========================================
// 5. DASHBOARD ROUTE (parallelized)
// ==========================================

app.get('/api/dashboard/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        // Get user memberships first
        const memberships = await CircleMember.find({ user_id: userId }).select('circle_id').lean();
        const joinedCircleIds = memberships.map(m => m.circle_id);

        // Run all 3 queries IN PARALLEL
        const [joinedCirclesRaw, createdCirclesRaw, upcomingEventsRaw] = await Promise.all([
            Circle.find({ _id: { $in: joinedCircleIds } }).lean(),
            Circle.find({ created_by: userId }).lean(),
            Event.find({ circle_id: { $in: joinedCircleIds }, event_date: { $gte: new Date() } })
                .populate('circle_id', 'name')
                .populate('created_by', 'name')
                .sort({ event_date: 1 })
                .limit(5)
                .lean()
        ]);

        // Batch count members for all circles at once
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

        const joinedCircles  = joinedCirclesRaw.map(c => ({ ...c, member_count: countMap[c._id.toString()] || 0 }));
        const createdCircles = createdCirclesRaw.map(c => ({ ...c, member_count: countMap[c._id.toString()] || 0 }));
        const upcomingEvents = upcomingEventsRaw.map(e => ({
            ...e,
            circle_name:  e.circle_id?.name  || 'Unknown',
            creator_name: e.created_by?.name || 'Unknown'
        }));

        res.json({
            joinedCircles, createdCircles, upcomingEvents,
            stats: {
                totalJoined:  joinedCircles.length,
                totalCreated: createdCircles.length,
                totalEvents:  upcomingEvents.length
            }
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        res.status(500).json({ error: 'Server error fetching dashboard data.' });
    }
});

// ==========================================
// START SERVER
// ==========================================

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`🚀 CircleHub Backend running on http://localhost:${PORT}`);
        console.log(`🌿 MongoDB: ${mongoose.connection.name} @ ${mongoose.connection.host}`);
        keepAlive(); // Start keep-alive pinger
        console.log('🏓 Keep-alive pinger started (every 10 min)');
    });
};

startServer();
