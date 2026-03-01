'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { VistralLogo } from '@/components/ui/VistralLogo';
import { MistralLogo } from '@/components/ui/MistralLogo';

interface Analysis {
  job_id: string;
  title: string;
  summary: string;
  created_at: number;
  topics_count: number;
  status: string;
}

function formatRelativeDate(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function ChevronIcon({ className, collapsed }: { className?: string; collapsed: boolean }) {
  return (
    <svg className={`${className} transition-transform ${collapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} width="12" height="12">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function SidebarToggleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);

  useEffect(() => {
    api.listJobs().then(setAnalyses).catch(() => {});
  }, []);

  // Refresh analyses when navigating to analysis page
  useEffect(() => {
    if (pathname.startsWith('/analysis/') && !pathname.includes('demo-')) {
      const timer = setTimeout(() => {
        api.listJobs().then(setAnalyses).catch(() => {});
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const currentJobId = pathname.startsWith('/analysis/') ? pathname.split('/').pop() : null;

  if (collapsed) {
    return (
      <div className="w-12 bg-[#1A1A1A] border-r border-[#2a2a2a] flex flex-col items-center py-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer mb-4"
        >
          <SidebarToggleIcon className="w-4 h-4 text-[#888]" />
        </button>
        <a href="/" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors mb-1">
          <VistralLogo className="w-4 h-4" />
        </a>
        <div className="w-5 h-px bg-[#2a2a2a] my-3" />
        <a href="/" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors mb-1">
          <PlusIcon className="w-4 h-4 text-[#666]" />
        </a>
        <div className="w-5 h-px bg-[#2a2a2a] my-3" />
        {analyses.slice(0, 5).map((a) => (
          <a
            key={a.job_id}
            href={`/analysis/${a.job_id}`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors mb-1 ${
              currentJobId === a.job_id ? 'bg-[#FA500F]/10 text-[#FA500F]' : 'hover:bg-[#2a2a2a] text-[#555]'
            }`}
            title={a.title}
          >
            <VideoIcon className="w-3.5 h-3.5" />
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="w-56 bg-[#1A1A1A] border-r border-[#2a2a2a] flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 shrink-0">
        <a href="/" className="flex items-center gap-2">
          <VistralLogo className="w-4 h-4" />
          <span className="text-xs font-bold text-[#FFFAEB] tracking-widest">VISTRAL</span>
        </a>
        <button
          onClick={() => setCollapsed(true)}
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer"
        >
          <SidebarToggleIcon className="w-3.5 h-3.5 text-[#666]" />
        </button>
      </div>

      <div className="h-px bg-[#2a2a2a]" />

      {/* Navigation */}
      <div className="px-2 pt-3 pb-2">
        <a
          href="/"
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors ${
            pathname === '/' ? 'bg-[#2a2a2a] text-[#FFFAEB]' : 'text-[#999] hover:bg-[#222] hover:text-[#ccc]'
          }`}
        >
          <HomeIcon className="w-4 h-4" />
          Accueil
        </a>
        <a
          href="/"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium text-[#999] hover:bg-[#222] hover:text-[#ccc] transition-colors mt-0.5"
        >
          <PlusIcon className="w-4 h-4" />
          Nouvelle analyse
        </a>
      </div>

      <div className="h-px bg-[#2a2a2a] mx-3" />

      {/* Analyses history */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-3">
        <button
          onClick={() => setHistoryCollapsed(!historyCollapsed)}
          className="flex items-center justify-between w-full px-2.5 py-1.5 cursor-pointer group"
        >
          <span className="text-[10px] font-medium text-[#555] uppercase tracking-wider">Analyses</span>
          <ChevronIcon className="w-3 h-3 text-[#444] group-hover:text-[#666]" collapsed={historyCollapsed} />
        </button>

        {!historyCollapsed && (
          <div className="mt-1 space-y-0.5">
            {/* Demo entries */}
            {['meeting', 'interview', 'podcast'].map((demo) => {
              const demoId = `demo-${demo}`;
              const isActive = currentJobId === demoId;
              const labels: Record<string, string> = {
                meeting: 'Enterprise Meeting',
                interview: 'Technical Interview',
                podcast: 'Tech Podcast',
              };
              return (
                <a
                  key={demoId}
                  href={`/analysis/${demoId}`}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] transition-colors group ${
                    isActive
                      ? 'bg-[#FA500F]/10 text-[#FFFAEB]'
                      : 'text-[#888] hover:bg-[#222] hover:text-[#ccc]'
                  }`}
                >
                  <VideoIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#FA500F]' : 'text-[#555] group-hover:text-[#888]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{labels[demo]}</div>
                    <div className="text-[9px] text-[#555] mt-0.5">Demo</div>
                  </div>
                </a>
              );
            })}

            {/* Real analyses */}
            {analyses.length > 0 && (
              <>
                {analyses.map((analysis) => {
                  const isActive = currentJobId === analysis.job_id;
                  return (
                    <a
                      key={analysis.job_id}
                      href={`/analysis/${analysis.job_id}`}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] transition-colors group ${
                        isActive
                          ? 'bg-[#FA500F]/10 text-[#FFFAEB]'
                          : 'text-[#888] hover:bg-[#222] hover:text-[#ccc]'
                      }`}
                    >
                      <VideoIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#FA500F]' : 'text-[#555] group-hover:text-[#888]'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{analysis.title}</div>
                        <div className="text-[9px] text-[#555] mt-0.5">{formatRelativeDate(analysis.created_at)}</div>
                      </div>
                    </a>
                  );
                })}
              </>
            )}

            {analyses.length === 0 && (
              <div className="px-2.5 py-3 text-[11px] text-[#444] text-center">
                Aucune analyse pour le moment
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#2a2a2a] px-3 py-3">
        <div className="flex items-center gap-2">
          <MistralLogo className="w-3 h-2 opacity-40" variant="rainbow" />
          <span className="text-[9px] text-[#444]">Powered by Mistral AI</span>
        </div>
      </div>
    </div>
  );
}
