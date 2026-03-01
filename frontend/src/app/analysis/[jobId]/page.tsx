'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { formatTime, cn, NODE_COLORS, SPEAKER_COLORS, RELATION_COLORS } from '@/lib/utils';
import { useVideoSync } from '@/hooks/useVideoSync';
import { Badge } from '@/components/ui/Badge';
import { VistralLogo } from '@/components/ui/VistralLogo';

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
  const { currentTime, seekTo, bindVideo } = useVideoSync();
  const transcriptRef = useRef<HTMLDivElement>(null);

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
        label: n.label,
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
  }, [data]);

  const speakerList = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.transcript.map(s => s.speaker))];
  }, [data]);

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

  const handleSeek = useCallback((time: number) => {
    seekTo(time);
  }, [seekTo]);

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-[#777]">Loading analysis...</div>
    </main>
  );

  if (error || !data) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-red-400">{error || 'No data available'}</p>
        <a href="/" className="text-[#FA500F] text-sm hover:underline">Back to home</a>
      </div>
    </main>
  );

  const { insights, transcript, graph } = data;
  const videoDuration = graph.metadata.duration_seconds;

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-[#141414]">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 h-10 bg-[#1A1A1A] border-b border-[#2a2a2a] shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <VistralLogo className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-wider text-[#999]"><span className="text-[#FA500F]">V</span>ISTRAL</span>
          </a>
          <div className="w-px h-4 bg-[#333]" />
          <div className="flex items-center gap-2">
            {currentSpeaker && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SPEAKER_COLORS[speakerList.indexOf(currentSpeaker) % SPEAKER_COLORS.length] }} />
                <span className="text-xs text-[#ccc]">{currentSpeaker}</span>
              </div>
            )}
            {currentTopic && (
              <>
                <span className="text-[#444] text-xs">/</span>
                <span className="text-xs text-[#888]">{currentTopic.name}</span>
              </>
            )}
          </div>
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
            {data.video_url ? (
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
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-[#666] uppercase tracking-wider">Timeline</span>
              <span className="text-[10px] text-[#444] font-mono">{formatTime(videoDuration)}</span>
            </div>

            {/* Topics bar */}
            <div className="relative h-7 bg-[#1E1E1E] rounded overflow-hidden border border-[#2a2a2a]">
              {insights.topics.map((topic, i) => {
                const left = (topic.start_time / videoDuration) * 100;
                const width = ((topic.end_time - topic.start_time) / videoDuration) * 100;
                return (
                  <div
                    key={i}
                    className="absolute h-full cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      left: `${left}%`, width: `${width}%`,
                      backgroundColor: `hsl(${(i * 60) % 360}, 40%, 28%)`,
                    }}
                    onClick={() => handleSeek(topic.start_time)}
                    title={topic.name}
                  >
                    <span className="text-[9px] text-[#bbb] px-1.5 truncate block leading-7 font-medium">{topic.name}</span>
                  </div>
                );
              })}
              <div
                className="absolute top-0 w-0.5 h-full bg-[#FA500F] z-10 shadow-[0_0_4px_rgba(250,80,15,0.5)]"
                style={{ left: `${(currentTime / videoDuration) * 100}%` }}
              />
            </div>

            {/* Speaker segments */}
            {speakerList.map((speaker, si) => (
              <div key={speaker} className="flex items-center gap-2">
                <span className="text-[10px] w-20 truncate text-right shrink-0" style={{ color: SPEAKER_COLORS[si % SPEAKER_COLORS.length] + 'cc' }}>{speaker}</span>
                <div className="relative h-3 flex-1 bg-[#1E1E1E] rounded-sm">
                  {(segmentsBySpeaker.get(speaker) ?? []).map((seg, i) => {
                    const left = (seg.start / videoDuration) * 100;
                    const width = ((seg.end - seg.start) / videoDuration) * 100;
                    return (
                      <div
                        key={i}
                        className="absolute h-full rounded-sm cursor-pointer hover:brightness-125"
                        style={{
                          left: `${left}%`, width: `${Math.max(0.4, width)}%`,
                          backgroundColor: SPEAKER_COLORS[si % SPEAKER_COLORS.length] + '70',
                        }}
                        onClick={() => handleSeek(seg.start)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Events markers */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] w-20 text-right text-[#666] shrink-0">Events</span>
              <div className="relative h-3 flex-1 bg-[#1E1E1E] rounded-sm">
                {graph.edges.filter(e => e.relation === 'contradicts').map((edge, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-full bg-red-500/80 rounded-sm cursor-pointer hover:bg-red-400"
                    style={{ left: `${(edge.timestamp / videoDuration) * 100}%` }}
                    onClick={() => handleSeek(edge.timestamp)}
                    title="Contradiction"
                  />
                ))}
                {insights.decisions.map((d, i) => (
                  <div
                    key={`d${i}`}
                    className="absolute w-1.5 h-full bg-yellow-500/80 rounded-sm cursor-pointer hover:bg-yellow-400"
                    style={{ left: `${(d.timestamp / videoDuration) * 100}%` }}
                    onClick={() => handleSeek(d.timestamp)}
                    title={`Decision: ${d.description}`}
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-500/80" /><span className="text-[9px] text-[#555]">Contradiction</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-yellow-500/80" /><span className="text-[9px] text-[#555]">Decision</span></div>
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
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-medium text-[#666] uppercase tracking-wider">Key Quotes</h3>
                    {insights.key_quotes.slice(0, 3).map((q, i) => (
                      <div key={i} className="border-l-2 border-[#333] pl-3 py-1.5 cursor-pointer hover:border-[#FA500F] hover:bg-[#1E1E1E] transition-colors rounded-r" onClick={() => handleSeek(q.timestamp)}>
                        <p className="text-[12px] text-[#bbb] italic">&ldquo;{q.quote}&rdquo;</p>
                        <p className="text-[10px] text-[#555] mt-0.5">{q.speaker} &middot; {formatTime(q.timestamp)}</p>
                      </div>
                    ))}
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
                    onClick={() => handleSeek(topic.start_time)}
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
                        <Badge key={s} size="sm" color={SPEAKER_COLORS[speakerList.indexOf(s) % SPEAKER_COLORS.length]}>{s}</Badge>
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
                      onClick={() => item.evidence[0] && handleSeek(item.evidence[0].timestamp)}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-[12px] text-[#ddd] leading-snug">{item.description}</p>
                        {item.evidence[0] && (
                          <p className="text-[10px] text-[#555] mt-1 truncate italic">&ldquo;{item.evidence[0].quote}&rdquo; &middot; {formatTime(item.evidence[0].timestamp)}</p>
                        )}
                      </div>
                      <span className="w-24 text-center text-[11px] text-[#888] shrink-0">{item.assignee}</span>
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
                    onClick={() => handleSeek(d.timestamp)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] text-[#ddd] font-medium leading-snug">{d.description}</p>
                        <p className="text-[11px] text-[#666] mt-1">{d.context}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-[#888]">{d.made_by}</span>
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
                      <div className="bg-[#1A1A1A] border border-[#2a2a2a] rounded p-2.5 cursor-pointer hover:border-[#333] transition-colors" onClick={() => handleSeek(c.claim_a.timestamp)}>
                        <div className="text-[9px] text-[#555] uppercase tracking-wide mb-1">Claim A &middot; {c.claim_a.source_type}</div>
                        <p className="text-[11px] text-[#bbb] italic leading-snug">&ldquo;{c.claim_a.quote}&rdquo;</p>
                        <p className="text-[9px] text-[#444] mt-1 font-mono">{c.claim_a.source} &middot; {formatTime(c.claim_a.timestamp)}</p>
                      </div>
                      <div className="bg-[#1A1A1A] border border-[#2a2a2a] rounded p-2.5 cursor-pointer hover:border-[#333] transition-colors" onClick={() => handleSeek(c.claim_b.timestamp)}>
                        <div className="text-[9px] text-[#555] uppercase tracking-wide mb-1">Claim B &middot; {c.claim_b.source_type}</div>
                        <p className="text-[11px] text-[#bbb] italic leading-snug">&ldquo;{c.claim_b.quote}&rdquo;</p>
                        <p className="text-[9px] text-[#444] mt-1 font-mono">{c.claim_b.source} &middot; {formatTime(c.claim_b.timestamp)}</p>
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
                      onClick={() => handleSeek(kpi.timestamp)}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] text-[#ddd]">{kpi.name}</span>
                        <p className="text-[10px] text-[#555] truncate mt-0.5">{kpi.context}</p>
                      </div>
                      <span className="w-28 text-right text-[13px] font-semibold text-[#FA500F] shrink-0 font-mono">{kpi.value}</span>
                      <div className="w-24 text-right shrink-0">
                        <span className="text-[10px] text-[#666]">{kpi.mentioned_by}</span>
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
                  const si = speakerList.indexOf(seg.speaker);
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex gap-3 px-4 py-2 cursor-pointer transition-colors',
                        isActive ? 'bg-[#FA500F]/8 border-l-2 border-[#FA500F]' : 'hover:bg-[#1E1E1E] border-l-2 border-transparent'
                      )}
                      onClick={() => handleSeek(seg.start)}
                    >
                      <span className="text-[10px] text-[#444] font-mono w-10 text-right shrink-0 pt-0.5">{formatTime(seg.start)}</span>
                      <div className="shrink-0 w-16">
                        <span className="text-[10px] font-medium" style={{ color: SPEAKER_COLORS[si % SPEAKER_COLORS.length] }}>{seg.speaker}</span>
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
                    if (graphNode) handleSeek(graphNode.first_seen);
                  }}
                  width={typeof window !== 'undefined' ? window.innerWidth * 0.5 - 20 : 600}
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
