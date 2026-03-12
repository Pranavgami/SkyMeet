import { X, Mic, MicOff, Camera, CameraOff, Wifi, WifiOff } from 'lucide-react';

export default function ParticipantsPanel({
  participants,
  localName,
  micEnabled,
  camEnabled,
  connectionStates,
  onClose,
}) {
  const getConnectionQuality = (peerId) => {
    const state = connectionStates.get(peerId);
    if (!state) return 'connecting';
    if (['connected', 'completed'].includes(state)) return 'good';
    if (['checking', 'new'].includes(state)) return 'connecting';
    return 'poor';
  };

  return (
    <div className="participants-panel">
      <div className="panel-header">
        <h3>Participants ({participants.size + 1})</h3>
        <button className="panel-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="panel-list">
        {/* Local user */}
        <div className="participant-item">
          <div className="participant-avatar">
            {localName.charAt(0).toUpperCase()}
          </div>
          <div className="participant-info">
            <span className="participant-name">{localName} (You)</span>
          </div>
          <div className="participant-status">
            {micEnabled ? (
              <Mic size={14} className="status-icon" />
            ) : (
              <MicOff size={14} className="status-icon off" />
            )}
            {camEnabled ? (
              <Camera size={14} className="status-icon" />
            ) : (
              <CameraOff size={14} className="status-icon off" />
            )}
          </div>
        </div>

        {/* Remote participants */}
        {Array.from(participants.entries()).map(([peerId, user]) => {
          const quality = getConnectionQuality(peerId);
          return (
            <div key={peerId} className="participant-item">
              <div className="participant-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="participant-info">
                <span className="participant-name">{user.name}</span>
                <span className={`participant-quality ${quality}`}>
                  {quality === 'good' ? (
                    <><Wifi size={12} /> Connected</>
                  ) : quality === 'poor' ? (
                    <><WifiOff size={12} /> Poor connection</>
                  ) : (
                    'Connecting...'
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
