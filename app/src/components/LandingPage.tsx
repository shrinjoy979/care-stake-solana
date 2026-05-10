import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const short = (pk: string) => `${pk.slice(0, 4)}…${pk.slice(-4)}`;

function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = useCallback(() => {
    if (publicKey) disconnect();
    else setVisible(true);
  }, [publicKey, disconnect, setVisible]);

  const label = connecting ? "Connecting…" : publicKey ? short(publicKey.toBase58()) : "Connect wallet";

  return (
    <button onClick={handleClick} style={{
      background: publicKey ? "transparent" : "#1D9E75",
      color: publicKey ? "#9FE1CB" : "#0a0f0d",
      border: publicKey ? "0.5px solid rgba(29,158,117,0.4)" : "none",
      borderRadius: 6, padding: "9px 20px",
      fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: 13,
      cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500&display=swap');`;

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes float  { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-10px); } }
  @keyframes ticker { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
  .fade-up    { animation: fadeUp 0.7s ease forwards; }
  .float-card { animation: float 4s ease-in-out infinite; }

  .float-card-wrap {
    position: absolute;
    right: 48px;
    top: 50%;
    transform: translateY(-50%);
  }
  .float-card { width: 280px; }

  .nav-links { display: flex; gap: 32px; font-size: 13px; color: #8aab9a; }
  .nav-links span { cursor: pointer; transition: color 0.2s; white-space: nowrap; }
  .hamburger { display: none; background: none; border: none; color: #9FE1CB; font-size: 22px; cursor: pointer; padding: 0; }
  .mobile-menu {
    display: none; flex-direction: column; gap: 0;
    position: absolute; top: 100%; left: 0; right: 0;
    background: rgba(10,15,13,0.98); border-bottom: 0.5px solid rgba(29,158,117,0.2);
    padding: 8px 0; z-index: 200;
  }
  .mobile-menu.open { display: flex; }
  .mobile-menu span {
    padding: 14px 24px; font-size: 15px; color: #8aab9a;
    cursor: pointer; border-bottom: 0.5px solid rgba(29,158,117,0.08);
    transition: background 0.2s;
  }
  .mobile-menu span:hover { background: rgba(29,158,117,0.08); color: #9FE1CB; }

  .stats-grid   { display: grid; grid-template-columns: repeat(4,1fr); gap: 40px; }
  .how-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
  .problem-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 40px; align-items: center; }
  .arrow-divider { font-family: 'Playfair Display',serif; font-size: 32px; color: #1D9E75; font-style: italic; text-align: center; }

  @media (max-width: 900px) {
    .nav-links  { display: none; }
    .hamburger  { display: block; }

    .float-card-wrap {
      position: static;
      display: flex;
      justify-content: center;
      margin-top: 40px;
      transform: none;
    }
    .float-card { width: 100%; max-width: 340px; }

    .stats-grid   { grid-template-columns: repeat(2,1fr); gap: 24px; }
    .how-grid     { grid-template-columns: 1fr; gap: 40px; }
    .problem-grid { grid-template-columns: 1fr; gap: 20px; }
    .arrow-divider { transform: rotate(90deg); font-size: 24px; }

    .hero-section    { padding: 60px 24px 48px !important; }
    .stats-section   { padding: 40px 24px !important; }
    .how-section     { padding: 60px 24px !important; max-width: 100% !important; }
    .problem-section { padding: 48px 24px !important; }
    .cta-section     { padding: 60px 24px !important; }
    .footer-section  { padding: 24px !important; flex-direction: column !important; gap: 8px; text-align: center; }
    nav { padding: 16px 24px !important; }

    h1 { font-size: clamp(36px, 9vw, 64px) !important; }
    .cta-h2 { font-size: 36px !important; }
    .how-h2 { font-size: 32px !important; }
  }

  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: repeat(2,1fr); gap: 16px; }
    .hero-buttons { flex-direction: column !important; align-items: stretch !important; }
    .hero-buttons button { width: 100%; text-align: center; }
  }
`;

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = FONT + STYLES;
    document.head.appendChild(style);
    const iv = setInterval(() => setActiveStep((s) => (s + 1) % 5), 2500);
    return () => clearInterval(iv);
  }, []);

  const steps = [
    { icon: "◈", title: "Receive $HEALTH",     desc: "Both you and your practitioner get tokens upon onboarding" },
    { icon: "⬡", title: "Stake together",       desc: "Lock tokens into a shared outcome pot before treatment begins" },
    { icon: "✦", title: "Treatment & tracking", desc: "Health metrics recorded on-chain at each session" },
    { icon: "◉", title: "Outcomes verified",    desc: "Improvement? Practitioner earns. Decline? You reclaim + slash" },
    { icon: "◈", title: "Earn & repeat",        desc: "Virtuous cycle of aligned incentives drives better care" },
  ];

  const stats = [
    { val: "94%", label: "outcome alignment" },
    { val: "3.2×", label: "better results vs fee-for-service" },
    { val: "0%",   label: "pharma kickbacks" },
    { val: "∞",    label: "practitioner accountability" },
  ];

  const tickerItems = [
    "$HEALTH +12.4%", "Dr. Chen slashed 200 tokens", "Patient outcome verified", "New stake pot opened",
    "Blood pressure normalized", "Cholesterol improved", "$HEALTH +12.4%", "Dr. Chen slashed 200 tokens",
    "Patient outcome verified", "New stake pot opened", "Blood pressure normalized", "Cholesterol improved",
  ];

  const navItems = [
    { label: "Protocol",     href: "#protocol",     external: false },
    { label: "How it works", href: "#how-it-works", external: false },
    { label: "Tokenomics",   href: "#tokenomics",   external: false },
    { label: "Docs",         href: "https://github.com/shrinjoy979/care-stake-solana", external: true },
  ];

  const handleNav = (item: typeof navItems[0]) => {
    setMenuOpen(false);
    if (item.external) window.open(item.href, "_blank");
    else document.querySelector(item.href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", background:"#0a0f0d", color:"#e8f0eb", minHeight:"100vh", overflowX:"hidden" }}>

      {/* Nav */}
      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 48px", borderBottom:"0.5px solid rgba(29,158,117,0.2)", position:"sticky", top:0, background:"rgba(10,15,13,0.92)", backdropFilter:"blur(12px)", zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"#1D9E75", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#0a0f0d" }}>H</div>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, color:"#9FE1CB", letterSpacing:"0.05em" }}>$HEALTH</span>
        </div>

        <div className="nav-links">
          {navItems.map(n => (
            <span key={n.label} onClick={() => handleNav(n)}
              onMouseEnter={e => (e.target as HTMLElement).style.color = "#9FE1CB"}
              onMouseLeave={e => (e.target as HTMLElement).style.color = "#8aab9a"}>
              {n.label}
            </span>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <WalletButton />
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile dropdown */}
        <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
          {navItems.map(n => (
            <span key={n.label} onClick={() => handleNav(n)}>{n.label}</span>
          ))}
        </div>
      </nav>

      {/* Ticker */}
      <div style={{ background:"#0f1f18", borderBottom:"0.5px solid rgba(29,158,117,0.15)", overflow:"hidden", padding:"8px 0" }}>
        <div style={{ display:"flex", gap:40, animation:"ticker 28s linear infinite", whiteSpace:"nowrap" }}>
          {tickerItems.map((t, i) => (
            <span key={i} style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color: t.includes("+") ? "#5DCAA5" : t.includes("slashed") ? "#D4537E" : "#8aab9a", flexShrink:0 }}>◆ {t}</span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="hero-section" style={{ padding:"100px 48px 80px", maxWidth:1200, margin:"0 auto", position:"relative" }}>
        <div style={{ position:"absolute", top:60, right:80, width:400, height:400, background:"radial-gradient(circle, rgba(29,158,117,0.08) 0%, transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />

        <div style={{ opacity:1, animation:"fadeUp 0.8s ease forwards" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(29,158,117,0.1)", border:"0.5px solid rgba(29,158,117,0.3)", borderRadius:999, padding:"5px 14px", marginBottom:32 }}>
            <span style={{ width:6, height:6, background:"#5DCAA5", borderRadius:"50%", display:"inline-block" }} />
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#9FE1CB" }}>Solana-Powered Healthcare System</span>
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(48px,7vw,88px)", fontWeight:900, lineHeight:1.0, marginBottom:28, maxWidth:780 }}>
            Healthcare where<br /><span style={{ color:"#1D9E75", fontStyle:"italic" }}>outcomes</span> pay,<br />not procedures.
          </h1>
          <p style={{ fontSize:18, color:"#8aab9a", maxWidth:520, lineHeight:1.7, marginBottom:44, fontWeight:300 }}>
            The principal-agent problem kills patients. We fix it with $HEALTH tokens — stake-based incentives that reward practitioners only when you actually get better.
          </p>
          <div className="hero-buttons" style={{ display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>
            <WalletButton />
            <button
              onClick={() => window.open("https://github.com/shrinjoy979/care-stake-solana", "_blank")}
              style={{ background:"transparent", color:"#9FE1CB", border:"0.5px solid rgba(29,158,117,0.4)", borderRadius:8, padding:"14px 28px", fontFamily:"'Outfit',sans-serif", fontSize:15, cursor:"pointer" }}>
              View on GitHub
            </button>
          </div>
        </div>

        {/* Floating card */}
        <div className="float-card-wrap">
          <div className="float-card" style={{ background:"#0f1f18", border:"0.5px solid rgba(29,158,117,0.25)", borderRadius:16, padding:"24px 28px", opacity:1 }}>
            <div style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#5DCAA5", marginBottom:16, letterSpacing:"0.06em" }}>LIVE OUTCOME</div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:13, color:"#8aab9a" }}>Patient</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#9FE1CB" }}>0x4f2…3a1</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
              <span style={{ fontSize:13, color:"#8aab9a" }}>Health Δ</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#5DCAA5" }}>+14 pts ↑</span>
            </div>
            <div style={{ height:1, background:"rgba(29,158,117,0.15)", marginBottom:18 }} />
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:10, color:"#8aab9a", marginBottom:4 }}>practitioner earns</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:500, color:"#1D9E75" }}>+480 $H</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:"#8aab9a", marginBottom:4 }}>slashed</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:500, color:"#D4537E" }}>0 $H</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Protocol */}
      <section id="protocol" className="stats-section" style={{ borderTop:"0.5px solid rgba(29,158,117,0.1)", borderBottom:"0.5px solid rgba(29,158,117,0.1)", padding:"48px", background:"#0c1710" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="stats-grid">
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:42, fontWeight:700, color:"#1D9E75", lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:12, color:"#8aab9a", marginTop:8, fontWeight:300 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="how-section" style={{ padding:"100px 48px", maxWidth:1200, margin:"0 auto" }}>
        <div className="how-grid">
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#5DCAA5", letterSpacing:"0.08em", marginBottom:16 }}>THE PROTOCOL</div>
            <h2 className="how-h2" style={{ fontFamily:"'Playfair Display',serif", fontSize:42, fontWeight:700, lineHeight:1.2, marginBottom:20 }}>Skin in the game.<br />For both sides.</h2>
            <p style={{ fontSize:15, color:"#8aab9a", lineHeight:1.8, fontWeight:300 }}>Traditional healthcare rewards volume. We reward outcomes. Every treatment recommendation is a bet — practitioners stake their tokens on your recovery.</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {steps.map((s, i) => (
              <div key={i} onClick={() => setActiveStep(i)} style={{ display:"flex", gap:16, padding:"18px 20px", borderRadius:12, border:`0.5px solid ${activeStep === i ? "rgba(29,158,117,0.5)" : "rgba(29,158,117,0.1)"}`, background: activeStep === i ? "rgba(29,158,117,0.06)" : "transparent", cursor:"pointer", transition:"all 0.3s ease" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:18, color: activeStep === i ? "#1D9E75" : "#2d4a38", transition:"color 0.3s", flexShrink:0, width:24 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:500, color: activeStep === i ? "#e8f0eb" : "#8aab9a", marginBottom:4 }}>{s.title}</div>
                  <div style={{ fontSize:13, color:"#5a7a68", lineHeight:1.5 }}>{s.desc}</div>
                </div>
                <div style={{ marginLeft:"auto", fontFamily:"'DM Mono',monospace", fontSize:11, color:"#2d4a38" }}>0{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section id="tokenomics" className="problem-section" style={{ padding:"80px 48px", background:"#0c1710" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#5DCAA5", letterSpacing:"0.08em", marginBottom:48, textAlign:"center" }}>THE PROBLEM WE SOLVE</div>
          <div className="problem-grid">
            <div style={{ background:"rgba(212,83,126,0.06)", border:"0.5px solid rgba(212,83,126,0.2)", borderRadius:16, padding:32 }}>
              <div style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#D4537E", marginBottom:20, letterSpacing:"0.06em" }}>TODAY</div>
              {["Pharma incentivized to sell expensive drugs", "Insurers profit by denying claims", "Clinics optimize for visit volume", "You bear all the downside risk"].map((t, i) => (
                <div key={i} style={{ display:"flex", gap:12, marginBottom:14, fontSize:14, color:"#8aab9a", alignItems:"flex-start" }}>
                  <span style={{ color:"#D4537E", flexShrink:0, marginTop:2 }}>✕</span> {t}
                </div>
              ))}
            </div>
            <div className="arrow-divider">→</div>
            <div style={{ background:"rgba(29,158,117,0.06)", border:"0.5px solid rgba(29,158,117,0.25)", borderRadius:16, padding:32 }}>
              <div style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#5DCAA5", marginBottom:20, letterSpacing:"0.06em" }}>WITH $HEALTH</div>
              {["Practitioners earn only when you improve", "Outcome verification on-chain, trustless", "Skin in the game on every recommendation", "Slash bad actors, reward excellence"].map((t, i) => (
                <div key={i} style={{ display:"flex", gap:12, marginBottom:14, fontSize:14, color:"#8aab9a", alignItems:"flex-start" }}>
                  <span style={{ color:"#1D9E75", flexShrink:0, marginTop:2 }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" style={{ padding:"100px 48px", textAlign:"center" }}>
        <h2 className="cta-h2" style={{ fontFamily:"'Playfair Display',serif", fontSize:52, fontWeight:700, marginBottom:20 }}>
          Your health is the<br /><span style={{ color:"#1D9E75", fontStyle:"italic" }}>only metric that matters.</span>
        </h2>
        <p style={{ fontSize:16, color:"#8aab9a", marginBottom:44, fontWeight:300 }}>Connect your wallet to get started. Built on Solana.</p>
        <WalletButton />
      </section>

      {/* Footer */}
      <footer className="footer-section" style={{ borderTop:"0.5px solid rgba(29,158,117,0.1)", padding:"32px 48px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"#2d4a38" }}>$HEALTH — Solana-Powered Healthcare System</span>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"#2d4a38" }}>Built on Solana ◆ Powered by Anchor</span>
      </footer>
    </div>
  );
}