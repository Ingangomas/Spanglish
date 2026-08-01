// Módulo de Reconocimiento de Voz Inteligente Infantil (STT Dual Engine)
// Optimizado para escuchar deletreo por letra o palabra completa tanto en Inglés como en Español.

class STTEngine {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 3; // Capturar múltiples alternativas para mayor precisión
      this.recognition.lang = 'en-US';
    } else {
      this.recognition = null;
    }

    // Mapa fonético de letras habladas por un niño de 7 años (en Inglés y Español)
    this.phoneticLetterMap = {
      // Fonética en Inglés
      'ay': 'a', 'ei': 'a', 'hey': 'a',
      'bee': 'b', 'be': 'b', 'bi': 'b',
      'cee': 'c', 'see': 'c', 'si': 'c',
      'dee': 'd', 'di': 'd',
      'ee': 'e', 'eh': 'e',
      'ef': 'f', 'eff': 'f',
      'gee': 'g', 'ji': 'g',
      'aitch': 'h', 'eich': 'h',
      'eye': 'i', 'ai': 'i',
      'jay': 'j', 'jey': 'j',
      'kay': 'k', 'key': 'k',
      'el': 'l', 'ell': 'l',
      : 'm', 'emm': 'm',
      'en': 'n', 'enn': 'n',
      'oh': 'o', 'ou': 'o',
      'pee': 'p', 'pi': 'p',
      'cue': 'q', 'kiu': 'q',
      'ar': 'r', 'are': 'r',
      'ess': 's', 'es': 's',
      'tee': 't', 'ti': 't',
      'you': 'u', 'iu': 'u',
      'vee': 'v', 'vi': 'v',
      'double you': 'w', 'doble u': 'w',
      'ex': 'x', 'eks': 'x',
      'why': 'y', 'wai': 'y',
      'zee': 'z', 'zed': 'z', 'zi': 'z',

      // Fonética en Español (para niños hispanohablantes deletreando)
      'a': 'a',
      'ce': 'c',
      'de': 'd',
      'efe': 'f',
      'ge': 'g',
      'hache': 'h',
      'jota': 'j',
      'ka': 'k',
      'ele': 'l',
      'eme': 'm',
      'ene': 'n',
      'pe': 'p',
      'cu': 'q',
      'erre': 'r',
      'te': 't',
      'uve': 'v',
      'equis': 'x',
      'ye': 'y',
      'zeta': 'z'
    };
  }

  isSupported() {
    return this.recognition !== null;
  }

  startListening(onResultCallback, onErrorCallback, onEndCallback) {
    if (!this.isSupported()) {
      if (onErrorCallback) onErrorCallback("El micrófono requiere Google Chrome o Microsoft Edge.");
      return;
    }

    this.recognition.onresult = (event) => {
      // Recopilar todas las alternativas posibles reconocidas
      const alternatives = [];
      for (let i = 0; i < event.results[0].length; i++) {
        alternatives.push(event.results[0][i].transcript.toLowerCase().trim());
      }
      const primaryTranscript = alternatives[0];

      if (onResultCallback) onResultCallback(primaryTranscript, alternatives);
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        if (onErrorCallback) onErrorCallback("No escuchamos nada. ¡Intenta hablar más cerca del micrófono!");
      } else if (event.error === 'not-allowed') {
        if (onErrorCallback) onErrorCallback("Por favor permite el acceso al micrófono en el navegador.");
      } else {
        if (onErrorCallback) onErrorCallback(`Micrófono: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      if (onEndCallback) onEndCallback();
    };

    try {
      this.recognition.start();
    } catch (e) {
      if (onErrorCallback) onErrorCallback("El micrófono ya está activo.");
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // Evaluador Fonético Robusto para Niños
  evaluateMatch(transcript, targetWord, alternatives = []) {
    const target = targetWord.toLowerCase().trim();
    const cleanTarget = target.replace(/[^a-z0-9]/g, '');

    // Comprobar todas las alternativas entregadas por el reconocedor
    const allTranscripts = [transcript, ...alternatives];

    for (let t of allTranscripts) {
      const spokenClean = t.toLowerCase().replace(/[^a-z0-9]/g, '');

      // 1. Coincidencia directa de la palabra pronunciada (ej: "pen" === "pen")
      if (spokenClean === cleanTarget) {
        return { match: true, score: 100 };
      }

      // 2. Coincidencia por conversión fonética de letras individuales
      const tokens = t.toLowerCase().split(/[\s\-]+/);
      let convertedLetters = '';
      tokens.forEach(tok => {
        if (this.phoneticLetterMap[tok]) {
          convertedLetters += this.phoneticLetterMap[tok];
        } else if (tok.length === 1 && /[a-z]/.test(tok)) {
          convertedLetters += tok;
        }
      });

      if (convertedLetters === cleanTarget) {
        return { match: true, score: 100 };
      }

      // 3. Similitud aproximada si el niño omitió solo 1 letra o tuvo pequeña imprecisión
      if (cleanTarget.length >= 3) {
        const distWord = this.levenshteinDistance(spokenClean, cleanTarget);
        if (distWord <= 1) return { match: true, score: 90 };

        if (convertedLetters.length > 0) {
          const distLetters = this.levenshteinDistance(convertedLetters, cleanTarget);
          if (distLetters <= 1) return { match: true, score: 90 };
        }
      }
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
