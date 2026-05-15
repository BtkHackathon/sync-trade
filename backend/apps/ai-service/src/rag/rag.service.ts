import { Injectable } from '@nestjs/common';

type SupplierContextInput = {
  id: string;
  name: string;
  sector?: string | null;
  supplierProfile?: {
    reliabilityScore?: number | null;
    completedAuctions?: number | null;
    cancelledAuctions?: number | null;
    onTimeDeliveryRate?: number | null;
    certifications?: string[] | null;
    specializations?: string[] | null;
  } | null;
};

@Injectable()
export class RagService {
  buildSupplierMemory(suppliers: SupplierContextInput[]): string[] {
    return suppliers.map((supplier) => {
      const profile = supplier.supplierProfile;
      const certifications = profile?.certifications?.join(', ') || 'no certifications';
      const specializations = profile?.specializations?.join(', ') || 'general supply';
      const reliability = profile?.reliabilityScore ?? 0;
      const completed = profile?.completedAuctions ?? 0;
      const cancelled = profile?.cancelledAuctions ?? 0;
      const onTime = Math.round((profile?.onTimeDeliveryRate ?? 0) * 100);

      return [
        `${supplier.name} (${supplier.sector ?? 'unknown sector'})`,
        `reliability=${reliability}/10`,
        `completed=${completed}`,
        `cancelled=${cancelled}`,
        `on_time=${onTime}%`,
        `certifications=${certifications}`,
        `specializations=${specializations}`,
      ].join('; ');
    });
  }
}
