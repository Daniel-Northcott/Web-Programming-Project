# Web Programming Project

## Database Dump/Restore
- Requires MongoDB Database Tools (`mongodump`, `mongorestore`) in PATH.
- Uses `.env` to infer the database name from `MONGODB_URI` when possible.

### Commands (PowerShell)
- Dump current database:
  - `npm run dump`
  - or `./scripts/dump.ps1 -DbName movies -OutDir ./db-dumps`
- Restore from latest dump:
  - `npm run restore`
  - or `./scripts/restore.ps1 -DbName movies -DumpPath ./db-dumps/<timestamp>/movies`

### Notes
- Dumps are stored in `./db-dumps/<timestamp>/`.
- If `-DumpPath` is omitted, `restore.ps1` uses the latest folder under `db-dumps` matching the DB name.
- For sharing, publish dumps outside Git (e.g., release asset or shared drive) and provide collaborators with restore instructions.
