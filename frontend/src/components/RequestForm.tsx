import { Plus, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import type { ManufacturingRequest } from "../types";

interface RequestFormProps {
  onSubmit: (request: Omit<ManufacturingRequest, "id" | "owner" | "urgency"> & { owner?: string }) => void;
}

const initialState = {
  title: "18mm meşe CNC panel",
  description: "Mobilya prototipi için düşük fireyle üretilebilecek özel kesim paneller.",
  material: "oak wood",
  process: "cnc cutting",
  quantity: 30,
  deadlineDays: 14,
  budgetLevel: "low" as const,
  city: "Istanbul",
  owner: "Hackathon Team",
};

export function RequestForm({ onSubmit }: RequestFormProps) {
  const [form, setForm] = useState(initialState);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <section className="panel form-panel" aria-labelledby="request-form-title">
      <div className="panel-head compact">
        <div>
          <span className="eyebrow">Request-Oriented Flow</span>
          <h2 id="request-form-title">Talep oluştur</h2>
        </div>
        <Sparkles size={19} aria-hidden="true" />
      </div>

      <form onSubmit={handleSubmit}>
        <label className="field">
          <span>Talep başlığı</span>
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>

        <label className="field">
          <span>Üretim ihtiyacı</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>

        <div className="form-row">
          <label className="field">
            <span>Malzeme</span>
            <select
              value={form.material}
              onChange={(event) => setForm({ ...form, material: event.target.value })}
            >
              <option value="oak wood">Meşe ahşap</option>
              <option value="aluminum">Alüminyum</option>
              <option value="recycled textile">Geri dönüştürülmüş kumaş</option>
            </select>
          </label>

          <label className="field">
            <span>Süreç</span>
            <select value={form.process} onChange={(event) => setForm({ ...form, process: event.target.value })}>
              <option value="cnc cutting">CNC kesim</option>
              <option value="cnc milling">CNC freze</option>
              <option value="sewing">Dikiş</option>
            </select>
          </label>
        </div>

        <div className="form-row three">
          <label className="field">
            <span>Adet</span>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })}
            />
          </label>

          <label className="field">
            <span>Teslim</span>
            <input
              type="number"
              min={1}
              value={form.deadlineDays}
              onChange={(event) => setForm({ ...form, deadlineDays: Number(event.target.value) })}
            />
          </label>

          <label className="field">
            <span>Bütçe</span>
            <select
              value={form.budgetLevel}
              onChange={(event) => setForm({ ...form, budgetLevel: event.target.value as typeof form.budgetLevel })}
            >
              <option value="low">Kısıtlı</option>
              <option value="balanced">Dengeli</option>
              <option value="premium">Premium</option>
            </select>
          </label>
        </div>

        <button className="primary-button" type="submit">
          <Plus size={17} aria-hidden="true" />
          <span>AI ile talep aç</span>
        </button>
      </form>
    </section>
  );
}
