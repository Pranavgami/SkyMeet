import { createContext, useContext } from 'react';
import useMediaStream from '../hooks/useMediaStream';

const MediaContext = createContext(null);

export function MediaProvider({ children }) {
  const media = useMediaStream();

  return (
    <MediaContext.Provider value={media}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMediaContext() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMediaContext must be used within a MediaProvider');
  }
  return context;
}
