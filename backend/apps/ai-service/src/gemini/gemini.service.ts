import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client?: GoogleGenerativeAI;
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

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: this.modelName });
  }

  get isFallbackMode(): boolean {
    return !this.model;
  }

  /**
   * text-embedding-004 ile 768 boyutlu semantik embedding üretir.
   * API key yoksa ya da hata olursa null döner — çağıran fallback kararını kendisi verir.
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.client) {
      return null;
    }

    try {
      const embeddingModel = this.client.getGenerativeModel({
        model: EMBEDDING_MODEL,
      });
      const result = await embeddingModel.embedContent(text);
      const values = result.embedding.values;

      if (!values || values.length !== EMBEDDING_DIMENSIONS) {
        this.logger.warn(
          `Embedding boyutu beklenenden farklı: ${values?.length ?? 0} (beklenen ${EMBEDDING_DIMENSIONS})`,
        );
        return null;
      }

      return Array.from(values);
    } catch (error) {
      this.logger.warn(
        `Embedding üretilemedi: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
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
