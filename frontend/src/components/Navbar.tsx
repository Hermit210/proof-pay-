import { useState } from "react";
import { NavLink } from "react-router-dom";
import { WalletConnect } from "../features/wallet-connect/WalletConnect";
import { useWalletContext } from "../context/WalletContext";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/history", label: "History" },
];

export function Navbar() {
  const { status, address, error, freighterAvailable, connect } = useWalletContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-logo" onClick={() => setMobileOpen(false)}>
          <span className="navbar-logo-mark">◆</span> ProofPay
        </NavLink>

        <div className="navbar-links">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="navbar-right">
          <button
            className="navbar-hamburger"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
          <div className="hide-on-mobile-nav">
            <WalletConnect
              status={status}
              address={address}
              error={error}
              freighterAvailable={freighterAvailable}
              onConnect={connect}
            />
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="navbar-mobile-menu">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? "active" : undefined)}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <div style={{ marginTop: "0.5rem" }}>
            <WalletConnect
              status={status}
              address={address}
              error={error}
              freighterAvailable={freighterAvailable}
              onConnect={connect}
            />
          </div>
        </div>
      )}
    </>
  );
}
