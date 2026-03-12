import { useState, useEffect } from 'react';
import { Copy, Check, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RoomHeader({ roomId, participantCount }) {
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      toast.success('Room ID copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="room-header">
      <div className="room-header-left">
        <div className="header-logo">
          <img src="/assets/logo.png" alt="SkyMeet" className="header-logo-img" />
          <span className="header-logo-text">SkyMeet</span>
        </div>
        <div className="header-divider" />
        <span className="room-id-chip" onClick={copyRoomId} title="Click to copy Room ID">
          {roomId}
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </span>
      </div>
      <div className="room-header-center">
        <span className="call-timer">{formatTime(elapsed)}</span>
      </div>
      <div className="room-header-right">
        <div className="header-participant-count">
          <Users size={14} />
          <span>{participantCount}</span>
        </div>
      </div>
    </div>
  );
}
