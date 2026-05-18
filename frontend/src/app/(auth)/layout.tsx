import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sol panel — marka */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] flex-col justify-between p-12 relative overflow-hidden">
        {/* Arka plan doku */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 -left-16 w-96 h-96 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-1/4 -right-16 w-80 h-80 rounded-full bg-blue-400 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                <path
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="9,22 9,12 15,12 15,22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">
              SyncTrade
            </span>
          </div>
        </div>

        {/* Orta içerik */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-blue-300 text-xs font-medium tracking-wide uppercase">
                Gemini AI Destekli
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Tedarik sürecinizi
              <br />
              <span className="text-blue-400">yapay zekayla</span>
              <br />
              yönetin.
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Şartname analizinden kartel tespitine, canlı açık artırmadan akıllı
              tedarikçi önerilerine kadar tüm süreç tek platformda.
            </p>
          </div>

          {/* Özellik listesi */}
          <div className="space-y-3">
            {[
              'AI ile otomatik şartname analizi',
              'Gerçek zamanlı ters açık artırma',
              'Gemini tabanlı tedarikçi risk skoru',
              'Kartel ve fiyat anlaşması tespiti',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-2.5 h-2.5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alt footer */}
        <div className="relative z-10">
          <p className="text-slate-600 text-xs">
            BTK Akademi Hackathon 2026 — SyncTrade
          </p>
        </div>
      </div>

      {/* Sağ panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
