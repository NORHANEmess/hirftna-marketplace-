import {
  Gem, FlameKindling, Scissors, Palette, Briefcase,
  Sparkles, Wheat, Lamp, Shapes, Hammer,
} from 'lucide-react';

/** Maps a category slug to a lucide-react icon component */
export const CATEGORY_ICON_MAP = {
  jewelry:       Gem,
  pottery:       Hammer,
  textiles:      Scissors,
  paintings:     Palette,
  'leather-goods': Briefcase,
  'candles-soap':  FlameKindling,
  'food-honey':    Wheat,
  'home-decor':    Lamp,
  embroidery:    Sparkles,
  woodwork:      Hammer,
  other:         Shapes,
};

/** Returns the icon component for a category slug, or Shapes as fallback */
export function getCategoryIcon(slug) {
  return CATEGORY_ICON_MAP[slug] ?? Shapes;
}
