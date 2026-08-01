// Módulo de Síntesis de Voz (Text-to-Speech)
// Soporta pronunciación en Inglés Nativo (normal y lenta "tortuga") y Español.

class TTSEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;
    const load = () => {
      this.voices = this.synth.getVoices();
    };
    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  getBestVoice(langPrefix) {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    // Buscar voz nativa preferred US/UK o ES
    let voice = this.voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && v.name.includes("Google"));
    if (!voice) {
      voice = this.voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
    }
    return voice;
  }

  speakEnglish(text, slow = false) {
    if (!this.synth) return;
    this.synth.cancel(); // Detener audios previos
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    const voice = this.getBestVoice('en');
    if (voice) utterance.voice = voice;
    
    utterance.rate = slow ? 0.6 : 0.9; // Velocidad tortuga o normal alegre
    utterance.pitch = 1.1; // Tono alegre infantil
    this.synth.speak(utterance);
  }

  speakSpanish(text) {
    if (!this.synth) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    const voice = this.getBestVoice('es');
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    this.synth.speak(utterance);
  }

  spellOutWord(word, onLetterCallback, onCompleteCallback) {
    if (!this.synth) return;
    this.synth.cancel();

    const letters = word.toUpperCase().split('');
    let index = 0;

    const speakNextLetter = () => {
      if (index >= letters.length) {
        // Al terminar de deletrear, pronunciar la palabra completa
        setTimeout(() => {
          this.speakEnglish(word, false);
          if (onCompleteCallback) onCompleteCallback();
        }, 500);
        return;
      }

      const char = letters[index];
      if (onLetterCallback) onLetterCallback(char, index);

      const utterance = new SpeechSynthesisUtterance(char);
      utterance.lang = 'en-US';
      const voice = this.getBestVoice('en');
      if (voice) utterance.voice = voice;
      utterance.rate = 0.85;
      utterance.pitch = 1.1;

      utterance.onend = () => {
        index++;
        setTimeout(speakNextLetter, 300);
      };

      this.synth.speak(utterance);
    };

    speakNextLetter();
  }
}

const tts = new TTSEngine();
