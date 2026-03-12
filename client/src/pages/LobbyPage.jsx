import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Copy, Check, Mic, MicOff, Camera, CameraOff, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaContext } from '../contexts/MediaContext';
import '../styles/HomePage.css';

export default function LobbyPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name;
  const [copied, setCopied] = useState(false);
  const videoRef = useRef(null);
  const {
    localStream,
    micEnabled,
    camEnabled,
    mediaLoading,
    mediaError,
    initStream,
    toggleMic,
    toggleCam,
  } = useMediaContext();

  useEffect(() => {
    if (!name) {
      navigate('/', { replace: true });
      return;
    }
    initStream();
  }, [name, navigate, initStream]);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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

  const joinCall = () => {
    navigate(`/call/${roomId}`, { state: { name } });
  };

  if (!name) return null;

  return (
    <div className="home-container">
      <div className="home-bg-effects">
        <div className="home-bg-orb home-bg-orb--1" />
        <div className="home-bg-orb home-bg-orb--2" />
        <div className="home-bg-grid" />
      </div>

      <div className="lobby-card">
        <div className="home-logo">
          <img src="/assets/logo.png" alt="SkyMeet" className="home-logo-img" />
          <h1>SkyMeet</h1>
        </div>

        <div className="lobby-content">
          <div className="lobby-preview">
            {mediaLoading && (
              <div className="video-skeleton">
                <div className="skeleton-pulse" />
                <p>Initializing camera...</p>
              </div>
            )}
            {mediaError && (
              <div className="media-error-fallback">
                <AlertTriangle size={40} />
                <h3>
                  {mediaError === 'blocked'
                    ? 'Camera/Mic Blocked'
                    : mediaError === 'not-found'
                    ? 'No Camera/Mic Found'
                    : mediaError === 'in-use'
                    ? 'Device In Use'
                    : 'Media Error'}
                </h3>
                <p>
                  {mediaError === 'blocked'
                    ? 'Please allow camera and microphone access in your browser settings, then refresh.'
                    : mediaError === 'not-found'
                    ? 'Connect a camera and microphone to this device.'
                    : mediaError === 'in-use'
                    ? 'Close other apps using your camera and try again.'
                    : 'An unexpected error occurred. Try refreshing the page.'}
                </p>
              </div>
            )}
            {!mediaLoading && !mediaError && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`lobby-video ${!camEnabled ? 'video-hidden' : ''}`}
              />
            )}
            {!camEnabled && !mediaError && !mediaLoading && (
              <div className="cam-off-placeholder">
                <span className="avatar-circle">{name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="lobby-preview-controls">
              <button
                className={`preview-btn ${!micEnabled ? 'off' : ''}`}
                onClick={toggleMic}
                title={micEnabled ? 'Mute mic' : 'Unmute mic'}
              >
                {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button
                className={`preview-btn ${!camEnabled ? 'off' : ''}`}
                onClick={toggleCam}
                title={camEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {camEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
              </button>
            </div>
          </div>

          <div className="lobby-info">
            <h2>Ready to join?</h2>
            <p className="lobby-name">Joining as <strong>{name}</strong></p>

            <div className="room-id-display">
              <span className="room-id-label">Room ID</span>
              <div className="room-id-value" onClick={copyRoomId}>
                <code>{roomId}</code>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </div>
              <span className="room-id-hint">Share this ID with others to invite them</span>
            </div>

            <button className="btn btn-primary btn-large" onClick={joinCall}>
              <ArrowRight size={20} />
              Join Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
