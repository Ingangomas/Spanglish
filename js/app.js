// Control Principal de la Aplicación Spanglish (Spelling Bee App)

class AppController {
  constructor() {
    this.currentLevel = 1;
    this.currentWordIndex = 0;
    this.filteredWords = [];
    this.currentWordObj = null;
    this.enteredLetters = [];

    // Modo de Estudio: 'grid' (ver todas las tarjetas) o 'sequential' (sucesivo continuo)
    this.studyMode = 'grid';

    // Modo Concurso
    this.contestWordObj = null;

    this.initDOM();
    this.initEvents();
    this.updateLevelButtons();
    this.loadLevel(1);
    this.renderDictionary();
  }

  initDOM() {
    this.mascotText = document.getElementById('mascot-text');
    this.cardLevelBadge = document.getElementById('card-level-badge');
    this.cardEnglishWord = document.getElementById('card-english-word');
    this.cardPhonetic = document.getElementById('card-phonetic');
    this.spellingSlots = document.getElementById('spelling-slots');
    this.keyboardLetters = document.getElementById('keyboard-letters');
    this.cardSpanishMeaning = document.getElementById('card-spanish-meaning');
    this.cardSynonyms = document.getElementById('card-synonyms');
    this.cardHowToUse = document.getElementById('card-how-to-use');
    this.cardExampleEn = document.getElementById('card-example-en');
    this.cardExampleEs = document.getElementById('card-example-es');

    this.levelGridView = document.getElementById('level-words-grid-view');
    this.singleWordPracticeView = document.getElementById('single-word-practice-view');
    this.levelWordsContainer = document.getElementById('level-words-container');

    this.btnMicListen = document.getElementById('btn-mic-listen');
    this.voiceStatus = document.getElementById('voice-status');
    this.voiceStatusMsg = document.getElementById('voice-status-msg');
    this.voiceHint = document.getElementById('voice-hint');

    this.renderKeyboard();
  }

  updateLevelButtons() {
    const container = document.getElementById('level-buttons-container');
    if (!container) return;
    container.innerHTML = '';

    for (let lvl = 1; lvl <= 5; lvl++) {
      const info = gamification.getLevelProgressInfo(lvl);
      const btn = document.createElement('button');
      btn.className = `btn-level ${lvl === this.currentLevel ? 'active' : ''} ${!info.isUnlocked ? 'locked' : ''}`;

      if (info.isUnlocked) {
        btn.innerHTML = `Nivel ${lvl} <span class="lvl-pct">${info.percentage}%</span>`;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.btn-level').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.loadLevel(lvl);
        });
      } else {
        const prevInfo = gamification.getLevelProgressInfo(lvl - 1);
        btn.innerHTML = `<i class="fa-solid fa-lock"></i> Nivel ${lvl} <span class="lvl-pct">${prevInfo.percentage}% / 80%</span>`;
        btn.addEventListener('click', () => {
          this.setMascot(`🔒 El Nivel ${lvl} está bloqueado. Debes dominar al menos el 80% de las palabras del Nivel ${lvl - 1} para abrirlo (Llevas el ${prevInfo.percentage}%). ¡Tú puedes!`);
          tts.speakSpanish(`Para desbloquear el Nivel ${lvl}, completa el 80% del nivel anterior.`);
        });
      }
      container.appendChild(btn);
    }
  }

  renderKeyboard() {
    this.keyboardLetters.innerHTML = '';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    alphabet.forEach(letter => {
      const btn = document.createElement('button');
      btn.className = 'key-btn';
      btn.textContent = letter;
      btn.addEventListener('click', () => this.handleKeyPress(letter));
      this.keyboardLetters.appendChild(btn);
    });
  }

  initEvents() {
    // Pestañas
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

        const targetTab = btn.getAttribute('data-tab');
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');

        if (targetTab === 'tab-sentences') this.loadStandaloneSentenceWorkshop();
        if (targetTab === 'tab-blind-bee') this.loadContestMode();
      });
    });

    // Modos de Aprendizaje
    document.getElementById('btn-mode-grid').addEventListener('click', () => {
      this.studyMode = 'grid';
      document.getElementById('btn-mode-grid').classList.add('active');
      document.getElementById('btn-mode-sequential').classList.remove('active');
      this.showGridView();
    });

    document.getElementById('btn-mode-sequential').addEventListener('click', () => {
      this.studyMode = 'sequential';
      document.getElementById('btn-mode-sequential').classList.add('active');
      document.getElementById('btn-mode-grid').classList.remove('active');
      this.showSingleWordView(this.currentWordIndex);
    });

    document.getElementById('btn-back-to-grid').addEventListener('click', () => {
      this.showGridView();
    });

    // Botones de Voz y Audio
    document.getElementById('btn-speak-normal').addEventListener('click', () => {
      if (this.currentWordObj) tts.speakEnglish(this.currentWordObj.word, false);
    });

    document.getElementById('btn-speak-slow').addEventListener('click', () => {
      if (this.currentWordObj) tts.speakEnglish(this.currentWordObj.word, true);
    });

    document.getElementById('btn-spell-auto').addEventListener('click', () => {
      if (!this.currentWordObj) return;
      this.setMascot("¡Escucha con atención cómo se deletrea esta palabra!");
      tts.spellOutWord(this.currentWordObj.word, (char, idx) => {
        this.highlightSlot(idx, char);
      });
    });

    document.getElementById('btn-read-meaning').addEventListener('click', () => {
      if (!this.currentWordObj) return;
      const textToRead = `${this.currentWordObj.spanish}. ${this.currentWordObj.howToUseEs}`;
      tts.speakSpanish(textToRead);
    });

    // Acciones del Teclado
    document.getElementById('btn-key-backspace').addEventListener('click', () => this.handleBackspace());
    document.getElementById('btn-key-check').addEventListener('click', () => this.checkSpelling());
    document.getElementById('btn-next-word').addEventListener('click', () => this.nextWord());

    // Teclado Físico
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('tab-spelling').classList.contains('active') && 
          this.singleWordPracticeView.style.display !== 'none' &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        if (e.key === 'Backspace') {
          this.handleBackspace();
        } else if (e.key === 'Enter') {
          this.checkSpelling();
        } else if (/^[a-zA-Z]$/.test(e.key)) {
          this.handleKeyPress(e.key.toUpperCase());
        }
      }
    });

    // Micrófono
    this.btnMicListen.addEventListener('click', () => this.toggleVoiceRecognition());

    // Verificación de Escritura Activa
    document.getElementById('btn-check-synonym').addEventListener('click', () => this.checkSynonymWriting());
    document.getElementById('btn-check-full-sentence').addEventListener('click', () => this.checkFullSentenceWriting());

    // Panel de Padres Modal
    const modal = document.getElementById('modal-parent-dashboard');
    document.getElementById('btn-parent-dashboard').addEventListener('click', () => {
      document.getElementById('dash-total-mastered').textContent = gamification.state.masteredWords.length;
      document.getElementById('dash-total-stars').textContent = gamification.state.stars;
      document.getElementById('dash-streak').textContent = gamification.state.streakDays;
      this.renderParentLevelProgress();
      modal.classList.add('active');
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
      modal.classList.remove('active');
    });

    document.getElementById('btn-reset-data').addEventListener('click', () => {
      if (confirm("¿Estás seguro de reiniciar el progreso de Spanglish del niño?")) {
        gamification.resetProgress();
        modal.classList.remove('active');
        this.updateLevelButtons();
        this.loadLevel(1);
        this.setMascot("¡Hemos reiniciado tu progreso! ¡A conquistar de nuevo los 5 niveles!");
      }
    });

    document.getElementById('btn-print-flashcards').addEventListener('click', () => {
      window.print();
    });

    // Filtros del Diccionario
    document.getElementById('dict-search-input').addEventListener('input', () => this.renderDictionary());
    document.getElementById('dict-level-filter').addEventListener('change', () => this.renderDictionary());

    // Taller Dedicado de Escritura de Oraciones (Pestaña 4)
    document.getElementById('btn-submit-written-sentence').addEventListener('click', () => this.checkStandaloneSentence());
    document.getElementById('btn-next-sentence-practice').addEventListener('click', () => this.loadStandaloneSentenceWorkshop());

    // Modo Concurso Real
    document.getElementById('btn-contest-play-word').addEventListener('click', () => this.playContestAudio());
    document.getElementById('btn-contest-submit').addEventListener('click', () => this.checkContestAnswer());
  }

  loadLevel(level) {
    this.currentLevel = level;
    this.filteredWords = WORDS_DATA.filter(w => w.level === level);
    if (this.filteredWords.length === 0) {
      this.filteredWords = WORDS_DATA;
    }
    this.currentWordIndex = 0;

    document.getElementById('level-grid-title').textContent = `Palabras del Nivel ${level}`;
    
    this.renderLevelGrid();
    
    if (this.filteredWords.length > 0) {
      this.loadWord(this.filteredWords[0]);
    }

    if (this.studyMode === 'grid') {
      this.showGridView();
    } else {
      this.showSingleWordView(0);
    }
  }

  renderLevelGrid() {
    this.levelWordsContainer.innerHTML = '';
    this.filteredWords.forEach((wordObj, idx) => {
      const isMastered = gamification.state.masteredWords.includes(wordObj.id);
      const card = document.createElement('div');
      card.className = `word-card-item ${isMastered ? 'mastered' : ''}`;
      card.innerHTML = `
        <div class="w-title">${wordObj.word}</div>
        <div class="w-es">${wordObj.spanish}</div>
      `;
      card.addEventListener('click', () => {
        this.showSingleWordView(idx);
      });
      this.levelWordsContainer.appendChild(card);
    });
  }

  showGridView() {
    this.levelGridView.style.display = 'block';
    this.singleWordPracticeView.style.display = 'none';
  }

  showSingleWordView(index) {
    if (typeof index === 'number') {
      this.currentWordIndex = index;
    }
    this.levelGridView.style.display = 'none';
    this.singleWordPracticeView.style.display = 'block';
    this.loadWord(this.filteredWords[this.currentWordIndex]);
  }

  loadWord(wordObj) {
    this.currentWordObj = wordObj;
    this.enteredLetters = [];

    document.getElementById('sequence-indicator-text').textContent = `Palabra ${this.currentWordIndex + 1} de ${this.filteredWords.length}`;
    this.cardLevelBadge.textContent = `Nivel ${wordObj.level}`;
    this.cardEnglishWord.textContent = wordObj.word.toUpperCase();
    this.cardPhonetic.textContent = `Pronunciación: /${wordObj.phonetic}/`;
    this.cardSpanishMeaning.textContent = wordObj.spanish;

    this.cardSynonyms.innerHTML = wordObj.synonyms.map(s => `<span class="synonym-tag">${s}</span>`).join('');
    this.cardHowToUse.textContent = wordObj.howToUseEs;
    this.cardExampleEn.textContent = wordObj.exampleEn;
    this.cardExampleEs.textContent = wordObj.exampleEs;

    // Configurar sección de Escritura Activa
    const mainSynonym = wordObj.synonyms[0] || "palabra equivalente";
    document.getElementById('synonym-word-name').textContent = wordObj.word.toUpperCase();
    document.getElementById('synonym-target-hint').textContent = mainSynonym;
    document.getElementById('input-synonym-user').value = '';
    document.getElementById('synonym-feedback').textContent = '';

    document.getElementById('sentence-es-prompt').textContent = wordObj.exampleEs;
    document.getElementById('sentence-en-target-display').textContent = wordObj.exampleEn;
    document.getElementById('input-sentence-user').value = '';
    document.getElementById('sentence-full-feedback').textContent = '';

    const spelledSpaced = wordObj.word.toUpperCase().split('').join(' - ');
    if (this.voiceHint) {
      this.voiceHint.textContent = `"${spelledSpaced}"`;
    }
    if (this.voiceStatusMsg) {
      this.voiceStatusMsg.textContent = "Haz clic en el micrófono y di la palabra en inglés o deletrea:";
    }

    this.renderSlots();
    this.setMascot(`¡Estudiemos '${wordObj.word.toUpperCase()}'! Primero mira el significado arriba y luego deletréala.`);
  }

  renderSlots() {
    this.spellingSlots.innerHTML = '';
    const targetLength = this.currentWordObj.word.length;

    for (let i = 0; i < targetLength; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot-box';
      if (this.enteredLetters[i]) {
        slot.textContent = this.enteredLetters[i];
        slot.classList.add('filled');
      }
      this.spellingSlots.appendChild(slot);
    }
  }

  highlightSlot(index, char) {
    const slots = this.spellingSlots.children;
    if (slots[index]) {
      slots[index].textContent = char;
      slots[index].classList.add('filled');
    }
  }

  handleKeyPress(letter) {
    if (!this.currentWordObj) return;
    if (this.enteredLetters.length < this.currentWordObj.word.length) {
      this.enteredLetters.push(letter);
      tts.speakEnglish(letter, false);
      this.renderSlots();
    }
  }

  handleBackspace() {
    if (this.enteredLetters.length > 0) {
      this.enteredLetters.pop();
      this.renderSlots();
    }
  }

  checkSpelling() {
    if (!this.currentWordObj) return;

    const userSpelling = this.enteredLetters.join('').toLowerCase();
    const target = this.currentWordObj.word.toLowerCase().replace(/[^a-z0-9]/g, '');
    const slots = this.spellingSlots.children;

    if (userSpelling === target) {
      for (let s of slots) s.classList.add('correct');
      
      const isNew = gamification.recordWordMastered(this.currentWordObj.id, this.currentWordObj.level);
      this.renderLevelGrid();
      this.updateLevelButtons();

      this.setMascot("🎉 ¡EXCELENTE! ¡Deletreo correcto! ¡Ahora completa la escritura del sinónimo y la oración abajo!");
      tts.speakSpanish("¡Excelente! Deletreo perfecto en Spanglish.");

      if (this.studyMode === 'sequential') {
        setTimeout(() => this.nextWord(), 2000);
      }
    } else {
      for (let s of slots) s.classList.add('error');
      this.setMascot("❌ ¡Casi! Revisa las letras e inténtalo de nuevo.");
      tts.speakSpanish("Inténtalo otra vez.");
      setTimeout(() => {
        for (let s of slots) s.classList.remove('error');
      }, 1200);
    }
  }

  checkSynonymWriting() {
    const inputVal = document.getElementById('input-synonym-user').value.trim().toLowerCase();
    const fb = document.getElementById('synonym-feedback');

    if (!inputVal) {
      fb.style.color = '#9F1239';
      fb.textContent = 'Escribe una palabra en el cuadro.';
      return;
    }

    const validSynonyms = this.currentWordObj.synonyms.map(s => s.toLowerCase());
    if (validSynonyms.includes(inputVal) || inputVal === this.currentWordObj.synonyms[0].toLowerCase()) {
      fb.style.color = '#065F46';
      fb.innerHTML = '🎉 ¡Increíble! Escribiste el sinónimo perfectamente (+3 estrellas ⭐).';
      gamification.state.stars += 3;
      gamification.saveState();
      tts.speakSpanish("¡Muy bien! Sinónimo escrito correctamente.");
    } else {
      fb.style.color = '#9F1239';
      fb.innerHTML = `❌ El sinónimo sugerido es <strong>"${this.currentWordObj.synonyms[0]}"</strong>. ¡Vuelve a escribirlo!`;
      tts.speakSpanish("Revisa el sinónimo e inténtalo de nuevo.");
    }
  }

  checkFullSentenceWriting() {
    const inputVal = document.getElementById('input-sentence-user').value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const targetVal = this.currentWordObj.exampleEn.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const fb = document.getElementById('sentence-full-feedback');

    if (!inputVal) {
      fb.style.color = '#9F1239';
      fb.textContent = 'Escribe la oración en inglés.';
      return;
    }

    if (inputVal === targetVal) {
      fb.style.color = '#065F46';
      fb.innerHTML = '🏆 <strong>¡EXCELENTE TRABAJO! Escribiste toda la oración en inglés correctamente (+5 estrellas ⭐).</strong>';
      gamification.recordWordMastered(this.currentWordObj.id, this.currentWordObj.level);
      this.renderLevelGrid();
      this.updateLevelButtons();
      tts.speakSpanish("¡Formidable! Escribiste la oración completa perfectamente.");
      
      if (this.studyMode === 'sequential') {
        setTimeout(() => this.nextWord(), 2500);
      }
    } else {
      fb.style.color = '#9F1239';
      fb.innerHTML = `❌ Revisa las palabras. Debe ser exactamente: <strong>"${this.currentWordObj.exampleEn}"</strong>`;
      tts.speakSpanish("Compara con el modelo e inténtalo otra vez.");
    }
  }

  nextWord() {
    this.currentWordIndex = (this.currentWordIndex + 1) % this.filteredWords.length;
    this.loadWord(this.filteredWords[this.currentWordIndex]);
  }

  setMascot(text) {
    this.mascotText.textContent = text;
  }

  toggleVoiceRecognition() {
    const targetWord = this.currentWordObj ? this.currentWordObj.word.toUpperCase() : '';
    if (this.btnMicListen.classList.contains('listening')) {
      stt.stopListening();
      this.btnMicListen.classList.remove('listening');
      if (this.voiceStatusMsg) this.voiceStatusMsg.textContent = "Micrófono detenido.";
    } else {
      this.btnMicListen.classList.add('listening');
      if (this.voiceStatusMsg) this.voiceStatusMsg.textContent = "🎤 Escuchando... Habla la palabra en inglés o deletréala en inglés/español:";

      stt.startListening(
        (primaryTranscript, alternatives) => {
          this.btnMicListen.classList.remove('listening');
          if (this.voiceStatusMsg) this.voiceStatusMsg.innerHTML = `Escuchamos: <strong>"${primaryTranscript}"</strong>. Guía:`;
          
          const result = stt.evaluateMatch(primaryTranscript, this.currentWordObj.word, alternatives);
          if (result.match) {
            this.enteredLetters = this.currentWordObj.word.toUpperCase().split('');
            this.renderSlots();
            this.checkSpelling();
          } else {
            this.setMascot(`Escuché "${primaryTranscript}". La palabra a deletrear es '${targetWord}'. ¡Intenta deletrearla letra por letra o usa el teclado!`);
          }
        },
        (errorMsg) => {
          this.btnMicListen.classList.remove('listening');
          if (this.voiceStatusMsg) this.voiceStatusMsg.textContent = errorMsg;
        },
        () => {
          this.btnMicListen.classList.remove('listening');
        }
      );
    }
  }

  renderParentLevelProgress() {
    const list = document.getElementById('parent-level-progress-list');
    if (!list) return;
    list.innerHTML = '<h3>Progreso de Desbloqueo por Nivel (Meta: 80%):</h3>';

    for (let lvl = 1; lvl <= 5; lvl++) {
      const info = gamification.getLevelProgressInfo(lvl);
      const item = document.createElement('div');
      item.className = 'lvl-progress-item';
      item.innerHTML = `
        <span>Nivel ${lvl} (${info.masteredCount}/${info.totalWords})</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="bar-bg"><div class="bar-fill" style="width: ${info.percentage}%"></div></div>
          <span>${info.percentage}% ${info.isUnlocked ? '🔓' : '🔒'}</span>
        </div>
      `;
      list.appendChild(item);
    }
  }

  loadStandaloneSentenceWorkshop() {
    const randomIdx = Math.floor(Math.random() * WORDS_DATA.length);
    this.standaloneWordObj = WORDS_DATA[randomIdx];

    document.getElementById('builder-spanish-target').textContent = this.standaloneWordObj.exampleEs;
    document.getElementById('sentence-writing-model-en').textContent = this.standaloneWordObj.exampleEn;
    document.getElementById('standalone-sentence-textarea').value = '';
    document.getElementById('standalone-sentence-feedback').textContent = '';
  }

  checkStandaloneSentence() {
    const userText = document.getElementById('standalone-sentence-textarea').value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const targetText = this.standaloneWordObj.exampleEn.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const fb = document.getElementById('standalone-sentence-feedback');

    if (userText === targetText) {
      fb.style.color = '#065F46';
      fb.innerHTML = '🎉 <strong>¡Perfecto! Escribiste la oración en inglés correctamente.</strong>';
      gamification.recordWordMastered('sentence_w_' + Date.now(), 1);
      tts.speakSpanish("¡Gran trabajo! Oración en inglés escrita correctamente.");
      setTimeout(() => this.loadStandaloneSentenceWorkshop(), 2200);
    } else {
      fb.style.color = '#9F1239';
      fb.innerHTML = `❌ Debe ser exactamente: <strong>"${this.standaloneWordObj.exampleEn}"</strong>`;
      tts.speakSpanish("Vuelve a escribir la oración fijándote en las letras.");
    }
  }

  loadContestMode() {
    const randomIdx = Math.floor(Math.random() * WORDS_DATA.length);
    this.contestWordObj = WORDS_DATA[randomIdx];

    document.getElementById('contest-clue').innerHTML = `
      Pista: Esta palabra en español significa <strong>"${this.contestWordObj.spanish}"</strong> y tiene <strong>${this.contestWordObj.word.length} letras</strong>.
    `;
    document.getElementById('contest-user-input').value = '';
    document.getElementById('contest-feedback').textContent = '';
  }

  playContestAudio() {
    if (this.contestWordObj) {
      tts.speakEnglish(this.contestWordObj.word, false);
    }
  }

  checkContestAnswer() {
    const inputVal = document.getElementById('contest-user-input').value.trim().toLowerCase();
    const target = this.contestWordObj.word.toLowerCase();
    const fb = document.getElementById('contest-feedback');

    if (inputVal === target || inputVal === target.split('').join(' ')) {
      fb.style.color = '#065F46';
      fb.textContent = '🏆 ¡CORRECTO! Ganaste la ronda de concurso de Spelling Bee.';
      gamification.recordWordMastered(this.contestWordObj.id, this.contestWordObj.level);
      tts.speakSpanish("¡Felicidades, ganaste esta ronda de Spelling Bee!");
      setTimeout(() => this.loadContestMode(), 2500);
    } else {
      fb.style.color = '#9F1239';
      fb.textContent = `❌ La respuesta correcta era: "${this.contestWordObj.word.toUpperCase()}". Escucha de nuevo.`;
      tts.speakEnglish(this.contestWordObj.word, true);
    }
  }

  renderDictionary() {
    const grid = document.getElementById('dictionary-grid');
    if (!grid) return;

    const query = document.getElementById('dict-search-input').value.toLowerCase();
    const selectedLevel = document.getElementById('dict-level-filter').value;

    grid.innerHTML = '';

    const matches = WORDS_DATA.filter(w => {
      const matchQ = w.word.toLowerCase().includes(query) || w.spanish.toLowerCase().includes(query);
      const matchL = selectedLevel === 'all' || w.level === parseInt(selectedLevel);
      return matchQ && matchL;
    });

    matches.forEach(w => {
      const card = document.createElement('div');
      card.className = 'dict-card';
      card.innerHTML = `
        <div>
          <span class="word-badge-level">Niv ${w.level}</span>
          <h3>${w.word}</h3>
          <p class="es-meaning">${w.spanish}</p>
        </div>
        <div class="dict-card-actions">
          <button class="btn-mini-audio" onclick="tts.speakEnglish('${w.word}', false)"><i class="fa-solid fa-volume-high"></i></button>
          <button class="btn-mini-audio" onclick="tts.speakEnglish('${w.word}', true)"><i class="fa-solid fa-turtle"></i></button>
        </div>
      `;
      grid.appendChild(card);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
