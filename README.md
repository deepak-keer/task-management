# TaskFlow — Team Task Management System

A production-ready, real-time team task management platform built with Next.js 14 and NestJS. Inspired by Linear, Jira, and Notion — built for small to mid-size teams.

---

## Features

- **Real-time collaboration** via Socket.io — task moves, comments, notifications sync instantly
- **Kanban board** with drag-and-drop (dnd-kit) and optimistic updates
- **Three-role system**: Super Admin, Admin, Member
- **Dynamic permissions engine** — Super Admin can toggle any feature per role in real-time
- **Invite-only registration** with approval flow
- **Rich task detail**: TipTap descriptions, subtasks, file attachments, watchers, activity log
- **Comments** with @mentions, emoji reactions, and typing indicators
- **Calendar view** of tasks by due date
- **Global command palette** (⌘K) for quick navigation
- **Notification system**: in-app, real-time, paginated with per-type preferences
- **Dark/light mode** saved to database per user
- **Due date reminders** via hourly cron job
- **Admin panel**: user management, invite links, workspace overview
- **Super Admin panel**: user approvals/bans, permissions config, analytics charts

---

## Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account (free tier works)

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd task-manager

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure environment variables

**Backend** — copy `.env.example` to `.env`:
```bash
cd backend && cp .env.example .env
```
Edit `.env`:
```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/taskmanager
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Frontend** — copy `.env.example` to `.env.local`:
```bash
cd frontend && cp .env.example .env.local
```
```
NEXT_PUBLIC_API_URL=https://task-management-k9q8.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://task-management-k9q8.onrender.com
```

### 3. Seed the Super Admin

```bash
cd backend
npm run seed
```

This creates:
- **Email**: `admin@taskflow.dev`
- **Password**: `Admin@12345`

⚠️ **Change this password immediately after first login.**

### 4. Run the applications

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## First Steps After Setup

1. Log in as `admin@taskflow.dev` / `Admin@12345`
2. Go to **Settings** → **Invite Links** → create an invite link
3. Share the link with team members to register
4. Go to **Admin → Users** → approve pending registrations
5. Go to **Admin → Permissions** → configure role access

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `Esc` | Close modal / command palette |
| `↑↓` in command palette | Navigate results |
| `↵` in command palette | Open selected item |

---

## WebSocket Events Reference

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-board` | Client → Server | Join a project room |
| `leave-board` | Client → Server | Leave a project room |
| `typing-comment` | Client → Server | Broadcast typing indicator |
| `online-status-changed` | Client → Server | Update online presence |
| `task-created` | Server → Project Room | New task broadcast |
| `task-updated` | Server → Project Room | Task change broadcast |
| `task-moved` | Server → Project Room | Task column change |
| `task-deleted` | Server → Project Room | Task deletion |
| `comment-added` | Server → Project Room | New comment |
| `comment-updated` | Server → Project Room | Comment edit |
| `user-joined-board` | Server → Project Room | User joined board |
| `user-left-board` | Server → Project Room | User left board |
| `notification` | Server → User | Personal notification |
| `permissions-updated` | Server → All | Role permission change |
| `user-registered` | Server → Admins | New user pending approval |
| `user-approved` | Server → User | Account approved |
| `user-rejected` | Server → User | Account rejected |

---

## Folder Structure

```
task-manager/
├── backend/                    # NestJS backend
│   └── src/
│       ├── auth/               # JWT auth, guards, strategies
│       ├── users/              # User profiles, stats, recently viewed
│       ├── projects/           # Project CRUD + member management
│       ├── tasks/              # Full task lifecycle
│       ├── comments/           # Comments with @mentions + reactions
│       ├── notifications/      # Real-time notification system
│       ├── invites/            # Invite link generation + validation
│       ├── permissions/        # Role-based permissions engine
│       ├── gateway/            # Socket.io WebSocket gateway
│       ├── scheduler/          # Due date reminder cron jobs
│       └── super-admin/        # Super admin endpoints
└── frontend/                   # Next.js 14 frontend
    ├── app/                    # App Router pages
    │   ├── (auth)/             # Login, register
    │   ├── (main)/             # Dashboard, tasks, projects, calendar
    │   ├── (admin)/            # Settings (admin)
    │   └── (super-admin)/      # Admin panel (super admin)
    ├── components/
    │   ├── board/              # Kanban column + task card
    │   ├── tasks/              # Task creation modal
    │   ├── ui/                 # Design system components
    │   ├── layout/             # Sidebar + header
    │   └── shared/             # Command palette
    ├── store/                  # Redux Toolkit store
    │   ├── slices/             # auth, board, ui, socket, notifications
    │   └── middleware/         # Socket.io ↔ Redux bridge
    ├── services/               # RTK Query API slices
    ├── hooks/                  # usePermission, useAuth, useSocket
    └── lib/                    # Utilities and constants
```

---

## Tech Stack

### Backend
- **NestJS** — modular Node.js framework
- **MongoDB + Mongoose** — flexible document database
- **Socket.io** — real-time WebSocket communication
- **JWT + Passport** — authentication
- **@nestjs/schedule** — cron job scheduler
- **bcryptjs** — password hashing

### Frontend
- **Next.js 14** (App Router) — React framework
- **Redux Toolkit + RTK Query** — state management + data fetching
- **@dnd-kit** — accessible drag-and-drop
- **Recharts** — analytics charts
- **Tailwind CSS** — utility-first styling
- **react-hot-toast** — toast notifications
- **lucide-react** — icon library

---

## API Endpoints Summary

| Module | Endpoints |
|--------|-----------|
| Auth | POST /auth/login, POST /auth/register, GET /auth/me |
| Users | GET/PATCH /users/:id, PATCH /users/:id/password |
| Projects | CRUD /projects, member management |
| Tasks | CRUD /tasks, move, subtasks, watch, attachments |
| Comments | CRUD /comments, reactions |
| Notifications | GET/PATCH /notifications |
| Invites | CRUD /invites, GET /invites/validate/:token |
| Permissions | GET/PATCH /permissions (super admin) |
| Super Admin | /super-admin/users, /super-admin/stats, /super-admin/workspaces |

---

## License

MIT
# task-management
