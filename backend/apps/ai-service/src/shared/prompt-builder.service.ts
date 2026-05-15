import { Injectable } from '@nestjs/common';

export interface AuctionAnalysisPrompt {
  systemPrompt: string;
  userPrompt: string;
}

@Injectable()
export class PromptBuilderService {
  /**
   * Build supplier risk analysis prompt
   */
  buildSupplierRiskAnalysisPrompt(supplierData: unknown): string {
    return [
      'You are an expert B2B procurement analyst.',
      'Analyze this supplier for reverse-auction procurement decisions.',
      '',
      'Evaluate:',
      '- Trust score (0-100): Based on reliability, completion rate, cancellation history',
      '- Risk level: LOW, MEDIUM, HIGH based on profile and bidding patterns',
      '- Strengths: 3-5 key competitive advantages',
      '- Risks: 3-5 potential concerns or red flags',
      '- Recommended use cases: When to engage this supplier',
      '',
      'Return valid JSON:',
      '{',
      '  "supplierId": "string",',
      '  "supplierName": "string",',
      '  "trustScore": number (0-100),',
      '  "riskLevel": "LOW" | "MEDIUM" | "HIGH",',
      '  "summary": "string (2-3 sentences)",',
      '  "strengths": ["string", ...],',
      '  "risks": ["string", ...],',
      '  "recommendedUseCases": ["string", ...]',
      '}',
      '',
      'Supplier Data:',
      JSON.stringify(supplierData, null, 2),
    ].join('\n');
  }

  /**
   * Build auction analysis prompt
   */
  buildAuctionAnalysisPrompt(auctionData: unknown, supplierContext: string[]): string {
    return [
      'You are an expert procurement analyst for reverse auctions.',
      'Analyze this completed auction and rank suppliers.',
      '',
      'Provide:',
      '1. Overall auction assessment: Market competitiveness, bid quality',
      '2. Supplier rankings: Best value, reliability, risk profile',
      '3. Final recommendations: Who should win, why',
      '4. Market insights: Pricing trends, supply availability',
      '',
      'Return valid JSON:',
      '{',
      '  "auctionId": "string",',
      '  "title": "string",',
      '  "marketInsight": "string (context on market for this category)",',
      '  "bidQuality": "string (assessment of bid competitiveness)",',
      '  "rankings": [',
      '    {',
      '      "rank": number,',
      '      "supplierId": "string",',
      '      "score": number (0-100),',
      '      "reasoning": "string"',
      '    }',
      '  ],',
      '  "recommendation": "string (why this supplier should win)",',
      '  "alternateOptions": ["string (fallback suppliers)"]',
      '}',
      '',
      'Auction Data:',
      JSON.stringify(auctionData, null, 2),
      '',
      'Supplier Historical Context:',
      supplierContext.join('\n---\n'),
    ].join('\n');
  }

  /**
   * Build spec extraction prompt
   */
  buildSpecExtractionPrompt(text: string): string {
    return [
      'Extract structured procurement requirements from this specification.',
      '',
      'Return valid JSON with:',
      '{',
      '  "title": "string",',
      '  "category": "string (ELECTRONICS|MECHANICAL|CHEMICAL|SERVICES|OTHER)",',
      '  "quantity": { "value": number, "unit": "string" },',
      '  "budget": number (estimated max price),',
      '  "deadline": "ISO8601 date string",',
      '  "requirements": ["string", ...],',
      '  "deliveryAddress": "string"',
      '}',
      '',
      'Specification Text:',
      text,
    ].join('\n');
  }

  /**
   * Build fraud pattern analysis prompt
   */
  buildFraudPatternAnalysisPrompt(bidsData: unknown, heuristicFindings: string): string {
    return [
      'Analyze these bids for collusion and fraud patterns in a B2B reverse auction.',
      '',
      'Investigate:',
      '1. Coordination signals: Timing patterns, price alignment',
      '2. Supplier anomalies: Reliability mismatches with bidding',
      '3. Network patterns: Historical coordination between suppliers',
      '4. Outlier detection: Abnormally priced bids from weak suppliers',
      '',
      'Return valid JSON:',
      '{',
      '  "suspicionLevel": "HIGH" | "MEDIUM" | "LOW" | "NONE",',
      '  "riskScore": number (0-100),',
      '  "patterns": ["string (detected pattern)", ...],',
      '  "reasoning": "string (detailed explanation)",',
      '  "recommendations": ["string (action item)", ...]',
      '}',
      '',
      'Heuristic Findings:',
      heuristicFindings,
      '',
      'Bid Data:',
      JSON.stringify(bidsData, null, 2),
    ].join('\n');
  }

  /**
   * Build document validation prompt (for vision analysis)
   */
  buildDocumentValidationPrompt(auctionSpecs: string): string {
    return [
      'Validate if this delivery document matches the auction requirements.',
      'Check: Product photos, invoice details, packing specifications.',
      '',
      'Return valid JSON:',
      '{',
      '  "isValid": boolean,',
      '  "matchPercentage": number (0-100),',
      '  "checklist": {',
      '    "productMatch": boolean,',
      '    "quantityMatch": boolean,',
      '    "qualityMatch": boolean,',
      '    "documentationComplete": boolean',
      '  },',
      '  "issues": ["string (any discrepancies)", ...],',
      '  "recommendation": "string (APPROVE|REVIEW|REJECT)"',
      '}',
      '',
      'Auction Requirements:',
      auctionSpecs,
    ].join('\n');
  }

  /**
   * Build performance report prompt
   */
  buildPerformanceReportPrompt(supplierHistoryData: unknown): string {
    return [
      'Generate a supplier performance report for use in future auctions.',
      '',
      'Analyze:',
      '- On-time delivery trends',
      '- Quality consistency',
      '- Price competitiveness',
      '- Communication responsiveness',
      '',
      'Return valid JSON:',
      '{',
      '  "supplierId": "string",',
      '  "reportPeriod": "string",',
      '  "performanceScore": number (0-100),',
      '  "onTimeRate": number (0-100),',
      '  "qualityGrade": "A" | "B" | "C" | "D" | "F",',
      '  "priceCompetitiveness": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",',
      '  "recommendation": "PREFERRED" | "ACCEPTABLE" | "REVIEW" | "AVOID",',
      '  "summary": "string"',
      '}',
      '',
      'Historical Data:',
      JSON.stringify(supplierHistoryData, null, 2),
    ].join('\n');
  }
}
