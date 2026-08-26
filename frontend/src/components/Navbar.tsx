import { useState } from "react";
import { NavLink } from "react-router-dom";
import { WalletConnect } from "../features/wallet-connect/WalletConnect";
import { useWalletContext } from "../context/WalletContext";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/history", label: "History" },
  { to: "/about", label: "About" },
];

export function Navbar() {
  const { status, address, error, freighterAvailable, connect, disconnect } = useWalletContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-logo" onClick={() => setMobileOpen(false)}>
          <span className="navbar-logo-mark">◆</span> ProofPay
        </NavLink>

        <div className="navbar-right">
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
              onDisconnect={disconnect}
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
              onDisconnect={disconnect}
            />
          </div>
        </div>
      )}
    </>
  );
}
