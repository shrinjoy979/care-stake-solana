import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useHealthProgram } from "./hooks/useHealthProgram";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import "./App.css";

type View = "landing" | "register" | "dashboard";

export default function App() {
  const { connected } = useWallet();
  const { isRegistered, registerPatient, loading, error } = useHealthProgram();
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);

  // ── Routing logic ────────────────────────────────────────────────────────
  const view: View = !connected
    ? "landing"
    : !isRegistered
    ? "register"
    : "dashboard";

  // ── Registration handler ─────────────────────────────────────────────────
  async function handleRegister() {
    if (!name.trim()) return;
    setRegistering(true);
    try {
      await registerPatient(name.trim());
    } catch (e: any) {
      console.error("Registration failed:", e);
    } finally {
      setRegistering(false);
    }
  }

  // ── Views ────────────────────────────────────────────────────────────────
  if (view === "landing") return <LandingPage />;

  if (view === "register") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0a0f0d", fontFamily: "'Outfit', sans-serif",
      }}>
        <div style={{
          background: "#0f1f18", border: "0.5px solid rgba(29,158,117,0.25)",
          borderRadius: 16, padding: "40px 48px", width: 400, textAlign: "center",
        }}>
          <div style={{
            width: 48, height: 48, background: "#1D9E75", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, color: "#0a0f0d", margin: "0 auto 24px",
          }}>H</div>

          <h2 style={{ color: "#e8f0eb", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Register as Patient
          </h2>
          <p style={{ color: "#8aab9a", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
            Your name is hashed on-chain for privacy. You'll receive 500 $HEALTH tokens to start.
          </p>

          <input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleRegister()}
            style={{
              width: "100%", background: "#0a0f0d",
              border: "0.5px solid rgba(29,158,117,0.3)", borderRadius: 8,
              padding: "12px 16px", color: "#e8f0eb",
              fontFamily: "'Outfit', sans-serif", fontSize: 14,
              outline: "none", marginBottom: 16, boxSizing: "border-box",
            }}
          />

          {error && (
            <div style={{ color: "#D4537E", fontSize: 12, marginBottom: 12 }}>{error}</div>
          )}

          <button
            onClick={handleRegister}
            disabled={registering || loading || !name.trim()}
            style={{
              width: "100%", background: registering ? "rgba(29,158,117,0.4)" : "#1D9E75",
              color: "#0a0f0d", border: "none", borderRadius: 8,
              padding: "13px", fontFamily: "'Outfit', sans-serif",
              fontWeight: 500, fontSize: 14, cursor: registering ? "wait" : "pointer",
            }}
          >
            {registering ? "Registering on-chain…" : "Register & get 500 $HEALTH →"}
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}