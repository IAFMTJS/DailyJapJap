// Flashcard Page Component
import api from '../utils/api.js';
import { showError, escapeHtml, shuffleArray } from '../utils/helpers.js';
import { studyStats, saveStudyStats } from '../services/studyStats.js';

let flashcardWords = [];
let currentFlashcardIndex = 0;

export async function init() {
    // Don't block on studyPage - flashcards can work independently
    console.log('FlashcardPage.init called');
}

export async function load() {
    console.log('FlashcardPage.load called');
    
    // Ensure flashcard mode panel is active
    const flashcardModePanel = document.getElementById('flashcardMode');
    if (flashcardModePanel) {
        flashcardModePanel.classList.add('active');
        console.log('Flashcard mode panel activated');
    } else {
        console.error('flashcardMode panel not found!');
    }
    
    // Show initial state if wrapper is empty
    const wrapper = document.getElementById('flashcardWrapper');
    if (wrapper && !wrapper.querySelector('#flashcard')) {
        wrapper.innerHTML = '<div class="loading-state"><div class="premium-spinner"></div><p>Loading flashcards...</p></div>';
    }
    
    // Ensure days are loaded for the day selector
    if (window.studyPage && window.studyPage.load) {
        try {
            await window.studyPage.load();
        } catch (error) {
            console.warn('Could not load studyPage, continuing anyway:', error);
        }
    }
    
    // Populate day selector if needed
    const daySelect = document.getElementById('flashcardDaySelect');
    if (daySelect) {
        // Try to get from studyPage first
        if (daySelect.options.length <= 1 && window.studyPage && window.studyPage.getAllDaysData) {
            const daysData = window.studyPage.getAllDaysData();
            if (Object.keys(daysData).length > 0) {
                daySelect.innerHTML = '<option value="">All Days</option>';
                Object.keys(daysData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
                    const option = document.createElement('option');
                    option.value = day;
                    option.textContent = `Day ${day} - ${daysData[day].title}`;
                    daySelect.appendChild(option);
                });
            }
        }
        
        // If still empty, load days directly
        if (daySelect.options.length <= 1) {
            try {
                const daysData = await api.get('/days');
                if (daysData.days && daysData.days.length > 0) {
                    daySelect.innerHTML = '<option value="">All Days</option>';
                    daysData.days.forEach(day => {
                        const option = document.createElement('option');
                        option.value = day.day;
                        option.textContent = `Day ${day.day} - ${day.title}`;
                        daySelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.warn('Could not load days for flashcard selector:', error);
            }
        }
        
        // Set up change listener if not already set
        if (!daySelect.dataset.listenerAttached) {
            daySelect.dataset.listenerAttached = 'true';
            daySelect.addEventListener('change', () => {
                if (window.flashcardPage && window.flashcardPage.load) {
                    window.flashcardPage.load();
                }
            });
        }
    }
    
    await loadFlashcards();
}

async function loadFlashcards() {
    try {
        console.log('Loading flashcards...');
        const daySelect = document.getElementById('flashcardDaySelect');
        if (!daySelect) {
            console.error('flashcardDaySelect not found');
            showFlashcardError('Flashcard day selector not found');
            return;
        }
        
        const wrapper = document.getElementById('flashcardWrapper');
        if (!wrapper) {
            console.error('flashcardWrapper not found');
            return;
        }
        
        // Show loading state only if flashcard doesn't exist
        const flashcard = document.getElementById('flashcard');
        if (!flashcard) {
            wrapper.innerHTML = '<div class="loading-state"><div class="premium-spinner"></div><p>Loading flashcards...</p></div>';
        } else {
            // Show loading overlay on existing flashcard
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10;';
            loadingOverlay.innerHTML = '<div class="premium-spinner"></div>';
            wrapper.appendChild(loadingOverlay);
            
            // Remove overlay after a short delay (will be removed when showFlashcard is called)
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.remove();
                }
            }, 1000);
        }
        
        const selectedDay = daySelect.value;
        
        if (selectedDay) {
            console.log('Loading words for day:', selectedDay);
            const data = await api.get(`/words/${selectedDay}`);
            flashcardWords = data.words || [];
            console.log('Loaded', flashcardWords.length, 'words for day', selectedDay);
        } else {
            // Load all words from all days
            console.log('Loading all words from all days...');
            flashcardWords = [];
            
            try {
                const daysData = await api.get('/days');
                
                if (!daysData.days || daysData.days.length === 0) {
                    console.error('No days found');
                    showFlashcardError('No days available. Make sure the server is running.');
                    return;
                }
                
                // Load words from each day
                for (const dayInfo of daysData.days) {
                    const dayNum = dayInfo.day;
                    try {
                        const data = await api.get(`/words/${dayNum}`);
                        if (data.words && data.words.length > 0) {
                            flashcardWords = flashcardWords.concat(data.words);
                        }
                    } catch (error) {
                        console.error(`Error loading words for day ${dayNum}:`, error);
                    }
                }
                console.log('Loaded', flashcardWords.length, 'total words from all days');
            } catch (error) {
                console.error('Error loading days:', error);
                showFlashcardError(`Failed to load days: ${error.message}`);
                return;
            }
        }
        
        if (flashcardWords.length === 0) {
            showFlashcardError('No words available. Please select a day or make sure the server is running.');
            return;
        }
        
        // Shuffle cards
        flashcardWords = shuffleArray([...flashcardWords]);
        currentFlashcardIndex = 0;
        
        console.log('Flashcards loaded:', flashcardWords.length, 'words');
        showFlashcard();
    } catch (error) {
        console.error('Error loading flashcards:', error);
        showFlashcardError(`Failed to load flashcards: ${error.message}`);
    }
}

function showFlashcardError(message) {
    console.error('Flashcard error:', message);
    const wrapper = document.getElementById('flashcardWrapper');
    if (wrapper) {
        wrapper.innerHTML = `<div class="empty-state"><h2>⚠️ Error</h2><p>${escapeHtml(message)}</p></div>`;
    }
}

export function showFlashcard() {
    const wrapper = document.getElementById('flashcardWrapper');
    if (!wrapper) {
        console.error('flashcardWrapper not found');
        return;
    }
    
    // Check if flashcard mode panel is active
    const flashcardModePanel = document.getElementById('flashcardMode');
    if (flashcardModePanel && !flashcardModePanel.classList.contains('active')) {
        console.warn('Flashcard mode panel is not active!');
        // Try to activate it
        flashcardModePanel.classList.add('active');
    }
    
    // Remove any loading overlays
    const loadingOverlays = wrapper.querySelectorAll('.loading-overlay');
    loadingOverlays.forEach(overlay => overlay.remove());
    
    // Remove any loading states that might be blocking
    const loadingStates = wrapper.querySelectorAll('.loading-state');
    loadingStates.forEach(state => {
        // Only remove if it's not the only content
        if (wrapper.querySelector('#flashcard')) {
            state.remove();
        }
    });
    
    if (flashcardWords.length === 0) {
        wrapper.innerHTML = '<div class="empty-state"><h2>No words available</h2><p>Please select a day or wait for words to load.</p></div>';
        return;
    }
    
    const card = flashcardWords[currentFlashcardIndex];
    if (!card) {
        console.error('No card at index', currentFlashcardIndex);
        wrapper.innerHTML = '<div class="empty-state"><h2>Error</h2><p>Card not found at index ' + currentFlashcardIndex + '</p></div>';
        return;
    }
    
    // Make sure the flashcard HTML structure exists
    let flashcard = document.getElementById('flashcard');
    if (!flashcard) {
        console.log('Flashcard element not found, creating it...');
        wrapper.innerHTML = `
            <div class="premium-flashcard" id="flashcard">
                <div class="flashcard-front">
                    <div class="flashcard-japanese" id="flashcardJapanese"></div>
                    <div class="flashcard-furigana" id="flashcardFurigana"></div>
                    <div class="flashcard-audio">
                        <button class="premium-btn audio-btn" id="flashcardAudioBtn" onclick="window.flashcardPage?.playAudio()">
                            🔊 Play Audio
                        </button>
                    </div>
                    <button class="premium-btn flip-btn" onclick="window.flashcardPage?.flipCard()">
                        <span>👁️</span> Reveal Answer
                    </button>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-japanese" id="flashcardJapaneseBack"></div>
                    <div class="flashcard-furigana" id="flashcardFuriganaBack"></div>
                    <div class="flashcard-translation" id="flashcardTranslation"></div>
                    <div class="flashcard-audio">
                        <button class="premium-btn audio-btn" id="flashcardAudioBtnBack" onclick="window.flashcardPage?.playAudio()">
                            🔊 Play Audio
                        </button>
                    </div>
                    <div class="flashcard-actions">
                        <button class="action-btn wrong-btn" onclick="window.flashcardPage?.rateCard(false)">
                            ❌ Hard
                        </button>
                        <button class="action-btn correct-btn" onclick="window.flashcardPage?.rateCard(true)">
                            ✅ Easy
                        </button>
                    </div>
                    <button class="premium-btn flip-btn" onclick="window.flashcardPage?.flipCard()">
                        <span>🔄</span> Flip Back
                    </button>
                </div>
            </div>
        `;
        flashcard = document.getElementById('flashcard');
        console.log('Flashcard element created:', flashcard);
    } else {
        console.log('Flashcard element found:', flashcard);
    }
    
    if (!flashcard) {
        console.error('Failed to create flashcard element');
        return;
    }
    
    // Ensure flashcard is visible
    flashcard.style.display = 'block';
    flashcard.style.visibility = 'visible';
    flashcard.style.opacity = '1';
    
    // Reset flip state
    flashcard.classList.remove('flipped');
    
    // Update front
    const japaneseEl = document.getElementById('flashcardJapanese');
    const furiganaEl = document.getElementById('flashcardFurigana');
    if (japaneseEl) {
        japaneseEl.textContent = card.japanese || '';
        console.log('Updated flashcardJapanese:', card.japanese);
    } else {
        console.error('flashcardJapanese element not found!');
    }
    if (furiganaEl) {
        furiganaEl.textContent = card.furigana || '';
        console.log('Updated flashcardFurigana:', card.furigana);
    } else {
        console.error('flashcardFurigana element not found!');
    }
    
    // Update back
    const japaneseBackEl = document.getElementById('flashcardJapaneseBack');
    const furiganaBackEl = document.getElementById('flashcardFuriganaBack');
    const translationEl = document.getElementById('flashcardTranslation');
    if (japaneseBackEl) {
        japaneseBackEl.textContent = card.japanese || '';
    } else {
        console.error('flashcardJapaneseBack element not found!');
    }
    if (furiganaBackEl) {
        furiganaBackEl.textContent = card.furigana || '';
    } else {
        console.error('flashcardFuriganaBack element not found!');
    }
    if (translationEl) {
        translationEl.textContent = card.translation || '';
        console.log('Updated flashcardTranslation:', card.translation);
    } else {
        console.error('flashcardTranslation element not found!');
    }
    
    // Update progress
    const progressEl = document.getElementById('flashcardProgress');
    if (progressEl) {
        progressEl.textContent = `${currentFlashcardIndex + 1} / ${flashcardWords.length}`;
    } else {
        console.warn('flashcardProgress element not found');
    }
    
    // Ensure flashcard is visible
    if (flashcard.style.display === 'none') {
        flashcard.style.display = 'block';
    }
    if (wrapper.style.display === 'none') {
        wrapper.style.display = 'block';
    }
    
    console.log('Flashcard displayed:', card.japanese, card.furigana, 'Index:', currentFlashcardIndex);
    console.log('Flashcard element:', flashcard);
    console.log('Flashcard visible:', flashcard.offsetWidth > 0 && flashcard.offsetHeight > 0);
}

export function flipCard() {
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.classList.toggle('flipped');
    } else {
        console.error('Flashcard element not found');
    }
}

export function nextCard() {
    if (flashcardWords.length === 0) {
        console.warn('No flashcard words loaded');
        return;
    }
    if (currentFlashcardIndex < flashcardWords.length - 1) {
        currentFlashcardIndex++;
        showFlashcard();
    } else {
        console.log('Already at last card');
    }
}

export function previousCard() {
    if (flashcardWords.length === 0) {
        console.warn('No flashcard words loaded');
        return;
    }
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        showFlashcard();
    } else {
        console.log('Already at first card');
    }
}

export function rateCard(isEasy) {
    if (flashcardWords.length === 0 || !flashcardWords[currentFlashcardIndex]) {
        console.error('No card to rate');
        return;
    }
    
    const card = flashcardWords[currentFlashcardIndex];
    const wordId = `flashcard-${currentFlashcardIndex}`;
    
    if (isEasy) {
        studyStats.wordsMastered.add(wordId);
    }
    studyStats.wordsStudied.add(wordId);
    saveStudyStats();
    
    // Auto advance after a moment
    setTimeout(() => {
        if (currentFlashcardIndex < flashcardWords.length - 1) {
            nextCard();
        } else {
            alert('You\'ve completed all flashcards! 🎉');
            currentFlashcardIndex = 0;
            showFlashcard();
        }
    }, 500);
}

export function playAudio() {
    if (flashcardWords.length === 0 || !flashcardWords[currentFlashcardIndex]) {
        console.error('No card to play audio for');
        return;
    }
    
    const card = flashcardWords[currentFlashcardIndex];
    if (card && card.japanese) {
        if (window.speakJapanese) {
            window.speakJapanese(card.japanese);
        } else {
            console.error('speakJapanese function not available');
            alert('Audio is not available. Please refresh the page.');
        }
    }
}

// Export for global access
window.flashcardPage = { init, load, showFlashcard, flipCard, nextCard, previousCard, rateCard, playAudio };

