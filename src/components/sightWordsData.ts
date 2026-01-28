const sightWordsData = {
  1: [
    'the', 'and', 'a', 'to', 'of', 'in', 'is', 'you', 'that', 'it',
    'he', 'was', 'for', 'on', 'are', 'with', 'as', 'I', 'his', 'they'
  ],
  2: [
    'be', 'at', 'this', 'have', 'from', 'or', 'had', 'by', 'hot', 'has',
    'her', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about'
  ],
  3: [
    'who', 'oil', 'use', 'two', 'how', 'its', 'said', 'each', 'which', 'she',
    'do', 'an', 'all', 'into', 'could', 'year', 'your', 'work', 'first', 'made'
  ],
  4: [
    'when', 'them', 'many', 'some', 'these', 'would', 'other', 'than', 'then', 'now',
    'look', 'only', 'come', 'over', 'also', 'back', 'after', 'use', 'two', 'way'
  ],
  5: [
    'because', 'through', 'before', 'around', 'another', 'while', 'should', 'between', 'always', 'every',
    'under', 'never', 'being', 'often', 'both', 'once', 'where', 'right', 'own', 'might'
  ],
  6: [
    'although', 'however', 'whether', 'among', 'during', 'several', 'therefore', 'toward', 'without', 'within',
    'against', 'beneath', 'beyond', 'despite', 'except', 'throughout', 'underneath', 'alongside', 'besides', 'meanwhile'
  ],
  7: [
    'consequently', 'furthermore', 'nevertheless', 'accordingly', 'alternatively', 'subsequently', 'simultaneously', 'particularly', 'specifically', 'essentially',
    'approximately', 'immediately', 'significantly', 'individually', 'collectively', 'temporarily', 'permanently', 'originally', 'primarily', 'relatively'
  ],
  8: [
    'notwithstanding', 'correspondingly', 'predominantly', 'extraordinarily', 'comprehensively', 'substantially', 'systematically', 'theoretically', 'fundamentally', 'considerably',
    'dramatically', 'increasingly', 'respectively', 'traditionally', 'universally', 'proportionally', 'substantially', 'exceptionally', 'remarkably', 'understandably'
  ]
};

export function getRandomWords(level: number, count: number = 5) {
  const words = sightWordsData[level as keyof typeof sightWordsData] || sightWordsData[1];
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getSightWords(level: number) {
  return sightWordsData[level as keyof typeof sightWordsData] || sightWordsData[1];
}
