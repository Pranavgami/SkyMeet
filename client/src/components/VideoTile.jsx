import { useRef, useEffect } from 'react';
import { MicOff, Wifi, WifiOff } from 'lucide-react';
import '../styles/VideoTile.css';

export default function VideoTile({
  stream,
  name,
  muted = false,
  isLocal = false,
  micEnabled = true,
  camEnabled = true,
  connectionState,
  small = false,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      if (stream) {
        videoRef.current.srcObject = stream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().some((t) => t.enabled);
  const showVideo = isLocal ? camEnabled : hasVideo;

  const qualityIndicator = () => {
    if (isLocal || !connectionState) return null;
    const good = ['connected', 'completed'].includes(connectionState);
    const poor = ['disconnected', 'failed', 'checking'].includes(connectionState);
    return (
      <div className={`connection-indicator ${good ? 'good' : poor ? 'poor' : ''}`} title={connectionState}>
        {good ? <Wifi size={14} /> : <WifiOff size={14} />}
      </div>
    );
  };

  return (
    <div className={`video-tile ${small ? 'video-tile-small' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`tile-video ${!showVideo ? 'video-hidden' : ''} ${isLocal ? 'tile-video-mirrored' : ''}`}
      />
      {!showVideo && (
        <div className="tile-avatar">
          <span className="avatar-circle">
            {name?.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
      )}
      <div className="tile-overlay">
        <span className="tile-name">{name}</span>
        <div className="tile-indicators">
          {qualityIndicator()}
          {(isLocal ? !micEnabled : false) && (
            <span className="mic-off-badge">
              <MicOff size={14} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
