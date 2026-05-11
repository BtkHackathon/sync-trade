import { Factory, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import type { ProductionCapacity } from "../types";

interface CapacityFormProps {
  onSubmit: (
    capacity: Omit<ProductionCapacity, "id" | "trustScore" | "verificationStatus" | "carbonSavingKg"> & {
      trustScore?: number;
    },
  ) => void;
}

const initialState = {
  supplier: "Yeni CNC Atölyesi",
  city: "Istanbul",
  machineType: "3-axis CNC router",
  materialAvailable: "oak wood offcuts",
  availableHours: 32,
  productionCapacity: 40,
  trustScore: 86,
};

export function CapacityForm({ onSubmit }: CapacityFormProps) {
  const [form, setForm] = useState(initialState);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <section className="panel form-panel" aria-labelledby="capacity-form-title">
      <div className="panel-head compact">
        <div>
          <span className="eyebrow">Capacity Owner Flow</span>
          <h2 id="capacity-form-title">Kapasite ekle</h2>
        </div>
        <Factory size={19} aria-hidden="true" />
      </div>

      <form onSubmit={handleSubmit}>
        <label className="field">
          <span>Firma / Atölye</span>
          <input value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} />
        </label>

        <label className="field">
          <span>Makine tipi</span>
          <select
            value={form.machineType}
            onChange={(event) => setForm({ ...form, machineType: event.target.value })}
          >
            <option value="3-axis CNC router">3 eksenli CNC router</option>
            <option value="CNC milling center">CNC milling center</option>
            <option value="industrial sewing line">Endüstriyel dikiş hattı</option>
          </select>
        </label>

        <label className="field">
          <span>Uygun malzeme</span>
          <select
            value={form.materialAvailable}
            onChange={(event) => setForm({ ...form, materialAvailable: event.target.value })}
          >
            <option value="oak wood offcuts">Meşe artık malzeme</option>
            <option value="6061 aluminum stock">6061 alüminyum stok</option>
            <option value="recycled canvas rolls">Geri dönüştürülmüş canvas</option>
          </select>
        </label>

        <div className="form-row three">
          <label className="field">
            <span>Boş saat</span>
            <input
              type="number"
              min={1}
              value={form.availableHours}
              onChange={(event) => setForm({ ...form, availableHours: Number(event.target.value) })}
            />
          </label>

          <label className="field">
            <span>Kapasite</span>
            <input
              type="number"
              min={1}
              value={form.productionCapacity}
              onChange={(event) => setForm({ ...form, productionCapacity: Number(event.target.value) })}
            />
          </label>

          <label className="field">
            <span>Trust</span>
            <input
              type="number"
              min={1}
              max={100}
              value={form.trustScore}
              onChange={(event) => setForm({ ...form, trustScore: Number(event.target.value) })}
            />
          </label>
        </div>

        <button className="primary-button" type="submit">
          <Plus size={17} aria-hidden="true" />
          <span>Kapasiteyi yayına al</span>
        </button>
      </form>
    </section>
  );
}
