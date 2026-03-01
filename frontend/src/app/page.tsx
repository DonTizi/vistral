'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { VistralLogo } from '@/components/ui/VistralLogo';
import { Button } from '@/components/ui/Button';
import { Preloader } from '@/components/Preloader';

function VideoFileIcon({ color, foldColor, label, labelColor = 'white', labelSize = 8, children }: {
  color: string; foldColor: string; label: string; labelColor?: string; labelSize?: number; children?: React.ReactNode;
}) {
  return (
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" className="drop-shadow-lg">
      <path d="M4 4C4 1.79 5.79 0 8 0H30L44 14V52C44 54.21 42.21 56 40 56H8C5.79 56 4 54.21 4 52V4Z" fill={color} />
      <path d="M30 0L44 14H34C31.79 14 30 12.21 30 10V0Z" fill={foldColor} />
      {children}
      <text x="24" y="51" textAnchor="middle" fill={labelColor} fontSize={labelSize} fontWeight="700" fontFamily="Inter, sans-serif">{label}</text>
    </svg>
  );
}

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

const YOUTUBE_RE = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)/;

export default function LandingPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleUrlSubmit = useCallback(async () => {
    const url = urlValue.trim();
    if (!url) return;

    if (!YOUTUBE_RE.test(url)) {
      setError('Only YouTube URLs are supported — this project was built for a hackathon!');
      return;
    }

    setIsDownloading(true);
    setError(null);
    try {
      const { job_id } = await api.uploadUrl(url);
      router.push(`/processing/${job_id}`);
    } catch (e: any) {
      setError(e.message || 'Download failed');
      setIsDownloading(false);
    }
  }, [urlValue, router]);

  return (
    <Preloader>
    <main className="h-full overflow-auto relative">
      {/* Warm ambient glow */}
      <div className="absolute inset-0 mistral-glow pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-full">
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

            {/* Upload zone — Mistral console style */}
            <div className="w-full mb-8">
              <div
                className={`relative rounded-2xl py-10 px-6 text-center transition-all duration-200
                  ${isDragging ? 'bg-[#FA500F]/5 ring-2 ring-[#FA500F]/20' : ''}
                  ${(isUploading || isDownloading) ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !(isUploading || isDownloading) && !showUrlInput && document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileInput}
                />

                {(isUploading || isDownloading) ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-[#FA500F] border-t-transparent animate-spin" />
                    <p className="text-sm font-medium text-[#FFFAEB]">
                      {isDownloading ? 'Downloading from YouTube...' : 'Uploading...'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    {/* Video file type icons */}
                    <div className="flex items-end justify-center -space-x-3 mb-1">
                      <div className="relative z-0 -rotate-6">
                        <VideoFileIcon color="#FA500F" foldColor="#C73D0B" label="MP4">
                          <path d="M19 26L29 32L19 38V26Z" fill="white" />
                        </VideoFileIcon>
                      </div>
                      <div className="relative z-10 translate-y-[-4px]">
                        <VideoFileIcon color="#FFD800" foldColor="#CCB000" label="WEBM" labelColor="#1A1A1A" labelSize={7}>
                          <rect x="13" y="22" width="22" height="4" rx="1" fill="#1A1A1A" />
                          <line x1="18" y1="22" x2="16" y2="26" stroke="#FFD800" strokeWidth="1.5" />
                          <line x1="24" y1="22" x2="22" y2="26" stroke="#FFD800" strokeWidth="1.5" />
                          <line x1="30" y1="22" x2="28" y2="26" stroke="#FFD800" strokeWidth="1.5" />
                          <rect x="13" y="26" width="22" height="12" rx="1" fill="#1A1A1A" opacity="0.8" />
                        </VideoFileIcon>
                      </div>
                      <div className="relative z-0 rotate-6">
                        <VideoFileIcon color="#4FC3F7" foldColor="#2E9FD4" label="MOV">
                          <circle cx="24" cy="31" r="8" fill="none" stroke="white" strokeWidth="2" />
                          <circle cx="24" cy="31" r="3" fill="white" />
                          <circle cx="24" cy="23.5" r="1.2" fill="white" />
                          <circle cx="24" cy="38.5" r="1.2" fill="white" />
                          <circle cx="17" cy="28" r="1.2" fill="white" />
                          <circle cx="31" cy="34" r="1.2" fill="white" />
                        </VideoFileIcon>
                      </div>
                    </div>

                    <h2 className="text-lg font-semibold text-[#FFFAEB]">Analyze your videos</h2>
                    <p className="text-sm text-[#888]">MP4, WebM, MOV &nbsp;·&nbsp; up to 500MB</p>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('file-input')?.click();
                        }}
                        className="flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Upload a video
                      </Button>

                      <Button
                        variant="secondary"
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowUrlInput(!showUrlInput);
                          setError(null);
                        }}
                        className="flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        YouTube URL
                      </Button>
                    </div>

                    {/* YouTube URL input */}
                    {showUrlInput && (
                      <div
                        className="w-full max-w-sm flex gap-2 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="url"
                          value={urlValue}
                          onChange={(e) => { setUrlValue(e.target.value); setError(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUrlSubmit(); }}
                          placeholder="https://youtube.com/watch?v=..."
                          className="flex-1 bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#FFFAEB] placeholder-[#555] focus:outline-none focus:border-[#FA500F] transition-colors"
                          autoFocus
                        />
                        <Button
                          variant="primary"
                          size="md"
                          onClick={handleUrlSubmit}
                          disabled={!urlValue.trim()}
                          className="shrink-0"
                        >
                          Go
                        </Button>
                      </div>
                    )}

                    <p className="text-xs text-[#666]">or drop your file here</p>
                  </div>
                )}

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

        {/* Footer */}
        <footer className="w-full px-8 py-4 flex items-center justify-center">
          <span className="text-[#555] text-[10px] tracking-wide">
            Voxtral  ·  Pixtral  ·  Mistral Small
          </span>
        </footer>
      </div>
    </main>
    </Preloader>
  );
}
