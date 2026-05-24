/**
 * Maps a category slug to its i18n translation key.
 * Falls back to the raw API name if no key is found.
 */
export const CATEGORY_SLUG_TO_I18N_KEY = {
  'jewelry':       'categories.jewelry',
  'pottery':       'categories.pottery',
  'textiles':      'categories.textiles',
  'paintings':     'categories.paintings',
  'leather-goods': 'categories.leather',
  'candles-soap':  'categories.candles',
  'food-honey':    'categories.food',
  'home-decor':    'categories.decor',
  'other':         'categories.other',
  'sweets':        'categories.sweets',
};

export function getCategoryName(slug, name, t) {
  const key = CATEGORY_SLUG_TO_I18N_KEY[slug];
  if (key) return t(key, { defaultValue: name });
  return name;
}
