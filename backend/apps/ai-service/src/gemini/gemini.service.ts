import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly model?: GenerativeModel;
  readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    this.modelName = this.config.get<string>('GEMINI_MODEL', 'gemini-1.5-pro');

    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey || apiKey.includes('your-gemini-api-key')) {
      this.logger.warn(
        'GEMINI_API_KEY missing. AI service will use deterministic fallback output.',
      );
      return;
    }

    const client = new GoogleGenerativeAI(apiKey);
    this.model = client.getGenerativeModel({ model: this.modelName });
  }

  get isFallbackMode(): boolean {
    return !this.model;
  }

  async generateJson<T>(options: {
    task: string;
    prompt: string;
    fallback: T;
  }): Promise<T> {
    if (!this.model) {
      return options.fallback;
    }

    try {
      const result = await this.model.generateContent(
        [
          'Return only valid JSON. Do not add markdown fences or explanatory text.',
          `Task: ${options.task}`,
          options.prompt,
        ].join('\n\n'),
      );

      const text = result.response.text();
      return this.parseJson<T>(text);
    } catch (error) {
      this.logger.warn(
        `Gemini failed for ${options.task}; fallback used. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return options.fallback;
    }
  }

  private parseJson<T>(text: string): T {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const objectStart = cleaned.indexOf('{');
    const arrayStart = cleaned.indexOf('[');
    const start =
      objectStart === -1
        ? arrayStart
        : arrayStart === -1
          ? objectStart
          : Math.min(objectStart, arrayStart);

    if (start < 0) {
      throw new Error('Gemini response did not contain JSON.');
    }

    return JSON.parse(cleaned.slice(start)) as T;
  }
}
