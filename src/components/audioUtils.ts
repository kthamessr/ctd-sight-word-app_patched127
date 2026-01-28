// Audio utility functions for game sounds

const backgroundMusic: HTMLAudioElement | null = null;
let isMusicPlaying = false;

/**
 * Play background music in a loop
 */
export function playBackgroundMusic() {
  if (isMusicPlaying) return;

  // Create a simple upbeat background melody using Web Audio API
  if (typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    
    // Simple melody notes (frequencies in Hz)
    const melody = [
      { freq: 523.25, duration: 0.3 }, // C5
      { freq: 587.33, duration: 0.3 }, // D5
      { freq: 659.25, duration: 0.3 }, // E5
      { freq: 523.25, duration: 0.3 }, // C5
      { freq: 659.25, duration: 0.3 }, // E5
      { freq: 523.25, duration: 0.3 }, // C5
      { freq: 698.46, duration: 0.6 }, // F5
    ];

    let currentTime = audioContext.currentTime;

    const playMelody = () => {
      melody.forEach((note) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = note.freq;

        gainNode.gain.setValueAtTime(0.1, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.duration);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + note.duration);

        currentTime += note.duration;
      });

      // Schedule next loop
      setTimeout(() => {
        if (isMusicPlaying) {
          currentTime = audioContext.currentTime;
          playMelody();
        }
      }, melody.reduce((sum, note) => sum + note.duration, 0) * 1000 + 500);
    };

    isMusicPlaying = true;
    playMelody();
  }
}

/**
 * Stop background music
 */
export function stopBackgroundMusic() {
  isMusicPlaying = false;
  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
}

/**
 * Play a chime sound for correct answers
 */
export function playCorrectChime() {
  if (typeof window === 'undefined') return;

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass();
  const now = audioContext.currentTime;

  // Create a pleasant ascending chime (3 notes)
  const notes = [
    { freq: 659.25, time: 0, duration: 0.15 },      // E5
    { freq: 783.99, time: 0.1, duration: 0.15 },    // G5
    { freq: 1046.50, time: 0.2, duration: 0.3 },    // C6
  ];

  notes.forEach((note) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = note.freq;

    const startTime = now + note.time;
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + note.duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + note.duration);
  });
}

/**
 * Play a soft error sound for incorrect answers
 */
export function playIncorrectSound() {
  if (typeof window === 'undefined') return;

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass();
  const now = audioContext.currentTime;

  // Create a gentle descending tone
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(400, now);
  oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.3);

  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  oscillator.start(now);
  oscillator.stop(now + 0.3);
}

/**
 * Toggle background music on/off
 */
export function toggleBackgroundMusic() {
  if (isMusicPlaying) {
    stopBackgroundMusic();
    return false;
  } else {
    playBackgroundMusic();
    return true;
  }
}

/**
 * Check if music is currently playing
 */
export function isMusicActive() {
  return isMusicPlaying;
}
