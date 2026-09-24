const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware — dynamic CORS for local dev + Vercel production
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    /\.vercel\.app$/        // any *.vercel.app subdomain
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(allowed =>
            allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
        );
        if (isAllowed) return callback(null, true);
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
}));
app.use(express.json());

// ==========================================
// MONGOOSE SCHEMAS & MODELS
// ==========================================

// User Schema
const userSchema = new mongoose.Schema({
    name:      { type: String, required: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    location:  { type: String, default: 'Urban Neighborhood' },
    bio:       { type: String, default: '' },
    interests: { type: String, default: 'Community, Events' },
    skills:    { type: String, default: 'Networking' }
}, { timestamps: true });

// Circle Schema
const circleSchema = new mongoose.Schema({
    name:        { type: String, required: true },
    description: { type: String, required: true },
    category:    { type: String, required: true },
    location:    { type: String, required: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Circle Members Schema (join table equivalent)
const circleMemberSchema = new mongoose.Schema({
    circle_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    joined_at:  { type: Date, default: Date.now }
});
circleMemberSchema.index({ circle_id: 1, user_id: 1 }, { unique: true });

// Event Schema
const eventSchema = new mongoose.Schema({
    circle_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    event_date:  { type: Date, required: true },
    location:    { type: String, required: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const User         = mongoose.model('User',         userSchema);
const Circle       = mongoose.model('Circle',       circleSchema);
const CircleMember = mongoose.model('CircleMember', circleMemberSchema);
const Event        = mongoose.model('Event',        eventSchema);

// ==========================================
// ROOT HEALTH CHECK ROUTE
// ==========================================

app.get('/', (req, res) => {
    res.json({
        message: 'CircleHub API is running cleanly!',
        database: mongoose.connection.readyState === 1 ? '✅ MongoDB Connected' : '❌ MongoDB Disconnected',
        dbName: mongoose.connection.name || 'N/A'
    });
});

// ==========================================
// 1. AUTHENTICATION ROUTES (Register & Login)
// ==========================================

// Register User
app.post('/api/register', async (req, res) => {
    const { name, email, password, location, bio, interests, skills } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    try {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ error: 'Email is already registered.' });
        }

        const newUser = await User.create({
            name,
            email,
            password,
            location: location || 'Urban Neighborhood',
            bio:       bio || '',
            interests: interests || 'Community, Events',
            skills:    skills || 'Networking'
        });

        const { password: _, ...userProfile } = newUser.toObject();

        res.status(201).json({
            message: 'User registered successfully!',
            user: userProfile
        });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ error: 'User with this email not found.' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid password.' });
        }

        const { password: _, ...userProfile } = user.toObject();
        res.json({
            message: 'Login successful!',
            user: userProfile
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// ==========================================
// 2. USER PROFILE ROUTES
// ==========================================

// Get User Profile
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json(user);
    } catch (err) {
        console.error('Get Profile Error:', err);
        res.status(500).json({ error: 'Server error fetching user profile.' });
    }
});

// Update User Profile
app.put('/api/users/:id', async (req, res) => {
    const { name, location, bio, interests, skills } = req.body;

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, location, bio, interests, skills },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({
            message: 'Profile updated successfully!',
            user: updatedUser
        });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Server error updating profile.' });
    }
});

// ==========================================
// 3. CIRCLE MANAGEMENT ROUTES
// ==========================================

// Get All Circles with member count & user join status
app.get('/api/circles', async (req, res) => {
    const userId = req.query.userId || null;

    try {
        const circles = await Circle.find()
            .populate('created_by', 'name')
            .sort({ createdAt: -1 });

        // Fetch member counts and join status in parallel
        const enriched = await Promise.all(circles.map(async (circle) => {
            const member_count = await CircleMember.countDocuments({ circle_id: circle._id });
            let is_member = false;

            if (userId) {
                const membership = await CircleMember.findOne({
                    circle_id: circle._id,
                    user_id:   userId
                });
                is_member = !!membership;
            }

            return {
                ...circle.toObject(),
                creator_name: circle.created_by?.name || 'Unknown',
                member_count,
                is_member
            };
        }));

        res.json(enriched);
    } catch (err) {
        console.error('Get Circles Error:', err);
        res.status(500).json({ error: 'Server error fetching circles.' });
    }
});

// Create New Circle
app.post('/api/circles', async (req, res) => {
    const { name, description, category, location, created_by } = req.body;

    if (!name || !description || !category || !location || !created_by) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const circle = await Circle.create({ name, description, category, location, created_by });

        // Auto-join creator to circle
        await CircleMember.create({ circle_id: circle._id, user_id: created_by });

        res.status(201).json({
            message: 'Circle created successfully!',
            circleId: circle._id
        });
    } catch (err) {
        console.error('Create Circle Error:', err);
        res.status(500).json({ error: 'Server error creating circle.' });
    }
});

// Get Single Circle Details
app.get('/api/circles/:id', async (req, res) => {
    try {
        const circle = await Circle.findById(req.params.id)
            .populate('created_by', 'name');

        if (!circle) {
            return res.status(404).json({ error: 'Circle not found.' });
        }

        const member_count = await CircleMember.countDocuments({ circle_id: circle._id });

        res.json({
            ...circle.toObject(),
            creator_name: circle.created_by?.name || 'Unknown',
            member_count
        });
    } catch (err) {
        console.error('Get Circle Details Error:', err);
        res.status(500).json({ error: 'Server error fetching circle details.' });
    }
});

// Join Circle
app.post('/api/circles/:id/join', async (req, res) => {
    const { userId } = req.body;
    const circleId = req.params.id;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        await CircleMember.findOneAndUpdate(
            { circle_id: circleId, user_id: userId },
            { circle_id: circleId, user_id: userId },
            { upsert: true, new: true }
        );

        res.json({ message: 'Successfully joined circle!' });
    } catch (err) {
        console.error('Join Circle Error:', err);
        res.status(500).json({ error: 'Server error joining circle.' });
    }
});

// Leave Circle
app.post('/api/circles/:id/leave', async (req, res) => {
    const { userId } = req.body;
    const circleId = req.params.id;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        await CircleMember.deleteOne({ circle_id: circleId, user_id: userId });

        res.json({ message: 'Successfully left circle.' });
    } catch (err) {
        console.error('Leave Circle Error:', err);
        res.status(500).json({ error: 'Server error leaving circle.' });
    }
});

// Get Circle Members
app.get('/api/circles/:id/members', async (req, res) => {
    try {
        const members = await CircleMember.find({ circle_id: req.params.id })
            .populate('user_id', 'id name email location')
            .sort({ joined_at: 1 });

        const result = members.map(m => ({
            id:        m.user_id._id,
            name:      m.user_id.name,
            email:     m.user_id.email,
            location:  m.user_id.location,
            joined_at: m.joined_at
        }));

        res.json(result);
    } catch (err) {
        console.error('Get Members Error:', err);
        res.status(500).json({ error: 'Server error fetching circle members.' });
    }
});

// ==========================================
// 4. EVENT MANAGEMENT ROUTES
// ==========================================

// Get All Events
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find()
            .populate('circle_id', 'name')
            .populate('created_by', 'name')
            .sort({ event_date: 1 });

        const result = events.map(e => ({
            ...e.toObject(),
            circle_name:  e.circle_id?.name  || 'Unknown',
            creator_name: e.created_by?.name || 'Unknown'
        }));

        res.json(result);
    } catch (err) {
        console.error('Get Events Error:', err);
        res.status(500).json({ error: 'Server error fetching events.' });
    }
});

// Create Event
app.post('/api/events', async (req, res) => {
    const { circle_id, title, description, event_date, location, created_by } = req.body;

    if (!circle_id || !title || !description || !event_date || !location || !created_by) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const event = await Event.create({ circle_id, title, description, event_date, location, created_by });

        res.status(201).json({
            message: 'Event created successfully!',
            eventId: event._id
        });
    } catch (err) {
        console.error('Create Event Error:', err);
        res.status(500).json({ error: 'Server error creating event.' });
    }
});

// ==========================================
// 5. DASHBOARD SUMMARY ROUTE
// ==========================================

app.get('/api/dashboard/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        // Get circle IDs the user has joined
        const memberships = await CircleMember.find({ user_id: userId }).select('circle_id');
        const joinedCircleIds = memberships.map(m => m.circle_id);

        // User joined circles (with member count)
        const joinedCirclesRaw = await Circle.find({ _id: { $in: joinedCircleIds } });
        const joinedCircles = await Promise.all(joinedCirclesRaw.map(async (c) => ({
            ...c.toObject(),
            member_count: await CircleMember.countDocuments({ circle_id: c._id })
        })));

        // User created circles (with member count)
        const createdCirclesRaw = await Circle.find({ created_by: userId });
        const createdCircles = await Promise.all(createdCirclesRaw.map(async (c) => ({
            ...c.toObject(),
            member_count: await CircleMember.countDocuments({ circle_id: c._id })
        })));

        // Upcoming events for user's joined circles (next 5)
        const upcomingEventsRaw = await Event.find({
            circle_id: { $in: joinedCircleIds },
            event_date: { $gte: new Date() }
        })
            .populate('circle_id', 'name')
            .populate('created_by', 'name')
            .sort({ event_date: 1 })
            .limit(5);

        const upcomingEvents = upcomingEventsRaw.map(e => ({
            ...e.toObject(),
            circle_name:  e.circle_id?.name  || 'Unknown',
            creator_name: e.created_by?.name || 'Unknown'
        }));

        res.json({
            joinedCircles,
            createdCircles,
            upcomingEvents,
            stats: {
                totalJoined:  joinedCircles.length,
                totalCreated: createdCircles.length,
                totalEvents:  upcomingEvents.length
            }
        });
    } catch (err) {
        console.error('Dashboard Data Error:', err);
        res.status(500).json({ error: 'Server error fetching dashboard data.' });
    }
});

// ==========================================
// START SERVER
// ==========================================

const startServer = async () => {
    await connectDB(); // Connect to MongoDB Atlas first
    app.listen(PORT, () => {
        console.log(`🚀 CircleHub Backend running on http://localhost:${PORT}`);
        console.log(`🌿 MongoDB Database: ${mongoose.connection.name}`);
        console.log(`🌐 Atlas Cluster:    ${mongoose.connection.host}`);
    });
};

startServer();
