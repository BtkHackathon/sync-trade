import { Injectable } from '@nestjs/common';

// TODO: extractFromPdf(buffer) → pdf-parse ile metin çıkar
// TODO: buildSpecPrompt(text)  → metni Gemini'ye gönderilecek prompt'a çevir
// TODO: parseSpecResponse(text) → Gemini çıktısını yapılandırılmış nesneye dönüştür
//   Çıktı formatı: { title, requirements[], technicalSpecs{}, estimatedBudget, deadline }

@Injectable()
export class SpecAssistantService {}
