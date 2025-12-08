// Flashcards Module
class FlashcardsModule {
    constructor(appManager) {
        this.appManager = appManager;
        this.state = appManager.getState();
        this.api = appManager.getAPI();
        this.events = appManager.getEventBus();
        this.initialized = false;
        
        this.flashcardWords = [];
        this.currentFlashcardIndex = 0;
    }
    
    async init() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        this.initialized = true;
    }
    
    async activate() {
        await this.init();
        await this.loadFlashcards();
    }
    
    deactivate() {
        // Nothing to clean up
    }
    
    async loadFlashcards() {
        const daySelect = document.getElementById('flashcardDaySelect');
        const selectedDay = daySelect?.value;
        
        try {
            if (selectedDay) {
                const data = await this.api.get(`/words/${selectedDay}`);
                this.flashcardWords = data.words || [];
            } else {
                // Load all words
                const daysData = await this.api.get('/days');
                this.flashcardWords = [];
                
                for (const day of daysData.days || []) {
                    const wordData = await this.api.get(`/words/${day.day}`);
                    if (wordData.words) {
                        this.flashcardWords = this.flashcardWords.concat(wordData.words);
                    }
                }
            }
            
            // Shuffle
            this.flashcardWords = window.utils.shuffleArray(this.flashcardWords);
            this.currentFlashcardIndex = 0;
            
            this.showFlashcard();
        } catch (error) {
            console.error('Error loading flashcards:', error);
            this.showError('Failed to load flashcards');
        }
    }
    
    showFlashcard() {
        const wrapper = document.getElementById('flashcardWrapper');
        if (!wrapper) return;
        
        if (this.flashcardWords.length === 0) {
            wrapper.innerHTML = '<div class="empty-state"><p>No words available</p></div>';
            return;
        }
        
        const card = this.flashcardWords[this.currentFlashcardIndex];
        if (!card) return;
        
        // Ensure flashcard structure exists
        let flashcard = document.getElementById('flashcard');
        if (!flashcard) {
            wrapper.innerHTML = this.getFlashcardHTML();
            flashcard = document.getElementById('flashcard');
        }
        
        if (!flashcard) return;
        
        // Reset flip state
        flashcard.classList.remove('flipped');
        
        // Update content
        const japaneseEl = document.getElementById('flashcardJapanese');
        const furiganaEl = document.getElementById('flashcardFurigana');
        const japaneseBackEl = document.getElementById('flashcardJapaneseBack');
        const furiganaBackEl = document.getElementById('flashcardFuriganaBack');
        const translationEl = document.getElementById('flashcardTranslation');
        const progressEl = document.getElementById('flashcardProgress');
        
        if (japaneseEl) japaneseEl.textContent = card.japanese || '';
        if (furiganaEl) furiganaEl.textContent = card.furigana || '';
        if (japaneseBackEl) japaneseBackEl.textContent = card.japanese || '';
        if (furiganaBackEl) furiganaBackEl.textContent = card.furigana || '';
        if (translationEl) translationEl.textContent = card.translation || '';
        if (progressEl) {
            progressEl.textContent = `${this.currentFlashcardIndex + 1} / ${this.flashcardWords.length}`;
        }
    }
    
    getFlashcardHTML() {
        return `
            <div class="premium-flashcard" id="flashcard">
                <div class="flashcard-front">
                    <div class="flashcard-japanese" id="flashcardJapanese"></div>
                    <div class="flashcard-furigana" id="flashcardFurigana"></div>
                    <button class="premium-btn flip-btn" onclick="window.appManager.getModule('flashcards').flipCard()">
                        <span>👁️</span> Reveal Answer
                    </button>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-japanese" id="flashcardJapaneseBack"></div>
                    <div class="flashcard-furigana" id="flashcardFuriganaBack"></div>
                    <div class="flashcard-translation" id="flashcardTranslation"></div>
                    <div class="flashcard-actions">
                        <button class="action-btn wrong-btn" onclick="window.appManager.getModule('flashcards').rateCard(false)">
                            ❌ Hard
                        </button>
                        <button class="action-btn correct-btn" onclick="window.appManager.getModule('flashcards').rateCard(true)">
                            ✅ Easy
                        </button>
                    </div>
                    <button class="premium-btn flip-btn" onclick="window.appManager.getModule('flashcards').flipCard()">
                        <span>🔄</span> Flip Back
                    </button>
                </div>
            </div>
        `;
    }
    
    flipCard() {
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.classList.toggle('flipped');
        }
    }
    
    nextCard() {
        if (this.currentFlashcardIndex < this.flashcardWords.length - 1) {
            this.currentFlashcardIndex++;
            this.showFlashcard();
        }
    }
    
    previousCard() {
        if (this.currentFlashcardIndex > 0) {
            this.currentFlashcardIndex--;
            this.showFlashcard();
        }
    }
    
    rateCard(isEasy) {
        const card = this.flashcardWords[this.currentFlashcardIndex];
        if (!card) return;
        
        // Update spaced repetition
        const wordId = `flashcard-${this.currentFlashcardIndex}`;
        this.events.emit('word-rated', { wordId, isEasy, word: card });
        
        // Auto advance
        setTimeout(() => {
            if (this.currentFlashcardIndex < this.flashcardWords.length - 1) {
                this.nextCard();
            } else {
                alert('You\'ve completed all flashcards! 🎉');
                this.currentFlashcardIndex = 0;
                this.showFlashcard();
            }
        }, 500);
    }
    
    setupEventListeners() {
        const daySelect = document.getElementById('flashcardDaySelect');
        if (daySelect) {
            daySelect.addEventListener('change', () => {
                this.loadFlashcards();
            });
        }
    }
    
    showError(message) {
        const wrapper = document.getElementById('flashcardWrapper');
        if (wrapper) {
            wrapper.innerHTML = `
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
    window.FlashcardsModule = FlashcardsModule;
}

