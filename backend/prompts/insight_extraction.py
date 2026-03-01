"""Prompt for Pass B: insight extraction from serialized knowledge graph."""

PASS_B_PROMPT = """You are a business intelligence analyst reasoning over a Temporal Knowledge Graph extracted from a video.

TASK: Analyze this knowledge graph and produce actionable insights with evidence chains.

KNOWLEDGE GRAPH:
{graph}

Produce a JSON response with this structure:

{{
  "summary": "2-3 sentence executive summary of the entire video content",
  "topics": [
    {{
      "name": "Topic name",
      "start_time": 30.0,
      "end_time": 180.0,
      "key_points": ["point 1", "point 2", "point 3"],
      "speakers_involved": ["speaker_1", "speaker_2"],
      "evidence": [
        {{"timestamp": 32.5, "source": "audio", "quote": "exact quote from transcript"}},
        {{"timestamp": 35.0, "source": "visual", "description": "Slide showing X"}}
      ]
    }}
  ],
  "action_items": [
    {{
      "description": "Clear, actionable task description",
      "assignee": "speaker_1",
      "priority": "high",
      "evidence": [
        {{"timestamp": 145.2, "source": "audio", "quote": "exact quote"}}
      ]
    }}
  ],
  "decisions": [
    {{
      "description": "What was decided",
      "made_by": "speaker_1",
      "timestamp": 245.0,
      "context": "Context around the decision",
      "evidence": [
        {{"timestamp": 245.0, "source": "audio", "quote": "exact quote"}}
      ]
    }}
  ],
  "contradictions": [
    {{
      "description": "Brief description of the contradiction",
      "claim_a": {{
        "source": "speaker_1",
        "quote": "What they said",
        "timestamp": 45.2,
        "source_type": "audio"
      }},
      "claim_b": {{
        "source": "Slide 3",
        "quote": "What the slide shows",
        "timestamp": 43.0,
        "source_type": "visual"
      }},
      "explanation": "Why these two claims conflict",
      "severity": "high"
    }}
  ],
  "kpis": [
    {{
      "name": "KPI name",
      "value": "value with unit",
      "context": "What this KPI represents",
      "mentioned_by": "speaker_1",
      "timestamp": 45.2,
      "evidence": [
        {{"timestamp": 45.2, "source": "audio", "quote": "exact quote"}}
      ]
    }}
  ],
  "key_quotes": [
    {{
      "speaker": "speaker_1",
      "quote": "Notable or important quote",
      "timestamp": 120.0,
      "context": "Why this quote matters"
    }}
  ]
}}

Rules:
- ALWAYS use the exact speaker IDs from the graph (e.g. speaker_1, speaker_2) — NEVER invent names like "Speaker A" or real names
- Every insight MUST have at least one evidence entry with timestamp and source
- Contradictions compare audio claims vs visual claims, or conflicting statements by different speakers
- Priority for action items: high = explicitly assigned with urgency, medium = discussed, low = implied
- KPIs must be quantitative (numbers, percentages, amounts)
- Key quotes should be the most impactful or decision-defining moments
- Be precise with timestamps — they must match the graph data
- If no contradictions are found, return an empty array (don't fabricate them)"""
