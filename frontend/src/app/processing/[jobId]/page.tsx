'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSSE } from '@/hooks/useSSE';
import { api } from '@/lib/api';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'audio', label: 'Audio', icon: 'M' },
  { key: 'transcription', label: 'Transcription', icon: 'T' },
  { key: 'frames', label: 'Frames', icon: 'F' },
  { key: 'vision', label: 'Vision', icon: 'V' },
  { key: 'graph', label: 'Knowledge Graph', icon: 'G' },
  { key: 'insights', label: 'Insights', icon: 'I' },
];

function getStepStatus(stepKey: string, currentStep: string | undefined, isComplete: boolean) {
  if (isComplete) return 'done';
  const stepOrder = STEPS.map(s => s.key);
  const currentIdx = currentStep ? stepOrder.indexOf(currentStep) : -1;
  const thisIdx = stepOrder.indexOf(stepKey);
  if (thisIdx < currentIdx) return 'done';
  if (thisIdx === currentIdx) return 'active';
  return 'pending';
}

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const { events, currentStep, isComplete, error } = useSSE(api.getStreamUrl(jobId));

  useEffect(() => {
    if (isComplete) {
      const timeout = setTimeout(() => router.push(`/analysis/${jobId}`), 1500);
      return () => clearTimeout(timeout);
    }
  }, [isComplete, jobId, router]);

  const activeStepKey = currentStep?.step === 'complete' ? 'insights' :
                         currentStep?.step === 'analysis' ? 'graph' :
                         currentStep?.step;
  const overallProgress = currentStep?.progress ?? 0;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            <span className="text-[#FA500F]">VIST</span>RAL
          </h1>
          <p className="text-[#999999]">
            {isComplete ? 'Analysis complete' : error ? 'Processing error' : 'Building knowledge graph...'}
          </p>
        </div>

        {/* Pipeline Steps */}
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((step, i) => {
            const status = getStepStatus(step.key, activeStepKey, isComplete);
            return (
              <div key={step.key} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500',
                    status === 'done' && 'bg-[#FA500F] text-white',
                    status === 'active' && 'bg-[#FA500F]/20 text-[#FA500F] ring-2 ring-[#FA500F] animate-pulse',
                    status === 'pending' && 'bg-[#242424] text-[#666666] border border-[#333333]',
                  )}>
                    {status === 'done' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : step.icon}
                  </div>
                  <span className={cn(
                    'text-xs font-medium transition-colors',
                    status === 'active' ? 'text-[#FA500F]' : status === 'done' ? 'text-[#FFFAEB]' : 'text-[#666666]',
                  )}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'h-px flex-1 transition-colors mt-[-20px]',
                    status === 'done' ? 'bg-[#FA500F]' : 'bg-[#333333]',
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <ProgressBar progress={overallProgress} />
          <div className="flex justify-between text-xs text-[#666666]">
            <span>{currentStep?.message || 'Initializing...'}</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-[#242424] border border-[#333333] rounded-xl p-4 max-h-48 overflow-y-auto">
          <div className="space-y-1">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-[#666666] font-mono w-6">{String(i + 1).padStart(2, '0')}</span>
                <span className={cn(
                  'font-medium',
                  e.step === 'error' ? 'text-red-400' : e.step === 'complete' ? 'text-green-400' : 'text-[#999999]'
                )}>
                  {e.message}
                </span>
              </div>
            ))}
            {events.length === 0 && <span className="text-[#666666] text-xs">Waiting for pipeline...</span>}
          </div>
        </div>

        {error && (
          <div className="text-center">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <button onClick={() => router.push('/')} className="text-[#FA500F] text-sm hover:underline">
              Back to home
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
