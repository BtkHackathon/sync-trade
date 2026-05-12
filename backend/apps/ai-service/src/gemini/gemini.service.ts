import { Injectable } from '@nestjs/common';

// TODO: @google/generative-ai paketini import et
// TODO: constructor'da ConfigService'den GEMINI_API_KEY al, GenerativeModel başlat
// TODO: generate(prompt: string): Promise<string>
//   → model.generateContent(prompt) çağır
//   → response.text() döndür
//   → hata yönetimi: rate limit, API hatası

@Injectable()
export class GeminiService {}
