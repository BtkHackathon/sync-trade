import { Injectable } from '@nestjs/common';

// TODO: upsertEmbedding(supplierId, text)
//   → Gemini embeddings API ile vektör üret
//   → MongoDB + pgvector'a kaydet

// TODO: similarSuppliers(queryText, topK)
//   → Query için embedding üret
//   → pgvector cosine similarity ile en yakın K supplier'ı bul
//   → Sonuçları döndür (supplier bilgisi + benzerlik skoru)

// NOT: RAG düşük öncelik — temel AI özellikleri tamamlandıktan sonra ele al

@Injectable()
export class RagService {}
