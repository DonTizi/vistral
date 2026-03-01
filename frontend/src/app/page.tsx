'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { MistralLogo } from '@/components/ui/MistralLogo';
import { VistralLogo } from '@/components/ui/VistralLogo';
import { Preloader } from '@/components/Preloader';

const DEMOS = [
  {
    name: 'meeting',
    title: 'Enterprise Meeting',
    description: 'Q3 budget review with slides and multiple speakers',
    duration: '10 min',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    name: 'interview',
    title: 'Technical Interview',
    description: 'Senior engineer candidate assessment',
    duration: '8 min',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    name: 'podcast',
    title: 'Tech Podcast',
    description: 'AI industry trends discussion with expert panel',
    duration: '12 min',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
  },
];

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638l-3.96-4.158a.75.75 0 111.08-1.04l5.25 5.5a.75.75 0 010 1.04l-5.25 5.5a.75.75 0 11-1.08-1.04l3.96-4.158H3.75A.75.75 0 013 10z" clipRule="evenodd" />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file (MP4, WebM, etc.)');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const { job_id } = await api.upload(file);
      router.push(`/processing/${job_id}`);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      setIsUploading(false);
    }
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <Preloader>
    <main className="min-h-screen relative">
      {/* Warm ambient glow */}
      <div className="absolute inset-0 mistral-glow pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="w-full px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VistralLogo className="w-6 h-6" />
            <span className="text-sm font-bold text-[#FFFAEB] tracking-widest">VISTRAL</span>
          </div>
          <div className="flex items-center gap-2">
            <MistralLogo className="w-3.5 h-2.5" variant="rainbow" />
            <span className="text-[11px] text-[#555]">Powered by Mistral AI</span>
          </div>
        </nav>

        {/* Rainbow accent bar */}
        <div className="h-[2px] mistral-gradient-bar" />

        {/* Main content — tighter, more intentional */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md mx-auto flex flex-col items-center">

            {/* Brand mark — pixel V + ISTRAL */}
            <h1 className="flex items-end mb-3">
              <VistralLogo className="h-[32px] w-auto mb-[8px] mr-[2px]" />
              <span className="text-[42px] font-bold tracking-tight text-[#FFFAEB] leading-none">ISTRAL</span>
            </h1>
            <p className="text-sm text-[#888] mb-8 text-center max-w-xs leading-relaxed">
              Temporal knowledge graphs from enterprise videos with traceable evidence chains.
            </p>

            {/* Upload zone — compact, purposeful */}
            <div className="w-full mb-8">
              <div
                className={`upload-zone relative rounded-xl py-8 px-6 text-center border
                  ${isDragging ? 'dragging border-[#FA500F]' : 'border-[#333]'}
                  ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isUploading && document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <div className="flex flex-col items-center gap-2.5">
                  {isUploading ? (
                    <div className="w-8 h-8 rounded-full border-2 border-[#FA500F] border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#2a2a2a] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#FA500F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-[#FFFAEB]">
                      {isUploading ? 'Uploading...' : 'Drop a video or click to browse'}
                    </p>
                    <p className="text-xs text-[#666] mt-1">MP4, WebM, MOV — up to 500MB</p>
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
              </div>
            </div>

            {/* Divider */}
            <div className="w-full flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-[#2a2a2a]" />
              <span className="text-[#666] text-[10px] uppercase tracking-[0.15em] font-medium">or try a demo</span>
              <div className="h-px flex-1 bg-[#2a2a2a]" />
            </div>

            {/* Demo cards */}
            <div className="w-full space-y-2">
              {DEMOS.map((demo) => (
                <button
                  key={demo.name}
                  onClick={() => router.push(`/analysis/demo-${demo.name}`)}
                  className="demo-card w-full bg-[#222] border border-[#2E2E2E] rounded-lg px-4 py-3 text-left group flex items-center gap-3.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#888] group-hover:text-[#FA500F] group-hover:bg-[#322118] transition-colors shrink-0">
                    {demo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium text-[#FFFAEB]">{demo.title}</span>
                      <span className="text-[10px] text-[#666] font-medium">{demo.duration}</span>
                    </div>
                    <p className="text-xs text-[#777] mt-0.5 truncate">{demo.description}</p>
                  </div>
                  <ArrowRight className="demo-arrow w-4 h-4 text-[#555] transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — meaningful, readable */}
        <footer className="w-full px-8 py-4 flex items-center justify-center gap-2">
          <MistralLogo className="w-3.5 h-2.5 opacity-40" variant="rainbow" />
          <span className="text-[#555] text-[10px] tracking-wide">
            Voxtral  ·  Pixtral  ·  Mistral Small
          </span>
        </footer>
      </div>
    </main>
    </Preloader>
  );
}
