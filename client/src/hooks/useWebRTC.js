import { useRef, useCallback, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function useWebRTC({ socket, localStream, screenStream, isScreenSharing }) {
  const peerConnections = useRef(new Map());
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [connectionStates, setConnectionStates] = useState(new Map());
  const pendingCandidates = useRef(new Map());

  const updateRemoteStream = useCallback((peerId, stream) => {
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.set(peerId, stream);
      return next;
    });
  }, []);

  const removeRemoteStream = useCallback((peerId) => {
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
    setConnectionStates((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  const createPeerConnection = useCallback((peerId) => {
    if (peerConnections.current.has(peerId)) {
      peerConnections.current.get(peerId).close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(peerId, pc);

    // Add local tracks
    if (localStream) {
      const streamToSend = isScreenSharing && screenStream ? screenStream : localStream;
      streamToSend.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        updateRemoteStream(peerId, stream);
      }
    };

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('signal:ice-candidate', {
          target: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Connection state monitoring
    pc.oniceconnectionstatechange = () => {
      setConnectionStates((prev) => {
        const next = new Map(prev);
        next.set(peerId, pc.iceConnectionState);
        return next;
      });

      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    return pc;
  }, [localStream, screenStream, isScreenSharing, socket, updateRemoteStream]);

  const createOffer = useCallback(async (peerId) => {
    try {
      const pc = createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('signal:offer', {
        target: peerId,
        offer: pc.localDescription,
      });

      // Flush any pending ICE candidates
      const pending = pendingCandidates.current.get(peerId);
      if (pending) {
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current.delete(peerId);
      }
    } catch (err) {
      console.error('Error creating offer:', err);
      toast.error('Failed to establish connection with a peer.');
    }
  }, [createPeerConnection, socket]);

  const handleOffer = useCallback(async (peerId, offer) => {
    try {
      const pc = createPeerConnection(peerId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('signal:answer', {
        target: peerId,
        answer: pc.localDescription,
      });

      // Flush any pending ICE candidates
      const pending = pendingCandidates.current.get(peerId);
      if (pending) {
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current.delete(peerId);
      }
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  }, [createPeerConnection, socket]);

  const handleAnswer = useCallback(async (peerId, answer) => {
    try {
      const pc = peerConnections.current.get(peerId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (peerId, candidate) => {
    try {
      const pc = peerConnections.current.get(peerId);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue candidate if remote description not set yet
        if (!pendingCandidates.current.has(peerId)) {
          pendingCandidates.current.set(peerId, []);
        }
        pendingCandidates.current.get(peerId).push(candidate);
      }
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  }, []);

  const removePeer = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    pendingCandidates.current.delete(peerId);
    removeRemoteStream(peerId);
  }, [removeRemoteStream]);

  const replaceTrack = useCallback(async (newTrack, kind) => {
    for (const [, pc] of peerConnections.current) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === kind);
      if (sender) {
        try {
          await sender.replaceTrack(newTrack);
        } catch (err) {
          console.error('Error replacing track:', err);
        }
      }
    }
  }, []);

  const closeAllConnections = useCallback(() => {
    for (const [peerId, pc] of peerConnections.current) {
      pc.close();
      removeRemoteStream(peerId);
    }
    peerConnections.current.clear();
    pendingCandidates.current.clear();
  }, [removeRemoteStream]);

  // Replace video track when screen sharing starts/stops
  useEffect(() => {
    if (isScreenSharing && screenStream) {
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      if (screenVideoTrack) {
        replaceTrack(screenVideoTrack, 'video');
      }
    } else if (!isScreenSharing && localStream) {
      const cameraVideoTrack = localStream.getVideoTracks()[0];
      if (cameraVideoTrack) {
        replaceTrack(cameraVideoTrack, 'video');
      }
    }
  }, [isScreenSharing, screenStream, localStream, replaceTrack]);

  // Set up socket listeners for signaling
  useEffect(() => {
    if (!socket) return;

    const onOffer = ({ from, offer }) => {
      handleOffer(from, offer);
    };

    const onAnswer = ({ from, answer }) => {
      handleAnswer(from, answer);
    };

    const onIceCandidate = ({ from, candidate }) => {
      handleIceCandidate(from, candidate);
    };

    socket.on('signal:offer', onOffer);
    socket.on('signal:answer', onAnswer);
    socket.on('signal:ice-candidate', onIceCandidate);

    return () => {
      socket.off('signal:offer', onOffer);
      socket.off('signal:answer', onAnswer);
      socket.off('signal:ice-candidate', onIceCandidate);
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate]);

  return {
    remoteStreams,
    connectionStates,
    createOffer,
    removePeer,
    closeAllConnections,
  };
}
