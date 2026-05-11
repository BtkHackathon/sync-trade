import { Activity, BadgeCheck, BrainCircuit, Factory, Handshake, PackagePlus } from "lucide-react";
import type { ActivityEvent } from "../types";

interface LiveFeedProps {
  events: ActivityEvent[];
}

const iconMap = {
  NEW_REQUEST: PackagePlus,
  NEW_CAPACITY: Factory,
  AI_ANALYSIS: BrainCircuit,
  NEW_MATCH: Handshake,
  VERIFICATION_COMPLETE: BadgeCheck,
};

export function LiveFeed({ events }: LiveFeedProps) {
  return (
    <section className="panel feed-panel" aria-labelledby="feed-title">
      <div className="panel-head compact">
        <div>
          <span className="eyebrow">Realtime Feed</span>
          <h2 id="feed-title">Canlı üretim ağı</h2>
        </div>
        <Activity size={19} aria-hidden="true" />
      </div>

      <div className="feed-list">
        {events.map((event) => {
          const Icon = iconMap[event.type];
          return (
            <article className="feed-item" key={event.id}>
              <div className="feed-icon">
                <Icon size={16} aria-hidden="true" />
              </div>
              <div>
                <span>{event.timestamp}</span>
                <strong>{event.title}</strong>
                <p>{event.detail}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
