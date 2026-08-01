// Módulo de Reconocimiento de Voz (Speech-to-Text)
// Permite escuchar la pronunciación o deletreo del niño y evaluarla.

class STTEngine {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US'; // Escuchar en inglés
    } else {
      this.recognition = null;
    }
  }

  isSupported() {
    return this.recognition !== null;
  }

  startListening(onResultCallback, onErrorCallback, onEndCallback) {
    if (!this.isSupported()) {
      if (onErrorCallback) onErrorCallback("El navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
      return;
    }

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      const confidence = event.results[0][0].confidence;
      if (onResultCallback) onResultCallback(transcript, confidence);
    };

    this.recognition.onerror = (event) => {
      if (onErrorCallback) onErrorCallback(`Error de micrófono: ${event.error}`);
    };

    this.recognition.onend = () => {
      if (onEndCallback) onEndCallback();
    };

    try {
      this.recognition.start();
    } catch (e) {
      if (onErrorCallback) onErrorCallback("El micrófono ya está activo o fue bloqueado.");
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // Normalizador para comparar lo que dijo el niño con la palabra/letras esperadas
  evaluateMatch(spokenText, targetWord) {
    const target = targetWord.toLowerCase().trim();
    const spoken = spokenText.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const cleanTarget = target.replace(/[^a-z0-9]/g, '');

    // Coincidencia exacta
    if (spoken === cleanTarget) return { match: true, score: 100 };

    // Deletreo hablado (ej: "a p p l e" o "a-p-p-l-e")
    const spokenLetters = spokenText.toLowerCase().split(/[\s\-]+/).join('');
    if (spokenLetters === cleanTarget) return { match: true, score: 100 };

    // Similitud de Levenshtein para pequeñas imprecisiones infantiles
    const distance = this.levenshteinDistance(spoken, cleanTarget);
    if (distance <= 1 && cleanTarget.length >= 4) {
      return { match: true, score: 85, note: "¡Casi perfecto! Muy buena pronunciación." };
    }

    return { match: false, score: 0 };
  }

  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

const stt = new STTEngine();
