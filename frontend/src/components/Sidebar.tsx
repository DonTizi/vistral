'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onDataPurged: () => void;
}

function SettingsModal({ open, onClose, onDataPurged }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [jobsCount, setJobsCount] = useState(0);
  const [uploadsCount, setUploadsCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [purging, setPurging] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setApiKey('');
    setShowKey(false);
    setSaved(false);
    setConfirmPurge(false);
    setError(null);
    api.getSettings().then(s => {
      setMaskedKey(s.mistral_api_key);
      setHasKey(s.has_api_key);
      setJobsCount(s.jobs_count);
      setUploadsCount(s.uploads_count);
    }).catch(() => {});
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await api.updateApiKey(apiKey.trim());
      setMaskedKey(result.mistral_api_key);
      setHasKey(true);
      setApiKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePurge = async () => {
    if (!confirmPurge) {
      setConfirmPurge(true);
      return;
    }
    setPurging(true);
    setError(null);
    try {
      const result = await api.purgeData();
      setJobsCount(0);
      setUploadsCount(0);
      setConfirmPurge(false);
      onDataPurged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="w-[420px] bg-[#1A1A1A] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-4 h-4 text-[#888]" />
            <span className="text-[13px] font-semibold text-[#FFFAEB]">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-[#666]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* API Key Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <KeyIcon className="w-3.5 h-3.5 text-[#FA500F]/70" />
              <span className="text-[11px] font-semibold text-[#FA500F]/70 uppercase tracking-[0.15em]">Mistral API Key</span>
            </div>

            {/* Current key status */}
            {hasKey && (
              <div className="flex items-center gap-2 mb-2.5 px-3 py-2 rounded-lg bg-[#222] border border-[#2E2E2E]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                <span className="text-[11px] text-[#888] font-mono flex-1 truncate">{maskedKey}</span>
                <span className="text-[10px] text-[#555]">Active</span>
              </div>
            )}

            {!hasKey && (
              <div className="flex items-center gap-2 mb-2.5 px-3 py-2 rounded-lg bg-[#222] border border-[#2E2E2E]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                <span className="text-[11px] text-[#666]">No API key configured</span>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); }}
                  placeholder={hasKey ? 'Enter new key to replace...' : 'Enter your Mistral API key...'}
                  className="w-full bg-[#141414] border border-[#2E2E2E] rounded-lg px-3 py-2 pr-9 text-[12px] text-[#FFFAEB] placeholder-[#444] outline-none focus:border-[#FA500F]/50 transition-colors font-mono"
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
                >
                  {showKey
                    ? <EyeSlashIcon className="w-4 h-4 text-[#555] hover:text-[#888] transition-colors" />
                    : <EyeIcon className="w-4 h-4 text-[#555] hover:text-[#888] transition-colors" />
                  }
                </button>
              </div>
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim() || saving}
                className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-[#FA500F] text-white hover:bg-[#E04600] shadow-[0_0_12px_rgba(250,80,15,0.2)]"
              >
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Saving
                  </span>
                ) : saved ? (
                  <span className="flex items-center gap-1">
                    <CheckIcon className="w-3.5 h-3.5" />
                    Saved
                  </span>
                ) : 'Save'}
              </button>
            </div>

            <p className="text-[10px] text-[#444] mt-2">
              Get your key at{' '}
              <a href="https://console.mistral.ai/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#FA500F]/60 hover:text-[#FA500F]/80 transition-colors">
                console.mistral.ai
              </a>
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#2a2a2a]" />

          {/* Data Management */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrashIcon className="w-3.5 h-3.5 text-[#EF4444]/60" />
              <span className="text-[11px] font-semibold text-[#EF4444]/60 uppercase tracking-[0.15em]">Data</span>
            </div>

            {/* Stats */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1 px-3 py-2 rounded-lg bg-[#222] border border-[#2E2E2E] text-center">
                <div className="text-[15px] font-semibold text-[#FFFAEB]">{jobsCount}</div>
                <div className="text-[10px] text-[#555]">Analyses</div>
              </div>
              <div className="flex-1 px-3 py-2 rounded-lg bg-[#222] border border-[#2E2E2E] text-center">
                <div className="text-[15px] font-semibold text-[#FFFAEB]">{uploadsCount}</div>
                <div className="text-[10px] text-[#555]">Uploads</div>
              </div>
            </div>

            {/* Purge button */}
            <button
              onClick={handlePurge}
              disabled={purging || (jobsCount === 0 && uploadsCount === 0)}
              className={`w-full px-4 py-2.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                confirmPurge
                  ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
                  : 'bg-[#222] border border-[#2E2E2E] text-[#999] hover:bg-[#2a2a2a] hover:text-[#ccc] hover:border-[#333]'
              }`}
            >
              {purging ? (
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Purging...
                </span>
              ) : confirmPurge ? (
                'Confirm — Delete all data permanently'
              ) : (
                'Purge all data'
              )}
            </button>

            {confirmPurge && !purging && (
              <button
                onClick={() => setConfirmPurge(false)}
                className="w-full mt-1.5 px-4 py-1.5 rounded-lg text-[11px] text-[#666] hover:text-[#999] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
              <p className="text-[11px] text-[#EF4444]">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        <div className="flex-1" />
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer mb-1"
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4 text-[#555]" />
        </button>
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onDataPurged={() => { setAnalyses([]); router.push('/'); }}
        />
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
      <div className="shrink-0 border-t border-[#2a2a2a] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MistralLogo className="w-3 h-2 opacity-40" variant="rainbow" />
            <span className="text-[9px] text-[#444]">Powered by Mistral AI</span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer"
            title="Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-[#555] hover:text-[#888] transition-colors" />
          </button>
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDataPurged={() => { setAnalyses([]); router.push('/'); }}
      />
    </div>
  );
}
