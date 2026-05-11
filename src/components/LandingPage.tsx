import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  BrainCircuit,
  Building2,
  Factory,
  Gauge,
  Handshake,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { initialCapacities, initialRequests } from "../data/seedData";

interface LandingPageProps {
  onOpenDashboard: () => void;
}

const processLabels: Record<string, string> = {
  "cnc cutting": "CNC kesim",
  "cnc milling": "CNC freze",
  sewing: "Dikiş",
};

const materialLabels: Record<string, string> = {
  "oak wood": "Meşe ahşap",
  aluminum: "Alüminyum",
  "recycled textile": "Geri dönüştürülmüş kumaş",
};

export function LandingPage({ onOpenDashboard }: LandingPageProps) {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <button className="brand brand-button" type="button" aria-label="Sync-Trade ana sayfa">
          <span className="brand-mark">ST</span>
          <span>
            <strong>SYNC-TRADE</strong>
            <small>Manufacturing Marketplace</small>
          </span>
        </button>

        <nav aria-label="Ana sayfa bağlantıları">
          <a href="#opportunities">Fırsatlar</a>
          <a href="#how">İşleyiş</a>
          <a href="#trust">Güvenlik</a>
        </nav>

        <button className="primary-button" type="button" onClick={onOpenDashboard}>
          <Gauge size={17} aria-hidden="true" />
          <span>Dashboard</span>
        </button>
      </header>

      <section className="landing-hero">
        <div className="hero-scene" aria-hidden="true">
          <div className="scene-card request">
            <PackageCheck size={18} />
            <span>REQ-102</span>
            <strong>30 adet meşe CNC panel</strong>
            <small>AI analiz ediyor</small>
          </div>
          <div className="scene-card capacity">
            <Factory size={18} />
            <span>CAP-022</span>
            <strong>Boş CNC router</strong>
            <small>38 saat uygun</small>
          </div>
          <div className="scene-card match">
            <Handshake size={18} />
            <span>MATCH FOUND</span>
            <strong>%91</strong>
            <small>teknik uygunluk</small>
          </div>
          <div className="network-line one" />
          <div className="network-line two" />
          <div className="network-node n1" />
          <div className="network-node n2" />
          <div className="network-node n3" />
        </div>

        <div className="hero-copy">
          <span className="eyebrow">AI-Powered B2B E-Commerce</span>
          <h1>Ürün değil, üretim kapasitesi ticarete dönüşür.</h1>
          <p>
            Sync-Trade, üretim ihtiyacı olan firmaları boş makine zamanı, artık malzeme ve uygun iş gücü bulunan
            üreticilerle AI yardımıyla eşleştiren dinamik bir B2B pazaryeridir.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={onOpenDashboard}>
              <BrainCircuit size={18} aria-hidden="true" />
              <span>Canlı demo dashboard</span>
            </button>
            <a className="ghost-link" href="#opportunities">
              Açık fırsatları gör
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="landing-stats" aria-label="Platform özeti">
        <article>
          <Boxes size={20} aria-hidden="true" />
          <span>Açık talep</span>
          <strong>{initialRequests.length}</strong>
        </article>
        <article>
          <Factory size={20} aria-hidden="true" />
          <span>Açık kapasite</span>
          <strong>{initialCapacities.length}</strong>
        </article>
        <article>
          <Recycle size={20} aria-hidden="true" />
          <span>Atık önleme</span>
          <strong>67kg</strong>
        </article>
        <article>
          <ShieldCheck size={20} aria-hidden="true" />
          <span>Verified supplier</span>
          <strong>2</strong>
        </article>
      </section>

      <section className="landing-section" id="opportunities">
        <div className="section-heading">
          <span className="eyebrow">Marketplace Vitrini</span>
          <h2>Ana sayfada ürün yerine açık üretim fırsatları görünür.</h2>
          <p>
            E-ticaret hissini burada veriyoruz: kullanıcılar aktif talepleri ve üreticilerin satışa açtığı kapasiteyi
            inceleyebilir.
          </p>
        </div>

        <div className="opportunity-grid">
          {initialRequests.map((request) => (
            <article className="opportunity-card" key={request.id}>
              <div className="card-topline">
                <span>Talep</span>
                <strong>{request.id}</strong>
              </div>
              <h3>{request.title}</h3>
              <p>{request.description}</p>
              <div className="card-meta">
                <span>{materialLabels[request.material] ?? request.material}</span>
                <span>{processLabels[request.process] ?? request.process}</span>
                <span>{request.quantity} adet</span>
                <span>{request.deadlineDays} gün</span>
              </div>
              <button className="card-action" type="button" onClick={onOpenDashboard}>
                Talebi eşleştir
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section capacity-market">
        <div className="section-heading">
          <span className="eyebrow">Kapasite Pazarı</span>
          <h2>Üreticiler boş makine zamanını satışa açar.</h2>
        </div>

        <div className="capacity-showcase">
          {initialCapacities.map((capacity) => (
            <article className="capacity-card" key={capacity.id}>
              <div>
                <span className="status-pill">
                  <BadgeCheck size={14} aria-hidden="true" />
                  {capacity.verificationStatus === "verified" ? "Verified" : "Review"}
                </span>
                <h3>{capacity.supplier}</h3>
                <p>{capacity.machineType}</p>
              </div>
              <div className="capacity-metrics">
                <span>{capacity.availableHours} saat</span>
                <span>{capacity.productionCapacity} adet</span>
                <span>Trust {capacity.trustScore}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section how-section" id="how">
        <div className="section-heading">
          <span className="eyebrow">İşleyiş</span>
          <h2>Üç adımda talep-kapasite ticareti.</h2>
        </div>
        <div className="steps-grid">
          <article>
            <PackageCheck size={22} aria-hidden="true" />
            <h3>1. Talep açılır</h3>
            <p>Firma ihtiyacını, adetini, bütçesini ve teslim süresini girer.</p>
          </article>
          <article>
            <Factory size={22} aria-hidden="true" />
            <h3>2. Kapasite eklenir</h3>
            <p>Üretici boş makine, artık malzeme veya iş gücünü sisteme açar.</p>
          </article>
          <article>
            <BrainCircuit size={22} aria-hidden="true" />
            <h3>3. AI eşleştirir</h3>
            <p>Malzeme, makine, teslim ve güven kriterleriyle match score üretilir.</p>
          </article>
        </div>
      </section>

      <section className="trust-band" id="trust">
        <div>
          <span className="eyebrow">Trust & Verification</span>
          <h2>Güven skoru ticaret kararının parçasıdır.</h2>
          <p>
            Vergi levhası, şirket bilgisi ve tutarlılık kontrolleriyle üretici doğrulaması yapılır. Böylece eşleşme
            sadece uygun değil, güvenilir olur.
          </p>
        </div>
        <div className="trust-band-grid">
          <span>
            <ShieldCheck size={18} aria-hidden="true" />
            OCR belge kontrolü
          </span>
          <span>
            <Building2 size={18} aria-hidden="true" />
            Firma adı eşleşmesi
          </span>
          <span>
            <Timer size={18} aria-hidden="true" />
            Teslim riski analizi
          </span>
        </div>
      </section>
    </main>
  );
}
