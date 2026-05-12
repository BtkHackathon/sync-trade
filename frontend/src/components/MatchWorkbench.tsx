import { ArrowRight, BadgeCheck, BrainCircuit, Factory, PackageCheck, Timer } from "lucide-react";
import type { ManufacturingRequest, MatchResult, ProductionCapacity } from "../types";

interface MatchWorkbenchProps {
  match: MatchResult;
  request: ManufacturingRequest;
  capacity: ProductionCapacity;
}

const scoreItems = [
  { key: "material", label: "Material Similarity" },
  { key: "machine", label: "Machine Compatibility" },
  { key: "deadline", label: "Deadline Suitability" },
  { key: "trust", label: "Trust Score" },
] as const;

export function MatchWorkbench({ match, request, capacity }: MatchWorkbenchProps) {
  return (
    <section className="panel workbench" aria-labelledby="workbench-title">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Live Match Workspace</span>
          <h2 id="workbench-title">AI eşleştirme akışı</h2>
        </div>
        <div className="score-ring" style={{ "--score": `${match.score}%` } as React.CSSProperties}>
          <strong>{match.score}%</strong>
          <span>Match</span>
        </div>
      </div>

      <div className="flow-grid">
        <article className="flow-card">
          <PackageCheck size={22} aria-hidden="true" />
          <span>Talep</span>
          <h3>{request.title}</h3>
          <p>{request.quantity} adet · {request.deadlineDays} gün · {request.city}</p>
        </article>

        <div className="flow-connector" aria-hidden="true">
          <BrainCircuit size={24} />
          <ArrowRight size={22} />
        </div>

        <article className="flow-card">
          <Factory size={22} aria-hidden="true" />
          <span>Kapasite</span>
          <h3>{capacity.supplier}</h3>
          <p>{capacity.machineType} · {capacity.availableHours} boş saat</p>
        </article>
      </div>

      <div className="analysis-strip">
        <div>
          <BadgeCheck size={18} aria-hidden="true" />
          <span>CNC uyumlu</span>
        </div>
        <div>
          <PackageCheck size={18} aria-hidden="true" />
          <span>Malzeme uygun</span>
        </div>
        <div>
          <Timer size={18} aria-hidden="true" />
          <span>Teslim penceresi yeterli</span>
        </div>
      </div>

      <div className="score-list">
        {scoreItems.map((item) => (
          <div className="score-row" key={item.key}>
            <span>{item.label}</span>
            <div className="score-bar" aria-hidden="true">
              <i style={{ width: `${match.breakdown[item.key]}%` }} />
            </div>
            <strong>{match.breakdown[item.key]}%</strong>
          </div>
        ))}
      </div>

      <p className="ai-reason">{match.reason}</p>
    </section>
  );
}
