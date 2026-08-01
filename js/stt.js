// Módulo de Reconocimiento de Voz Inteligente Infantil (STT Dual Engine)
// Optimizado para tolerancia a vocales cortas (ej: "pen" vs "pan"), fonética en español/inglés y voz infantil.

class STTEngine {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 5; // Capturar hasta 5 opciones para tolerancia acústica
      this.recognition.lang = 'en-US';
    } else {
      this.recognition = null;
    }

    // Mapa fonético de letras habladas por un niño de 7 años
    this.phoneticLetterMap = {
      'ay': 'a', 'ei': 'a', 'hey': 'a', 'a': 'a',
      'bee': 'b', 'be': 'b', 'bi': 'b',
      'cee': 'c', 'see': 'c', 'si': 'c', 'ce': 'c',
      'dee': 'd', 'di': 'd', 'de': 'd',
      'ee': 'e', 'eh': 'e', 'e': 'e',
      'ef': 'f', 'eff': 'f', 'efe': 'f',
      'gee': 'g', 'ji': 'g', 'ge': 'g',
      'aitch': 'h', 'eich': 'h', 'hache': 'h',
      'eye': 'i', 'ai': 'i', 'i': 'i',
      'jay': 'j', 'jey': 'j', 'jota': 'j',
      'kay': 'k', 'key': 'k', 'ka': 'k',
      'el': 'l', 'ell': 'l', 'ele': 'l',
      'em': 'm', 'emm': 'm', 'eme': 'm',
      'en': 'n', 'enn': 'n', 'ene': 'n',
      'oh': 'o', 'ou': 'o', 'o': 'o',
      'pee': 'p', 'pi': 'p', 'pe': 'p',
      'cue': 'q', 'kiu': 'q', 'cu': 'q',
      'ar': 'r', 'are': 'r', 'erre': 'r',
      'ess': 's', 'es': 's', 'ese': 's',
      'tee': 't', 'ti': 't', 'te': 't',
      'you': 'u', 'iu': 'u', 'u': 'u',
      'vee': 'v', 'vi': 'v', 'uve': 'v',
      'double you': 'w', 'doble u': 'w',
      'ex': 'x', 'eks': 'x', 'equis': 'x',
      'why': 'y', 'wai': 'y', 'ye': 'y',
      'zee': 'z', 'zed': 'z', 'zi': 'z', 'zeta': 'z'
    };

    // Pares comunes de confusión acústica de vocales (Short Vowel Confusion Pairs)
    // En inglés americano, la 'E' corta (pen) y la 'A' o 'I' corta (pan/pin) suenan idénticas a los motores STT.
    this.commonVowelConfusions = {
      'pen': ['pan', 'pin', 'pain', 'peen'],
      'pet': ['pat', 'pit', 'pete'],
      'bed': ['bad', 'bid'],
      'men': ['man', 'min'],
      'red': ['rad', 'read'],
      'ten': ['tan', 'tin'],
      'leg': ['lag', 'lig'],
      'net': ['nat', 'nit'],
      'vet': ['vat', 'vit'],
      'wet': ['wat', 'wit'],
      'hen': ['han', 'hin'],
      'hat': ['hut', 'hot'],
      'cap': ['cup', 'cop'],
      'pig': ['peg', 'puk'],
      'bag': ['bug', 'beg'],
      'cat': ['cut', 'cot'],
      'rat': ['rut', 'rot'],
      'sad': ['sid', 'sod']
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

  // Evaluador Fonético Inteligente con Tolerancia a Confusión de Vocales
  evaluateMatch(transcript, targetWord, alternatives = []) {
    const target = targetWord.toLowerCase().trim();
    const cleanTarget = target.replace(/[^a-z0-9]/g, '');

    const allTranscripts = [transcript, ...alternatives];

    // Lista de palabras acústicamente equivalentes según el diccionario de confusión
    const knownConfusions = this.commonVowelConfusions[cleanTarget] || [];

    for (let t of allTranscripts) {
      const spokenClean = t.toLowerCase().replace(/[^a-z0-9]/g, '');

      // 1. Coincidencia directa (ej: "pen" === "pen")
      if (spokenClean === cleanTarget) {
        return { match: true, score: 100 };
      }

      // 2. Coincidencia por Tolerancia Fonética de Vocales (ej: Target "pen", STT escuchó "pan")
      if (knownConfusions.includes(spokenClean)) {
        return { match: true, score: 95, note: "Ajuste acústico de vocal superado" };
      }

      // 3. Tolerancia por substitución de 1 sola vocal (si difieren únicamente en 1 vocal corta E/A/I)
      if (spokenClean.length === cleanTarget.length && cleanTarget.length >= 3) {
        let diffCount = 0;
        let diffIsVowel = false;

        for (let i = 0; i < cleanTarget.length; i++) {
          if (spokenClean[i] !== cleanTarget[i]) {
            diffCount++;
            if (/[aeiou]/.test(spokenClean[i]) && /[aeiou]/.test(cleanTarget[i])) {
              diffIsVowel = true;
            }
          }
        }

        if (diffCount === 1 && diffIsVowel) {
          return { match: true, score: 90, note: "Tolerancia de vocal corta aplicada" };
        }
      }

      // 4. Coincidencia por conversión fonética de letras (ej: "P - E - N" -> p-e-n)
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
