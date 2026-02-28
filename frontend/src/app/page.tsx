'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';

const DEMOS = [
  { name: 'meeting', title: 'Enterprise Meeting', description: 'Q3 budget review with slides and multiple speakers', duration: '10 min', icon: '[]' },
  { name: 'interview', title: 'Technical Interview', description: 'Senior engineer candidate assessment', duration: '8 min', icon: '[]' },
  { name: 'podcast', title: 'Tech Podcast', description: 'AI industry trends discussion with expert panel', duration: '12 min', icon: '[]' },
];

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
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-[#FA500F]">VIST</span>RAL
          </h1>
          <p className="text-[#999999] text-lg">
            Video World-State Intelligence
          </p>
          <p className="text-[#666666] text-sm max-w-lg mx-auto">
            Build Temporal Knowledge Graphs from enterprise videos.
            Traceable insights with evidence chains. Powered by Mistral AI.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
            isDragging ? 'border-[#FA500F] bg-[#FA500F]/5' : 'border-[#333333] hover:border-[#FA500F]/50'
          } ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
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
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#242424] flex items-center justify-center">
              {isUploading ? (
                <svg className="w-8 h-8 text-[#FA500F] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-[#999999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-[#FFFAEB] font-medium">
                {isUploading ? 'Uploading...' : 'Drop your video here'}
              </p>
              <p className="text-[#666666] text-sm mt-1">MP4, WebM, MOV up to 500MB</p>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Demo Selector */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#333333]" />
            <span className="text-[#666666] text-sm">or try a demo</span>
            <div className="h-px flex-1 bg-[#333333]" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {DEMOS.map((demo) => (
              <Card
                key={demo.name}
                onClick={() => router.push(`/analysis/demo-${demo.name}`)}
                className="hover:bg-[#2a2a2a] group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#FFFAEB] group-hover:text-[#FA500F] transition-colors">
                      {demo.title}
                    </span>
                    <span className="text-xs text-[#666666]">{demo.duration}</span>
                  </div>
                  <p className="text-xs text-[#999999] leading-relaxed">{demo.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#444444] text-xs">
          100% Mistral AI Stack &middot; Voxtral + Pixtral + Mistral Small
        </p>
      </div>
    </main>
  );
}
