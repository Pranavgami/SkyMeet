import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function useMediaStream() {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const initStream = useCallback(async () => {
    setMediaLoading(true);
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMicEnabled(true);
      setCamEnabled(true);
      setMediaLoading(false);
      return stream;
    } catch (err) {
      setMediaLoading(false);
      let message = 'Could not access camera/microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera/microphone access was denied. Please allow permissions in your browser settings.';
        setMediaError('blocked');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera or microphone found on this device.';
        setMediaError('not-found');
      } else if (err.name === 'NotReadableError') {
        message = 'Camera or microphone is already in use by another application.';
        setMediaError('in-use');
      } else {
        setMediaError('unknown');
      }
      toast.error(message);
      return null;
    }
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicEnabled(audioTrack.enabled);
    }
  }, []);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamEnabled(videoTrack.enabled);
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
      screenStreamRef.current = screen;
      setScreenStream(screen);
      setIsScreenSharing(true);

      // When user stops sharing via browser UI
      screen.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        screenStreamRef.current = null;
        setIsScreenSharing(false);
      };

      return screen;
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        toast.error('Failed to start screen sharing.');
      }
      return null;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    const screen = screenStreamRef.current;
    if (screen) {
      screen.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  }, []);

  const stopAllStreams = useCallback(() => {
    const local = localStreamRef.current;
    if (local) {
      local.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    stopScreenShare();
  }, [stopScreenShare]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    localStream,
    screenStream,
    micEnabled,
    camEnabled,
    isScreenSharing,
    mediaLoading,
    mediaError,
    initStream,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    stopAllStreams,
  };
}
