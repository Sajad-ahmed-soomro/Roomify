export type RoomType = {
  id: string;
  label: string;
  emoji: string;
};

export type DesignStyle = {
  id: string;
  label: string;
  description: string;
  image: string;
  /** Prompt fragment (mirrored in backend/app/catalog.py). */
  prompt: string;
};

const unsplash = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const ROOM_TYPES: RoomType[] = [
  { id: "living-room", label: "Living room", emoji: "🛋️" },
  { id: "bedroom", label: "Bedroom", emoji: "🛏️" },
  { id: "kitchen", label: "Kitchen", emoji: "🍳" },
  { id: "dining-room", label: "Dining room", emoji: "🍽️" },
  { id: "bathroom", label: "Bathroom", emoji: "🛁" },
  { id: "office", label: "Home office", emoji: "💻" },
];

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: "modern",
    label: "Modern",
    description: "Clean lines, bold accents",
    image: unsplash("photo-1586023492125-27b2c045efd7"),
    prompt: "modern interior, clean lines, statement furniture, neutral palette with bold accent colors",
  },
  {
    id: "scandinavian",
    label: "Scandinavian",
    description: "Light woods, cosy textiles",
    image: unsplash("photo-1600210492486-724fe5c67fb0"),
    prompt: "scandinavian interior, light oak wood, white walls, cosy wool textiles, hygge, plants",
  },
  {
    id: "boho",
    label: "Boho",
    description: "Plants, rattan, warm tones",
    image: unsplash("photo-1615874959474-d609969a20ed"),
    prompt: "bohemian interior, rattan furniture, macrame, many plants, warm earthy tones, layered rugs",
  },
  {
    id: "minimalist",
    label: "Minimalist",
    description: "Calm, airy, essential",
    image: unsplash("photo-1513694203232-719a280e022f"),
    prompt: "minimalist interior, uncluttered, soft white and beige, essential furniture only, natural light",
  },
  {
    id: "mid-century",
    label: "Mid-century",
    description: "Walnut, curves, retro hues",
    image: unsplash("photo-1618221195710-dd6b41faaea6"),
    prompt: "mid-century modern interior, walnut wood, tapered legs, mustard and teal accents, retro lighting",
  },
  {
    id: "coastal",
    label: "Coastal",
    description: "Breezy blues and linen",
    image: unsplash("photo-1560448204-e02f11c3d0e2"),
    prompt: "coastal interior, light blue and sand tones, linen fabrics, whitewashed wood, airy and bright",
  },
  {
    id: "farmhouse",
    label: "Farmhouse",
    description: "Rustic charm, soft neutrals",
    image: unsplash("photo-1616486338812-3dadae4b4ace"),
    prompt: "modern farmhouse interior, reclaimed wood, shiplap, soft neutrals, rustic decor",
  },
  {
    id: "industrial",
    label: "Industrial",
    description: "Raw textures, dark metal",
    image: unsplash("photo-1502005229762-cf1b2da7c5d6"),
    prompt: "industrial loft interior, exposed brick, black metal, concrete, leather, edison bulbs",
  },
];

export const HERO_IMAGES = {
  before: unsplash("photo-1555041469-a586c61ea9bc", 1400),
  gallery: [
    unsplash("photo-1616486338812-3dadae4b4ace", 900),
    unsplash("photo-1618221195710-dd6b41faaea6", 900),
    unsplash("photo-1600210492486-724fe5c67fb0", 900),
  ],
};

export function getStyle(id: string) {
  return DESIGN_STYLES.find((s) => s.id === id) ?? DESIGN_STYLES[0];
}

export function getRoomType(id: string) {
  return ROOM_TYPES.find((r) => r.id === id) ?? ROOM_TYPES[0];
}
