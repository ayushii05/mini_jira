# Mini-Jira — Monolithic Bug Tracking System

A full-stack bug tracking web application built in a single root directory using Node.js/Express, React/Vite, Tailwind CSS, and SQLite3 with Role-Based Access Control (RBAC).

---

## Features

- **Light and Dark Mode**: Toggle between light and dark themes with persistent user preferences.
- **Dashboard**: Live analytics powered by Recharts, showing open vs. closed bug ratios and issue breakdowns.
- **Kanban Board**: Drag-and-drop interface across To Do, In Progress, and Done columns with visual drop rejection for non-developers.
- **Backlog Management**: Sprint tracking, progress metrics, real-time search, and multi-criteria filters.
- **Bug List**: Server-side paginated table with real-time search by title or numeric ID.
- **Issue Creation Modal**: Client-side validated form restricted to Tester accounts.
- **Member Management**: User role administration restricted to Admin accounts.
- **Issue Details & Comments**: Sliding drawer with field editing and activity feeds.

---

## Role-Based Access Control (RBAC)

Authentication is handled via mocked request headers (`x-user-id` or `user_id`). The server strictly enforces permissions:

| Role | Allowed Actions | Restricted Actions |
| :--- | :--- | :--- |
| **Admin** | Update user roles (`PATCH /api/users/:id/role`), manage sprints | Cannot create tickets or move cards on board |
| **Tester** | Create tickets (`POST /api/tickets`) | Cannot update ticket status or change roles |
| **Developer** | Update ticket status (`PATCH /api/tickets/:id/status`), move board cards | Cannot create tickets or change roles |

---

## Project Structure

```
mini-jira/
├── public/                 # Production build output directory
│   ├── assets/             # Bundled JS and CSS
│   └── index.html          # SPA entry point served by Express
├── server/
│   ├── index.js            # Express API and static file server
│   ├── db.js               # SQLite database setup, migrations, and seeds
│   └── middleware/
│       └── auth.js         # Header-based RBAC middleware
├── src/
│   ├── components/         # React UI components (Board, Backlog, Dashboard, etc.)
│   ├── AuthContext.jsx     # Session state and mock authentication
│   ├── ThemeContext.jsx    # Light/Dark mode state management
│   ├── api.js              # Fetch client attaching auth headers
│   ├── App.jsx             # Main view router and shell
│   ├── index.css           # Styling and theme tokens
│   └── main.jsx
├── database.sqlite         # Local SQLite database file
├── vite.config.js          # Vite build configuration (outputs to public/)
├── test-api.cjs            # Automated API and RBAC verification test suite
└── package.json            # Root configuration running concurrently
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Runs the Express backend (port 3001) and Vite dev server (port 5173) simultaneously:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

### 3. Run in Production Mode (Unified Server)
Builds the frontend into `./public` and serves everything through Express:
```bash
npm run build
npm start
```
- Full App: `http://localhost:3001`

### 4. Run Automated Test Suite
Executes the test suite verifying all 23 backend constraints and RBAC rules:
```bash
node test-api.cjs
```

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs backend and frontend concurrently |
| `npm run server` | Starts only the Express backend server |
| `npm run client` | Starts only the Vite frontend dev server |
| `npm run build` | Builds the React application into `./public` |
| `npm start` | Runs the Express server serving static assets from `./public` |

---

## Tech Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS, Recharts 2
- **Backend**: Node.js, Express 4, SQLite3, CORS, Concurrently
- **Database**: SQLite3 (Local zero-config database)


[def]: image-2.png
