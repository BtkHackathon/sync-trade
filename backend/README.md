# SyncTrade Backend

B2B ters ihale platformu — NestJS mikroservis mimarisi.

## Gereksinimler

- Node.js 22+
- Yarn 1.x
- Docker & Docker Compose

---

## Kurulum

### 1. Bağımlılıkları yükle

```bash
yarn install
```

### 2. Ortam değişkenlerini ayarla

`.env` dosyası zaten mevcut. Sadece Gemini API anahtarını güncelle:

```bash
# .env dosyasında bu satırı bul ve kendi anahtarınla değiştir
GEMINI_API_KEY=your-gemini-api-key-here
```

Gemini API anahtarını [Google AI Studio](https://aistudio.google.com/apikey)'dan alabilirsin.

### 3. Altyapıyı başlat (PostgreSQL + MongoDB + Redis)

```bash
docker compose up -d postgres mongodb redis
```

Containerların hazır olmasını bekle (~10 saniye):

```bash
docker compose ps
```

`healthy` durumunda olmaları gerekiyor.

### 4. Veritabanı şemasını oluştur

```bash
yarn db:migrate
```

### 5. Demo verilerini yükle

```bash
yarn db:seed
```

Seed çıktısında demo hesap bilgileri görünecek:

```
BUYER   → info@tekstilfabrikasi.com   / password123
BUYER   → procurement@elektronikcorp.com / password123
SUPPLIER → info@malzemecioglu.com     / password123
SUPPLIER → info@teknometri.com        / password123
...
```

---

## Servisleri Başlatma

Her servis için ayrı terminal aç:

```bash
# Auth Service    → http://localhost:3001
yarn start:dev:auth

# Auction Service → http://localhost:3002
yarn start:dev:auction

# Bid Service     → http://localhost:3003
yarn start:dev:bid

# AI Service      → http://localhost:3004
yarn start:dev:ai

# Notification Service → http://localhost:3005 (WebSocket)
yarn start:dev:notification

# Gateway         → http://localhost:3000
yarn start:dev:gateway
```

---

## Swagger UI (API Dokümantasyonu)

| Servis       | URL                              |
|--------------|----------------------------------|
| Auth         | http://localhost:3001/api/docs   |
| Auction      | http://localhost:3002/api/docs   |
| Bid          | http://localhost:3003/api/docs   |
| AI           | http://localhost:3004/api/docs   |
| Gateway      | http://localhost:3000/api/docs   |

### Swagger'da kimlik doğrulama

1. `POST /api/auth/login` ile giriş yap, `accessToken` al
2. Sağ üstteki **Authorize** butonuna tıkla
3. `Bearer <accessToken>` yapıştır

---

## Proje Yapısı

```
backend/
├── apps/
│   ├── auth-service/        # Kayıt, giriş, JWT, şirket profilleri
│   ├── auction-service/     # İhale CRUD, durum makinesi, cron
│   ├── bid-service/         # Teklif motoru, Redis distributed lock
│   ├── ai-service/          # Gemini analiz, fraud detection, RAG
│   ├── notification-service/ # Socket.io WebSocket gateway
│   └── gateway/             # API proxy, global JWT guard
├── libs/
│   ├── common/              # Guard, filter, interceptor, decorator'lar
│   ├── database/            # PrismaModule (PostgreSQL), MongoDbModule
│   └── events/              # Redis event tipleri
├── prisma/
│   ├── schema.prisma        # Veritabanı şeması
│   ├── migrations/          # Prisma migration dosyaları
│   └── seed.ts              # Demo veri seed scripti
├── docker-compose.yml
├── .env                     # Ortam değişkenleri
└── nest-cli.json            # NestJS monorepo konfigürasyonu
```

---

## Faydalı Komutlar

```bash
# Prisma Studio (veritabanı arayüzü)
yarn db:studio

# Şema değişiklikten sonra migration oluştur
yarn db:migrate

# Prisma client'ı yeniden oluştur (schema değişince)
yarn db:generate

# Docker altyapısını durdur
docker compose down

# Docker altyapısını sıfırla (veriler silinir)
docker compose down -v
```

---

## Servisler Arası İletişim

```
Client
  └─► Gateway :3000        (HTTP proxy + JWT doğrulama)
        ├─► Auth Service :3001     (PostgreSQL)
        ├─► Auction Service :3002  (PostgreSQL + Redis)
        ├─► Bid Service :3003      (PostgreSQL + Redis distributed lock)
        └─► AI Service :3004       (PostgreSQL + MongoDB + Gemini API)

Notification Service :3005  (Socket.io — client direkt bağlanır)
Redis Pub/Sub               (Bid placed, Auction closed eventleri)
```

---

## Sık Karşılaşılan Sorunlar

**`Cannot connect to PostgreSQL`**
```bash
docker compose up -d postgres
# Birkaç saniye bekle, sonra tekrar dene
```

**`Authentication failed` (MongoDB)**
```bash
docker compose stop mongodb
docker volume rm backend_mongo_data
docker compose up -d mongodb
```

**`prisma generate` sonrası TypeScript hataları**
```bash
yarn db:generate
# VS Code'da: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

**Port zaten kullanımda**
```bash
# Hangi process kullanıyor
lsof -i :3001
# Kapat
kill -9 <PID>
```
