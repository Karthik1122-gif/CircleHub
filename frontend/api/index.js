import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: '50kb' }));

// Cached MongoDB connection across serverless function invocations
let isConnected = false;
async function connectDB() {
    if (isConnected && mongoose.connection.readyState === 1) return;
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI is not defined in environment variables.');
    }
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        bufferCommands: false
    });
    isConnected = true;
}

// Ensure DB connected on every request
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('Database connection error in serverless handler:', err);
        return res.status(500).json({ error: 'Database connection failed. Please try again.' });
    }
});

// Schemas & Models
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

const circleMemberSchema = new mongoose.Schema({
    circle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    user_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joined_at: { type: Date, default: Date.now }
});
circleMemberSchema.index({ circle_id: 1, user_id: 1 }, { unique: true });

const eventSchema = new mongoose.Schema({
    circle_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    event_date:  { type: Date, required: true },
    location:    { type: String, required: true, trim: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const User         = mongoose.models.User         || mongoose.model('User',         userSchema);
const Circle       = mongoose.models.Circle       || mongoose.model('Circle',       circleSchema);
const CircleMember = mongoose.models.CircleMember || mongoose.model('CircleMember', circleMemberSchema);
const Event        = mongoose.models.Event        || mongoose.model('Event',        eventSchema);

const formatUser = (rawUser) => {
    const obj = rawUser.toObject ? rawUser.toObject() : { ...rawUser };
    const { password, __v, ...rest } = obj;
    const idStr = String(rest._id);
    return { ...rest, _id: idStr, id: idStr };
};

// Ping / Health
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', ts: Date.now() });
});

// Register
app.post('/api/register', async (req, res) => {
    const { name, email, password, location, bio, interests, skills } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Full name is required.' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email address is required.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    try {
        const cleanEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: cleanEmail }).select('_id').lean();
        if (existing) return res.status(400).json({ error: 'This email is already registered. Please sign in instead.' });

        const newUser = await User.create({
            name:      name.trim(),
            email:     cleanEmail,
            password:  password,
            location:  (location && location.trim())  || 'Urban Neighborhood',
            bio:       (bio && bio.trim())            || '',
            interests: (interests && interests.trim()) || 'Community, Events',
            skills:    (skills && skills.trim())       || 'Networking'
        });

        return res.status(201).json({ message: 'User registered successfully!', user: formatUser(newUser) });
    } catch (err) {
        console.error('Registration Error:', err);
        return res.status(500).json({ error: err.message || 'Server error during registration.' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    try {
        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail }).lean();
        if (!user) return res.status(404).json({ error: 'No account found with this email. Please register first.' });
        if (user.password !== password) return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });

        return res.json({ message: 'Login successful!', user: formatUser(user) });
    } catch (err) {
        console.error('Login Error:', err);
        return res.status(500).json({ error: 'Server error during login.' });
    }
});

// User Profile
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -__v').lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });
        return res.json(formatUser(user));
    } catch (err) {
        return res.status(500).json({ error: 'Error fetching profile.' });
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
        return res.json({ message: 'Profile updated!', user: formatUser(updatedUser) });
    } catch (err) {
        return res.status(500).json({ error: 'Error updating profile.' });
    }
});

// Circles
app.get('/api/circles', async (req, res) => {
    const userId = req.query.userId || null;
    try {
        const circles = await Circle.find().populate('created_by', 'name').sort({ createdAt: -1 }).lean();
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
        return res.status(500).json({ error: 'Error fetching circles.' });
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
        return res.status(201).json({ message: 'Circle created!', id: circle._id.toString(), _id: circle._id.toString() });
    } catch (err) {
        return res.status(500).json({ error: 'Error creating circle.' });
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
        return res.status(500).json({ error: 'Error fetching circle.' });
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
        return res.status(500).json({ error: 'Error joining circle.' });
    }
});

app.post('/api/circles/:id/leave', async (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    try {
        await CircleMember.deleteOne({ circle_id: req.params.id, user_id: userId });
        return res.json({ message: 'Successfully left circle.' });
    } catch (err) {
        return res.status(500).json({ error: 'Error leaving circle.' });
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
        return res.status(500).json({ error: 'Error fetching members.' });
    }
});

// Events
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find().populate('circle_id', 'name').populate('created_by', 'name').sort({ event_date: 1 }).lean();
        const result = events.map(e => ({
            ...e,
            id: e._id.toString(),
            _id: e._id.toString(),
            circle_name:  e.circle_id?.name  || 'Community Circle',
            creator_name: e.created_by?.name || 'Community Member'
        }));
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Error fetching events.' });
    }
});

app.post('/api/events', async (req, res) => {
    const { circle_id, title, description, event_date, location, created_by } = req.body || {};
    if (!circle_id || !title || !description || !event_date || !location || !created_by) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const event = await Event.create({ circle_id, title, description, event_date, location, created_by });
        return res.status(201).json({ message: 'Event created successfully!', id: event._id.toString(), _id: event._id.toString() });
    } catch (err) {
        return res.status(500).json({ error: 'Error creating event.' });
    }
});

// Dashboard
app.get('/api/dashboard/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        let validUserObjectId = null;
        try { validUserObjectId = new mongoose.Types.ObjectId(userId); }
        catch {
            return res.json({ joinedCircles: [], createdCircles: [], upcomingEvents: [], stats: { totalJoined: 0, totalCreated: 0, totalEvents: 0 } });
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

        const allCircleIds = [...new Set([...joinedCirclesRaw.map(c => c._id), ...createdCirclesRaw.map(c => c._id)])];
        const memberCounts = await CircleMember.aggregate([
            { $match: { circle_id: { $in: allCircleIds } } },
            { $group: { _id: '$circle_id', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        memberCounts.forEach(m => { countMap[m._id.toString()] = m.count; });

        const joinedCircles  = joinedCirclesRaw.map(c => ({ ...c, id: c._id.toString(), _id: c._id.toString(), member_count: countMap[c._id.toString()] || 0 }));
        const createdCircles = createdCirclesRaw.map(c => ({ ...c, id: c._id.toString(), _id: c._id.toString(), member_count: countMap[c._id.toString()] || 0 }));
        const upcomingEvents = upcomingEventsRaw.map(e => ({
            ...e,
            id: e._id.toString(),
            _id: e._id.toString(),
            circle_name:  e.circle_id?.name  || 'Community Circle',
            creator_name: e.created_by?.name || 'Community Member'
        }));

        return res.json({
            joinedCircles, createdCircles, upcomingEvents,
            stats: { totalJoined: joinedCircles.length, totalCreated: createdCircles.length, totalEvents: upcomingEvents.length }
        });
    } catch (err) {
        return res.status(500).json({ error: 'Error fetching dashboard data.' });
    }
});

export default app;
