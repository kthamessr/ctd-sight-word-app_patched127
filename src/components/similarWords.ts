// Returns a list of words from the same grade level that are visually similar to the target word
// Similarity is based on Levenshtein distance <= 2 and not being the target word itself
export function getSimilarWords(target: string, gradeWords: string[], count: number): string[] {
  // Simple Levenshtein distance implementation
  function levenshtein(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    return matrix[a.length][b.length];
  }

  // Filter out the target word and sort by similarity
  const filtered = gradeWords.filter(w => w !== target);
  const sorted = filtered
    .map(w => ({ word: w, dist: levenshtein(target, w) }))
    .sort((a, b) => a.dist - b.dist || a.word.localeCompare(b.word));
  // Pick the closest visually similar words (distance <= 2 preferred)
  const close = sorted.filter(w => w.dist <= 2).slice(0, count);
  // If not enough, fill with next closest
  if (close.length < count) {
    const fill = sorted.filter(w => w.dist > 2).slice(0, count - close.length);
    return [...close.map(w => w.word), ...fill.map(w => w.word)].slice(0, count);
  }
  return close.map(w => w.word);
}
