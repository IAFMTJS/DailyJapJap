// API base URL
const API_BASE = 'http://localhost:3000/api';

// Global state
let allDaysData = {};
let currentDay = null;
let currentDayWords = [];
let currentMode = 'study';

// Flashcard state
let flashcardWords = [];
let currentFlashcardIndex = 0;
let flashcardStats = {};

// Quiz state
let quizWords = [];
let currentQuizIndex = 0;
let quizScore = 0;
let quizAnswers = [];
let isQuizActive = false;

// Study stats
let studyStats = {
    wordsStudied: new Set(),
    wordsMastered: new Set(),
    studyStreak: parseInt(localStorage.getItem('studyStreak') || '0'),
    lastStudyDate: localStorage.getItem('lastStudyDate') || null
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    try {
        await initializeApp();
        setupEventListeners();
        updateStudyStreak();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to initialize application. Check console for details.');
    }
});

async function initializeApp() {
    try {
        console.log('Starting initialization...');
        
        // Test API connection first
        try {
            const testResponse = await fetch(`${API_BASE}/days`);
            if (!testResponse.ok) {
                throw new Error(`Server returned ${testResponse.status}`);
            }
            console.log('API connection successful');
            const statusEl = document.getElementById('connectionStatus');
            if (statusEl) statusEl.style.display = 'none';
        } catch (err) {
            console.error('API connection failed:', err);
            const statusEl = document.getElementById('connectionStatus');
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.textContent = `⚠️ Cannot connect to ${API_BASE}`;
            }
            showError(`Cannot connect to server at ${API_BASE}. Is the Flask server running?`);
            return;
        }
        
        await loadDays(); // This will auto-load the first day
        await loadStats();
        console.log('Initialization complete');
    } catch (error) {
        console.error('Initialization error:', error);
        showError(`Failed to initialize: ${error.message}`);
    }
}

async function loadDays() {
    try {
        console.log('Loading days from:', `${API_BASE}/days`);
        const response = await fetch(`${API_BASE}/days`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Days data received:', data);
        
        if (data.error) {
            showError(data.error);
            return;
        }
        
        if (!data.days || data.days.length === 0) {
            showError('No days found in the data.');
            return;
        }
        
        const daySelect = document.getElementById('daySelect');
        const flashcardDaySelect = document.getElementById('flashcardDaySelect');
        const quizDaySelect = document.getElementById('quizDaySelect');
        
        if (!daySelect || !flashcardDaySelect || !quizDaySelect) {
            console.error('Select elements not found!');
            return;
        }
        
        // Clear and populate selects
        [daySelect, flashcardDaySelect, quizDaySelect].forEach(select => {
            if (!select) {
                console.warn('Select element not found');
                return;
            }
            
            select.innerHTML = '<option value="">Select a day...</option>';
            data.days.forEach(day => {
                const option = document.createElement('option');
                option.value = day.day;
                option.textContent = `Day ${day.day} - ${day.title}`;
                select.appendChild(option);
            });
            
            // Add "All Days" option for flashcard and quiz (at the beginning)
            if (select !== daySelect) {
                const allOption = document.createElement('option');
                allOption.value = '';
                allOption.textContent = 'All Days';
                allOption.selected = true;
                select.insertBefore(allOption, select.firstChild);
            }
        });
        
        // Store days data
        allDaysData = {};
        for (const day of data.days) {
            allDaysData[day.day] = {
                title: day.title,
                wordCount: day.wordCount
            };
        }
        
        // Auto-select first day
        if (data.days.length > 0 && daySelect) {
            daySelect.value = data.days[0].day;
            console.log('Auto-loading day:', data.days[0].day);
            await loadWords(parseInt(data.days[0].day));
        }
        
    } catch (error) {
        console.error('Error loading days:', error);
        showError(`Failed to load days: ${error.message}. Make sure the server is running at ${API_BASE}.`);
    }
}

async function loadWords(day) {
    try {
        console.log('Loading words for day:', day);
        const wordGrid = document.getElementById('wordGrid');
        if (!wordGrid) {
            console.error('wordGrid element not found!');
            return;
        }
        
        wordGrid.innerHTML = '<div class="loading-state"><div class="premium-spinner"></div><p>Loading your Japanese words...</p></div>';
        
        const response = await fetch(`${API_BASE}/words/${day}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Words data received:', data);
        
        if (data.error) {
            showError(data.error);
            return;
        }
        
        if (!data.words || data.words.length === 0) {
            wordGrid.innerHTML = '<div class="empty-state"><h2>No words found</h2><p>No words available for this day.</p></div>';
            return;
        }
        
        currentDay = day;
        currentDayWords = data.words;
        
        // Update day title
        const dayTitleEl = document.getElementById('dayTitle');
        if (dayTitleEl) {
            dayTitleEl.textContent = data.title || '';
        }
        
        console.log('Rendering', data.words.length, 'words');
        renderWords(data.words);
        updateProgress();
        
    } catch (error) {
        console.error('Error loading words:', error);
        showError(`Failed to load words: ${error.message}`);
    }
}

function renderWords(words) {
    const wordGrid = document.getElementById('wordGrid');
    const showFurigana = document.getElementById('showFurigana').checked;
    const showTranslation = document.getElementById('showTranslation').checked;
    
    if (!words || words.length === 0) {
        wordGrid.innerHTML = '<div class="empty-state"><h2>No words found</h2><p>No words available for this day.</p></div>';
        return;
    }
    
    wordGrid.innerHTML = words.map((word, index) => {
        const wordId = `${currentDay}-${index}`;
        const isStudied = studyStats.wordsStudied.has(wordId);
        const isMastered = studyStats.wordsMastered.has(wordId);
        
        return `
            <div class="word-card ${isMastered ? 'mastered' : ''}" data-word-id="${wordId}">
                <div class="word-japanese">${escapeHtml(word.japanese)}</div>
                ${showFurigana && word.furigana ? `<div class="word-furigana">${escapeHtml(word.furigana)}</div>` : ''}
                ${showTranslation ? `<div class="word-translation">${escapeHtml(word.translation)}</div>` : ''}
                <div class="audio-controls">
                    <button class="btn btn-primary" onclick="speakJapanese('${escapeHtml(word.japanese)}')">
                        🔊 Speak
                    </button>
                    ${word.sentence ? `
                        <button class="btn btn-secondary" onclick="speakJapanese('${escapeHtml(word.sentence)}')">
                            🔊 Sentence
                        </button>
                    ` : ''}
                </div>
                ${isStudied ? '<div class="word-badge">✓ Studied</div>' : ''}
            </div>
        `;
    }).join('');
    
    // Mark words as studied when viewed
    words.forEach((word, index) => {
        const wordId = `${currentDay}-${index}`;
        studyStats.wordsStudied.add(wordId);
    });
    saveStudyStats();
}

function speakJapanese(text) {
    if (!('speechSynthesis' in window)) {
        alert('Text-to-speech is not supported in your browser.');
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // iOS Chrome requires voices to be loaded first
    const speak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Get available voices
        const voices = window.speechSynthesis.getVoices();
        
        // Find Japanese voice - try multiple strategies for iOS compatibility
        let japaneseVoice = voices.find(voice => 
            voice.lang === 'ja-JP' || 
            voice.lang === 'ja' ||
            voice.lang.startsWith('ja-')
        );
        
        // Fallback: search by name
        if (!japaneseVoice) {
            japaneseVoice = voices.find(voice => 
                voice.name.toLowerCase().includes('japanese') ||
                voice.name.toLowerCase().includes('japan')
            );
        }
        
        // iOS Chrome: prefer native voice if available
        if (!japaneseVoice && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
            // iOS may have different voice names
            japaneseVoice = voices.find(voice => 
                voice.lang.includes('ja') || 
                voice.localService === true
            );
        }
        
        if (japaneseVoice) {
            utterance.voice = japaneseVoice;
            console.log('Using voice:', japaneseVoice.name, japaneseVoice.lang);
        } else {
            console.warn('No Japanese voice found, using default. Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        }
        
        // Error handling
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            if (event.error === 'not-allowed') {
                alert('Please allow audio permissions for text-to-speech to work.');
            } else {
                alert('Text-to-speech failed. Please try again.');
            }
        };
        
        utterance.onstart = () => {
            console.log('Speech started');
        };
        
        utterance.onend = () => {
            console.log('Speech ended');
        };
        
        window.speechSynthesis.speak(utterance);
    };
    
    // iOS Chrome: voices may not be loaded immediately
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        // Wait for voices to load
        window.speechSynthesis.onvoiceschanged = () => {
            speak();
        };
        // Fallback timeout
        setTimeout(speak, 500);
    } else {
        speak();
    }
}

// Preload voices for better iOS compatibility
if ('speechSynthesis' in window) {
    // Force voice loading on iOS
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Voices loaded:', voices.length);
        if (voices.length > 0) {
            const japaneseVoices = voices.filter(v => 
                v.lang.startsWith('ja') || 
                v.name.toLowerCase().includes('japanese')
            );
            console.log('Japanese voices found:', japaneseVoices.length);
            japaneseVoices.forEach(v => {
                console.log(`  - ${v.name} (${v.lang})`);
            });
        }
    };
    
    // Load voices immediately if available
    loadVoices();
    
    // Also listen for voice changes (important for iOS)
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // iOS Chrome workaround: trigger voice loading with a dummy utterance
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        const dummyUtterance = new SpeechSynthesisUtterance('');
        dummyUtterance.volume = 0;
        window.speechSynthesis.speak(dummyUtterance);
        window.speechSynthesis.cancel();
    }
}

// Mode switching
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchMode(mode);
        });
    });
    
    // Day selector
    document.getElementById('daySelect').addEventListener('change', async (e) => {
        if (e.target.value) {
            await loadWords(parseInt(e.target.value));
        }
    });
    
    // Settings toggles
    document.getElementById('showFurigana').addEventListener('change', () => {
        if (currentDayWords.length > 0) {
            renderWords(currentDayWords);
        }
    });
    
    document.getElementById('showTranslation').addEventListener('change', () => {
        if (currentDayWords.length > 0) {
            renderWords(currentDayWords);
        }
    });
    
    // Flashcard day selector
    document.getElementById('flashcardDaySelect').addEventListener('change', () => {
        loadFlashcards();
    });
    
    // Quiz day selector
    document.getElementById('quizDaySelect').addEventListener('change', () => {
        // Reset quiz when day changes
        resetQuiz();
    });
}

function switchMode(mode) {
    currentMode = mode;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Update panels
    document.querySelectorAll('.mode-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${mode}Mode`);
    });
    
    // Initialize mode-specific features
    if (mode === 'flashcards') {
        // Ensure flashcard dropdown is populated before loading
        const flashcardDaySelect = document.getElementById('flashcardDaySelect');
        if (flashcardDaySelect && flashcardDaySelect.options.length <= 1) {
            // Days not loaded yet, wait a bit and try again
            setTimeout(() => {
                if (flashcardDaySelect.options.length > 1) {
                    loadFlashcards();
                } else {
                    console.warn('Flashcard day select not populated, loading days first...');
                    loadDays().then(() => loadFlashcards());
                }
            }, 100);
        } else {
            loadFlashcards();
        }
    } else if (mode === 'quiz') {
        resetQuiz();
    } else if (mode === 'stats') {
        updateStatistics();
    }
}

// Flashcard functions
async function loadFlashcards() {
    try {
        console.log('Loading flashcards...');
        const daySelect = document.getElementById('flashcardDaySelect');
        if (!daySelect) {
            console.error('flashcardDaySelect not found');
            showFlashcardError('Flashcard day selector not found');
            return;
        }
        
        // Show loading state (but keep the flashcard structure)
        const wrapper = document.getElementById('flashcardWrapper');
        const flashcard = document.getElementById('flashcard');
        if (wrapper && !flashcard) {
            // Only show loading if flashcard doesn't exist
            wrapper.innerHTML = '<div class="loading-state"><div class="premium-spinner"></div><p>Loading flashcards...</p></div>';
        }
        
        const selectedDay = daySelect.value;
        
        if (selectedDay) {
            // Load words for specific day
            console.log('Loading words for day:', selectedDay);
            const response = await fetch(`${API_BASE}/words/${selectedDay}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            flashcardWords = data.words || [];
            console.log('Loaded', flashcardWords.length, 'words for day', selectedDay);
        } else {
            // Load all words from all days
            console.log('Loading all words from all days...');
            flashcardWords = [];
            
            // First get the list of days
            const daysResponse = await fetch(`${API_BASE}/days`);
            if (!daysResponse.ok) {
                throw new Error(`HTTP error! status: ${daysResponse.status}`);
            }
            const daysData = await daysResponse.json();
            
            if (!daysData.days || daysData.days.length === 0) {
                console.error('No days found');
                showFlashcardError('No days available');
                return;
            }
            
            // Load words from each day
            for (const dayInfo of daysData.days) {
                const dayNum = dayInfo.day;
                const response = await fetch(`${API_BASE}/words/${dayNum}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.words && data.words.length > 0) {
                        flashcardWords = flashcardWords.concat(data.words);
                    }
                }
            }
            console.log('Loaded', flashcardWords.length, 'total words from all days');
        }
        
        if (flashcardWords.length === 0) {
            showFlashcardError('No words available. Please select a day or make sure the server is running.');
            return;
        }
        
        // Shuffle cards
        flashcardWords = shuffleArray([...flashcardWords]);
        currentFlashcardIndex = 0;
        
        console.log('Flashcards loaded:', flashcardWords.length, 'words');
        console.log('First card:', flashcardWords[0]);
        
        // Ensure flashcard mode is visible
        const flashcardPanel = document.getElementById('flashcardMode');
        if (flashcardPanel) {
            flashcardPanel.classList.add('active');
        }
        
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
        wrapper.innerHTML = `<div class="empty-state"><h2>⚠️ Error</h2><p>${escapeHtml(message)}</p><p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-muted);">Check the browser console (F12) for more details.</p></div>`;
    }
}

function showFlashcard() {
    const wrapper = document.getElementById('flashcardWrapper');
    if (!wrapper) {
        console.error('flashcardWrapper not found');
        return;
    }
    
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
        // Recreate the flashcard structure if it was removed
        wrapper.innerHTML = `
            <div class="premium-flashcard" id="flashcard">
                <div class="flashcard-front">
                    <div class="flashcard-japanese" id="flashcardJapanese"></div>
                    <div class="flashcard-furigana" id="flashcardFurigana"></div>
                    <button class="premium-btn flip-btn" onclick="flipCard()">
                        <span>👁️</span> Reveal Answer
                    </button>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-japanese" id="flashcardJapaneseBack"></div>
                    <div class="flashcard-furigana" id="flashcardFuriganaBack"></div>
                    <div class="flashcard-translation" id="flashcardTranslation"></div>
                    <div class="flashcard-actions">
                        <button class="action-btn wrong-btn" onclick="rateCard(false)">
                            ❌ Hard
                        </button>
                        <button class="action-btn correct-btn" onclick="rateCard(true)">
                            ✅ Easy
                        </button>
                    </div>
                    <button class="premium-btn flip-btn" onclick="flipCard()">
                        <span>🔄</span> Flip Back
                    </button>
                </div>
            </div>
        `;
        flashcard = document.getElementById('flashcard');
    }
    
    if (!flashcard) {
        console.error('Failed to create flashcard element');
        return;
    }
    
    // Reset flip state
    flashcard.classList.remove('flipped');
    
    // Update front
    const japaneseEl = document.getElementById('flashcardJapanese');
    const furiganaEl = document.getElementById('flashcardFurigana');
    if (japaneseEl) japaneseEl.textContent = card.japanese || '';
    if (furiganaEl) furiganaEl.textContent = card.furigana || '';
    
    // Update back
    const japaneseBackEl = document.getElementById('flashcardJapaneseBack');
    const furiganaBackEl = document.getElementById('flashcardFuriganaBack');
    const translationEl = document.getElementById('flashcardTranslation');
    if (japaneseBackEl) japaneseBackEl.textContent = card.japanese || '';
    if (furiganaBackEl) furiganaBackEl.textContent = card.furigana || '';
    if (translationEl) translationEl.textContent = card.translation || '';
    
    // Update progress
    const progressEl = document.getElementById('flashcardProgress');
    if (progressEl) {
        progressEl.textContent = `${currentFlashcardIndex + 1} / ${flashcardWords.length}`;
    }
    
    console.log('Flashcard displayed:', card.japanese, card.furigana);
}

function flipCard() {
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.classList.toggle('flipped');
    } else {
        console.error('Flashcard element not found');
    }
}

function nextCard() {
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

function previousCard() {
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

function rateCard(isEasy) {
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
            // Optionally restart from beginning
            currentFlashcardIndex = 0;
            showFlashcard();
        }
    }, 500);
}

// Quiz functions
async function startQuiz() {
    const daySelect = document.getElementById('quizDaySelect');
    const selectedDay = daySelect.value;
    
    if (selectedDay) {
        const response = await fetch(`${API_BASE}/words/${selectedDay}`);
        const data = await response.json();
        quizWords = data.words || [];
    } else {
        // Load all words
        quizWords = [];
        for (const dayNum of Object.keys(allDaysData).sort((a, b) => parseInt(a) - parseInt(b))) {
            const response = await fetch(`${API_BASE}/words/${dayNum}`);
            const data = await response.json();
            if (data.words) {
                quizWords = quizWords.concat(data.words);
            }
        }
    }
    
    if (quizWords.length === 0) {
        alert('No words available for quiz.');
        return;
    }
    
    // Shuffle and limit to 10 questions
    quizWords = shuffleArray([...quizWords]).slice(0, 10);
    currentQuizIndex = 0;
    quizScore = 0;
    quizAnswers = [];
    isQuizActive = true;
    
    document.getElementById('startQuizBtn').style.display = 'none';
    document.getElementById('nextQuizBtn').style.display = 'none';
    
    showQuestion();
}

function showQuestion() {
    if (currentQuizIndex >= quizWords.length) {
        showQuizResults();
        return;
    }
    
    const question = quizWords[currentQuizIndex];
    document.getElementById('quizJapanese').textContent = question.japanese;
    document.getElementById('quizFurigana').textContent = question.furigana || '';
    document.getElementById('quizQuestionNum').textContent = currentQuizIndex + 1;
    document.getElementById('quizTotal').textContent = quizWords.length;
    document.getElementById('quizScore').textContent = quizScore;
    
    // Generate options (correct answer + 3 random wrong answers)
    const options = [question];
    const otherWords = quizWords.filter((w, i) => i !== currentQuizIndex);
    const wrongOptions = shuffleArray([...otherWords]).slice(0, 3);
    const allOptions = shuffleArray([...options, ...wrongOptions]);
    
    const optionsContainer = document.getElementById('quizOptions');
    optionsContainer.innerHTML = allOptions.map((word, index) => `
        <div class="quiz-option" onclick="selectAnswer(${index}, '${escapeHtml(word.translation)}')">
            ${escapeHtml(word.translation)}
        </div>
    `).join('');
    
    document.getElementById('quizFeedback').textContent = '';
    document.getElementById('quizFeedback').className = 'quiz-feedback';
}

function selectAnswer(optionIndex, selectedTranslation) {
    if (!isQuizActive) return;
    
    const correctAnswer = quizWords[currentQuizIndex].translation;
    const isCorrect = selectedTranslation === correctAnswer;
    
    if (isCorrect) {
        quizScore++;
    }
    
    quizAnswers.push({
        question: quizWords[currentQuizIndex],
        selected: selectedTranslation,
        correct: isCorrect
    });
    
    // Show feedback
    const options = document.querySelectorAll('.quiz-option');
    options.forEach((opt, idx) => {
        opt.classList.add('disabled');
        const optText = opt.textContent.trim();
        if (optText === correctAnswer) {
            opt.classList.add('correct');
        } else if (optText === selectedTranslation && !isCorrect) {
            opt.classList.add('wrong');
        }
    });
    
    const feedback = document.getElementById('quizFeedback');
    feedback.textContent = isCorrect ? '✅ Correct!' : `❌ Wrong! Correct answer: ${correctAnswer}`;
    feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`;
    
    document.getElementById('quizScore').textContent = quizScore;
    document.getElementById('nextQuizBtn').style.display = 'block';
    isQuizActive = false;
}

function nextQuestion() {
    currentQuizIndex++;
    isQuizActive = true;
    document.getElementById('nextQuizBtn').style.display = 'none';
    showQuestion();
}

function showQuizResults() {
    const percentage = Math.round((quizScore / quizWords.length) * 100);
    const optionsContainer = document.getElementById('quizOptions');
    optionsContainer.innerHTML = `
        <div class="quiz-results">
            <h2>Quiz Complete! 🎉</h2>
            <div class="result-score">${quizScore} / ${quizWords.length}</div>
            <div class="result-percentage">${percentage}%</div>
            <button class="btn btn-primary" onclick="resetQuiz()">Try Again</button>
        </div>
    `;
    
    document.getElementById('quizQuestion').style.display = 'none';
    document.getElementById('quizFeedback').textContent = '';
}

function resetQuiz() {
    isQuizActive = false;
    currentQuizIndex = 0;
    quizScore = 0;
    quizAnswers = [];
    document.getElementById('startQuizBtn').style.display = 'block';
    document.getElementById('nextQuizBtn').style.display = 'none';
    document.getElementById('quizQuestion').style.display = 'block';
    document.getElementById('quizOptions').innerHTML = '';
    document.getElementById('quizFeedback').textContent = '';
}

// Statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        if (!data.error) {
            document.getElementById('totalWords').textContent = data.totalWords || 0;
            document.getElementById('totalDays').textContent = data.totalDays || 0;
            document.getElementById('statTotalWords').textContent = data.totalWords || 0;
            document.getElementById('statTotalDays').textContent = data.totalDays || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatistics() {
    document.getElementById('statStreak').textContent = studyStats.studyStreak;
    document.getElementById('statMastered').textContent = studyStats.wordsMastered.size;
    document.getElementById('studyStreak').textContent = studyStats.studyStreak;
    
    // Update day progress
    const progressList = document.getElementById('dayProgressList');
    progressList.innerHTML = Object.keys(allDaysData).sort((a, b) => parseInt(a) - parseInt(b)).map(dayNum => {
        const dayData = allDaysData[dayNum];
        const wordsInDay = dayData.wordCount || 0;
        const masteredInDay = Array.from(studyStats.wordsMastered).filter(id => id.startsWith(dayNum + '-')).length;
        const progress = wordsInDay > 0 ? (masteredInDay / wordsInDay) * 100 : 0;
        
        return `
            <div class="day-progress-item">
                <span class="day-progress-name">Day ${dayNum} - ${dayData.title}</span>
                <div class="day-progress-bar">
                    <div class="day-progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="day-progress-percent">${Math.round(progress)}%</span>
            </div>
        `;
    }).join('');
}

function updateStudyStreak() {
    const today = new Date().toDateString();
    const lastDate = studyStats.lastStudyDate;
    
    if (lastDate === today) {
        // Already studied today
        return;
    }
    
    if (lastDate) {
        const lastDateObj = new Date(lastDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDateObj.toDateString() === yesterday.toDateString()) {
            // Continue streak
            studyStats.studyStreak++;
        } else {
            // Reset streak
            studyStats.studyStreak = 1;
        }
    } else {
        // First time studying
        studyStats.studyStreak = 1;
    }
    
    studyStats.lastStudyDate = today;
    saveStudyStats();
}

function saveStudyStats() {
    localStorage.setItem('studyStreak', studyStats.studyStreak.toString());
    localStorage.setItem('lastStudyDate', studyStats.lastStudyDate);
    localStorage.setItem('wordsStudied', JSON.stringify(Array.from(studyStats.wordsStudied)));
    localStorage.setItem('wordsMastered', JSON.stringify(Array.from(studyStats.wordsMastered)));
}

function loadStudyStats() {
    const studied = localStorage.getItem('wordsStudied');
    const mastered = localStorage.getItem('wordsMastered');
    
    if (studied) {
        studyStats.wordsStudied = new Set(JSON.parse(studied));
    }
    if (mastered) {
        studyStats.wordsMastered = new Set(JSON.parse(mastered));
    }
}

// Load saved stats on init
loadStudyStats();

function updateProgress() {
    // Update any progress indicators
}

function showError(message) {
    console.error('Showing error:', message);
    const wordGrid = document.getElementById('wordGrid');
    if (wordGrid) {
        wordGrid.innerHTML = `
            <div class="empty-state">
                <h2>⚠️ Error</h2>
                <p>${escapeHtml(message)}</p>
                <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-muted);">
                    Make sure the Flask server is running on port 5000<br>
                    Try: <code style="background: var(--bg-light); padding: 0.25rem 0.5rem; border-radius: 4px;">python app.py</code>
                </p>
            </div>
        `;
    } else {
        // Fallback: show alert if wordGrid doesn't exist
        alert('Error: ' + message);
    }
    console.error('Error:', message);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
