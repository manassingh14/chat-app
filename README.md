# Chatty — Real-Time Chat Application

A full-stack real-time messaging application built with React, Node.js, Express, MongoDB, and Socket.IO. Users can register, authenticate, send text and image messages, and chat with other users with live online status indicators.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Control Flow](#control-flow)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)

---

## Features

### Authentication & User Management
- **Sign Up** — Create account with full name, email, and password (min 6 characters)
- **Login / Logout** — JWT-based authentication with HTTP-only cookies
- **Profile** — View and update profile picture (Cloudinary upload)
- **Protected Routes** — Client-side route guards based on auth state

### Messaging
- **One-to-One Chat** — Private conversations between two users
- **Text Messages** — Send and receive text messages
- **Image Sharing** — Attach and send images (stored via Cloudinary)
- **Real-Time Delivery** — Instant message delivery via WebSocket (Socket.IO)
- **Message History** — Persisted in MongoDB, loaded when opening a conversation

### User Experience
- **Online Status** — See which contacts are online (green indicator)
- **Online Filter** — Sidebar toggle to show only online users
- **Responsive UI** — Mobile-friendly layout with DaisyUI + Tailwind CSS
- **Theme Switcher** — 30+ themes (Settings page): light, dark, coffee, dracula, nord, etc.
- **Loading States** — Skeletons for sidebar and messages
- **Toast Notifications** — Success/error feedback (react-hot-toast)

### Pages
| Route     | Description                         | Access         |
|-----------|-------------------------------------|----------------|
| `/`       | Home — Chat interface               | Authenticated  |
| `/login`  | Login form                          | Guests only    |
| `/signup` | Registration form                   | Guests only    |
| `/profile`| User profile and avatar update      | Authenticated  |
| `/settings`| Theme selection and preview         | All users      |

---

## Tech Stack

| Layer   | Technology                          |
|---------|-------------------------------------|
| Frontend| React 19, Vite, Tailwind CSS, DaisyUI, Zustand, React Router, Socket.IO Client, Axios |
| Backend | Node.js, Express 5, MongoDB (Mongoose), Socket.IO, JWT, bcryptjs, Cloudinary |
| Auth    | JWT (httpOnly cookies, 7-day expiry) |
| Realtime| Socket.IO (connection + newMessage events) |

---

## Project Structure

```
ChatApp/
├── backend/
│   └── src/
│       ├── controller/
│       │   ├── auth_controlle.js    # signup, login, logout, updateProfile, checkAuth
│       │   └── message.controller.js
│       ├── lib/
│       │   ├── cloudinary.js        # Cloudinary config
│       │   ├── db.js                # MongoDB connection
│       │   ├── socket.js            # Socket.IO server, online users map
│       │   └── utils.js             # JWT generation
│       ├── middleware/
│       │   └── auth.middleware.js   # protectRoute (JWT verify)
│       ├── models/
│       │   ├── message.model.js
│       │   └── user_mode.js
│       ├── routes/
│       │   ├── auth_routes.js
│       │   └── message.route.js
│       └── index.js                 # Express app, CORS, static serve in prod
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AuthImagePattern.jsx
│       │   ├── ChatContainer.jsx
│       │   ├── ChatHeader.jsx
│       │   ├── MessageInput.jsx
│       │   ├── Navbar.jsx
│       │   ├── NoChatSelected.jsx
│       │   ├── Sidebar.jsx
│       │   └── skeletons/
│       ├── constants/
│       │   └── index.js             # THEMES
│       ├── lib/
│       │   ├── axios.js             # API client (withCredentials)
│       │   └── utils.js             # formatMessageTime
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── ProfilePage.jsx
│       │   ├── SettingsPage.jsx
│       │   └── SignUpPage.jsx
│       ├── store/
│       │   ├── useAuthStore.js      # auth, socket, onlineUsers
│       │   ├── useChatStore.js      # messages, users, selectedUser
│       │   └── useThemeStore.js     # theme (localStorage)
│       ├── App.jsx
│       └── main.jsx
├── package.json
└── README.md
```

---

## Control Flow

### 1. Application Boot & Auth Check

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  App Loads → checkAuth() → GET /api/auth/check (with JWT cookie)             │
│       ↓                                                                      │
│  Success → authUser set → connectSocket(userId) → Navigate to /              │
│  Failure → authUser null → Redirect to /login                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

- On mount, `App` calls `checkAuth()` from `useAuthStore`.
- If JWT is valid → user is set, Socket.IO connects with `userId`, user is redirected to home.
- If not → redirect to `/login` for unauthenticated routes.

---

### 2. Authentication Flow

```
Sign Up:
  Form (fullName, email, password) → POST /api/auth/signup
    → Validate & hash password (bcrypt) → Create User → generateToken (JWT cookie)
    → Respond with user object → connectSocket → toast success

Login:
  Form (email, password) → POST /api/auth/login
    → Verify credentials → generateToken (JWT cookie)
    → Respond with user object → connectSocket → toast success

Logout:
  POST /api/auth/logout → Clear JWT cookie → authUser = null → disconnectSocket
```

---

### 3. Socket.IO Flow (Online Status & Real-Time Messages)

```
Server (socket.js):
  connection → userId from query → userSocketMap[userId] = socketId
  → io.emit("getOnlineUsers", Object.keys(userSocketMap))
  disconnect → delete userSocketMap[userId] → io.emit("getOnlineUsers", ...)

Client (useAuthStore):
  connectSocket() → io(BASE_URL, { query: { userId } })
  → socket.on("getOnlineUsers", userIds) → set onlineUsers
```

- `userSocketMap` maps `userId → socketId` so the server can target a specific user.
- All clients receive `getOnlineUsers` on connect/disconnect.

---

### 4. Messaging Flow

```
Load conversation:
  User selects contact → setSelectedUser(user)
    → getMessages(userId) → GET /api/messages/:id
    → Messages stored in useChatStore
    → subscribeToMessages() → socket.on("newMessage", ...)

Send message:
  User types/sends → sendMessage({ text, image })
    → POST /api/messages/send/:id (text, image base64)
    → Backend: save to DB, upload image to Cloudinary if present
    → getReceiverSocketId(receiverId) → io.to(socketId).emit("newMessage", message)
    → Respond with message → Client appends to messages
    → Receiver (if online): socket.on("newMessage") → append to messages
```

- Sender gets the new message from the API response and appends it locally.
- Receiver gets it via Socket.IO `newMessage` if they are connected.

---

### 5. Route Protection Flow

```
App Routes:
  /           → authUser ? <HomePage /> : <Navigate to="/login" />
  /signup     → !authUser ? <SignUpPage /> : <Navigate to="/" />
  /login      → !authUser ? <LoginPage /> : <Navigate to="/" />
  /profile    → authUser ? <ProfilePage /> : <Navigate to="/login" />
  /settings   → <SettingsPage /> (always)
```

- `/`, `/profile` require auth; unauthenticated users go to `/login`.
- `/signup`, `/login` redirect to home if already logged in.
- `/settings` is available to all.

---

### 6. Profile Update Flow

```
Profile Page → User selects image → FileReader.readAsDataURL()
  → updateProfile({ profilePic: base64 }) → PUT /api/auth/update-profile
  → Backend: cloudinary.uploader.upload(profilePic)
  → User.findByIdAndUpdate(profilePic: url)
  → Respond with updated user → authUser updated in store
```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB
- Cloudinary account (for profile and message images)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/manassingh14/chat-app.git
   cd chat-app
   ```

2. **Install dependencies**
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```

3. **Configure environment**  
   Create `backend/.env` with the required variables (see [Environment Variables](#environment-variables)).

4. **Run in development**

   Terminal 1 (backend):
   ```bash
   npm run dev --prefix backend
   ```

   Terminal 2 (frontend):
   ```bash
   npm run dev --prefix frontend
   ```

   - Backend: `http://localhost:5001` (or your `PORT`)
   - Frontend: `http://localhost:5173`

5. **Production build**
   ```bash
   npm run build
   npm start
   ```

   Serves the built frontend from the backend in production.

---

## Environment Variables

Create `backend/.env`:

| Variable               | Description                         |
|------------------------|-------------------------------------|
| `PORT`                 | Server port (e.g. 5001)             |
| `MONGODB_URL`          | MongoDB connection string           |
| `JWT_SECRET`           | Secret for JWT signing              |
| `CLOUDINARY_CLOUD_NAME`| Cloudinary cloud name               |
| `CLOUDINARY_API_KEY`   | Cloudinary API key                  |
| `CLOUDINARY_API_SECRET`| Cloudinary API secret               |
| `NODE_ENV`             | `development` or `production`       |

---

## API Reference

### Auth (`/api/auth`)

| Method | Endpoint         | Auth | Description                    |
|--------|------------------|------|--------------------------------|
| POST   | `/signup`        | No   | Register new user              |
| POST   | `/login`         | No   | Login                          |
| POST   | `/logout`        | No   | Logout (clear cookie)          |
| GET    | `/check`         | Yes  | Verify JWT, return user        |
| PUT    | `/update-profile`| Yes  | Update profile picture         |

### Messages (`/api/messages`)

| Method | Endpoint      | Auth | Description                    |
|--------|---------------|------|--------------------------------|
| GET    | `/users`      | Yes  | Get all users except current   |
| GET    | `/:id`        | Yes  | Get messages with user `id`    |
| POST   | `/send/:id`   | Yes  | Send message to user `id`      |

---

## License

ISC
