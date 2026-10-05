// Values reaching the profile form have already passed OCR candidate validation.
// Preserve all valid English name words instead of applying OCR dictionary-anchor
// trimming, which can remove legitimate surnames that are absent from a word list.
export const sanitizeProfileName = (name) => {
  if (!name) return '';
  return String(name)
    .replace(/[\u0600-\u06FF]/g, '')
    .replace(/[^A-Za-z\s.\-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
