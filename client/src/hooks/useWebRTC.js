import { useRef, useCallback, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Free TURN relay — needed when both peers are behind NAT/firewalls
    // that block direct peer-to-peer connections (common on mobile/corporate nets)
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export default function useWebRTC({ socket, localStream, screenStream, isScreenSharing }) {
  const peerConnections = useRef(new Map());
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [connectionStates, setConnectionStates] = useState(new Map());
  const pendingCandidates = useRef(new Map());

  // Refs so createPeerConnection always reads the LATEST stream values,
  // even when called from a stale closure (e.g. inside a socket callback
  // that fired after React state updated but before the effect re-ran).
  const localStreamRef = useRef(localStream);
  const screenStreamRef = useRef(screenStream);
  const isScreenSharingRef = useRef(isScreenSharing);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

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

    // Read from refs — always gets the LATEST stream regardless of when
    // this callback was created (avoids stale-closure race condition)
    const stream = localStreamRef.current;
    const screen = screenStreamRef.current;
    const sharing = isScreenSharingRef.current;

    if (stream) {
      const streamToSend = sharing && screen ? screen : stream;
      streamToSend.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        updateRemoteStream(peerId, remoteStream);
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
  }, [socket, updateRemoteStream]); // no longer depends on stream values — reads via refs

  const createOffer = useCallback(async (peerId) => {
    try {
      const pc = createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('signal:offer', {
        target: peerId,
        offer: pc.localDescription,
      });
      // NOTE: do NOT flush pendingCandidates here — remoteDescription is not
      // set yet at this point. The flush happens in handleAnswer after the
      // answer sets remoteDescription.
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
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Now that remoteDescription is set, apply any ICE candidates that
      // arrived before the answer (they were queued because they can only
      // be added after setRemoteDescription is called)
      const pending = pendingCandidates.current.get(peerId);
      if (pending?.length) {
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current.delete(peerId);
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
