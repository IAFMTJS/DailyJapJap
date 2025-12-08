// Study Module - Browse and study words
class StudyModule {
    constructor(appManager) {
        this.appManager = appManager;
        this.state = appManager.getState();
        this.api = appManager.getAPI();
        this.events = appManager.getEventBus();
        this.initialized = false;
        
        this.allDaysData = {};
        this.currentDay = null;
        this.currentDayWords = [];
    }
    
    async init() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        await this.loadDays();
        this.initialized = true;
    }
    
    async activate() {
        await this.init();
        // Auto-load first day if no day selected
        if (!this.currentDay && Object.keys(this.allDaysData).length > 0) {
            const firstDay = Object.keys(this.allDaysData).sort((a, b) => parseInt(a) - parseInt(b))[0];
            await this.loadWords(parseInt(firstDay));
        }
        this.render();
    }
    
    deactivate() {
        // Nothing to clean up
    }
    
    async loadDays() {
        try {
            const data = await this.api.get('/days');
            if (data.days && data.days.length > 0) {
                this.allDaysData = {};
                data.days.forEach(day => {
                    this.allDaysData[day.day] = {
                        title: day.title,
                        wordCount: day.wordCount
                    };
                });
                
                // Populate day selector
                const daySelect = document.getElementById('daySelect');
                if (daySelect) {
                    daySelect.innerHTML = '<option value="">Select a day...</option>';
                    data.days.forEach(day => {
                        const option = document.createElement('option');
                        option.value = day.day;
                        option.textContent = `Day ${day.day} - ${day.title}`;
                        daySelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading days:', error);
        }
    }
    
    async loadWords(day) {
        try {
            const data = await this.api.get(`/words/${day}`);
            if (data.words) {
                this.currentDay = day;
                this.currentDayWords = data.words;
                this.render();
                
                // Mark words as studied
                data.words.forEach((word, index) => {
                    const wordId = `${day}-${index}`;
                    this.events.emit('word-studied', { wordId, word });
                });
            }
        } catch (error) {
            console.error('Error loading words:', error);
            this.showError('Failed to load words');
        }
    }
    
    render() {
        const wordGrid = document.getElementById('wordGrid');
        if (!wordGrid) return;
        
        if (this.currentDayWords.length === 0) {
            wordGrid.innerHTML = '<div class="empty-state"><p>Select a day to view words</p></div>';
            return;
        }
        
        const showFurigana = document.getElementById('showFurigana')?.checked ?? true;
        const showTranslation = document.getElementById('showTranslation')?.checked ?? true;
        
        wordGrid.innerHTML = this.currentDayWords.map((word, index) => {
            const wordId = `${this.currentDay}-${index}`;
            const dayProgress = this.state.get('dayProgress') || {};
            const isMastered = dayProgress[this.currentDay]?.masteredWords?.includes(wordId) || false;
            
            return `
                <div class="word-card ${isMastered ? 'mastered' : ''}" data-word-id="${wordId}">
                    <div class="word-japanese">${window.utils.escapeHtml(word.japanese)}</div>
                    ${showFurigana && word.furigana ? `<div class="word-furigana">${window.utils.escapeHtml(word.furigana)}</div>` : ''}
                    ${showTranslation ? `<div class="word-translation">${window.utils.escapeHtml(word.translation)}</div>` : ''}
                    <div class="audio-controls">
                        <button class="btn btn-primary" onclick="speakJapanese('${window.utils.escapeHtml(word.japanese)}')">
                            🔊 Speak
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    setupEventListeners() {
        // Day selector
        const daySelect = document.getElementById('daySelect');
        if (daySelect) {
            daySelect.addEventListener('change', async (e) => {
                if (e.target.value) {
                    await this.loadWords(parseInt(e.target.value));
                }
            });
        }
        
        // Settings toggles
        const showFurigana = document.getElementById('showFurigana');
        const showTranslation = document.getElementById('showTranslation');
        
        if (showFurigana) {
            showFurigana.addEventListener('change', () => {
                if (this.currentDayWords.length > 0) {
                    this.render();
                }
            });
        }
        
        if (showTranslation) {
            showTranslation.addEventListener('change', () => {
                if (this.currentDayWords.length > 0) {
                    this.render();
                }
            });
        }
    }
    
    showError(message) {
        const wordGrid = document.getElementById('wordGrid');
        if (wordGrid) {
            wordGrid.innerHTML = `
                <div class="empty-state">
                    <h2>⚠️ Error</h2>
                    <p>${window.utils.escapeHtml(message)}</p>
                </div>
            `;
        }
    }
}

// Export for registration
if (typeof window !== 'undefined') {
    window.StudyModule = StudyModule;
}

