import { Injectable } from '@nestjs/common';

// TODO: HttpService inject et
// TODO: forward(method, url, data?, headers?) → hedef servise isteği ilet
//   → Authorization header'ı aktar (JWT pass-through)
//   → Hata durumunda orijinal HTTP status kodunu koru

@Injectable()
export class ProxyService {}
