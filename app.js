/**
 * Application Entry Point
 * -----------------------
 * Express server providing static pages and JSON APIs for:
 *  - Movies: listing and import from local JSON file
 *  - Users: registration and login with bcrypt password hashing
 *  - Reviews: create and list movie reviews
 *  - Health: simple status check of server and MongoDB connection
 *
 * Authentication Strategy: lightweight, stateless; client stores username in localStorage.
 * Legacy Handling: login route backfills missing usernames for early accounts created before username field existed.
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const multer = require('multer');
const {MongoClient} = require("mongodb")

const User = require(path.join(__dirname, 'models', 'User.js'));
const Review = require(path.join(__dirname, 'models', 'Review.js'));
const Movie = require(path.join(__dirname, 'models', 'Movie.js'));

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-token';
const CLIENT = new MongoClient('mongodb://127.0.0.1:27017/')

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/catalog', (_, res) => res.sendFile(path.join(__dirname, 'catalog.html')));
app.get('/contact', (_, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/about', (_, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/userLogin', (_, res) => res.sendFile(path.join(__dirname, 'userLogin.html')));
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// -----------------------------------------------------------------------------
// Admin Auth + Middleware
// -----------------------------------------------------------------------------
/**
 * POST /api/admin/login
 * Simple credential check against env or defaults; returns a bearer token.
 */
app.post('/api/admin/login', (req, res) => {
	const { username, password } = req.body || {};
	if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
		return res.json({ token: ADMIN_TOKEN });
	}
	return res.status(401).json({ message: 'Invalid admin credentials' });
});

function requireAdmin(req, res, next) {
	const auth = req.headers.authorization || '';
	const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
	if (token === ADMIN_TOKEN) return next();
	return res.status(403).json({ message: 'Admin authorization required' });
}

// async function for inserting contact details into database
async function insertContact(name, email, issue, description){
	await CLIENT.connect()
	var db = CLIENT.db('movies')
	var coll = db.collection('contact')
	coll.insertOne({
		'Name' : name,
		'Email' : email,
		'Issue' : issue,
		'Description' : description
	})
}

// Multer storage for poster uploads
const picturesDir = path.join(__dirname, 'Pictures');
if (!fs.existsSync(picturesDir)) fs.mkdirSync(picturesDir, { recursive: true });
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, picturesDir),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname) || '.jpg';
		const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
		const unique = `${base}-${Date.now()}${ext}`;
		cb(null, unique);
	}
});
const upload = multer({ storage });

// -----------------------------------------------------------------------------
// Movies API
// -----------------------------------------------------------------------------
/**
 * GET /api/movies
 * Returns all movies sorted by title.
 */
app.get('/api/movies', async (_, res) => {
	try {
		const movies = await Movie.find({}).sort({ title: 1 }).lean();
		res.json(movies);
	} catch (err) {
		res.status(500).json({ message: 'Failed to load movies', error: err?.message });
	}
});

/**
 * POST /api/movies/import
 * Imports movies from local movies.json file; upserts each entry by title.
 */
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

// -----------------------------------------------------------------------------
// User Registration & Login
// -----------------------------------------------------------------------------
/**
 * POST /api/users/register
 * Validates required fields, checks uniqueness, hashes password, stores new user.
 * Responds with minimal identifying info (id, username).
 */
app.post('/api/users/register', async (req, res) => {
	try {
		const { firstName, lastName, username, email, password } = req.body;
		if (!username || !email || !password) return res.status(400).json({ message: 'username, email, and password required' });

		const existingEmail = await User.findOne({ email });
		if (existingEmail) return res.status(409).json({ message: 'Email already in use' });
		const existingUsername = await User.findOne({ username });
		if (existingUsername) return res.status(409).json({ message: 'Username already taken' });

		const hashed = await bcrypt.hash(password, 10);
		const user = await User.create({ firstName, lastName, username, email, password: hashed });
		return res.status(201).json({ id: user._id, username: user.username });
	} catch (err) {
		return res.status(500).json({ message: 'Registration failed', error: err?.message });
	}
});

/**
 * POST /api/users/login
 * Allows login by username OR email. Backfills missing username for legacy users.
 * Responds with id and username.
 */
app.post('/api/users/login', async (req, res) => {
	try {
		const { username, email, password } = req.body;
		if ((!username && !email) || !password) return res.status(400).json({ message: 'username or email and password required' });

		const user = await User.findOne(username ? { username } : { email });
		if (!user) return res.status(401).json({ message: 'Invalid credentials' });

		const ok = await bcrypt.compare(password, user.password);
		if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

		// Backfill username for legacy users that were created before username field existed
		if (!user.username) {
			const derived = user.email ? user.email.split('@')[0].toLowerCase() : `user${user._id.toString().slice(-4)}`;
			// Ensure uniqueness if collision
			let finalName = derived;
			let collisionCount = 0;
			while (await User.findOne({ username: finalName })) {
				collisionCount += 1;
				finalName = `${derived}${collisionCount}`;
			}
			user.username = finalName;
			await user.save();
		}

		return res.json({ id: user._id, username: user.username });
	} catch (err) {
		return res.status(500).json({ message: 'Login failed', error: err?.message });
	}
});

// -----------------------------------------------------------------------------
// Reviews API
// -----------------------------------------------------------------------------
/**
 * GET /api/reviews?title=OptionalTitle
 * Lists reviews globally or filtered by movie title (descending creation time).
 */
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

/**
 * POST /api/reviews
 * Creates a new review (title, username, rating required). Rating coerced to Number.
 */
app.post('/api/reviews', async (req, res) => {
	try {
		const { title, username, rating, text } = req.body;
		if (!title || !username || !rating) return res.status(400).json({ message: 'title, username, and rating are required' });
		const review = await Review.create({ title, username, rating: Number(rating), text });
		res.status(201).json(review);
	} catch (err) {
		console.error('POST /api/reviews error:', err);
		res.status(500).json({ message: 'Failed to add review', error: err?.message });
	}
});

// -----------------------------------------------------------------------------
// Admin APIs
// -----------------------------------------------------------------------------
/**
 * GET /api/admin/stats
 * Returns user count, review count, movie count, and per-user stats.
 */
app.get('/api/admin/stats', requireAdmin, async (_, res) => {
	try {
		const [userCount, reviewCount, movieCount] = await Promise.all([
			User.countDocuments({}),
			Review.countDocuments({}),
			Movie.countDocuments({}),
		]);

		// per-user stats: number of reviews and average rating
		const agg = await Review.aggregate([
			{
				$group: {
					_id: '$username',
					reviews: { $sum: 1 },
					avgRating: { $avg: '$rating' },
				},
			},
			{ $sort: { reviews: -1 } },
			{ $limit: 50 },
		]);

		res.json({ userCount, reviewCount, movieCount, users: agg });
	} catch (err) {
		res.status(500).json({ message: 'Failed to load admin stats', error: err?.message });
	}
});

/**
 * POST /api/admin/movies
 * Adds a movie (title required). Upserts by title.
 */
app.post('/api/admin/movies', requireAdmin, async (req, res) => {
	try {
		const { title, year, genre, description, poster } = req.body || {};
		if (!title) return res.status(400).json({ message: 'title required' });
		const doc = { title };
		if (year) doc.year = Number(year);
		if (genre) doc.genre = genre;
		if (description) doc.description = description;
		// Normalize poster into canonical field `image` (filename only)
		if (poster) {
			const cleaned = String(poster).replace(/^\/?Pictures\//, '');
			doc.image = cleaned;
		}
		await Movie.updateOne({ title }, { $set: doc }, { upsert: true });
		const saved = await Movie.findOne({ title }).lean();
		res.status(201).json(saved);
	} catch (err) {
		res.status(500).json({ message: 'Failed to add movie', error: err?.message });
	}
});

/**
 * POST /api/admin/movies/upload
 * Multipart form: fields (title, year, genre, description) + file "poster".
 * Saves file to /Pictures and stores poster path "/Pictures/<filename>".
 */
app.post('/api/admin/movies/upload', requireAdmin, upload.single('poster'), async (req, res) => {
	try {
		const { title, year, genre, description } = req.body || {};
		if (!title) return res.status(400).json({ message: 'title required' });
		let imageFilename;
		if (req.file) {
			imageFilename = req.file.filename; // store filename only
		}
		const doc = { title };
		if (year) doc.year = Number(year);
		if (genre) doc.genre = genre;
		if (description) doc.description = description;
		if (imageFilename) doc.image = imageFilename;
		await Movie.updateOne({ title }, { $set: doc }, { upsert: true });
		const saved = await Movie.findOne({ title }).lean();
		res.status(201).json(saved);
	} catch (err) {
		res.status(500).json({ message: 'Failed to upload movie/poster', error: err?.message });
	}
});

/**
 * DELETE /api/admin/movies/:id
 * Removes a movie by Mongo _id. Also optionally supports `?title=`.
 */
app.delete('/api/admin/movies/:id', requireAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const { title } = req.query;
		let result;
		if (title) {
			result = await Movie.deleteOne({ title });
		} else {
			result = await Movie.deleteOne({ _id: id });
		}
		res.json({ deletedCount: result.deletedCount });
	} catch (err) {
		res.status(500).json({ message: 'Failed to delete movie', error: err?.message });
	}
});

// -----------------------------------------------------------------------------
// Health Endpoint
// -----------------------------------------------------------------------------
/**
 * GET /api/health
 * Returns server status and current Mongo connection state for diagnostics.
 */
app.get('/api/health', async (_, res) => {
	const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
	const state = states[mongoose.connection.readyState] || String(mongoose.connection.readyState);
	res.json({
		server: 'ok',
		mongo: state,
		dbName: mongoose.connection.name || null
	});
});

/**
 * start
 * Initializes MongoDB connection (if URI provided) then starts Express server.
 * Logs connection outcomes to console.
 */
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


// post /contact_action
app.post("/contact_action", function(req, res){
	var query = req.body
	var name = query.name
	var issue = query.issue
	var email = query.email
	var description = query.description
	insertContact(name, email, issue, description)
	res.sendFile(path.join(__dirname,"contact_action.html"))
})

app.get('/get_movies', function(req, res){
	res.send({'key' : 'value'})
})

app.get('/source.js', function(res, req){
	res.sendFile(path.join(__dirname, "source.js"))
})

async function getMovies(){
    await CLIENT.connect()
    var db = CLIENT.db('movies')
    var coll = db.collection('movies')
    var movies = await coll.find({}).toArray()
    await CLIENT.close()
    return movies
}

getMovies()

start();
