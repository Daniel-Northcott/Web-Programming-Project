# Web Programming Project - Movie Database

A full-stack web application for managing a movie database with user authentication, reviews, and an admin panel. Built with Node.js, Express, and MongoDB.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Server](#running-the-server)
- [Admin Access](#admin-access)
- [Database Management](#database-management)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)

## 🔧 Prerequisites

Before you begin, ensure you have the following installed on your system:

### 1. Node.js and npm
- **Node.js** (v14 or higher recommended)
- Download from: https://nodejs.org/
- Verify installation:
  ```powershell
  node --version
  npm --version
  ```

### 2. MongoDB Community Server
- **MongoDB Community Server** (v5.0 or higher recommended)
- Download from: https://www.mongodb.com/try/download/community
- During installation:
  - Choose "Complete" installation
  - Install as a Windows Service (recommended)
  - Note: MongoDB Compass is optional but helpful for database visualization
- Verify installation:
  ```powershell
  mongod --version
  ```

### 3. MongoDB Database Tools
- Required for `mongodump` and `mongorestore` commands
- Download from: https://www.mongodb.com/try/download/database-tools
- Extract and add to your system PATH:
  1. Extract the downloaded archive
  2. Copy the `bin` folder path (e.g., `C:\Program Files\MongoDB\Tools\100\bin`)
  3. Add to PATH: System Properties → Environment Variables → System Variables → Path → New
- Verify installation:
  ```powershell
  mongodump --version
  mongorestore --version
  ```

## 📦 Installation

1. **Clone or navigate to the project directory:**
   ```powershell
   cd c:\ENTER_DIRETORY\Web-Programming-Project
   ```

2. **Install Node.js dependencies:**
   ```powershell
   npm install
   ```

   This will install all required packages:
   - **express** (v4.22.1) - Web framework for Node.js
   - **mongoose** (v8.6.3) - MongoDB object modeling tool
   - **bcryptjs** (v2.4.3) - Password hashing library
   - **multer** (v2.0.2) - Middleware for handling file uploads
   - **dotenv** (v16.4.5) - Environment variable management
   - **nodemon** (v3.1.0 - dev) - Auto-restart server during development

## 🗄️ Database Setup

### Starting MongoDB Service

**Windows Service (if installed as service):**
```powershell
# Check if MongoDB service is running
Get-Service MongoDB

# Start MongoDB service
Start-Service MongoDB

# Stop MongoDB service (when needed)
Stop-Service MongoDB
```

**Manual Start (if not installed as service):**
```powershell
mongod --dbpath="C:\data\db"
```

### Verify MongoDB is Running

```powershell
# Connect to MongoDB shell
mongosh
# Or for older versions:
mongo
```

If connected successfully, you should see the MongoDB shell prompt.

## ⚙️ Environment Configuration

Create or verify the `.env` file in the project root with the following variables:

```env
MONGODB_URI=mongodb://localhost:27017/movies
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
ADMIN_TOKEN=admin-token
```

**Important:** Change the default admin credentials for production use!

## 🚀 Running the Server

### Development Mode (with auto-restart):
```powershell
npm run dev
```

### Production Mode:
```powershell
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

### Verify Server is Running

Open your browser and navigate to:
- **Home:** http://localhost:3000
- **Catalog:** http://localhost:3000/catalog
- **Admin Panel:** http://localhost:3000/admin
- **User Login:** http://localhost:3000/userLogin

## 🔐 Admin Access

### Logging into the Admin Panel

1. Navigate to http://localhost:3000/admin
2. Use the credentials from your `.env` file:
   - **Username:** `admin` (default, or your custom value)
   - **Password:** `password` (default, or your custom value)

### Admin Features

Once logged in, the admin panel allows you to:
- Add new movies with poster uploads
- Import movies from JSON files
- View and manage existing movies
- Access database management tools

## 💾 Database Management

### Backup (Dump) Database

Create a backup of your MongoDB database:

```powershell
npm run dump
```

This will:
- Create a timestamped backup in `./db-dumps/YYYYMMDD-HHMMSS/`
- Backup all collections from the `movies` database
- Preserve all data in BSON format

**Manual dump command:**
```powershell
./scripts/dump.ps1 -DbName movies -OutDir ./db-dumps
```

### Restore Database

Restore from the latest backup:

```powershell
npm run restore
```

This will automatically:
- Find the most recent backup in `./db-dumps/`
- Restore all collections to the `movies` database

**Restore from specific backup:**
```powershell
./scripts/restore.ps1 -DbName movies -DumpPath ./db-dumps/20251208-174407/movies
```

**Manual restore command:**
```powershell
mongorestore --db movies ./db-dumps/20251208-174407/movies
```

### Notes on Database Management
- Dumps are stored in `./db-dumps/<timestamp>/`
- If `-DumpPath` is omitted, `restore.ps1` uses the latest folder under `db-dumps` matching the DB name
- Uses `.env` to infer the database name from `MONGODB_URI` when possible
- For sharing, publish dumps outside Git (e.g., release asset or shared drive) and provide collaborators with restore instructions

### Database Collections

The application uses the following MongoDB collections:
- **users** - User accounts with hashed passwords
- **movies** - Movie information and metadata
- **reviews** - User reviews for movies
- **contact** - Contact form submissions

## 📁 Project Structure

```
Web-Programming-Project/
├── models/                 # Mongoose models
│   ├── Movie.js           # Movie schema
│   ├── Review.js          # Review schema
│   └── User.js            # User schema
├── scripts/               # Database utility scripts
│   ├── dump.ps1          # Database backup script
│   └── restore.ps1       # Database restore script
├── db-dumps/             # Database backups (timestamped)
├── Pictures/             # Uploaded movie posters
├── app.js                # Main application server
├── package.json          # Node.js dependencies
├── .env                  # Environment variables (not in git)
├── index.html            # Home page
├── catalog.html          # Movie catalog
├── admin.html            # Admin panel
├── userLogin.html        # User login/register
├── contact.html          # Contact form
├── about.html            # About page
└── style.css             # Global styles
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the server in production mode |
| `npm run dev` | Start the server with nodemon (auto-restart on changes) |
| `npm run dump` | Backup the MongoDB database |
| `npm run restore` | Restore the MongoDB database from latest backup |

## 🛠️ Troubleshooting

### MongoDB Connection Issues

**Error: "MongoServerError: connect ECONNREFUSED"**
- Ensure MongoDB service is running: `Get-Service MongoDB`
- Start the service: `Start-Service MongoDB`
- Or manually start: `mongod --dbpath="C:\data\db"`

### Port Already in Use

**Error: "EADDRINUSE: address already in use"**
- Change the `PORT` in `.env` file
- Or kill the process using port 3000:
  ```powershell
  Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
  Stop-Process -Id <PID>
  ```

### mongodump/mongorestore Not Found

- Verify MongoDB Database Tools are installed
- Check that the tools `bin` directory is in your system PATH
- Restart PowerShell after adding to PATH

### Admin Login Not Working

- Verify credentials in `.env` match what you're entering
- Check that `.env` file exists in project root
- Restart the server after changing `.env`

## 📝 Notes

- User passwords are securely hashed using bcryptjs
- File uploads (movie posters) are stored in the `Pictures/` directory
- Database backups are timestamped and stored in `db-dumps/`
- The server uses stateless authentication (username stored in localStorage)

## 🤝 Contributing

When contributing to this project:
1. Make regular database backups using `npm run dump`
2. Test changes in development mode using `npm run dev`
3. Never commit the `.env` file or sensitive credentials

---

