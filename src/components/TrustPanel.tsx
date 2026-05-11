import { BadgeCheck, FileCheck2, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ProductionCapacity } from "../types";

interface TrustPanelProps {
  capacity: ProductionCapacity;
  verifiedSuppliers: number;
}

export function TrustPanel({ capacity, verifiedSuppliers }: TrustPanelProps) {
  return (
    <section className="panel trust-panel" aria-labelledby="trust-title">
      <div className="panel-head compact">
        <div>
          <span className="eyebrow">Trust Layer</span>
          <h2 id="trust-title">Doğrulama & risk</h2>
        </div>
        <ShieldCheck size={19} aria-hidden="true" />
      </div>

      <div className="trust-score">
        <div className="score-ring small" style={{ "--score": `${capacity.trustScore}%` } as React.CSSProperties}>
          <strong>{capacity.trustScore}</strong>
          <span>Trust</span>
        </div>
        <div>
          <strong>{capacity.supplier}</strong>
          <p>OCR + belge analizi sonucu firma profili izleniyor.</p>
        </div>
      </div>

      <div className="trust-grid">
        <div>
          <FileCheck2 size={18} aria-hidden="true" />
          <span>Vergi levhası</span>
          <strong>Okundu</strong>
        </div>
        <div>
          <BadgeCheck size={18} aria-hidden="true" />
          <span>Firma adı</span>
          <strong>Eşleşti</strong>
        </div>
        <div>
          <ShieldAlert size={18} aria-hidden="true" />
          <span>Fraud risk</span>
          <strong>Düşük</strong>
        </div>
      </div>

      <div className="verified-note">
        <span>{verifiedSuppliers}</span>
        <p>doğrulanmış kapasite sahibi aktif ağda işlem yapıyor.</p>
      </div>
    </section>
  );
}
