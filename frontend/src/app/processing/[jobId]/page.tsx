'use client';
import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSSE } from '@/hooks/useSSE';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { VistralLogo } from '@/components/ui/VistralLogo';
import { ProgressBar } from '@/components/ui/ProgressBar';


const STEPS = [
  { key: 'audio', label: 'Audio', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  )},
  { key: 'transcription', label: 'Transcription', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )},
  { key: 'frames', label: 'Frames', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25c0 .828.672 1.5 1.5 1.5z" />
    </svg>
  )},
  { key: 'vision', label: 'Vision', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { key: 'graph', label: 'Knowledge Graph', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  )},
  { key: 'insights', label: 'Insights', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  )},
];

const STEP_INDEX = new Map(STEPS.map((s, i) => [s.key, i]));

const STEP_SUBTITLES: Record<string, string> = {
  upload: 'Preparing your video for analysis',
  audio: 'Extracting and processing audio channels',
  transcription: 'Voxtral is transcribing speech',
  frames: 'Deduplicating visual keyframes',
  vision: 'Pixtral is analyzing visual content',
  analysis: 'Cross-referencing audio and visual entities',
  graph: 'Constructing the Temporal Knowledge Graph',
  insights: 'Reasoning over knowledge graph patterns',
};

function getStepStatus(stepKey: string, currentStep: string | undefined, isComplete: boolean) {
  if (isComplete) return 'done';
  const currentIdx = currentStep ? (STEP_INDEX.get(currentStep) ?? -1) : -1;
  const thisIdx = STEP_INDEX.get(stepKey) ?? -1;
  if (thisIdx < currentIdx) return 'done';
  if (thisIdx === currentIdx) return 'active';
  return 'pending';
}

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const { events, currentStep, isComplete, error } = useSSE(api.getStreamUrl(jobId));
  const eventLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isComplete) {
      const timeout = setTimeout(() => router.push(`/analysis/${jobId}`), 1500);
      return () => clearTimeout(timeout);
    }
  }, [isComplete, jobId, router]);

  // Auto-scroll event log
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [events.length]);

  const activeStepKey = currentStep?.step === 'complete' ? 'insights' :
                         currentStep?.step === 'analysis' ? 'graph' :
                         currentStep?.step;
  const overallProgress = currentStep?.progress ?? 0;
  const isProcessing = !isComplete && !error;

  // Dynamic subtitle based on current step
  const subtitle = isComplete
    ? 'Redirecting to analysis...'
    : error
      ? 'Something went wrong'
      : STEP_SUBTITLES[currentStep?.step ?? 'upload'] ?? 'Extracting temporal knowledge from your video';

  return (
    <main className="min-h-screen relative">
      {/* Subtle glow */}
      <div className="absolute inset-0 mistral-glow pointer-events-none" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="w-full px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <VistralLogo className="w-5 h-5" />
            <span className="text-sm font-semibold text-[#FFFAEB] tracking-wide">VISTRAL</span>
          </a>
          <span className="text-xs text-[#555]">Processing</span>
        </nav>
        <div className="h-px mistral-gradient-bar opacity-40" />

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
          <div className="w-full max-w-4xl mx-auto space-y-12">
            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-[#FFFAEB]">
                {isComplete ? 'Analysis Complete' : error ? 'Processing Error' : 'Building Knowledge Graph'}
              </h1>
              <AnimatePresence mode="wait">
                <motion.p
                  key={subtitle}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className={cn('text-sm', isProcessing ? 'text-shimmer' : 'text-[#777777]')}
                >
                  {subtitle}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Pipeline Steps */}
            <div className="flex items-start justify-between gap-1">
              {STEPS.map((step, i) => {
                const status = getStepStatus(step.key, activeStepKey, isComplete);
                return (
                  <div key={step.key} className="flex items-center gap-1 flex-1">
                    <div className="flex flex-col items-center gap-2.5 flex-1">
                      <motion.div
                        animate={status === 'done' ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500',
                          status === 'done' && 'bg-[#FA500F] text-white',
                          status === 'active' && 'bg-[#FA500F]/10 text-[#FA500F] border border-[#FA500F] glow-pulse',
                          status === 'pending' && 'bg-[#1A1A1A] text-[#555555] border border-[#2a2a2a]',
                        )}
                      >
                        {status === 'done' ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : step.icon}
                      </motion.div>
                      <span className={cn(
                        'text-xs font-medium transition-colors text-center',
                        status === 'active' ? 'text-[#FA500F]' : status === 'done' ? 'text-[#FFFAEB]' : 'text-[#555555]',
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn(
                        'h-px flex-1 transition-colors mt-[-20px]',
                        status === 'done' ? 'bg-[#FA500F]' : 'bg-[#2a2a2a]',
                      )} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <ProgressBar progress={overallProgress} className="bg-[#1A1A1A]" />
              <div className="flex justify-between text-xs">
                <span className={cn(isProcessing ? 'text-shimmer' : 'text-[#777777]')}>
                  {currentStep?.message || 'Initializing pipeline...'}
                </span>
                <span className="text-[#FA500F] font-medium">{Math.round(overallProgress)}%</span>
              </div>
            </div>

            {/* Event Log */}
            <div
              ref={eventLogRef}
              className="bg-[#1A1A1A] border border-[#2a2a2a] rounded-xl p-4 max-h-48 overflow-y-auto"
            >
              <div className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {events.map((e, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="flex items-center gap-3 text-xs"
                    >
                      <span className="text-[#444444] font-mono w-5 text-right shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        e.step === 'error' ? 'bg-red-400' :
                        e.step === 'complete' ? 'bg-green-400' :
                        i === events.length - 1 ? 'bg-[#FA500F] pulse-dot' : 'bg-[#FA500F]'
                      )} />
                      <span className={cn(
                        e.step === 'error' ? 'text-red-400' : e.step === 'complete' ? 'text-green-400' : 'text-[#888888]'
                      )}>
                        {e.message}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {events.length === 0 && <span className="text-[#555555] text-xs">Waiting for pipeline...</span>}
              </div>
            </div>

            {error && (
              <div className="text-center space-y-3">
                <p className="text-red-400 text-sm">{error}</p>
                <a href="/" className="inline-flex items-center gap-2 text-sm text-[#FA500F] hover:underline">
                  Back to home
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
