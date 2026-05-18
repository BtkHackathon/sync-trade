'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Loader2, Sparkles, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiApi } from '@/lib/api';
import type { SpecAnalysisResult } from '@/types';

interface SpecUploadProps {
  onAnalysisComplete: (result: SpecAnalysisResult) => void;
}

type UploadState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

export function SpecUpload({ onAnalysisComplete }: SpecUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const analyze = useCallback(
    async (file: File) => {
      setState('uploading');
      setFileName(file.name);
      setErrorMsg(null);
      try {
        // Kısa bekleme — "yükleniyor" animasyonu görünsün
        await new Promise((r) => setTimeout(r, 400));
        setState('analyzing');

        const formData = new FormData();
        formData.append('file', file);

        // AI servisi gateway'den geçmiyor; direkt localhost:3004 kullan
        const AI_DIRECT =
          process.env.NEXT_PUBLIC_AI_DIRECT_URL ?? 'http://localhost:3004/api';
        const { data } = await import('axios').then((m) =>
          m.default.post(`${AI_DIRECT}/ai/analyze-spec`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          }),
        );

        setState('done');
        onAnalysisComplete(
          (data as { data: { analysisResult: SpecAnalysisResult } }).data
            .analysisResult,
        );
      } catch {
        setState('error');
        setErrorMsg('Analiz başarısız. Lütfen geçerli bir PDF yükleyin.');
      }
    },
    [onAnalysisComplete],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropAccepted: ([file]) => analyze(file),
    onDropRejected: () => {
      setState('error');
      setErrorMsg('Yalnızca PDF dosyası kabul edilmektedir (maks. 10 MB).');
    },
    disabled: state === 'uploading' || state === 'analyzing',
  });

  function reset() {
    setState('idle');
    setFileName(null);
    setErrorMsg(null);
  }

  /* ── Yüklenirken / analiz shimmer ── */
  if (state === 'uploading' || state === 'analyzing') {
    return (
      <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-8 space-y-5">
        {/* Shimmer satırları */}
        <div className="space-y-3">
          {[80, 60, 90, 50].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded shimmer"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>

        {/* Durum metni */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            {state === 'uploading' ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">
              {state === 'uploading' ? 'PDF yükleniyor…' : 'Gemini AI analiz ediyor…'}
            </p>
            <p className="text-xs text-blue-600">
              {state === 'uploading'
                ? fileName
                : 'Şartname içeriği okunuyor, form alanları doldurulacak'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Başarıyla tamamlandı ── */
  if (state === 'done') {
    return (
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">
              AI analizi tamamlandı!
            </p>
            <p className="text-xs text-emerald-700 truncate mt-0.5">{fileName}</p>
          </div>
          <button
            onClick={reset}
            className="text-emerald-600 hover:text-emerald-800 transition-colors"
            title="Farklı dosya yükle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-emerald-700 mt-3 pl-11">
          Form alanları AI tarafından dolduruldu. İsterseniz düzenleyebilirsiniz.
        </p>
      </div>
    );
  }

  /* ── Hata ── */
  if (state === 'error') {
    return (
      <div
        {...getRootProps()}
        className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-8 text-center cursor-pointer hover:border-red-300 transition-colors"
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <X className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
          <p className="text-xs text-red-500">Tekrar denemek için tıklayın</p>
        </div>
      </div>
    );
  }

  /* ── Varsayılan: Yükle alanı ── */
  return (
    <div
      {...getRootProps()}
      className={cn(
        'rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all',
        isDragActive
          ? 'border-blue-400 bg-blue-50/80 scale-[1.01]'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30',
      )}
    >
      <input {...getInputProps()} />

      <div className="space-y-4">
        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto transition-colors group-hover:bg-blue-100">
          {isDragActive ? (
            <Upload className="w-6 h-6 text-blue-500" />
          ) : (
            <FileText className="w-6 h-6 text-slate-400" />
          )}
        </div>

        <div className="space-y-1.5">
          <p className="font-semibold text-[#0F172A] text-sm">
            {isDragActive
              ? 'Dosyayı bırakın…'
              : 'Şartname PDF\'ini yükleyin'}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            PDF dosyanızı sürükleyip bırakın veya seçmek için tıklayın.
            <br />
            Gemini AI içeriği analiz edip form alanlarını otomatik dolduracak.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-blue-700 text-xs font-medium">
              Gemini AI Destekli
            </span>
          </div>
          <span className="text-slate-400 text-xs">PDF · maks. 10 MB</span>
        </div>
      </div>
    </div>
  );
}
