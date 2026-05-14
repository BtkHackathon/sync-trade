import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, CompanyRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL as string),
} as any);

async function main() {
  console.log('🌱 Seed verisi oluşturuluyor...');

  await prisma.eventOutbox.deleteMany();
  await prisma.awardedBid.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.document.deleteMany();
  await prisma.supplierProfile.deleteMany();
  await prisma.company.deleteMany();

  const password = await bcrypt.hash('Demo@12345', 12);

  // ─── Alıcı Şirketler ─────────────────────────────────────────────────────
  const buyer1 = await prisma.company.create({
    data: {
      name: 'Anadolu Mobilya Holding A.Ş.',
      email: 'tedarik@anadolumobilya.com',
      passwordHash: password,
      role: CompanyRole.BUYER,
      sector: 'Perakende & Mobilya',
      taxId: '1234567890',
      phone: '+902324001234',
      city: 'İzmir',
      address: 'Atatürk Caddesi No:45, Bornova, İzmir',
      isVerified: true,
    },
  });

  const buyer2 = await prisma.company.create({
    data: {
      name: 'Marmara Tekstil San. A.Ş.',
      email: 'satin.alma@marmaratekstil.com',
      passwordHash: password,
      role: CompanyRole.BUYER,
      sector: 'Tekstil & Konfeksiyon',
      taxId: '9876543210',
      phone: '+902164001234',
      city: 'Bursa',
      address: 'OSB 2. Cadde No:12, Bursa',
      isVerified: true,
    },
  });

  // ─── Tedarikçi Şirketler ─────────────────────────────────────────────────
  const supplier1 = await prisma.company.create({
    data: {
      name: 'Ergosan Mobilya Üretim A.Ş.',
      email: 'ihale@ergosanmobilya.com',
      passwordHash: password,
      role: CompanyRole.SUPPLIER,
      sector: 'Mobilya İmalatı',
      taxId: '1111111111',
      phone: '+902324556677',
      city: 'İzmir',
      address: 'Kemalpaşa OSB, İzmir',
      isVerified: true,
      supplierProfile: {
        create: {
          certifications: ['ISO 9001:2015', 'CE Belgesi', 'TSE Standartları'],
          specializations: ['Ofis Mobilyası', 'Ergonomik Ürünler', 'Toplu Alım'],
          description: '15 yıllık kurumsal mobilya üretim deneyimi. Yıllık 50.000 adet üretim kapasitesi.',
          reliabilityScore: 8.7,
          totalBids: 47,
          completedAuctions: 43,
          cancelledAuctions: 2,
          avgDeliveryDays: 22,
          onTimeDeliveryRate: 0.94,
        },
      },
    },
  });

  const supplier2 = await prisma.company.create({
    data: {
      name: 'Baysak Ofis Sistemleri Ltd. Şti.',
      email: 'teklifler@baysakofis.com',
      passwordHash: password,
      role: CompanyRole.SUPPLIER,
      sector: 'Mobilya İmalatı',
      taxId: '2222222222',
      phone: '+902124556677',
      city: 'İstanbul',
      address: 'İkitelli OSB, İstanbul',
      isVerified: true,
      supplierProfile: {
        create: {
          certifications: ['ISO 14001', 'CE Belgesi'],
          specializations: ['Ofis Koltuğu', 'Okul Mobilyası'],
          description: 'Düşük fiyat odaklı seri üretim. Hızlı teslimat avantajı.',
          reliabilityScore: 5.2,
          totalBids: 89,
          completedAuctions: 61,
          cancelledAuctions: 14,
          avgDeliveryDays: 18,
          onTimeDeliveryRate: 0.71,
        },
      },
    },
  });

  const supplier3 = await prisma.company.create({
    data: {
      name: 'Kalitaş Mobilya ve İç Mekan A.Ş.',
      email: 'proje@kalitasmobilya.com',
      passwordHash: password,
      role: CompanyRole.SUPPLIER,
      sector: 'Mobilya İmalatı',
      taxId: '3333333333',
      phone: '+903224556677',
      city: 'Ankara',
      address: 'Ostim Sanayi Bölgesi, Ankara',
      isVerified: true,
      supplierProfile: {
        create: {
          certifications: ['ISO 9001:2015', 'ISO 45001', 'Greenguard Gold', 'CE Belgesi'],
          specializations: ['Premium Ofis Mobilyası', 'Proje Bazlı Üretim', 'Kurumsal Projeler'],
          description: 'Kurumsal projeler için premium kalite mobilya çözümleri. 20+ yıl deneyim.',
          reliabilityScore: 9.1,
          totalBids: 31,
          completedAuctions: 30,
          cancelledAuctions: 0,
          avgDeliveryDays: 28,
          onTimeDeliveryRate: 0.97,
        },
      },
    },
  });

  const supplier4 = await prisma.company.create({
    data: {
      name: 'Ucuz Depo Mobilya Ltd.',
      email: 'satis@ucuzdepo.com',
      passwordHash: password,
      role: CompanyRole.SUPPLIER,
      sector: 'Mobilya İmalatı',
      taxId: '4444444444',
      phone: '+902164556677',
      city: 'Bursa',
      address: 'Demirtaş OSB, Bursa',
      isVerified: false,
      supplierProfile: {
        create: {
          certifications: [],
          specializations: ['Her tür mobilya'],
          description: 'En ucuz fiyatlar garantisi.',
          reliabilityScore: 2.3,
          totalBids: 156,
          completedAuctions: 89,
          cancelledAuctions: 41,
          avgDeliveryDays: 45,
          onTimeDeliveryRate: 0.42,
        },
      },
    },
  });

  // ─── Demo İhaleler ────────────────────────────────────────────────────────
  const closedAuction = await prisma.auction.create({
    data: {
      title: '500 Adet Ergonomik Ofis Koltuğu Alımı',
      description: 'Manisa ofisimiz için yüksek sırtlı, bel destekli, kolçaklı ergonomik çalışma koltuğu. Kumaş rengi: Antrasit veya Gri.',
      category: 'Ofis Mobilyası',
      quantity: 500,
      unit: 'adet',
      maxBudget: 1000000,
      deliveryDeadline: new Date('2026-06-15'),
      deliveryAddress: 'Manisa OSB, 45030 Manisa',
      requirements: ['CE Sertifikası zorunlu', 'Kumaş: Örgü kumaş (mesh)', 'Yükseklik ayarlı', 'Garanti: Min 3 yıl'],
      status: 'CLOSED',
      endsAt: new Date(Date.now() - 3600000),
      buyerId: buyer1.id,
      lowestBidAmount: 820000,
      bidCount: 4,
    },
  });

  const openAuction = await prisma.auction.create({
    data: {
      title: '10 Ton A Kalite Penye Pamuk İpliği Alımı',
      description: 'Bant üretimi için 20/1 ve 30/1 numara, A kalite penye pamuk ipliği.',
      category: 'Tekstil Hammaddesi',
      quantity: 10000,
      unit: 'kg',
      maxBudget: 500000,
      deliveryDeadline: new Date('2026-06-01'),
      deliveryAddress: 'Bursa OSB, Bursa',
      requirements: ['Karde veya penye', 'OEKO-TEX Standard 100 sertifikalı', 'Nem oranı max %8'],
      status: 'OPEN',
      endsAt: new Date(Date.now() + 7200000),
      buyerId: buyer2.id,
      bidCount: 0,
    },
  });

  // ─── Teklifler (Kapalı İhale) ─────────────────────────────────────────────
  await prisma.bid.createMany({
    data: [
      {
        auctionId: closedAuction.id,
        supplierId: supplier1.id,
        amount: 950000,
        note: 'ISO 9001 belgeli fabrikamızda üretim. 22 günde teslim.',
        status: 'ACTIVE',
        ipAddress: '192.168.1.10',
      },
      {
        auctionId: closedAuction.id,
        supplierId: supplier2.id,
        amount: 820000,
        note: '18 gün içinde teslim edebiliriz. Stoktan karşılanabilir.',
        status: 'ACTIVE',
        ipAddress: '192.168.1.20',
      },
      {
        auctionId: closedAuction.id,
        supplierId: supplier3.id,
        amount: 970000,
        note: 'Premium malzeme kullanıyoruz. Greenguard Gold sertifikalı. 5 yıl garanti.',
        status: 'ACTIVE',
        ipAddress: '10.0.0.5',
      },
      {
        auctionId: closedAuction.id,
        supplierId: supplier4.id,
        amount: 680000,
        note: 'En ucuz fiyat garantisi veriyoruz.',
        status: 'ACTIVE',
        ipAddress: '192.168.1.20',
      },
    ],
  });

  console.log('\n✅ Seed verisi başarıyla oluşturuldu!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 DEMO GİRİŞ BİLGİLERİ (şifre: Demo@12345)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ALICI  →', buyer1.email, '(Mobilya)');
  console.log('ALICI  →', buyer2.email, '(Tekstil)');
  console.log('TEDARİKÇİ →', supplier1.email, '(Güvenilir, 8.7/10)');
  console.log('TEDARİKÇİ →', supplier2.email, '(Orta, 5.2/10)');
  console.log('TEDARİKÇİ →', supplier3.email, '(Premium, 9.1/10)');
  console.log('TEDARİKÇİ →', supplier4.email, '(Riskli, 2.3/10)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 DEMO İHALE (KAPALI — AI analizi için hazır):', closedAuction.id);
  console.log('📋 DEMO İHALE (AÇIK — canlı teklif için hazır):', openAuction.id);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
