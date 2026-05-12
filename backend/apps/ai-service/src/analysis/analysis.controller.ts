import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// TODO: POST /ai/analyze-supplier/:id → tedarikçi risk analizi (Gemini)
// TODO: POST /ai/analyze-spec         → şartname dosyası yükle, yapılandırılmış veri çıkar (Gemini + pdf-parse)
// TODO: POST /ai/detect-fraud/:auctionId → ihale tekliflerinde kartel/fraud analizi (Gemini)
// TODO: GET  /ai/reports/:auctionId   → daha önce yapılmış analiz raporunu getir (MongoDB)

@ApiTags('AI')
@Controller('ai')
export class AnalysisController {}
