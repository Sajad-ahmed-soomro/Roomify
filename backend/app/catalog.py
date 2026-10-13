"""Room types and styles. Ids must match frontend/src/lib/styles.ts."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Style:
    label: str
    prompt: str
    # Colour grade for the demo engine: warmth, saturation, brightness, contrast
    grade: tuple[float, float, float, float]


ROOM_TYPES: dict[str, str] = {
    "living-room": "Living room",
    "bedroom": "Bedroom",
    "kitchen": "Kitchen",
    "dining-room": "Dining room",
    "bathroom": "Bathroom",
    "office": "Home office",
}

STYLES: dict[str, Style] = {
    "modern": Style("Modern", "modern interior, clean lines, statement furniture, neutral palette with bold accent colors", (0.05, 1.15, 1.05, 1.1)),
    "scandinavian": Style("Scandinavian", "scandinavian interior, light oak wood, white walls, cosy wool textiles, hygge, plants", (0.12, 0.9, 1.12, 0.95)),
    "boho": Style("Boho", "bohemian interior, rattan furniture, macrame, many plants, warm earthy tones, layered rugs", (0.25, 1.1, 1.04, 1.0)),
    "minimalist": Style("Minimalist", "minimalist interior, uncluttered, soft white and beige, essential furniture only, natural light", (0.02, 0.75, 1.15, 0.92)),
    "mid-century": Style("Mid-century", "mid-century modern interior, walnut wood, tapered legs, mustard and teal accents, retro lighting", (0.2, 1.2, 1.0, 1.08)),
    "coastal": Style("Coastal", "coastal interior, light blue and sand tones, linen fabrics, whitewashed wood, airy and bright", (-0.12, 1.0, 1.1, 0.97)),
    "farmhouse": Style("Farmhouse", "modern farmhouse interior, reclaimed wood, shiplap, soft neutrals, rustic decor", (0.15, 0.95, 1.06, 1.02)),
    "industrial": Style("Industrial", "industrial loft interior, exposed brick, black metal, concrete, leather, edison bulbs", (0.08, 0.85, 0.95, 1.2)),
}

QUALITY_SUFFIX = "professional interior photography, realistic materials, soft natural light, highly detailed"
DEFAULT_NEGATIVE = (
    "cartoon, illustration, painting, blurry, distorted furniture, warped walls, "
    "unrealistic proportions, extra windows, text, watermark, low quality"
)


def template_prompt(room_type: str, style: str, wishes: str) -> str:
    """Prompt used when the LLM is unavailable."""
    parts = [f"photorealistic {ROOM_TYPES[room_type].lower()}", STYLES[style].prompt, wishes.strip(), QUALITY_SUFFIX]
    return ", ".join(p for p in parts if p)
