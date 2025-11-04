# Stencil Backend

Simple Express backend for the Stencil control app.

Features:
- SQLite database (migration SQL included)
- Authentication with bcrypt + JWT
- Endpoints: /api/auth, /api/lines, /api/logs

Quick start (PowerShell):

```powershell
cd c:\app\stencil\backend
copy .env.example .env
# edit .env if needed
npm install
node server.js --migrate
npm run dev
```

API endpoints:
- POST /api/auth/register { username, password, admin?, rol? }
- POST /api/auth/login { username, password }
- GET /api/lines
- POST /api/lines/:id/start { stencil }
- POST /api/lines/:id/stop
- POST /api/lines/:id/reset
- GET /api/logs (admin only)
