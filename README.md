# SkyMeet - Video Calling Platform

A production-grade peer-to-peer video calling platform built with React, Node.js, WebRTC, and Socket.io.

## Features

- Create or join rooms with a shareable Room ID
- Multi-user video calls (up to 5 participants)
- Mic/camera toggle, screen sharing
- Participants panel with connection quality indicators
- Auto-reconnect on socket disconnect
- Toast notifications for join/leave events
- Responsive dark-themed UI

## Tech Stack

- **Client:** React 19, React Router v7, Socket.io Client
- **Server:** Node.js, Express, Socket.io
- **Real-time:** WebRTC (browser-native) with Socket.io signaling

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Server

```bash
cd server
cp .env.example .env
npm install
npm run dev
npm start
```

Server runs on `http://localhost:5000` by default.

### Client

```bash
cd client
cp .env.example .env
npm install
npm start
```

Client runs on `http://localhost:3000` by default.

## Usage

1. Open `http://localhost:3000` in your browser
2. Enter your name and click **Create New Room**
3. Share the Room ID with others
4. Other participants enter the Room ID and click **Join Room**
5. Preview your camera in the lobby, then click **Join Call**

## Architecture

- **Mesh topology:** Each participant connects directly to every other participant via WebRTC
- **Signaling server:** Socket.io relays SDP offers/answers and ICE candidates
- **STUN servers:** Google's public STUN servers for NAT traversal
- **Room state:** In-memory Map on the server, auto-cleaned on disconnect
