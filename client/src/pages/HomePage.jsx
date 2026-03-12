import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ArrowRight,
  Plus,
  Shield,
  Zap,
  MonitorSmartphone,
} from "lucide-react";
import toast from "react-hot-toast";
import "../styles/HomePage.css";

function generateRoomId() {
  return (
    Math.random().toString(36).substring(2, 8) +
    "-" +
    Math.random().toString(36).substring(2, 6)
  );
}

export default function HomePage() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    const newRoomId = generateRoomId();
    navigate(`/lobby/${newRoomId}`, { state: { name: name.trim() } });
  };

  const handleJoinRoom = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!roomId.trim()) {
      toast.error("Please enter a Room ID");
      return;
    }
    navigate(`/lobby/${roomId.trim()}`, { state: { name: name.trim() } });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (roomId.trim()) {
        handleJoinRoom();
      } else if (name.trim()) {
        handleCreateRoom();
      }
    }
  };

  return (
    <div className="home-container">
      <div className="home-bg-effects">
        <div className="home-bg-orb home-bg-orb--1" />
        <div className="home-bg-orb home-bg-orb--2" />
        <div className="home-bg-orb home-bg-orb--3" />
        <div className="home-bg-grid" />
      </div>

      <div className="home-card">
        <div className="home-logo">
          <img src="/assets/logo.png" alt="SkyMeet" className="home-logo-img" />
          <h1>SkyMeet</h1>
        </div>
        <p className="home-subtitle">
          Secure, high-quality video calls right in your browser. No downloads
          required.
        </p>

        <div className="home-form">
          <div className="input-group">
            <Users size={18} />
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={30}
              autoFocus
            />
          </div>

          <button className="btn btn-primary" onClick={handleCreateRoom}>
            <Plus size={18} />
            Create New Room
          </button>

          <div className="divider">
            <span>or join existing</span>
          </div>

          <div className="input-group">
            <Shield size={18} />
            <input
              type="text"
              placeholder="Paste Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleJoinRoom}
            disabled={!roomId.trim()}
          >
            <ArrowRight size={18} />
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
