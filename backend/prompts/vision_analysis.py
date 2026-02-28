"""Prompt for Pixtral Large vision analysis of video frames."""

VISION_PROMPT = """You are analyzing {num_frames} frames extracted from a business video (meeting, interview, or presentation).

For each frame, extract:
1. **OCR text**: All readable text (slides, whiteboards, screen shares, captions)
2. **Scene description**: Brief description of what's visible (people, setting, presentation)
3. **Slide title**: If a presentation slide is visible, its title
4. **Objects**: Notable objects or visual elements (charts, graphs, diagrams, products)

Frames in order:
{frame_list}

Return a JSON object with this exact structure:
{{
  "frames": [
    {{
      "frame_number": 1,
      "ocr_text": ["line 1 of text", "line 2 of text"],
      "scene_description": "A presenter showing a slide about Q3 revenue",
      "slide_title": "Q3 Revenue Overview",
      "objects": ["bar chart", "company logo"]
    }}
  ]
}}

Rules:
- Return one entry per frame, in order
- If no text is visible, set ocr_text to empty array
- If no slide is visible, set slide_title to null
- Be precise with numbers and text — OCR accuracy matters
- Keep scene descriptions concise (one sentence)"""
