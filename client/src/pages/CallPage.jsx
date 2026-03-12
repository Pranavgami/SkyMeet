import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Monitor, Mic, MicOff, Camera, CameraOff, MonitorOff } from 'lucide-react';
import { useSocketContext } from '../contexts/SocketContext';
import { useMediaContext } from '../contexts/MediaContext';
import useWebRTC from '../hooks/useWebRTC';
import VideoTile from '../components/VideoTile';
import ControlsBar from '../components/ControlsBar';
import ParticipantsPanel from '../components/ParticipantsPanel';
import RoomHeader from '../components/RoomHeader';
import '../styles/CallPage.css';

export default function CallPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name;
  const { socket } = useSocketContext();
  const {
    localStream,
    screenStream,
    micEnabled,
    camEnabled,
    isScreenSharing,
    initStream,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    stopAllStreams,
  } = useMediaContext();

  const [participants, setParticipants] = useState(new Map());
  const [showParticipants, setShowParticipants] = useState(false);
  const joinedRef = useRef(false);
  const screenVideoRef = useRef(null);

  const {
    remoteStreams,
    connectionStates,
    createOffer,
    removePeer,
    closeAllConnections,
  } = useWebRTC({
    socket,
    localStream,
    screenStream,
    isScreenSharing,
  });

  // Attach screen stream to presenter video
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Leave call handler
  const leaveCall = useCallback(() => {
    if (socket) {
      socket.emit('room:leave');
    }
    closeAllConnections();
    stopAllStreams();
    navigate('/', { replace: true });
  }, [socket, closeAllConnections, stopAllStreams, navigate]);

  // Initialize media and join room
  useEffect(() => {
    if (!name) {
      navigate('/', { replace: true });
      return;
    }

    if (joinedRef.current) return;

    const setup = async () => {
      let stream = localStream;
      if (!stream) {
        stream = await initStream();
      }

      if (!socket) return;

      try {
        joinedRef.current = true;
        socket.emit('room:join', { roomId, name }, (response) => {
          if (!response.success) {
            toast.error(response.error || 'Failed to join room');
            navigate('/', { replace: true });
            return;
          }

          const usersMap = new Map();
          response.users.forEach((user) => {
            if (user.socketId !== socket.id) {
              usersMap.set(user.socketId, user);
            }
          });
          setParticipants(usersMap);

          for (const user of response.users) {
            if (user.socketId !== socket.id) {
              createOffer(user.socketId);
            }
          }
        });
      } catch (err) {
        toast.error('Failed to join room');
        navigate('/', { replace: true });
      }
    };

    setup();
  }, [name, socket, roomId, navigate, initStream, localStream, createOffer]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const onUserJoined = ({ socketId, name: userName }) => {
      toast.success(`${userName} joined the call`);
      setParticipants((prev) => {
        const next = new Map(prev);
        next.set(socketId, { socketId, name: userName });
        return next;
      });
    };

    const onUserLeft = ({ socketId, name: userName }) => {
      toast(`${userName} left the call`, { icon: '\uD83D\uDC4B' });
      setParticipants((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      removePeer(socketId);
    };

    socket.on('room:user-joined', onUserJoined);
    socket.on('room:user-left', onUserLeft);

    return () => {
      socket.off('room:user-joined', onUserJoined);
      socket.off('room:user-left', onUserLeft);
    };
  }, [socket, removePeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket && joinedRef.current) {
        socket.emit('room:leave');
      }
      closeAllConnections();
    };
  }, [socket, closeAllConnections]);

  if (!name) return null;

  // Build participant tiles
  const participantTiles = [];
  for (const [peerId, participant] of participants) {
    const stream = remoteStreams.get(peerId);
    const connState = connectionStates.get(peerId);
    participantTiles.push(
      <VideoTile
        key={peerId}
        stream={stream}
        name={participant.name}
        connectionState={connState}
        muted={false}
        isLocal={false}
      />
    );
  }

  const totalRemote = participantTiles.length;

  // Determine layout
  const renderContent = () => {
    // Screen sharing active — presenter layout
    if (isScreenSharing && screenStream) {
      return (
        <div className="presenter-layout">
          <div className="presenter-main">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className="presenter-main-video"
            />
            <div className="presenter-label">
              <Monitor size={14} />
              <span>You are presenting</span>
            </div>
          </div>
          <div className="presenter-sidebar">
            <VideoTile
              stream={localStream}
              name="You"
              muted
              isLocal
              micEnabled={micEnabled}
              camEnabled={camEnabled}
              small
            />
            {participantTiles}
          </div>
        </div>
      );
    }

    // Normal grid layout
    const gridClass =
      totalRemote === 0
        ? 'video-grid grid-1'
        : totalRemote === 1
        ? 'video-grid grid-2'
        : totalRemote <= 3
        ? 'video-grid grid-4'
        : 'video-grid grid-6';

    return (
      <>
        <div className={gridClass}>
          {totalRemote === 0 && (
            <VideoTile
              stream={localStream}
              name={`${name} (You)`}
              muted
              isLocal
              micEnabled={micEnabled}
              camEnabled={camEnabled}
            />
          )}
          {participantTiles}
        </div>

        {totalRemote > 0 && (
          <div className="self-view-pip">
            <VideoTile
              stream={localStream}
              name="You"
              muted
              isLocal
              micEnabled={micEnabled}
              camEnabled={camEnabled}
              small
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="call-container">
      <RoomHeader roomId={roomId} participantCount={participants.size + 1} />

      <div className="call-main">
        <div className={`call-grid-area ${showParticipants ? 'with-panel' : ''}`}>
          {renderContent()}
        </div>

        {showParticipants && (
          <ParticipantsPanel
            participants={participants}
            localName={name}
            micEnabled={micEnabled}
            camEnabled={camEnabled}
            connectionStates={connectionStates}
            onClose={() => setShowParticipants(false)}
          />
        )}
      </div>

      {/* Screen share floating popup */}
      {isScreenSharing && (
        <div className="screen-share-popup">
          <div className="popup-indicator">
            <div className="popup-indicator-dot" />
            <span>Sharing screen</span>
          </div>
          <div className="popup-divider" />
          <button
            className={`popup-btn ${!micEnabled ? 'popup-btn-off' : ''}`}
            onClick={toggleMic}
            title={micEnabled ? 'Mute' : 'Unmute'}
          >
            {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          <button
            className={`popup-btn ${!camEnabled ? 'popup-btn-off' : ''}`}
            onClick={toggleCam}
            title={camEnabled ? 'Stop camera' : 'Start camera'}
          >
            {camEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>
          <div className="popup-divider" />
          <button
            className="popup-btn popup-btn-stop"
            onClick={stopScreenShare}
            title="Stop sharing"
          >
            <MonitorOff size={16} />
            <span>Stop sharing</span>
          </button>
        </div>
      )}

      <ControlsBar
        micEnabled={micEnabled}
        camEnabled={camEnabled}
        isScreenSharing={isScreenSharing}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onToggleParticipants={() => setShowParticipants((p) => !p)}
        onLeave={leaveCall}
        participantCount={participants.size + 1}
      />
    </div>
  );
}
