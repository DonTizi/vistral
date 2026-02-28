"""Two-pass LLM reasoning using Mistral Small.

Pass A: Entity extraction from transcript (perception).
Pass B: Insight extraction from serialized knowledge graph (reasoning).
"""

import json
import logging

import httpx

from backend.config import MISTRAL_API_KEY, MISTRAL_BASE_URL, MODEL_REASONING
from backend.models import TranscriptSegment, ExtractedEntities
from backend.prompts.state_reasoning import PASS_A_PROMPT
from backend.prompts.insight_extraction import PASS_B_PROMPT

logger = logging.getLogger(__name__)

CHAT_URL = f"{MISTRAL_BASE_URL}/chat/completions"


async def _call_mistral(prompt: str, system: str = "", max_tokens: int = 4096) -> dict:
    """Make a single chat completion call to Mistral Small with JSON output."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            CHAT_URL,
            headers={
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL_REASONING,
                "messages": messages,
                "response_format": {"type": "json_object"},
                "max_tokens": max_tokens,
                "temperature": 0.1,
            },
        )

    if resp.status_code != 200:
        raise RuntimeError(f"Mistral API error ({resp.status_code}): {resp.text[:500]}")

    content = resp.json()["choices"][0]["message"]["content"]
    return json.loads(content)


async def extract_entities(transcript: list[TranscriptSegment]) -> ExtractedEntities:
    """Pass A: Extract speakers, topics, claims, KPIs from transcript.

    Runs as soon as transcript is available, in parallel with vision analysis.
    """
    # Format transcript for the prompt
    transcript_text = _format_transcript(transcript)
    prompt = PASS_A_PROMPT.format(transcript=transcript_text)

    logger.info("Pass A: Extracting entities from %d transcript segments", len(transcript))
    result = await _call_mistral(prompt, max_tokens=4096)

    entities = ExtractedEntities(
        speakers=result.get("speakers", []),
        topics=result.get("topics", []),
        claims=result.get("claims", []),
        kpis=result.get("kpis", []),
        decisions_raw=result.get("decisions_raw", []),
        action_items_raw=result.get("action_items_raw", []),
    )

    logger.info("Pass A complete: %d speakers, %d topics, %d claims, %d KPIs",
                len(entities.speakers), len(entities.topics),
                len(entities.claims), len(entities.kpis))
    return entities


async def extract_insights(serialized_graph: str) -> dict:
    """Pass B: Extract insights with evidence chains from serialized knowledge graph.

    Takes the compact graph representation (~3.5k tokens) instead of raw transcript
    (~40k tokens). This is 91% more token-efficient with better accuracy.
    """
    prompt = PASS_B_PROMPT.format(graph=serialized_graph)

    logger.info("Pass B: Extracting insights from serialized graph (%d chars)", len(serialized_graph))
    result = await _call_mistral(prompt, max_tokens=6000)

    # Validate expected fields
    expected = ["summary", "topics", "action_items", "decisions", "contradictions", "kpis", "key_quotes"]
    for field in expected:
        if field not in result:
            result[field] = [] if field != "summary" else "No summary available."

    logger.info("Pass B complete: %d topics, %d actions, %d decisions, %d contradictions",
                len(result.get("topics", [])), len(result.get("action_items", [])),
                len(result.get("decisions", [])), len(result.get("contradictions", [])))
    return result


def _format_transcript(segments: list[TranscriptSegment]) -> str:
    """Format transcript segments into readable text with timestamps."""
    lines = []
    for seg in segments:
        ts = f"[{seg.start:.1f}s-{seg.end:.1f}s]"
        lines.append(f"{ts} {seg.speaker}: {seg.text}")
    return "\n".join(lines)
