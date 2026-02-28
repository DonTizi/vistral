export interface GraphNode {
  id: string;
  type: 'speaker' | 'topic' | 'kpi' | 'slide' | 'decision' | 'claim';
  label: string;
  first_seen: number;
  last_seen: number;
  attributes: Record<string, any>;
}

export interface Evidence {
  source_type: 'audio' | 'visual' | 'merged';
  quote: string | null;
  description: string | null;
  frame_path: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: 'mentioned' | 'said_by' | 'shown_during' | 'contradicts' | 'decided' | 'committed_to' | 'related_to';
  timestamp: number;
  confidence: number;
  evidence: Evidence;
}

export interface TimelineSnapshot {
  timestamp: number;
  active_nodes: string[];
  active_edges: string[];
  current_topic: string | null;
  current_speaker: string | null;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  timeline: TimelineSnapshot[];
  metadata: {
    duration_seconds: number;
    total_nodes: number;
    total_edges: number;
    node_types: Record<string, number>;
  };
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface EvidenceChain {
  timestamp: number;
  source: 'audio' | 'visual';
  quote?: string;
  description?: string;
}

export interface TopicInsight {
  name: string;
  start_time: number;
  end_time: number;
  key_points: string[];
  speakers_involved: string[];
  evidence: EvidenceChain[];
}

export interface ActionItem {
  description: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  evidence: EvidenceChain[];
}

export interface Decision {
  description: string;
  made_by: string;
  timestamp: number;
  context: string;
  evidence: EvidenceChain[];
}

export interface Contradiction {
  description: string;
  claim_a: { source: string; quote: string; timestamp: number; source_type: string };
  claim_b: { source: string; quote: string; timestamp: number; source_type: string };
  explanation: string;
  severity: 'high' | 'medium' | 'low';
}

export interface KPI {
  name: string;
  value: string;
  context: string;
  mentioned_by: string;
  timestamp: number;
  evidence: EvidenceChain[];
}

export interface KeyQuote {
  speaker: string;
  quote: string;
  timestamp: number;
  context: string;
}

export interface Insights {
  summary: string;
  topics: TopicInsight[];
  action_items: ActionItem[];
  decisions: Decision[];
  contradictions: Contradiction[];
  kpis: KPI[];
  key_quotes: KeyQuote[];
}

export interface VisionEvent {
  frame_index: number;
  timestamp: number;
  frame_path: string;
  ocr_text: string[];
  scene_description: string;
  slide_title?: string;
}

export interface JobResults {
  job_id: string;
  status: 'processing' | 'completed' | 'error';
  video_url?: string;
  transcript: TranscriptSegment[];
  graph: KnowledgeGraph;
  insights: Insights;
  vision_events?: VisionEvent[];
}

export interface PipelineEvent {
  step: 'upload' | 'audio' | 'transcription' | 'frames' | 'vision' | 'analysis' | 'graph' | 'insights' | 'complete' | 'error';
  progress: number;
  message: string;
  data?: any;
}
