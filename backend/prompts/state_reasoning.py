"""Prompt for Pass A: entity extraction and topic segmentation from transcript."""

PASS_A_PROMPT = """You are analyzing a meeting/interview transcript to extract structured entities.

TASK: Extract all entities and segment the conversation into topics.

TRANSCRIPT:
{transcript}

Extract the following and return as JSON:

{{
  "speakers": [
    {{
      "id": "speaker_0",
      "name": "Speaker A",
      "role": "inferred role or unknown",
      "key_contributions": ["brief point 1", "brief point 2"]
    }}
  ],
  "topics": [
    {{
      "id": "topic_0",
      "name": "Topic name",
      "start_time": 0.0,
      "end_time": 120.0,
      "key_points": ["point 1", "point 2"],
      "speakers_involved": ["speaker_0", "speaker_1"]
    }}
  ],
  "claims": [
    {{
      "id": "claim_0",
      "speaker_id": "speaker_0",
      "content": "The exact claim made",
      "timestamp": 45.2,
      "type": "factual"
    }}
  ],
  "kpis": [
    {{
      "id": "kpi_0",
      "name": "Revenue Growth",
      "value": "18%",
      "mentioned_by": "speaker_0",
      "timestamp": 45.2,
      "context": "Q3 year-over-year growth"
    }}
  ],
  "action_items_raw": [
    {{
      "description": "What needs to be done",
      "assigned_to": "speaker_1",
      "timestamp": 200.0
    }}
  ],
  "decisions_raw": [
    {{
      "description": "What was decided",
      "made_by": "speaker_0",
      "timestamp": 245.0,
      "context": "During budget discussion"
    }}
  ]
}}

Rules:
- Assign speaker IDs consistently (speaker_0, speaker_1, etc.) matching the transcript labels
- Try to infer real names if speakers address each other by name
- Every claim must have a timestamp from the transcript
- KPIs are quantitative metrics mentioned (revenue, growth rates, costs, headcount, etc.)
- Be exhaustive — extract ALL entities, not just the obvious ones
- Topic segmentation should cover the entire transcript with no gaps"""
