import { BadRequestException, Injectable } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { SpecAnalysisResult } from '../analysis/analysis.types';

@Injectable()
export class SpecAssistantService {
  constructor(private readonly gemini: GeminiService) {}

  async analyze(input: {
    text?: string;
    file?: Express.Multer.File;
  }): Promise<SpecAnalysisResult> {
    const text = await this.extractText(input);
    const fallback = this.createFallback(text);

    return this.gemini.generateJson<SpecAnalysisResult>({
      task: 'specification-extraction',
      fallback,
      prompt: [
        'Extract a structured reverse-auction tender form from this specification.',
        'Return JSON with title, category, quantity, unit, estimatedBudget, deadline, requirements, technicalSpecs.',
        'Use null when a field is unknown.',
        '',
        text,
      ].join('\n'),
    });
  }

  private async extractText(input: {
    text?: string;
    file?: Express.Multer.File;
  }): Promise<string> {
    if (input.text?.trim()) {
      return input.text.trim();
    }

    if (!input.file) {
      throw new BadRequestException('Text or file is required.');
    }

    if (input.file.mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse') as (
        buffer: Buffer,
      ) => Promise<{ text: string }>;
      const result = await pdfParse(input.file.buffer);
      return result.text.trim();
    }

    if (input.file.mimetype.startsWith('text/')) {
      return input.file.buffer.toString('utf8').trim();
    }

    throw new BadRequestException('Only PDF or text files are supported.');
  }

  private createFallback(text: string): SpecAnalysisResult {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const quantity = this.extractQuantity(normalized);
    const budget = this.extractBudget(normalized);

    return {
      title: this.extractTitle(normalized),
      category: this.inferCategory(normalized),
      quantity: quantity.value,
      unit: quantity.unit,
      estimatedBudget: budget,
      deadline: this.extractDeadline(normalized),
      requirements: this.extractRequirements(normalized),
      technicalSpecs: {
        source: 'fallback-parser',
        confidence: 'medium',
      },
    };
  }

  private extractTitle(text: string): string {
    const firstSentence = text.split(/[.!?]/)[0]?.trim();
    return firstSentence?.slice(0, 120) || 'Yeni tedarik ihalesi';
  }

  private inferCategory(text: string): string {
    const lower = text.toLowerCase();
    if (/(koltuk|sandalye|masa|mobilya|ofis)/.test(lower))
      return 'Ofis Mobilyasi';
    if (/(tekstil|pamu|kumas|forma|tisort)/.test(lower)) return 'Tekstil';
    if (/(gida|restoran|et|sebze|bakliyat)/.test(lower)) return 'Gida';
    if (/(metal|cnc|sac|aluminyum)/.test(lower)) return 'Endustriyel Uretim';
    return 'Genel Tedarik';
  }

  private extractQuantity(text: string): {
    value: number | null;
    unit: string | null;
  } {
    const match = text.match(
      /(\d+)\s*(adet|ton|kg|kilogram|metre|m2|koli|paket)/i,
    );
    if (!match) {
      return { value: null, unit: null };
    }

    return {
      value: Number(match[1]),
      unit: match[2].toLowerCase(),
    };
  }

  private extractBudget(text: string): number | null {
    const match = text.match(/(\d[\d.,]*)\s*(tl|try)/i);
    if (!match) {
      return null;
    }

    const amount = match[1].replace(/\./g, '').replace(',', '.');
    return Number(amount);
  }

  private extractDeadline(text: string): string | null {
    const dayMatch = text.match(/(\d+)\s*(gun|hafta|ay)\s*(icinde)?/i);
    if (dayMatch) {
      return `${dayMatch[1]} ${dayMatch[2]}`;
    }

    const dateMatch = text.match(/(\d{1,2}\s+[A-Za-z]+)/);
    return dateMatch?.[1] ?? null;
  }

  private extractRequirements(text: string): string[] {
    return text
      .split(/[.;\n]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 8)
      .slice(0, 8);
  }
}
