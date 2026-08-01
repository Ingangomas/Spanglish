// Módulo de Gamificación, Puntos, Desbloqueo de Niveles por % de Acierto y Racha

class GamificationEngine {
  constructor() {
    this.storageKey = 'spanglish_progress_v2';
    this.state = this.loadState();
  }

  loadState() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      stars: 10,
      streakDays: 1,
      lastActiveDate: new Date().toDateString(),
      masteredWords: [], // IDs de palabras dominadas
      unlockedLevels: [1], // El nivel 1 siempre está desbloqueado
      badges: ['spanglish_starter']
    };
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    if (window.app && window.app.updateLevelButtons) {
      window.app.updateLevelButtons();
    }
    this.updateUI();
  }

  recordWordMastered(wordId, level) {
    let isNew = false;
    if (!this.state.masteredWords.includes(wordId)) {
      this.state.masteredWords.push(wordId);
      this.state.stars += 5;
      isNew = true;
    } else {
      this.state.stars += 1;
    }

    this.checkLevelUnlocks();
    this.saveState();

    if (isNew) {
      this.triggerConfetti();
    }
    return isNew;
  }

  // Verifica si el nivel N-1 se completó al 80% para desbloquear el nivel N
  checkLevelUnlocks() {
    if (typeof WORDS_DATA === 'undefined') return;

    for (let lvl = 1; lvl <= 4; lvl++) {
      const info = this.getLevelProgressInfo(lvl);
      const nextLvl = lvl + 1;

      if (info.percentage >= 80) {
        if (!this.state.unlockedLevels.includes(nextLvl)) {
          this.state.unlockedLevels.push(nextLvl);
          if (window.app) {
            window.app.setMascot(`🎉 ¡FELICIDADES! ¡Has alcanzado el ${info.percentage}% en el Nivel ${lvl} y DESBLOQUEASTE el Nivel ${nextLvl}! 🔓`);
          }
        }
      }
    }
  }

  isLevelUnlocked(level) {
    if (level === 1) return true;
    return this.state.unlockedLevels.includes(level);
  }

  getLevelProgressInfo(level) {
    if (typeof WORDS_DATA === 'undefined') return { masteredCount: 0, totalWords: 0, percentage: 0, isUnlocked: level === 1 };
    
    const wordsInLevel = WORDS_DATA.filter(w => w.level === level);
    const totalWords = wordsInLevel.length;
    if (totalWords === 0) return { masteredCount: 0, totalWords: 0, percentage: 0, isUnlocked: level === 1 };

    const masteredInLevel = wordsInLevel.filter(w => this.state.masteredWords.includes(w.id)).length;
    const percentage = Math.round((masteredInLevel / totalWords) * 100);

    return {
      masteredCount: masteredInLevel,
      totalWords: totalWords,
      percentage: percentage,
      isUnlocked: this.isLevelUnlocked(level)
    };
  }

  triggerConfetti() {
    if (window.confetti) {
      window.confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  updateUI() {
    const starsEl = document.getElementById('user-stars');
    const streakEl = document.getElementById('user-streak');
    const masteredEl = document.getElementById('user-mastered-count');

    if (starsEl) starsEl.textContent = this.state.stars;
    if (streakEl) streakEl.textContent = this.state.streakDays;
    if (masteredEl) masteredEl.textContent = this.state.masteredWords.length;
  }

  resetProgress() {
    localStorage.removeItem(this.storageKey);
    this.state = this.loadState();
    this.saveState();
  }
}

const gamification = new GamificationEngine();
