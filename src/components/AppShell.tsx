import type { ReactNode } from "react";
import {
  Activity,
  Bell,
  BrainCircuit,
  Factory,
  FileCheck2,
  Gauge,
  Handshake,
  ShieldCheck,
} from "lucide-react";

interface AppShellProps {
  children: ReactNode;
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
}

const navItems = [
  { label: "Dashboard", icon: Gauge, active: true },
  { label: "Talepler", icon: Activity },
  { label: "Kapasiteler", icon: Factory },
  { label: "Eşleşmeler", icon: Handshake },
  { label: "Doğrulama", icon: FileCheck2 },
];

export function AppShell({ children, onNavigateHome, onNavigateDashboard }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Ana navigasyon">
        <button className="brand brand-button" type="button" onClick={onNavigateHome} aria-label="Sync-Trade ana sayfa">
          <span className="brand-mark">ST</span>
          <span>
            <strong>SYNC-TRADE</strong>
            <small>Capacity Exchange</small>
          </span>
        </button>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${item.active ? "is-active" : ""}`}
                key={item.label}
                type="button"
                onClick={onNavigateDashboard}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="security-chip">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>JWT + Verified Company Middleware hazırlandı</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">AI-Powered Manufacturing Capacity Exchange</span>
            <h1>Dinamik Talep ve Kapasite Ağı</h1>
          </div>

          <div className="topbar-actions">
            <div className="ai-status" title="AI analiz motoru aktif">
              <BrainCircuit size={17} aria-hidden="true" />
              <span>Gemini Match Engine</span>
              <i />
            </div>
            <button className="icon-button" type="button" aria-label="Bildirimler">
              <Bell size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
