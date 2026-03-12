import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "./contexts/SocketContext";
import { MediaProvider } from "./contexts/MediaContext";
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import CallPage from "./pages/CallPage";

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <MediaProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#1a1a2e",
                color: "#f0f0f8",
                border: "1px solid rgba(108, 99, 255, 0.15)",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "500",
                padding: "12px 16px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(12px)",
              },
              success: {
                iconTheme: { primary: "#00d4aa", secondary: "#1a1a2e" },
                style: { border: "1px solid rgba(0, 212, 170, 0.2)" },
              },
              error: {
                iconTheme: { primary: "#ff4757", secondary: "#1a1a2e" },
                style: { border: "1px solid rgba(255, 71, 87, 0.2)" },
              },
            }}
          />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lobby/:roomId" element={<LobbyPage />} />
            <Route path="/call/:roomId" element={<CallPage />} />
          </Routes>
        </MediaProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}
