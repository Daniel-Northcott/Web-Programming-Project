require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const User = require(path.join(__dirname, 'models', 'User.js'));
const Review = require(path.join(__dirname, 'models', 'Review.js'));
const Movie = require(path.join(__dirname, 'models', 'Movie.js'));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/catelog', (_, res) => res.sendFile(path.join(__dirname, 'catelog.html')));
app.get('/contact', (_, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/about', (_, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/userLogin', (_, res) => res.sendFile(path.join(__dirname, 'userLogin.html')));

// Movies API
app.get('/api/movies', async (_, res) => {
	try {
		const movies = await Movie.find({}).sort({ title: 1 }).lean();
		res.json(movies);
	} catch (err) {
		res.status(500).json({ message: 'Failed to load movies', error: err?.message });
	}
});

// Import movies from movies.json into MongoDB
app.post('/api/movies/import', async (_, res) => {
	try {
		const raw = fs.readFileSync(path.join(__dirname, 'movies.json'), 'utf-8');
		const json = JSON.parse(raw);
		const entries = Object.entries(json.movies || {});
		const docs = entries.map(([title, m]) => ({ title, ...m }));
		for (const doc of docs) {
			await Movie.updateOne({ title: doc.title }, { $set: doc }, { upsert: true });
		}
		res.json({ imported: docs.length });
	} catch (err) {
		res.status(500).json({ message: 'Import failed', error: err?.message });
	}
});

app.post('/api/users/register', async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

		const existing = await User.findOne({ email });
		if (existing) return res.status(409).json({ message: 'User already exists' });

		const hashed = await bcrypt.hash(password, 10);
		const user = await User.create({ email, password: hashed });
		return res.status(201).json({ id: user._id, email: user.email });
	} catch (err) {
		return res.status(500).json({ message: 'Registration failed' });
	}
});

app.post('/api/users/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

		const user = await User.findOne({ email });
		if (!user) return res.status(401).json({ message: 'Invalid credentials' });

		const ok = await bcrypt.compare(password, user.password);
		if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

		return res.json({ id: user._id, email: user.email });
	} catch (err) {
		return res.status(500).json({ message: 'Login failed' });
	}
});

// Reviews API
app.get('/api/reviews', async (req, res) => {
	try {
		const { title } = req.query;
		const q = title ? { title } : {};
		const reviews = await Review.find(q).sort({ createdAt: -1 }).lean();
		res.json(reviews);
	} catch (err) {
		res.status(500).json({ message: 'Failed to load reviews' });
	}
});

app.post('/api/reviews', async (req, res) => {
	try {
		const { title, email, rating, text } = req.body;
		if (!title || !email || !rating) return res.status(400).json({ message: 'title, email, and rating are required' });
		const review = await Review.create({ title, email, rating: Number(rating), text });
		res.status(201).json(review);
	} catch (err) {
		console.error('POST /api/reviews error:', err);
		res.status(500).json({ message: 'Failed to add review', error: err?.message });
	}
});

// Health endpoint to check server and DB connection
app.get('/api/health', async (_, res) => {
	const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
	const state = states[mongoose.connection.readyState] || String(mongoose.connection.readyState);
	res.json({
		server: 'ok',
		mongo: state,
		dbName: mongoose.connection.name || null
	});
});

async function start() {
	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.warn('MONGODB_URI not set. Create a .env file with MONGODB_URI.');
	}
	try {
		if (uri) {
			await mongoose.connect(uri);
			console.log('Connected to MongoDB');
		}
	} catch (e) {
		console.error('MongoDB connection error:', e.message);
	}
	app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start();
