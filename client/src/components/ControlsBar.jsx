import {
  Mic, MicOff, Camera, CameraOff,
  Monitor, MonitorOff, Users, PhoneOff,
} from 'lucide-react';
import '../styles/ControlsBar.css';

export default function ControlsBar({
  micEnabled,
  camEnabled,
  isScreenSharing,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleParticipants,
  onLeave,
  participantCount,
}) {
  return (
    <div className="controls-bar">
      <div className="controls-group">
        <button
          className={`control-btn ${!micEnabled ? 'control-off' : ''}`}
          onClick={onToggleMic}
          title={micEnabled ? 'Mute microphone (Alt+M)' : 'Unmute microphone (Alt+M)'}
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          <span className="control-label">{micEnabled ? 'Mute' : 'Unmute'}</span>
        </button>

        <button
          className={`control-btn ${!camEnabled ? 'control-off' : ''}`}
          onClick={onToggleCam}
          title={camEnabled ? 'Turn off camera (Alt+V)' : 'Turn on camera (Alt+V)'}
        >
          {camEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
          <span className="control-label">{camEnabled ? 'Camera' : 'Camera'}</span>
        </button>

        <button
          className={`control-btn ${isScreenSharing ? 'control-active' : ''}`}
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop presenting' : 'Present your screen'}
        >
          {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          <span className="control-label">{isScreenSharing ? 'Presenting' : 'Present'}</span>
        </button>

        <button
          className="control-btn"
          onClick={onToggleParticipants}
          title="Show participants"
        >
          <Users size={20} />
          <span className="control-label">People</span>
          {participantCount > 1 && (
            <span className="control-badge">{participantCount}</span>
          )}
        </button>
      </div>

      <button
        className="control-btn control-end"
        onClick={onLeave}
        title="Leave call"
      >
        <PhoneOff size={20} />
        <span className="control-label">Leave</span>
      </button>
    </div>
  );
}
