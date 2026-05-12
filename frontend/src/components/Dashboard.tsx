import {
  Boxes,
  Building2,
  Factory,
  Gauge,
  Handshake,
  Recycle,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useSyncTradeDemo } from "../hooks/useSyncTradeDemo";
import { CapacityForm } from "./CapacityForm";
import { LiveFeed } from "./LiveFeed";
import { MatchWorkbench } from "./MatchWorkbench";
import { RequestForm } from "./RequestForm";
import { StatCard } from "./StatCard";
import { TrustPanel } from "./TrustPanel";

export function Dashboard() {
  const {
    requests,
    capacities,
    matches,
    activity,
    selectedMatch,
    selectedRequest,
    selectedCapacity,
    metrics,
    addRequest,
    addCapacity,
    selectMatch,
  } = useSyncTradeDemo();

  return (
    <main className="dashboard">
      <section className="command-strip" aria-label="Demo kontrol paneli">
        <div>
          <span className="eyebrow">Hackathon MVP Core</span>
          <h2>Talep gir, kapasite ekle, AI match score'u canlı üret.</h2>
        </div>
        <div className="command-actions">
          <button className="secondary-button" type="button">
            <Building2 size={17} aria-hidden="true" />
            <span>Verified Company</span>
          </button>
          <button className="primary-button" type="button">
            <Gauge size={17} aria-hidden="true" />
            <span>Live Demo Aktif</span>
          </button>
        </div>
      </section>

      <section className="stats-grid" aria-label="Ağ metrikleri">
        <StatCard icon={Boxes} label="Aktif talep" value={String(metrics.requests)} detail="AI analize hazır" />
        <StatCard
          icon={Factory}
          label="Açık kapasite"
          value={String(metrics.capacities)}
          detail={`${metrics.verifiedSuppliers} verified supplier`}
          tone="blue"
        />
        <StatCard icon={Handshake} label="Canlı match" value={String(metrics.matches)} detail="semantic scoring" />
        <StatCard
          icon={TrendingUp}
          label="Ortalama skor"
          value={`%${metrics.averageScore}`}
          detail="weighted formula"
          tone="green"
        />
        <StatCard
          icon={Recycle}
          label="Atık önleme"
          value={`${metrics.carbonSaving}kg`}
          detail="tahmini carbon saving"
          tone="green"
        />
        <StatCard icon={WalletCards} label="Bütçe etkisi" value="%24" detail="boş kapasite avantajı" tone="blue" />
      </section>

      <div className="dashboard-grid">
        <div className="main-stack">
          <MatchWorkbench match={selectedMatch} request={selectedRequest} capacity={selectedCapacity} />

          <section className="panel match-table" aria-labelledby="match-table-title">
            <div className="panel-head compact">
              <div>
                <span className="eyebrow">Match Feed</span>
                <h2 id="match-table-title">AI eşleşmeleri</h2>
              </div>
              <strong>{matches.length} aktif</strong>
            </div>

            <div className="table-list">
              {matches.map((match) => {
                const request = requests.find((item) => item.id === match.requestId);
                const capacity = capacities.find((item) => item.id === match.capacityId);
                return (
                  <button className="match-row" key={match.id} type="button" onClick={() => selectMatch(match.id)}>
                    <span>{match.createdAt}</span>
                    <strong>{request?.title ?? match.requestId}</strong>
                    <small>{capacity?.supplier ?? match.capacityId}</small>
                    <b>{match.score}%</b>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="forms-grid">
            <RequestForm onSubmit={addRequest} />
            <CapacityForm onSubmit={addCapacity} />
          </div>
        </div>

        <aside className="side-stack">
          <TrustPanel capacity={selectedCapacity} verifiedSuppliers={metrics.verifiedSuppliers} />
          <LiveFeed events={activity} />

          <section className="panel heatmap-panel" aria-labelledby="heatmap-title">
            <div className="panel-head compact">
              <div>
                <span className="eyebrow">Capacity Heatmap</span>
                <h2 id="heatmap-title">Şehir yoğunluğu</h2>
              </div>
            </div>
            <div className="city-list">
              {["Istanbul", "Ankara", "Izmir"].map((city) => {
                const count = capacities.filter((capacity) => capacity.city === city).length;
                return (
                  <div className="city-row" key={city}>
                    <span>{city}</span>
                    <i style={{ width: `${Math.max(22, count * 34)}%` }} />
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
