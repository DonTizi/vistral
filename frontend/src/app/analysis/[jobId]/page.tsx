'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { formatTime, cn, NODE_COLORS, SPEAKER_COLORS, RELATION_COLORS } from '@/lib/utils';
import { useVideoSync } from '@/hooks/useVideoSync';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { VistralLogo } from '@/components/ui/VistralLogo';

import type { JobResults, GraphNode } from '@/lib/types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const TABS = ['Summary', 'Topics', 'Actions', 'Decisions', 'Contradictions', 'KPIs', 'Transcript', 'Graph'] as const;
type Tab = typeof TABS[number];

export default function AnalysisPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const isDemo = jobId.startsWith('demo-');
  const [data, setData] = useState<JobResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Summary');
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

  // Graph data for force graph
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

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-[#999999]">Loading analysis...</div>
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
  const speakerList = useMemo(() => [...new Set(transcript.map(s => s.speaker))], [transcript]);
  const videoDuration = graph.metadata.duration_seconds;

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-[#1A1A1A] shrink-0 relative">
        <a href="/" className="flex items-center gap-2.5">
          <VistralLogo className="w-5 h-5" />
          <span className="text-sm font-semibold tracking-wide"><span className="text-[#FA500F]">V</span>ISTRAL</span>
        </a>
        <div className="absolute bottom-0 left-0 right-0 h-px mistral-gradient-bar opacity-40" />
        <div className="flex items-center gap-2">
          {currentSpeaker && <Badge color={SPEAKER_COLORS[speakerList.indexOf(currentSpeaker) % SPEAKER_COLORS.length]}>{currentSpeaker}</Badge>}
          {currentTopic && <Badge color="#22C55E">{currentTopic.name}</Badge>}
          {isDemo && <Badge color="#FA500F">Demo</Badge>}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Video + Timeline */}
        <div className="flex flex-col w-[55%] border-r border-[#333333]">
          {/* Video */}
          <div className="bg-black aspect-video relative shrink-0">
            {data.video_url ? (
              <video
                ref={bindVideo}
                src={data.video_url}
                className="w-full h-full object-contain"
                controls
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#666666]">
                <div className="text-center space-y-1">
                  <p className="text-sm">No video available (demo mode)</p>
                  <p className="text-xs">Timeline navigation still works</p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 className="text-sm font-medium text-[#999999]">Timeline</h3>

            {/* Topics bar */}
            <div className="relative h-8 bg-[#242424] rounded-lg overflow-hidden">
              {insights.topics.map((topic, i) => {
                const left = (topic.start_time / videoDuration) * 100;
                const width = ((topic.end_time - topic.start_time) / videoDuration) * 100;
                return (
                  <div
                    key={i}
                    className="absolute h-full cursor-pointer hover:brightness-125 transition-all"
                    style={{
                      left: `${left}%`, width: `${width}%`,
                      backgroundColor: `hsl(${(i * 60) % 360}, 50%, 35%)`,
                    }}
                    onClick={() => seekTo(topic.start_time)}
                    title={topic.name}
                  >
                    <span className="text-[10px] text-white px-1 truncate block leading-8">{topic.name}</span>
                  </div>
                );
              })}
              {/* Playhead */}
              <div
                className="absolute top-0 w-0.5 h-full bg-[#FA500F] z-10"
                style={{ left: `${(currentTime / videoDuration) * 100}%` }}
              />
            </div>

            {/* Speaker segments */}
            {speakerList.map((speaker, si) => (
              <div key={speaker} className="space-y-1">
                <span className="text-xs" style={{ color: SPEAKER_COLORS[si % SPEAKER_COLORS.length] }}>{speaker}</span>
                <div className="relative h-4 bg-[#242424] rounded">
                  {transcript.filter(s => s.speaker === speaker).map((seg, i) => {
                    const left = (seg.start / videoDuration) * 100;
                    const width = ((seg.end - seg.start) / videoDuration) * 100;
                    return (
                      <div
                        key={i}
                        className="absolute h-full rounded cursor-pointer hover:brightness-125"
                        style={{
                          left: `${left}%`, width: `${Math.max(0.5, width)}%`,
                          backgroundColor: SPEAKER_COLORS[si % SPEAKER_COLORS.length] + '80',
                        }}
                        onClick={() => seekTo(seg.start)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Events markers */}
            <div className="space-y-1">
              <span className="text-xs text-[#999999]">Events</span>
              <div className="relative h-6 bg-[#242424] rounded">
                {graph.edges.filter(e => e.relation === 'contradicts').map((edge, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-full bg-red-500 rounded cursor-pointer hover:bg-red-400"
                    style={{ left: `${(edge.timestamp / videoDuration) * 100}%` }}
                    onClick={() => seekTo(edge.timestamp)}
                    title="Contradiction"
                  />
                ))}
                {insights.decisions.map((d, i) => (
                  <div
                    key={`d${i}`}
                    className="absolute w-2 h-full bg-yellow-500 rounded cursor-pointer hover:bg-yellow-400"
                    style={{ left: `${(d.timestamp / videoDuration) * 100}%` }}
                    onClick={() => seekTo(d.timestamp)}
                    title={`Decision: ${d.description}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Insights */}
        <div className="flex flex-col w-[45%] overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-1 p-2 border-b border-[#333333] overflow-x-auto shrink-0">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                  activeTab === tab ? 'bg-[#FA500F] text-white' : 'text-[#999999] hover:text-[#FFFAEB] hover:bg-[#242424]/80'
                )}
              >
                {tab}
                {tab === 'Contradictions' && insights.contradictions.length > 0 && (
                  <span className="ml-1 text-[10px] bg-red-500/30 text-red-400 px-1 rounded">{insights.contradictions.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'Summary' && (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-[#FFFAEB]">{insights.summary}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Card><div className="text-center"><div className="text-2xl font-bold text-[#FA500F]">{insights.topics.length}</div><div className="text-xs text-[#999999]">Topics</div></div></Card>
                  <Card><div className="text-center"><div className="text-2xl font-bold text-[#FA500F]">{insights.action_items.length}</div><div className="text-xs text-[#999999]">Action Items</div></div></Card>
                  <Card><div className="text-center"><div className="text-2xl font-bold text-[#EAB308]">{insights.decisions.length}</div><div className="text-xs text-[#999999]">Decisions</div></div></Card>
                  <Card><div className="text-center"><div className="text-2xl font-bold text-red-400">{insights.contradictions.length}</div><div className="text-xs text-[#999999]">Contradictions</div></div></Card>
                </div>
                {insights.key_quotes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-[#999999]">Key Quotes</h3>
                    {insights.key_quotes.slice(0, 3).map((q, i) => (
                      <div key={i} className="border-l-2 border-[#FA500F] pl-3 cursor-pointer hover:bg-[#242424] rounded-r p-2" onClick={() => seekTo(q.timestamp)}>
                        <p className="text-sm italic text-[#FFFAEB]">&ldquo;{q.quote}&rdquo;</p>
                        <p className="text-xs text-[#999999] mt-1">{q.speaker} &middot; {formatTime(q.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Topics' && (
              <div className="space-y-3">
                {insights.topics.map((topic, i) => (
                  <Card key={i} onClick={() => seekTo(topic.start_time)}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{topic.name}</span>
                        <span className="text-xs text-[#999999]">{formatTime(topic.start_time)} - {formatTime(topic.end_time)}</span>
                      </div>
                      <ul className="space-y-1">
                        {topic.key_points.map((p, j) => (
                          <li key={j} className="text-xs text-[#999999] flex gap-2"><span className="text-[#FA500F]">-</span>{p}</li>
                        ))}
                      </ul>
                      <div className="flex gap-1 flex-wrap">
                        {topic.speakers_involved.map(s => (
                          <Badge key={s} color={SPEAKER_COLORS[speakerList.indexOf(s) % SPEAKER_COLORS.length]}>{s}</Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'Actions' && (
              <div className="space-y-3">
                {insights.action_items.map((item, i) => (
                  <Card key={i} onClick={() => item.evidence[0] && seekTo(item.evidence[0].timestamp)}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{item.description}</span>
                        <Badge color={item.priority === 'high' ? '#EF4444' : item.priority === 'medium' ? '#EAB308' : '#22C55E'}>{item.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#999999]">
                        <span>Assigned to: <span className="text-[#FFFAEB]">{item.assignee}</span></span>
                      </div>
                      {item.evidence[0] && (
                        <p className="text-xs text-[#666666] italic">&ldquo;{item.evidence[0].quote}&rdquo; - {formatTime(item.evidence[0].timestamp)}</p>
                      )}
                    </div>
                  </Card>
                ))}
                {insights.action_items.length === 0 && <p className="text-sm text-[#666666]">No action items detected</p>}
              </div>
            )}

            {activeTab === 'Decisions' && (
              <div className="space-y-3">
                {insights.decisions.map((d, i) => (
                  <Card key={i} onClick={() => seekTo(d.timestamp)}>
                    <div className="space-y-2">
                      <span className="text-sm font-medium">{d.description}</span>
                      <div className="text-xs text-[#999999]">
                        <span>By <span className="text-[#FFFAEB]">{d.made_by}</span> at {formatTime(d.timestamp)}</span>
                      </div>
                      <p className="text-xs text-[#666666]">{d.context}</p>
                    </div>
                  </Card>
                ))}
                {insights.decisions.length === 0 && <p className="text-sm text-[#666666]">No decisions detected</p>}
              </div>
            )}

            {activeTab === 'Contradictions' && (
              <div className="space-y-3">
                {insights.contradictions.map((c, i) => (
                  <Card key={i} className="border-red-500/30">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge color="#EF4444">{c.severity}</Badge>
                        <span className="text-sm font-medium">{c.description}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#1A1A1A] rounded-lg p-3 cursor-pointer hover:bg-[#2a2a2a]" onClick={() => seekTo(c.claim_a.timestamp)}>
                          <div className="text-xs text-[#999999] mb-1">Claim A ({c.claim_a.source_type})</div>
                          <p className="text-xs text-[#FFFAEB] italic">&ldquo;{c.claim_a.quote}&rdquo;</p>
                          <p className="text-[10px] text-[#666666] mt-1">{c.claim_a.source} &middot; {formatTime(c.claim_a.timestamp)}</p>
                        </div>
                        <div className="bg-[#1A1A1A] rounded-lg p-3 cursor-pointer hover:bg-[#2a2a2a]" onClick={() => seekTo(c.claim_b.timestamp)}>
                          <div className="text-xs text-[#999999] mb-1">Claim B ({c.claim_b.source_type})</div>
                          <p className="text-xs text-[#FFFAEB] italic">&ldquo;{c.claim_b.quote}&rdquo;</p>
                          <p className="text-[10px] text-[#666666] mt-1">{c.claim_b.source} &middot; {formatTime(c.claim_b.timestamp)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#FA500F]">{c.explanation}</p>
                    </div>
                  </Card>
                ))}
                {insights.contradictions.length === 0 && <p className="text-sm text-[#666666]">No contradictions detected</p>}
              </div>
            )}

            {activeTab === 'KPIs' && (
              <div className="space-y-3">
                {insights.kpis.map((kpi, i) => (
                  <Card key={i} onClick={() => seekTo(kpi.timestamp)}>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#FA500F]">{kpi.name}</span>
                        <span className="text-sm font-bold">{kpi.value}</span>
                      </div>
                      <p className="text-xs text-[#999999]">{kpi.context}</p>
                      <p className="text-xs text-[#666666]">Mentioned by {kpi.mentioned_by} at {formatTime(kpi.timestamp)}</p>
                    </div>
                  </Card>
                ))}
                {insights.kpis.length === 0 && <p className="text-sm text-[#666666]">No KPIs detected</p>}
              </div>
            )}

            {activeTab === 'Transcript' && (
              <div ref={transcriptRef} className="space-y-1">
                {transcript.map((seg, i) => {
                  const isActive = seg.start <= currentTime && seg.end > currentTime;
                  const si = speakerList.indexOf(seg.speaker);
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        isActive ? 'bg-[#FA500F]/10 border border-[#FA500F]/30' : 'hover:bg-[#242424]'
                      )}
                      onClick={() => seekTo(seg.start)}
                    >
                      <div className="shrink-0 w-16 text-right">
                        <span className="text-[10px] text-[#666666] font-mono">{formatTime(seg.start)}</span>
                      </div>
                      <div className="shrink-0">
                        <Badge color={SPEAKER_COLORS[si % SPEAKER_COLORS.length]}>{seg.speaker}</Badge>
                      </div>
                      <p className="text-sm text-[#FFFAEB] leading-relaxed">{seg.text}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'Graph' && (
              <div className="h-[calc(100vh-180px)] bg-[#1A1A1A] rounded-xl border border-[#333333] overflow-hidden relative">
                {/* Legend */}
                <div className="absolute top-3 left-3 z-10 bg-[#242424]/90 rounded-lg p-2 space-y-1">
                  {Object.entries(NODE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-[#999999] capitalize">{type}</span>
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
                  backgroundColor="#1A1A1A"
                  nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.label;
                    const fontSize = 11 / globalScale;
                    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Draw node circle
                    const r = Math.sqrt(node.val) * 2;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                    ctx.fillStyle = node.color;
                    ctx.fill();

                    // Draw label
                    ctx.fillStyle = '#FFFAEB';
                    ctx.fillText(label, node.x, node.y + r + fontSize);
                  }}
                  onNodeClick={(node: any) => {
                    const graphNode = data.graph.nodes.find((n: GraphNode) => n.id === node.id);
                    if (graphNode) seekTo(graphNode.first_seen);
                  }}
                  width={typeof window !== 'undefined' ? window.innerWidth * 0.45 - 40 : 600}
                  height={typeof window !== 'undefined' ? window.innerHeight - 200 : 500}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
