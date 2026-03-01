'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { formatTime, cn, NODE_COLORS, SPEAKER_COLORS, RELATION_COLORS } from '@/lib/utils';
import { useVideoSync } from '@/hooks/useVideoSync';
import { Badge } from '@/components/ui/Badge';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import type { YouTubePlayer as YTPlayer } from '@/hooks/useVideoSync';
import type { JobResults, GraphNode, TranscriptSegment } from '@/lib/types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const TABS = ['Summary', 'Topics', 'Actions', 'Decisions', 'Contradictions', 'KPIs', 'Transcript', 'Graph'] as const;
type Tab = typeof TABS[number];

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#EAB308',
  low: '#6B7280',
};

export default function AnalysisPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const isDemo = jobId.startsWith('demo-');
  const [data, setData] = useState<JobResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Summary');
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const storageKey = `vistral-speakers-${jobId}`;
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [editing, setEditing] = useState<{ speaker: string; value: string } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { currentTime, seekTo, bindVideo, bindYouTube } = useVideoSync();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Persist speaker names to localStorage
  useEffect(() => {
    try {
      if (Object.keys(speakerNames).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(speakerNames));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {}
  }, [speakerNames, storageKey]);

  useEffect(() => {
    (async () => {
      try {
        const result = isDemo
          ? await api.getDemo(jobId.replace('demo-', ''))
          : await api.getResults(jobId);
        setData(result);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, isDemo]);

  // Focus edit input when editing speaker
  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editing]);

  // Auto-scroll transcript
  useEffect(() => {
    if (activeTab !== 'Transcript' || !transcriptRef.current || !data) return;
    const segments = data.transcript;
    const activeIdx = segments.findIndex(s => s.start <= currentTime && s.end > currentTime);
    if (activeIdx >= 0) {
      const el = transcriptRef.current.children[activeIdx] as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, activeTab, data]);

  const currentSpeaker = useMemo(() => {
    if (!data) return null;
    const seg = data.transcript.find(s => s.start <= currentTime && s.end > currentTime);
    return seg?.speaker || null;
  }, [data, currentTime]);

  const currentTopic = useMemo(() => {
    if (!data) return null;
    return data.insights.topics.find(t => t.start_time <= currentTime && t.end_time > currentTime) || null;
  }, [data, currentTime]);

  const graphData = useMemo(() => {
    if (!data?.graph) return { nodes: [], links: [] };
    return {
      nodes: data.graph.nodes.map(n => ({
        id: n.id,
        label: n.type === 'speaker' ? (speakerNames[n.label] || n.label) : n.label,
        type: n.type,
        color: NODE_COLORS[n.type] || '#999',
        val: n.type === 'speaker' ? 8 : n.type === 'topic' ? 6 : 4,
      })),
      links: data.graph.edges.map((e) => ({
        source: e.source,
        target: e.target,
        relation: e.relation,
        color: RELATION_COLORS[e.relation] || '#666',
        timestamp: e.timestamp,
      })),
    };
  }, [data, speakerNames]);

  const speakerList = useMemo(() => {
    if (!data) return [];
    const all = new Set(data.transcript.map(s => s.speaker));
    for (const t of data.insights.topics) {
      for (const s of t.speakers_involved) all.add(s);
    }
    return [...all];
  }, [data]);

  const speakerColor = useCallback((name: string) => {
    const idx = speakerList.indexOf(name);
    return SPEAKER_COLORS[(idx >= 0 ? idx : speakerList.length + name.length) % SPEAKER_COLORS.length];
  }, [speakerList]);

  const displayName = (original: string) => speakerNames[original] || original;

  const speakerStats = useMemo(() => {
    if (!data) return { byName: new Map<string, { talkTime: number; segmentCount: number }>(), total: 0 };
    const byName = new Map<string, { talkTime: number; segmentCount: number }>();
    let total = 0;
    for (const seg of data.transcript) {
      const dur = seg.end - seg.start;
      total += dur;
      const prev = byName.get(seg.speaker) || { talkTime: 0, segmentCount: 0 };
      byName.set(seg.speaker, {
        talkTime: prev.talkTime + dur,
        segmentCount: prev.segmentCount + 1,
      });
    }
    return { byName, total };
  }, [data]);

  const commitRename = useCallback(() => {
    setEditing(prev => {
      if (!prev) return null;
      const trimmed = prev.value.trim();
      if (trimmed && trimmed !== prev.speaker) {
        setSpeakerNames(names => ({ ...names, [prev.speaker]: trimmed }));
      } else if (trimmed === prev.speaker) {
        setSpeakerNames(names => {
          const next = { ...names };
          delete next[prev.speaker];
          return next;
        });
      }
      return null;
    });
  }, []);

  const segmentsBySpeaker = useMemo(() => {
    if (!data) return new Map<string, TranscriptSegment[]>();
    const map = new Map<string, TranscriptSegment[]>();
    for (const seg of data.transcript) {
      let arr = map.get(seg.speaker);
      if (!arr) { arr = []; map.set(seg.speaker, arr); }
      arr.push(seg);
    }
    return map;
  }, [data]);

  const tabCounts = useMemo(() => {
    if (!data) return {};
    const { insights } = data;
    return {
      Topics: insights.topics.length,
      Actions: insights.action_items.length,
      Decisions: insights.decisions.length,
      Contradictions: insights.contradictions.length,
      KPIs: insights.kpis.length,
    } as Record<string, number>;
  }, [data]);

  if (loading) return (
    <main className="h-full flex items-center justify-center">
      <div className="text-[#777]">Loading analysis...</div>
    </main>
  );

  if (error || !data) return (
    <main className="h-full flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-red-400">{error || 'No data available'}</p>
        <a href="/" className="text-[#FA500F] text-sm hover:underline">Back to home</a>
      </div>
    </main>
  );

  const { insights, transcript, graph } = data;
  const videoDuration = graph.metadata.duration_seconds;

  return (
    <main className="h-full flex flex-col overflow-hidden bg-[#141414]">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 h-10 bg-[#1A1A1A] border-b border-[#2a2a2a] shrink-0">
        <div className="flex items-center gap-2">
          {currentSpeaker && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: speakerColor(currentSpeaker) }} />
              <span className="text-xs text-[#ccc]">{displayName(currentSpeaker)}</span>
            </div>
          )}
          {currentTopic && (
            <>
              <span className="text-[#444] text-xs">/</span>
              <span className="text-xs text-[#888]">{currentTopic.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#555] font-mono">{formatTime(currentTime)} / {formatTime(videoDuration)}</span>
          {isDemo && <span className="text-[10px] text-[#FA500F] font-medium px-1.5 py-0.5 rounded bg-[#FA500F]/10">DEMO</span>}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Video + Timeline ── */}
        <div className="flex flex-col w-[50%] border-r border-[#2a2a2a]">
          {/* Video */}
          <div className={cn(
            'bg-black relative shrink-0 transition-all duration-200',
            videoCollapsed ? 'h-0 overflow-hidden' : 'aspect-video'
          )}>
            {data.video_url?.includes('youtube.com') || data.video_url?.includes('youtu.be') ? (
              <YouTubePlayer
                url={data.video_url}
                onReady={bindYouTube}
                className="w-full h-full"
              />
            ) : data.video_url ? (
              <video
                ref={bindVideo}
                src={api.getVideoUrl(jobId)}
                className="w-full h-full object-contain"
                controls
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#444]">
                <div className="text-center space-y-0.5">
                  <p className="text-xs">No video available</p>
                  <p className="text-[10px] text-[#333]">Timeline navigation still works</p>
                </div>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setVideoCollapsed(!videoCollapsed)}
            className="flex items-center justify-center h-5 bg-[#1A1A1A] border-b border-[#2a2a2a] hover:bg-[#222] transition-colors cursor-pointer"
          >
            <svg width="10" height="6" viewBox="0 0 10 6" className={cn('text-[#555] transition-transform', videoCollapsed && 'rotate-180')}>
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="timeline-hud px-3 pt-3 pb-2.5 space-y-1.5">
              {/* Header — compact */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-[#FA500F]/70 uppercase tracking-[0.15em]">Timeline</span>
                <div className="h-px flex-1 bg-[#2E2E2E]" />
                <span className="text-[10px] text-[#999] font-mono tabular-nums">{formatTime(videoDuration)}</span>
              </div>

              {/* Time ruler — readable */}
              <div className="relative h-3.5">
                {Array.from({ length: Math.ceil(videoDuration / 60) + 1 }, (_, i) => {
                  const pos = (i * 60 / videoDuration) * 100;
                  if (pos > 100) return null;
                  return (
                    <div key={i} className="absolute flex flex-col items-center" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
                      <div className="w-px h-1.5 bg-[#444]" />
                      <span className="text-[8px] text-[#666] font-mono tabular-nums">{formatTime(i * 60)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Topics bar — active highlight + hide text on tiny segments */}
              <div className="relative h-8 rounded overflow-hidden timeline-track">
                {insights.topics.map((topic, i) => {
                  const left = (topic.start_time / videoDuration) * 100;
                  const width = ((topic.end_time - topic.start_time) / videoDuration) * 100;
                  const isActive = currentTopic?.name === topic.name;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'absolute h-full cursor-pointer timeline-topic-segment',
                        isActive && 'timeline-topic-active'
                      )}
                      style={{
                        left: `${left}%`, width: `${width}%`,
                        background: `linear-gradient(180deg, hsl(${(i * 55) % 360}, 40%, ${isActive ? 34 : 26}%) 0%, hsl(${(i * 55) % 360}, 35%, ${isActive ? 24 : 16}%) 100%)`,
                      }}
                      onClick={() => seekTo(topic.start_time)}
                      title={topic.name}
                    >
                      {width > 6 && (
                        <span className="text-[9px] text-[#FFFAEB]/55 px-1.5 truncate block leading-8 font-medium">{topic.name}</span>
                      )}
                    </div>
                  );
                })}
                {/* Playhead */}
                <div
                  className="absolute top-0 h-full z-10 timeline-playhead pointer-events-none"
                  style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-[#FA500F]" />
                  <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[7px] h-[7px] bg-[#FA500F] rotate-45 rounded-[1px]" />
                  <div className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] bg-[#FA500F] rotate-45 rounded-[1px] opacity-50" />
                </div>
              </div>

              {/* Speaker segments — taller, stronger contrast */}
              <div className="space-y-1">
                {speakerList.map((speaker, si) => {
                  const color = speakerColor(speaker);
                  return (
                    <div key={speaker} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-20 justify-end shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}40` }} />
                        <span className="text-[10px] truncate" style={{ color: color + 'bb' }}>{displayName(speaker)}</span>
                      </div>
                      <div className="relative h-4 flex-1 rounded-sm timeline-track overflow-hidden">
                        {(segmentsBySpeaker.get(speaker) ?? []).map((seg, i) => {
                          const left = (seg.start / videoDuration) * 100;
                          const width = ((seg.end - seg.start) / videoDuration) * 100;
                          return (
                            <div
                              key={i}
                              className="absolute h-full rounded-[2px] cursor-pointer timeline-speaker-seg"
                              style={{
                                left: `${left}%`, width: `${Math.max(0.5, width)}%`,
                                background: `linear-gradient(180deg, ${color}a0 0%, ${color}60 100%)`,
                                boxShadow: `0 0 4px ${color}20`,
                              }}
                              onClick={() => seekTo(seg.start)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Events — inline with speakers, bigger dots */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 w-20 justify-end shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#666]" />
                    <span className="text-[10px] text-[#666]">Events</span>
                  </div>
                  <div className="relative h-4 flex-1 rounded-sm timeline-track overflow-hidden">
                    {graph.edges.filter(e => e.relation === 'contradicts').map((edge, i) => (
                      <div
                        key={i}
                        className="absolute top-1/2 w-2 h-2 rounded-full cursor-pointer timeline-event-dot"
                        style={{
                          left: `${(edge.timestamp / videoDuration) * 100}%`,
                          background: `radial-gradient(circle, ${RELATION_COLORS.contradicts} 35%, ${RELATION_COLORS.contradicts}4d 70%, transparent 100%)`,
                          boxShadow: `0 0 6px ${RELATION_COLORS.contradicts}80, 0 0 10px ${RELATION_COLORS.contradicts}26`,
                          transform: 'translateY(-50%)',
                        }}
                        onClick={() => seekTo(edge.timestamp)}
                        title="Contradiction"
                      />
                    ))}
                    {insights.decisions.map((d, i) => (
                      <div
                        key={`d${i}`}
                        className="absolute top-1/2 w-2 h-2 rounded-full cursor-pointer timeline-event-dot"
                        style={{
                          left: `${(d.timestamp / videoDuration) * 100}%`,
                          background: `radial-gradient(circle, ${RELATION_COLORS.decided} 35%, ${RELATION_COLORS.decided}4d 70%, transparent 100%)`,
                          boxShadow: `0 0 6px ${RELATION_COLORS.decided}80, 0 0 10px ${RELATION_COLORS.decided}26`,
                          transform: 'translateY(-50%)',
                        }}
                        onClick={() => seekTo(d.timestamp)}
                        title={`Decision: ${d.description}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend — compact */}
              <div className="flex items-center gap-4 pt-1.5 border-t border-[#2E2E2E]">
                <div className="flex items-center gap-1.5">
                  <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: RELATION_COLORS.contradicts, boxShadow: `0 0 3px ${RELATION_COLORS.contradicts}66` }} />
                  <span className="text-[9px] text-[#777]">Contradiction</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: RELATION_COLORS.decided, boxShadow: `0 0 3px ${RELATION_COLORS.decided}66` }} />
                  <span className="text-[9px] text-[#777]">Decision</span>
                </div>
              </div>
            </div>

            {/* ── Speaker Panel ── */}
            <div className="timeline-hud px-3 pt-3 pb-2.5 mt-2">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] font-semibold text-[#FA500F]/70 uppercase tracking-[0.15em]">Speakers</span>
                <div className="h-px flex-1 bg-[#2E2E2E]" />
                <span className="text-[10px] text-[#555]">{speakerList.length}</span>
              </div>

              <div className="space-y-1">
                {speakerList.map(speaker => {
                  const color = speakerColor(speaker);
                  const stats = speakerStats.byName.get(speaker);
                  const pct = speakerStats.total > 0 && stats ? Math.round((stats.talkTime / speakerStats.total) * 100) : 0;
                  const isEditing = editing?.speaker === speaker;
                  const isCurrent = currentSpeaker === speaker;
                  const segments = segmentsBySpeaker.get(speaker) ?? [];
                  const nextSeg = segments.find(s => s.start > currentTime) || segments[0];

                  return (
                    <div
                      key={speaker}
                      className={cn(
                        'group flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all duration-150',
                        isCurrent ? 'bg-[#ffffff06]' : 'hover:bg-[#ffffff04]'
                      )}
                    >
                      {/* Color dot */}
                      <div
                        className={cn('w-2 h-2 rounded-full shrink-0 transition-shadow', isCurrent && 'pulse-dot')}
                        style={{ backgroundColor: color, boxShadow: isCurrent ? `0 0 8px ${color}60` : `0 0 4px ${color}30` }}
                      />

                      {/* Name — click to edit */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            value={editing.value}
                            onChange={e => setEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={commitRename}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setEditing(null);
                            }}
                            className="w-full bg-[#1A1A1A] border border-[#FA500F]/40 rounded px-1.5 py-0.5 text-[11px] text-[#FFFAEB] outline-none focus:border-[#FA500F]/70 font-medium"
                            spellCheck={false}
                          />
                        ) : (
                          <button
                            onClick={() => setEditing({ speaker, value: speakerNames[speaker] || speaker })}
                            className="flex items-center gap-1.5 cursor-pointer group/name"
                            title="Click to rename"
                          >
                            <span className="text-[11px] font-medium truncate" style={{ color }}>
                              {displayName(speaker)}
                            </span>
                            {speakerNames[speaker] && (
                              <span className="text-[9px] text-[#444] truncate">({speaker})</span>
                            )}
                            <svg width="10" height="10" viewBox="0 0 16 16" className="shrink-0 opacity-0 group-hover/name:opacity-50 transition-opacity" fill="currentColor" style={{ color: color + '80' }}>
                              <path d="M12.1 3.9a1.5 1.5 0 00-2.12 0L4 9.88V12h2.12l5.98-5.98a1.5 1.5 0 000-2.12zM9.27 4.5l2.23 2.23" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Talk time bar */}
                      <div className="w-16 shrink-0">
                        <div className="h-1 rounded-full bg-[#1A1A1A] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color + '80' }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <span className="text-[10px] text-[#555] font-mono tabular-nums w-8 text-right shrink-0">{pct}%</span>

                      {/* Navigate button */}
                      <button
                        onClick={() => nextSeg && seekTo(nextSeg.start)}
                        className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-[#ffffff08] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title={`Jump to ${displayName(speaker)}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#666]">
                          <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Insights ── */}
        <div className="flex flex-col w-[50%] overflow-hidden">
          {/* Tabs — underline style */}
          <div className="flex items-center border-b border-[#2a2a2a] shrink-0 bg-[#1A1A1A] px-1">
            {TABS.map(tab => {
              const count = tabCounts[tab];
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'relative px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer',
                    isActive ? 'text-[#FFFAEB]' : 'text-[#666] hover:text-[#999]'
                  )}
                >
                  {tab}
                  {count !== undefined && count > 0 && (
                    <span className={cn(
                      'ml-1 text-[9px] font-mono',
                      isActive ? 'text-[#FA500F]' : 'text-[#555]'
                    )}>{count}</span>
                  )}
                  {isActive && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#FA500F] rounded-full" />}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'Summary' && (
              <div className="p-4 space-y-4">
                <p className="text-[13px] leading-relaxed text-[#ccc]">{insights.summary}</p>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-px bg-[#2a2a2a] rounded overflow-hidden">
                  {[
                    { label: 'Topics', value: insights.topics.length, color: '#22C55E' },
                    { label: 'Actions', value: insights.action_items.length, color: '#FA500F' },
                    { label: 'Decisions', value: insights.decisions.length, color: '#EAB308' },
                    { label: 'Contradictions', value: insights.contradictions.length, color: '#EF4444' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#1A1A1A] p-3 text-center">
                      <div className="text-lg font-semibold" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="text-[10px] text-[#666] mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {insights.key_quotes.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-[#FA500F]/70 uppercase tracking-[0.15em]">Key Quotes</span>
                      <div className="h-px flex-1 bg-[#2E2E2E]" />
                    </div>
                    {insights.key_quotes.slice(0, 3).map((q, i) => {
                      const color = speakerColor(q.speaker);
                      return (
                        <div
                          key={i}
                          className="group flex items-start gap-3 py-2.5 px-2 rounded-md cursor-pointer hover:bg-[#1E1E1E] transition-all duration-150"
                          onClick={() => seekTo(q.timestamp)}
                        >
                          {/* Left accent bar */}
                          <div className="w-[2px] self-stretch rounded-full bg-[#FA500F]/20 group-hover:bg-[#FA500F]/40 transition-colors flex-shrink-0 mt-0.5" />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] text-[#aaa] leading-relaxed italic group-hover:text-[#ccc] transition-colors">
                              {q.quote}
                            </p>
                            <div className="flex items-center justify-between mt-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-[10px] text-[#666]">{displayName(q.speaker)}</span>
                              </div>
                              <span className="text-[10px] text-[#555] font-mono tabular-nums group-hover:text-[#FA500F]/70 transition-colors">{formatTime(q.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Topics' && (
              <div className="divide-y divide-[#2a2a2a]">
                {insights.topics.map((topic, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 cursor-pointer hover:bg-[#1E1E1E] transition-colors"
                    onClick={() => seekTo(topic.start_time)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-medium text-[#ddd]">{topic.name}</span>
                      <span className="text-[10px] text-[#555] font-mono">{formatTime(topic.start_time)} – {formatTime(topic.end_time)}</span>
                    </div>
                    <ul className="space-y-0.5 mb-2">
                      {topic.key_points.map((p, j) => (
                        <li key={j} className="text-[11px] text-[#888] flex gap-1.5">
                          <span className="text-[#555] shrink-0">&#8226;</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-1.5">
                      {topic.speakers_involved.map(s => (
                        <Badge key={s} size="sm" color={speakerColor(s)}>{displayName(s)}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Actions' && (
              <div>
                {/* Header row */}
                <div className="flex items-center px-4 py-1.5 bg-[#1A1A1A] border-b border-[#2a2a2a] text-[9px] text-[#555] uppercase tracking-wider font-medium">
                  <span className="flex-1">Action Item</span>
                  <span className="w-24 text-center">Assignee</span>
                  <span className="w-16 text-center">Priority</span>
                </div>
                <div className="divide-y divide-[#222]">
                  {insights.action_items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start px-4 py-2.5 cursor-pointer hover:bg-[#1E1E1E] transition-colors"
                      onClick={() => item.evidence[0] && seekTo(item.evidence[0].timestamp)}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-[12px] text-[#ddd] leading-snug">{item.description}</p>
                        {item.evidence[0] && (
                          <p className="text-[10px] text-[#555] mt-1 truncate italic">&ldquo;{item.evidence[0].quote}&rdquo; &middot; {formatTime(item.evidence[0].timestamp)}</p>
                        )}
                      </div>
                      <span className="w-24 text-center text-[11px] text-[#888] shrink-0">{displayName(item.assignee)}</span>
                      <div className="w-16 flex justify-center shrink-0">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            color: PRIORITY_COLORS[item.priority],
                            backgroundColor: PRIORITY_COLORS[item.priority] + '15',
                          }}
                        >
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                  {insights.action_items.length === 0 && <p className="text-[12px] text-[#555] p-4">No action items detected</p>}
                </div>
              </div>
            )}

            {activeTab === 'Decisions' && (
              <div className="divide-y divide-[#2a2a2a]">
                {insights.decisions.map((d, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 cursor-pointer hover:bg-[#1E1E1E] transition-colors"
                    onClick={() => seekTo(d.timestamp)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] text-[#ddd] font-medium leading-snug">{d.description}</p>
                        <p className="text-[11px] text-[#666] mt-1">{d.context}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-[#888]">{displayName(d.made_by)}</span>
                        <div className="text-[10px] text-[#555] font-mono">{formatTime(d.timestamp)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {insights.decisions.length === 0 && <p className="text-[12px] text-[#555] p-4">No decisions detected</p>}
              </div>
            )}

            {activeTab === 'Contradictions' && (
              <div className="divide-y divide-[#2a2a2a]">
                {insights.contradictions.map((c, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[c.severity] }} />
                      <span className="text-[12px] text-[#ddd] font-medium">{c.description}</span>
                      <span className="text-[9px] text-[#555] uppercase tracking-wide">{c.severity}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-[#1A1A1A] border border-[#2a2a2a] rounded p-2.5 cursor-pointer hover:border-[#333] transition-colors" onClick={() => seekTo(c.claim_a.timestamp)}>
                        <div className="text-[9px] text-[#555] uppercase tracking-wide mb-1">Claim A &middot; {c.claim_a.source_type}</div>
                        <p className="text-[11px] text-[#bbb] italic leading-snug">&ldquo;{c.claim_a.quote}&rdquo;</p>
                        <p className="text-[9px] text-[#444] mt-1 font-mono">{displayName(c.claim_a.source)} &middot; {formatTime(c.claim_a.timestamp)}</p>
                      </div>
                      <div className="bg-[#1A1A1A] border border-[#2a2a2a] rounded p-2.5 cursor-pointer hover:border-[#333] transition-colors" onClick={() => seekTo(c.claim_b.timestamp)}>
                        <div className="text-[9px] text-[#555] uppercase tracking-wide mb-1">Claim B &middot; {c.claim_b.source_type}</div>
                        <p className="text-[11px] text-[#bbb] italic leading-snug">&ldquo;{c.claim_b.quote}&rdquo;</p>
                        <p className="text-[9px] text-[#444] mt-1 font-mono">{displayName(c.claim_b.source)} &middot; {formatTime(c.claim_b.timestamp)}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#FA500F]/80">{c.explanation}</p>
                  </div>
                ))}
                {insights.contradictions.length === 0 && <p className="text-[12px] text-[#555] p-4">No contradictions detected</p>}
              </div>
            )}

            {activeTab === 'KPIs' && (
              <div>
                <div className="flex items-center px-4 py-1.5 bg-[#1A1A1A] border-b border-[#2a2a2a] text-[9px] text-[#555] uppercase tracking-wider font-medium">
                  <span className="flex-1">Metric</span>
                  <span className="w-28 text-right">Value</span>
                  <span className="w-24 text-right">Source</span>
                </div>
                <div className="divide-y divide-[#222]">
                  {insights.kpis.map((kpi, i) => (
                    <div
                      key={i}
                      className="flex items-center px-4 py-2.5 cursor-pointer hover:bg-[#1E1E1E] transition-colors"
                      onClick={() => seekTo(kpi.timestamp)}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] text-[#ddd]">{kpi.name}</span>
                        <p className="text-[10px] text-[#555] truncate mt-0.5">{kpi.context}</p>
                      </div>
                      <span className="w-28 text-right text-[13px] font-semibold text-[#FA500F] shrink-0 font-mono">{kpi.value}</span>
                      <div className="w-24 text-right shrink-0">
                        <span className="text-[10px] text-[#666]">{displayName(kpi.mentioned_by)}</span>
                        <div className="text-[9px] text-[#444] font-mono">{formatTime(kpi.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                  {insights.kpis.length === 0 && <p className="text-[12px] text-[#555] p-4">No KPIs detected</p>}
                </div>
              </div>
            )}

            {activeTab === 'Transcript' && (
              <div ref={transcriptRef} className="divide-y divide-[#1E1E1E]">
                {transcript.map((seg, i) => {
                  const isActive = seg.start <= currentTime && seg.end > currentTime;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex gap-3 px-4 py-2 cursor-pointer transition-colors',
                        isActive ? 'bg-[#FA500F]/8 border-l-2 border-[#FA500F]' : 'hover:bg-[#1E1E1E] border-l-2 border-transparent'
                      )}
                      onClick={() => seekTo(seg.start)}
                    >
                      <span className="text-[10px] text-[#444] font-mono w-10 text-right shrink-0 pt-0.5">{formatTime(seg.start)}</span>
                      <div className="shrink-0 w-16">
                        <span className="text-[10px] font-medium" style={{ color: speakerColor(seg.speaker) }}>{displayName(seg.speaker)}</span>
                      </div>
                      <p className="text-[12px] text-[#bbb] leading-relaxed">{seg.text}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'Graph' && (
              <div className="h-[calc(100vh-88px)] bg-[#141414] relative">
                {/* Legend */}
                <div className="absolute top-3 left-3 z-10 bg-[#1A1A1A]/95 border border-[#2a2a2a] rounded p-2 space-y-1">
                  {Object.entries(NODE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[9px] text-[#666] capitalize">{type}</span>
                    </div>
                  ))}
                </div>
                <ForceGraph2D
                  graphData={graphData}
                  nodeLabel={(node: any) => `${node.label} (${node.type})`}
                  nodeColor={(node: any) => node.color}
                  nodeVal={(node: any) => node.val}
                  linkColor={(link: any) => link.color}
                  linkLabel={(link: any) => link.relation}
                  linkDirectionalArrowLength={4}
                  linkDirectionalArrowRelPos={1}
                  linkWidth={1.5}
                  backgroundColor="#141414"
                  nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.label;
                    const fontSize = 11 / globalScale;
                    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const r = Math.sqrt(node.val) * 2;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                    ctx.fillStyle = node.color;
                    ctx.fill();
                    ctx.fillStyle = '#ccc';
                    ctx.fillText(label, node.x, node.y + r + fontSize);
                  }}
                  onNodeClick={(node: any) => {
                    const graphNode = data.graph.nodes.find((n: GraphNode) => n.id === node.id);
                    if (graphNode) seekTo(graphNode.first_seen);
                  }}
                  width={typeof window !== 'undefined' ? (window.innerWidth - 224) * 0.5 - 20 : 600}
                  height={typeof window !== 'undefined' ? window.innerHeight - 100 : 500}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
