"""Two-pass LLM reasoning using Mistral Small.

Pass A: Entity extraction from transcript (perception).
Pass B: Insight extraction from serialized knowledge graph (reasoning).
"""

import json
import logging
import re

import httpx

from backend.config import MISTRAL_API_KEY, MISTRAL_BASE_URL, MODEL_REASONING
from backend.models import TranscriptSegment, ExtractedEntities
from backend.prompts.state_reasoning import PASS_A_PROMPT
from backend.prompts.insight_extraction import PASS_B_PROMPT

logger = logging.getLogger(__name__)

CHAT_URL = f"{MISTRAL_BASE_URL}/chat/completions"


def _clean_json(raw: str) -> str:
    """Strip code fences and fix common LLM JSON issues."""
    text = raw.strip()
    # Remove markdown code fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    # Remove trailing commas before } or ]
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text


async def _call_mistral(prompt: str, system: str = "", max_tokens: int = 4096, retries: int = 2) -> dict:
    """Make a chat completion call to Mistral Small with JSON output.

    Retries on JSON parse failures (typically truncated output) with
    increased max_tokens on each attempt.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    current_max_tokens = max_tokens

    for attempt in range(retries + 1):
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
                    "max_tokens": current_max_tokens,
                    "temperature": 0.1,
                },
            )

        if resp.status_code != 200:
            raise RuntimeError(f"Mistral API error ({resp.status_code}): {resp.text[:500]}")

        content = resp.json()["choices"][0]["message"]["content"]
        finish_reason = resp.json()["choices"][0].get("finish_reason", "")

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            cleaned = _clean_json(content)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                if attempt < retries:
                    # Likely truncated — increase token budget and retry
                    current_max_tokens = min(current_max_tokens * 2, 16384)
                    logger.warning(
                        "JSON parse failed (attempt %d/%d, finish_reason=%s), "
                        "retrying with max_tokens=%d",
                        attempt + 1, retries + 1, finish_reason, current_max_tokens,
                    )
                    continue
                logger.error("Failed to parse LLM JSON after %d attempts (first 500 chars): %s",
                             retries + 1, content[:500])
                raise


async def extract_entities(transcript: list[TranscriptSegment]) -> ExtractedEntities:
    """Pass A: Extract speakers, topics, claims, KPIs from transcript.

    Runs as soon as transcript is available, in parallel with vision analysis.
    """
    # Format transcript for the prompt
    transcript_text = _format_transcript(transcript)
    prompt = PASS_A_PROMPT.format(transcript=transcript_text)

    logger.info("Pass A: Extracting entities from %d transcript segments", len(transcript))
    result = await _call_mistral(prompt, max_tokens=8192)

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
