// API base URL - automatically detects environment
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Global state
let allDaysData = {};
let currentDay = null;
let currentDayWords = [];
let currentMode = 'path';

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
    lastStudyDate: localStorage.getItem('lastStudyDate') || null,
    totalXP: parseInt(localStorage.getItem('totalXP') || '0'),
    dailyXP: parseInt(localStorage.getItem('dailyXP') || '0'),
    lastXPDate: localStorage.getItem('lastXPDate') || null,
    dayProgress: JSON.parse(localStorage.getItem('dayProgress') || '{}'),
    kanaProgress: JSON.parse(localStorage.getItem('kanaProgress') || '{}'),
    spacedRepetition: JSON.parse(localStorage.getItem('spacedRepetition') || '{}'),
    hearts: parseInt(localStorage.getItem('hearts') || '5'),
    lastHeartLoss: parseInt(localStorage.getItem('lastHeartLoss') || Date.now()),
    skillProgress: JSON.parse(localStorage.getItem('skillProgress') || '{}'),
    achievements: JSON.parse(localStorage.getItem('achievements') || '[]'),
    dailyQuests: JSON.parse(localStorage.getItem('dailyQuests') || '{}'),
    lastQuestDate: localStorage.getItem('lastQuestDate') || null,
    perfectLessons: parseInt(localStorage.getItem('perfectLessons') || '0'),
    exercisesCompleted: parseInt(localStorage.getItem('exercisesCompleted') || '0'),
};

// Learning plan
let learningPlan = [];
let learningPlanLoading = false;
let learningPlanLoaded = false;
let currentKanaType = 'hiragana';
let currentKanaLesson = null;

// Exercise state
let currentExercise = null;
let exerciseIndex = 0;
let exerciseScore = 0;
let exerciseMistakes = 0;
let exerciseHearts = 5;
let exerciseSet = [];
let currentSessionId = null;
let selectedOption = null;

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
            showError(`Cannot connect to server at ${API_BASE}. Is the server running?`);
            return;
        }
        
        // Reset daily XP if it's a new day
        resetDailyXP();
        
        await loadDays(); // This will auto-load the first day
        await loadStats();
        await loadLearningPlan();
        updateXPDisplay();
        updateHeartsDisplay();
        checkAchievements();
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
        addXP(1, 'Studied word');
    });
    
    // Update day progress
    const progress = (studyStats.wordsStudied.size / words.length) * 100;
    updateDayProgress(currentDay, progress);
    saveStudyStats();
}

function speakJapanese(text, options = {}) {
    if (window.audioPlayer) {
        return window.audioPlayer.play(text, {
            speed: options.speed || 0.8,
            onStart: options.onStart,
            onEnd: options.onEnd,
            onError: options.onError
        });
    }
    
    // Fallback to original implementation if audioPlayer not available
    if (!('speechSynthesis' in window)) {
        alert('Text-to-speech is not supported in your browser.');
        return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = options.speed || 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    const voices = window.speechSynthesis.getVoices();
    let japaneseVoice = voices.find(voice => 
        voice.lang === 'ja-JP' || 
        voice.lang === 'ja' ||
        voice.lang.startsWith('ja-')
    );
    
    if (!japaneseVoice) {
        japaneseVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('japanese') ||
            voice.name.toLowerCase().includes('japan')
        );
    }
    
    if (japaneseVoice) {
        utterance.voice = japaneseVoice;
    }
    
    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        if (options.onError) options.onError(event);
    };
    
    if (options.onStart) utterance.onstart = options.onStart;
    if (options.onEnd) utterance.onend = options.onEnd;
    
    window.speechSynthesis.speak(utterance);
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
    if (mode === 'path') {
        renderSkillTree();
    } else if (mode === 'kana') {
        loadKanaLessons();
    } else if (mode === 'practice') {
        loadPracticeHub();
    } else if (mode === 'achievements') {
        loadAchievements();
    } else if (mode === 'quests') {
        loadDailyQuests();
    } else if (mode === 'exercise') {
        startExerciseSession();
    } else if (mode === 'flashcards') {
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
    
    // Update hearts display
    updateHeartsDisplay();
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
    localStorage.setItem('totalXP', studyStats.totalXP.toString());
    localStorage.setItem('dailyXP', studyStats.dailyXP.toString());
    localStorage.setItem('lastXPDate', studyStats.lastXPDate);
    localStorage.setItem('dayProgress', JSON.stringify(studyStats.dayProgress));
    localStorage.setItem('kanaProgress', JSON.stringify(studyStats.kanaProgress));
    localStorage.setItem('spacedRepetition', JSON.stringify(studyStats.spacedRepetition));
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
    
    // Load additional stats
    const dayProgress = localStorage.getItem('dayProgress');
    if (dayProgress) {
        studyStats.dayProgress = JSON.parse(dayProgress);
    }
    const kanaProgress = localStorage.getItem('kanaProgress');
    if (kanaProgress) {
        studyStats.kanaProgress = JSON.parse(kanaProgress);
    }
    const spacedRepetition = localStorage.getItem('spacedRepetition');
    if (spacedRepetition) {
        studyStats.spacedRepetition = JSON.parse(spacedRepetition);
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

// XP System
function resetDailyXP() {
    const today = new Date().toDateString();
    if (studyStats.lastXPDate !== today) {
        studyStats.dailyXP = 0;
        studyStats.lastXPDate = today;
        saveStudyStats();
    }
}

function addXP(amount, reason = '') {
    studyStats.totalXP += amount;
    studyStats.dailyXP += amount;
    studyStats.lastXPDate = new Date().toDateString();
    saveStudyStats();
    updateXPDisplay();
    console.log(`+${amount} XP ${reason ? `(${reason})` : ''}`);
}

function updateXPDisplay() {
    const totalXPEl = document.getElementById('totalXP');
    const dailyXPEl = document.getElementById('dailyXP');
    const dailyGoalEl = document.getElementById('dailyGoal');
    
    if (totalXPEl) totalXPEl.textContent = studyStats.totalXP;
    if (dailyXPEl) dailyXPEl.textContent = studyStats.dailyXP;
    if (dailyGoalEl) {
        // Calculate daily goal based on current day in plan
        const today = new Date();
        const startDate = localStorage.getItem('startDate') || today.toDateString();
        const daysSinceStart = Math.floor((today - new Date(startDate)) / (1000 * 60 * 60 * 24));
        const currentDayPlan = learningPlan.find(p => p.day === daysSinceStart + 1);
        if (currentDayPlan) {
            dailyGoalEl.textContent = currentDayPlan.xpGoal || 20;
        }
    }
}

// Learning Plan
async function loadLearningPlan() {
    if (learningPlanLoading) {
        console.log('Learning plan already loading...');
        return;
    }
    
    if (learningPlanLoaded && learningPlan.length > 0) {
        console.log('Learning plan already loaded');
        return;
    }
    
    learningPlanLoading = true;
    
    try {
        console.log('Loading learning plan from:', `${API_BASE}/learning-plan`);
        const response = await fetch(`${API_BASE}/learning-plan`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.plan && Array.isArray(data.plan) && data.plan.length > 0) {
            learningPlan = data.plan;
            learningPlanLoaded = true;
            console.log('Learning plan loaded:', learningPlan.length, 'days');
        } else {
            console.warn('Learning plan is empty or invalid:', data);
            learningPlan = [];
        }
    } catch (error) {
        console.error('Error loading learning plan:', error);
        learningPlan = [];
        // Show error in UI
        const skillTreeEl = document.getElementById('skillTree');
        if (skillTreeEl) {
            skillTreeEl.innerHTML = `
                <div class="empty-state">
                    <h2>⚠️ Error Loading Learning Plan</h2>
                    <p>${escapeHtml(error.message)}</p>
                    <button class="premium-btn" onclick="retryLoadLearningPlan()">Retry</button>
                </div>
            `;
        }
    } finally {
        learningPlanLoading = false;
    }
}

function retryLoadLearningPlan() {
    learningPlanLoaded = false;
    learningPlan = [];
    loadLearningPlan().then(() => {
        if (currentMode === 'path') {
            renderSkillTree();
        }
    });
}

// Skill Tree Rendering
function renderSkillTree() {
    const skillTreeEl = document.getElementById('skillTree');
    if (!skillTreeEl) return;
    
    // If plan not loaded, load it first
    if (!learningPlanLoaded && !learningPlanLoading) {
        skillTreeEl.innerHTML = '<div class="empty-state"><div class="premium-spinner"></div><p>Loading learning path...</p></div>';
        loadLearningPlan().then(() => {
            if (learningPlan.length > 0) {
                renderSkillTree();
            }
        });
        return;
    }
    
    // If still loading, show loading state
    if (learningPlanLoading) {
        skillTreeEl.innerHTML = '<div class="empty-state"><div class="premium-spinner"></div><p>Loading learning path...</p></div>';
        return;
    }
    
    // If plan is empty after loading, show error
    if (learningPlan.length === 0) {
        skillTreeEl.innerHTML = `
            <div class="empty-state">
                <h2>No Learning Plan Available</h2>
                <p>Unable to load the learning plan. Please check your connection and try again.</p>
                <button class="premium-btn" onclick="retryLoadLearningPlan()">Retry</button>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    const startDate = localStorage.getItem('startDate');
    let daysSinceStart = 0;
    
    if (startDate) {
        daysSinceStart = Math.floor((today - new Date(startDate)) / (1000 * 60 * 60 * 24));
    } else {
        localStorage.setItem('startDate', today.toDateString());
    }
    
    const currentDay = daysSinceStart + 1;
    const completedDays = Object.keys(studyStats.dayProgress).filter(d => 
        studyStats.dayProgress[d].completed
    ).length;
    
    const daysCompletedEl = document.getElementById('daysCompleted');
    if (daysCompletedEl) daysCompletedEl.textContent = completedDays;
    
    skillTreeEl.innerHTML = learningPlan.map((lesson, index) => {
        const isUnlocked = index === 0 || learningPlan[index - 1].day <= currentDay || 
                          studyStats.dayProgress[learningPlan[index - 1].day]?.completed;
        const isCompleted = studyStats.dayProgress[lesson.day]?.completed || false;
        const isCurrent = lesson.day === currentDay;
        const progress = studyStats.dayProgress[lesson.day]?.progress || 0;
        const skillId = `day-${lesson.day}`;
        const crownLevel = getCrownLevel(skillId);
        const crowns = '👑'.repeat(crownLevel);
        
        let icon = '📚';
        if (lesson.type === 'hiragana') icon = 'あ';
        else if (lesson.type === 'katakana') icon = 'カ';
        else if (lesson.type === 'vocabulary') icon = '📖';
        
        return `
            <div class="skill-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}" 
                 data-day="${lesson.day}" data-type="${lesson.type}">
                <div class="skill-icon">${icon}</div>
                <div class="skill-info">
                    <div class="skill-title">
                        Day ${lesson.day}: ${lesson.title}
                        ${crowns ? `<span class="skill-crowns">${crowns}</span>` : ''}
                    </div>
                    <div class="skill-description">${lesson.description}</div>
                    ${lesson.type === 'vocabulary' ? `<div class="skill-meta">${lesson.wordCount} words</div>` : ''}
                    ${lesson.type === 'hiragana' || lesson.type === 'katakana' ? `<div class="skill-meta">${lesson.characterCount} characters</div>` : ''}
                    <div class="skill-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(progress)}%</span>
                    </div>
                </div>
                ${isUnlocked ? `<button class="premium-btn skill-btn" onclick="startLesson(${lesson.day}, '${lesson.type}')">
                    ${isCompleted ? 'Review' : isCurrent ? 'Start' : 'Continue'}
                </button>` : '<div class="skill-locked">🔒</div>'}
            </div>
        `;
    }).join('');
}

function startLesson(day, type) {
    const skillId = `day-${day}`;
    
    // Check if user wants to practice (exercise mode) or study
    // For now, start with exercise mode for gamification
    if (type === 'hiragana' || type === 'katakana') {
        // Start kana exercise session
        startExerciseSession(skillId, 'kana');
    } else {
        // Start vocabulary exercise session
        startExerciseSession(skillId, 'vocabulary');
    }
    
    // Also mark lesson as started
    completeLesson(skillId);
}

// Kana Learning
async function loadKanaLessons() {
    try {
        const response = await fetch(`${API_BASE}/kana`);
        const data = await response.json();
        
        const hiraganaLessons = data.hiragana?.lessons || [];
        const katakanaLessons = data.katakana?.lessons || [];
        
        const lessonSelect = document.getElementById('kanaLessonSelect');
        if (lessonSelect) {
            // Remove existing event listeners by cloning
            const newSelect = lessonSelect.cloneNode(true);
            lessonSelect.parentNode.replaceChild(newSelect, lessonSelect);
            
            newSelect.innerHTML = '<option value="">Select a lesson...</option>';
            
            hiraganaLessons.forEach(lesson => {
                const option = document.createElement('option');
                option.value = `hiragana-${lesson.day}`;
                option.textContent = `Day ${lesson.day}: ${lesson.title}`;
                newSelect.appendChild(option);
            });
            
            katakanaLessons.forEach(lesson => {
                const option = document.createElement('option');
                option.value = `katakana-${lesson.day}`;
                option.textContent = `Day ${lesson.day}: ${lesson.title}`;
                newSelect.appendChild(option);
            });
            
            newSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    const [type, day] = e.target.value.split('-');
                    loadKanaLesson(parseInt(day), type);
                }
            });
        }
        
        // Load first lesson by default if kana content is empty
        const kanaContent = document.getElementById('kanaContent');
        if (kanaContent && hiraganaLessons.length > 0 && !currentKanaLesson) {
            loadKanaLesson(hiraganaLessons[0].day, 'hiragana');
        }
    } catch (error) {
        console.error('Error loading kana lessons:', error);
        const kanaContent = document.getElementById('kanaContent');
        if (kanaContent) {
            kanaContent.innerHTML = `<div class="empty-state"><p>Error loading kana lessons: ${error.message}</p></div>`;
        }
    }
}

async function loadKanaLesson(day, type) {
    try {
        const response = await fetch(`${API_BASE}/kana?type=${type}&day=${day}`);
        const data = await response.json();
        
        if (data.error) {
            showError(data.error);
            return;
        }
        
        currentKanaLesson = data;
        currentKanaType = type;
        
        const kanaContent = document.getElementById('kanaContent');
        if (!kanaContent) return;
        
        kanaContent.innerHTML = `
            <div class="kana-lesson glass">
                <h3 class="lesson-title">${data.title}</h3>
                <p class="lesson-description">${data.description}</p>
                <div class="kana-grid">
                    ${data.characters.map(char => `
                        <div class="kana-card" data-char="${char.char}" data-romaji="${char.romaji}">
                            <div class="kana-char">${char.char}</div>
                            <div class="kana-romaji">${char.romaji}</div>
                            <button class="premium-btn small" onclick="speakJapanese('${char.romaji}')">🔊</button>
                        </div>
                    `).join('')}
                </div>
                <div class="kana-practice">
                    <h4>Practice Mode</h4>
                    <button class="premium-btn" onclick="startKanaQuiz('${type}', ${day})">Start Quiz</button>
                    <button class="premium-btn" onclick="startKanaFlashcards('${type}', ${day})">Flashcards</button>
                </div>
            </div>
        `;
        
        // Mark lesson as started
        const lessonKey = `${type}-${day}`;
        if (!studyStats.kanaProgress[lessonKey]) {
            studyStats.kanaProgress[lessonKey] = { started: true, progress: 0 };
            saveStudyStats();
        }
        
        // Add XP for viewing lesson
        addXP(5, `Viewed ${type} lesson`);
    } catch (error) {
        console.error('Error loading kana lesson:', error);
        showError(`Failed to load kana lesson: ${error.message}`);
    }
}

function startKanaQuiz(type, day) {
    switchMode('quiz');
    // TODO: Implement kana-specific quiz
    alert('Kana quiz coming soon!');
}

function startKanaFlashcards(type, day) {
    switchMode('flashcards');
    // TODO: Implement kana-specific flashcards
    alert('Kana flashcards coming soon!');
}

// Update day progress
function updateDayProgress(day, progress, completed = false) {
    if (!studyStats.dayProgress[day]) {
        studyStats.dayProgress[day] = { progress: 0, completed: false };
    }
    studyStats.dayProgress[day].progress = Math.max(studyStats.dayProgress[day].progress, progress);
    if (completed) {
        studyStats.dayProgress[day].completed = true;
        addXP(10, `Completed Day ${day}`);
    }
    saveStudyStats();
    
    if (currentMode === 'path') {
        renderSkillTree();
    }
}

// Spaced Repetition
function updateSpacedRepetition(itemId, isCorrect) {
    const now = Date.now();
    const item = studyStats.spacedRepetition[itemId] || {
        interval: 1, // days
        repetitions: 0,
        easeFactor: 2.5,
        nextReview: now
    };
    
    if (isCorrect) {
        item.repetitions++;
        if (item.repetitions === 1) {
            item.interval = 1;
        } else if (item.repetitions === 2) {
            item.interval = 6;
        } else {
            item.interval = Math.round(item.interval * item.easeFactor);
        }
        item.nextReview = now + (item.interval * 24 * 60 * 60 * 1000);
    } else {
        item.repetitions = 0;
        item.interval = 1;
        item.nextReview = now + (24 * 60 * 60 * 1000); // Review tomorrow
    }
    
    studyStats.spacedRepetition[itemId] = item;
    saveStudyStats();
}

function getItemsForReview() {
    const now = Date.now();
    return Object.keys(studyStats.spacedRepetition).filter(itemId => {
        const item = studyStats.spacedRepetition[itemId];
        return item.nextReview <= now;
    });
}

// Audio player functions for exercises
function playExerciseAudio(text) {
    if (window.audioPlayer) {
        const speed = parseFloat(document.getElementById('audioSpeed')?.value || '1');
        window.audioPlayer.setSpeed(speed);
        window.audioPlayer.play(text, {
            speed: speed,
            onStart: () => {
                const btn = document.getElementById('playAudioBtn');
                if (btn) btn.textContent = '⏸️ Playing...';
            },
            onEnd: () => {
                const btn = document.getElementById('playAudioBtn');
                if (btn) btn.textContent = '🔊 Play Audio';
            }
        }).catch(err => {
            console.error('Audio playback error:', err);
            const btn = document.getElementById('playAudioBtn');
            if (btn) btn.textContent = '🔊 Play Audio';
        });
    } else {
        speakJapanese(text);
    }
}

function repeatExerciseAudio(text) {
    if (window.audioPlayer) {
        window.audioPlayer.repeat().catch(err => {
            console.error('Audio repeat error:', err);
        });
    } else {
        speakJapanese(text);
    }
}

function setAudioSpeed(speed) {
    if (window.audioPlayer) {
        window.audioPlayer.setSpeed(parseFloat(speed));
    }
}

// ==================== ADVANCED GAME MECHANICS ====================

// Hearts System
function updateHeartsDisplay() {
    const hearts = getHearts();
    const heartsContainer = document.getElementById('heartsContainer');
    const heartsCount = document.getElementById('heartsCount');
    const exerciseHeartsEl = document.getElementById('exerciseHearts');
    
    if (heartsContainer) {
        heartsContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const heart = document.createElement('span');
            heart.className = 'heart';
            heart.textContent = i < hearts ? '❤️' : '🤍';
            heartsContainer.appendChild(heart);
        }
    }
    
    if (heartsCount) {
        heartsCount.textContent = `${hearts}/5`;
    }
    
    if (exerciseHeartsEl) {
        exerciseHeartsEl.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const heart = document.createElement('span');
            heart.className = 'heart';
            heart.textContent = i < exerciseHearts ? '❤️' : '🤍';
            exerciseHeartsEl.appendChild(heart);
        }
    }
}

function getHearts() {
    const hearts = studyStats.hearts || 5;
    const lastHeartLoss = studyStats.lastHeartLoss || Date.now();
    const timeSinceLoss = Date.now() - lastHeartLoss;
    const HEART_REFILL_TIME = 4 * 60 * 60 * 1000; // 4 hours
    
    if (hearts < 5 && timeSinceLoss >= HEART_REFILL_TIME) {
        const heartsRefilled = Math.floor(timeSinceLoss / HEART_REFILL_TIME);
        const newHearts = Math.min(5, hearts + heartsRefilled);
        if (newHearts !== hearts) {
            studyStats.hearts = newHearts;
            studyStats.lastHeartLoss = Date.now();
            saveStudyStats();
        }
        return newHearts;
    }
    
    return hearts;
}

function loseHeart() {
    const currentHearts = getHearts();
    if (currentHearts <= 0) return false;
    
    studyStats.hearts = currentHearts - 1;
    studyStats.lastHeartLoss = Date.now();
    saveStudyStats();
    updateHeartsDisplay();
    
    if (studyStats.hearts === 0) {
        showCelebration('💔 Out of hearts! They refill every 4 hours.', 'error');
    }
    
    return true;
}

// Crown Levels
function getCrownLevel(skillId) {
    return studyStats.skillProgress[skillId]?.crownLevel || 0;
}

function canLevelUp(skillId) {
    const currentLevel = getCrownLevel(skillId);
    if (currentLevel >= 5) return false;
    
    const skill = studyStats.skillProgress[skillId] || {};
    const lessonsCompleted = skill.lessonsCompleted || 0;
    const requiredLessons = (currentLevel + 1) * 2;
    
    return lessonsCompleted >= requiredLessons;
}

function levelUpSkill(skillId) {
    if (!canLevelUp(skillId)) return false;
    
    if (!studyStats.skillProgress[skillId]) {
        studyStats.skillProgress[skillId] = { crownLevel: 0, lessonsCompleted: 0, strength: 100 };
    }
    
    studyStats.skillProgress[skillId].crownLevel++;
    studyStats.skillProgress[skillId].strength = 100;
    saveStudyStats();
    
    showCelebration(`👑 Level ${studyStats.skillProgress[skillId].crownLevel} unlocked!`, 'success');
    addXP(20, 'Skill level up');
    
    return true;
}

function completeLesson(skillId) {
    if (!studyStats.skillProgress[skillId]) {
        studyStats.skillProgress[skillId] = { crownLevel: 0, lessonsCompleted: 0, strength: 100 };
    }
    
    studyStats.skillProgress[skillId].lessonsCompleted++;
    studyStats.skillProgress[skillId].lastPractice = Date.now();
    studyStats.skillProgress[skillId].strength = 100;
    
    if (canLevelUp(skillId)) {
        levelUpSkill(skillId);
    }
    
    saveStudyStats();
}

// Exercise System
async function startExerciseSession(skillId = null, type = 'vocabulary') {
    switchMode('exercise');
    
    exerciseIndex = 0;
    exerciseScore = 0;
    exerciseMistakes = 0;
    exerciseHearts = 5;
    exerciseSet = [];
    currentExercise = null;
    currentSessionId = null;
    
    try {
        // Generate exercise set
        const response = await fetch(`${API_BASE}/exercises?type=${type}${skillId ? `&skillId=${skillId}` : ''}&count=10`);
        const data = await response.json();
        
        if (data.exercises && data.exercises.length > 0) {
            exerciseSet = data.exercises;
            
            // Create session
            const sessionResponse = await fetch(`${API_BASE}/session?action=create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'user_' + Date.now(),
                    skillId: skillId || 'vocab',
                    exercises: exerciseSet
                })
            });
            
            const sessionData = await sessionResponse.json();
            if (sessionData.session) {
                currentSessionId = sessionData.session.id;
                exerciseHearts = sessionData.session.hearts;
            }
            
            showNextExercise();
        } else {
            showError('No exercises available');
        }
    } catch (error) {
        console.error('Error loading exercises:', error);
        showError('Failed to load exercises: ' + error.message);
    }
}

async function showNextExercise() {
    // Check if session is complete
    if (currentSessionId) {
        const summaryResponse = await fetch(`${API_BASE}/session?sessionId=${currentSessionId}&action=summary`);
        const summaryData = await summaryResponse.json();
        if (summaryData.summary && summaryData.summary.completed) {
            finishExerciseSession();
            return;
        }
    }
    
    if (exerciseIndex >= exerciseSet.length || exerciseHearts <= 0) {
        finishExerciseSession();
        return;
    }
    
    // Get current exercise from session if available
    if (currentSessionId) {
        try {
            const exerciseResponse = await fetch(`${API_BASE}/session?sessionId=${currentSessionId}&action=current`);
            const exerciseData = await exerciseResponse.json();
            if (exerciseData.exercise) {
                currentExercise = exerciseData.exercise;
                exerciseIndex = exerciseSet.findIndex(e => e.id === currentExercise.id);
            } else {
                currentExercise = exerciseSet[exerciseIndex];
            }
        } catch (error) {
            currentExercise = exerciseSet[exerciseIndex];
        }
    } else {
        currentExercise = exerciseSet[exerciseIndex];
    }
    
    const exerciseContent = document.getElementById('exerciseContent');
    const exerciseActions = document.getElementById('exerciseActions');
    const exerciseProgress = document.getElementById('exerciseProgress');
    const exerciseCounter = document.getElementById('exerciseCounter');
    
    if (exerciseCounter) {
        exerciseCounter.textContent = `${exerciseIndex + 1}/${exerciseSet.length}`;
    }
    
    if (exerciseProgress) {
        const progress = ((exerciseIndex + 1) / exerciseSet.length) * 100;
        exerciseProgress.style.width = `${progress}%`;
    }
    
    if (exerciseContent) {
        exerciseContent.innerHTML = renderExercise(currentExercise);
        
        // Initialize matching exercise if needed
        if (currentExercise.type === 'match' && currentExercise.pairs) {
            const container = document.getElementById('matchingExerciseContainer');
            if (container && window.MatchingExercise) {
                window.currentMatchingExercise = new MatchingExercise(
                    container,
                    currentExercise.pairs,
                    (matchedPairs) => {
                        // Auto-submit when all matched
                        userAnswer = matchedPairs;
                        checkExerciseAnswer();
                    }
                );
            }
        }
        
        // Initialize fill blank if needed
        if (currentExercise.type === 'fill_blank' && currentExercise.blanks) {
            // Fill blank is already rendered in renderExercise
        }
    }
    
    if (exerciseActions) {
        exerciseActions.innerHTML = '<button class="premium-btn" onclick="checkExerciseAnswer()">Check</button>';
    }
    
    updateHeartsDisplay();
    selectedOption = null;
}

function renderExercise(exercise) {
    switch (exercise.type) {
        case 'multiple_choice':
            return `
                <div class="exercise-question">
                    <h3>${exercise.question}</h3>
                    ${exercise.kana ? `<div class="exercise-kana">${exercise.kana.char}</div>` : ''}
                    <div class="exercise-options" id="exerciseOptions">
                        ${exercise.options.map((opt, idx) => `
                            <button class="exercise-option" onclick="selectExerciseOption(${idx}, '${escapeHtml(opt)}')">
                                ${escapeHtml(opt)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        case 'translation':
            return `
                <div class="exercise-question">
                    <h3>${escapeHtml(exercise.question)}</h3>
                    ${exercise.questionAudio ? `
                        <button class="premium-btn audio-btn" onclick="speakJapanese('${escapeHtml(exercise.questionAudio)}')">
                            🔊 Play Audio
                        </button>
                    ` : ''}
                    ${exercise.direction === 'jp_to_en' && exercise.word ? `
                        <div class="exercise-japanese-display">
                            <div class="japanese-text">${escapeHtml(exercise.word.japanese)}</div>
                            ${exercise.word.furigana ? `<div class="furigana-text">${escapeHtml(exercise.word.furigana)}</div>` : ''}
                        </div>
                    ` : ''}
                    <input type="text" 
                           id="exerciseAnswer" 
                           class="premium-input" 
                           placeholder="${exercise.direction === 'jp_to_en' ? 'Type the English translation...' : 'Type in Japanese...'}"
                           autocomplete="off"
                           onkeypress="if(event.key==='Enter') checkExerciseAnswer()">
                    ${exercise.hint ? `<p class="exercise-hint">💡 Hint: ${escapeHtml(exercise.hint)}</p>` : ''}
                </div>
            `;
        case 'match':
            return `
                <div class="exercise-question">
                    <h3>${escapeHtml(exercise.explanation || 'Match the pairs')}</h3>
                    <div id="matchingExerciseContainer"></div>
                </div>
            `;
        case 'fill_blank':
            return `
                <div class="exercise-question">
                    <h3>${escapeHtml(exercise.context || 'Fill in the blank')}</h3>
                    <div class="fill-blank-sentence">
                        ${exercise.blanks.map((blank, idx) => {
                            const beforeText = exercise.sentence.split('____')[idx] || '';
                            const afterText = exercise.sentence.split('____')[idx + 1] || '';
                            
                            if (exercise.blankType === 'select') {
                                return `
                                    ${beforeText}
                                    <select id="blank_${idx}" class="blank-select">
                                        <option value="">Select...</option>
                                        ${blank.options.map(opt => `
                                            <option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>
                                        `).join('')}
                                    </select>
                                    ${afterText}
                                `;
                            } else {
                                return `
                                    ${beforeText}
                                    <input type="text" 
                                           id="blank_${idx}" 
                                           class="blank-input" 
                                           placeholder="____"
                                           autocomplete="off">
                                    ${afterText}
                                `;
                            }
                        }).join('')}
                    </div>
                    ${exercise.explanation ? `<p class="exercise-hint">💡 ${escapeHtml(exercise.explanation)}</p>` : ''}
                </div>
            `;
        case 'listen':
            const audioText = exercise.audioUrl || exercise.questionAudio || exercise.word?.japanese || '';
            if (exercise.exerciseType === 'listen_select') {
                return `
                    <div class="exercise-question">
                        <h3>${escapeHtml(exercise.question)}</h3>
                        <div class="audio-controls-container">
                            <button class="premium-btn large audio-btn" id="playAudioBtn" onclick="playExerciseAudio('${escapeHtml(audioText)}')">
                                🔊 Play Audio
                            </button>
                            <button class="premium-btn small" onclick="repeatExerciseAudio('${escapeHtml(audioText)}')" title="Repeat">
                                🔁
                            </button>
                            <div class="speed-control">
                                <label>Speed:</label>
                                <select id="audioSpeed" onchange="setAudioSpeed(this.value)">
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1" selected>1x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                </select>
                            </div>
                        </div>
                        <div class="exercise-options" id="exerciseOptions">
                            ${exercise.options.map((opt, idx) => `
                                <button class="exercise-option" onclick="selectExerciseOption(${idx}, '${escapeHtml(opt)}')">
                                    ${escapeHtml(opt)}
                                </button>
                            `).join('')}
                        </div>
                        ${exercise.hint ? `<p class="exercise-hint">💡 Hint: ${escapeHtml(exercise.hint)}</p>` : ''}
                    </div>
                `;
            } else {
                return `
                    <div class="exercise-question">
                        <h3>${escapeHtml(exercise.question)}</h3>
                        <div class="audio-controls-container">
                            <button class="premium-btn large audio-btn" id="playAudioBtn" onclick="playExerciseAudio('${escapeHtml(audioText)}')">
                                🔊 Play Audio
                            </button>
                            <button class="premium-btn small" onclick="repeatExerciseAudio('${escapeHtml(audioText)}')" title="Repeat">
                                🔁
                            </button>
                            <div class="speed-control">
                                <label>Speed:</label>
                                <select id="audioSpeed" onchange="setAudioSpeed(this.value)">
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1" selected>1x</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                </select>
                            </div>
                        </div>
                        <input type="text" 
                               id="exerciseAnswer" 
                               class="premium-input" 
                               placeholder="Type what you hear in Japanese..."
                               autocomplete="off"
                               onkeypress="if(event.key==='Enter') checkExerciseAnswer()">
                        ${exercise.hint ? `<p class="exercise-hint">💡 Hint: ${escapeHtml(exercise.hint)}</p>` : ''}
                    </div>
                `;
            }
        default:
            return `<div class="exercise-question"><h3>${escapeHtml(exercise.question || 'Exercise')}</h3><p>Exercise type "${exercise.type}" is coming soon!</p></div>`;
    }
}

let selectedOption = null;
function selectExerciseOption(index, value) {
    selectedOption = value;
    document.querySelectorAll('.exercise-option').forEach((btn, idx) => {
        btn.classList.toggle('selected', idx === index);
    });
}

async function checkExerciseAnswer() {
    if (!currentExercise) return;
    
    let userAnswer = '';
    
    // Get user answer based on exercise type
    if (currentExercise.type === 'multiple_choice') {
        if (selectedOption === null) {
            showCelebration('Please select an answer', 'error');
            return;
        }
        userAnswer = selectedOption;
    } else if (currentExercise.type === 'translation' || currentExercise.type === 'listen') {
        const answerInput = document.getElementById('exerciseAnswer');
        userAnswer = answerInput ? answerInput.value.trim() : '';
        if (!userAnswer) {
            showCelebration('Please enter an answer', 'error');
            return;
        }
    } else if (currentExercise.type === 'match') {
        // Matching exercise handles its own validation
        if (window.currentMatchingExercise) {
            userAnswer = window.currentMatchingExercise.matchedPairs;
        } else {
            showCelebration('Please complete the matching exercise', 'error');
            return;
        }
    } else if (currentExercise.type === 'fill_blank') {
        const blanks = currentExercise.blanks || [];
        userAnswer = blanks.map((blank, idx) => {
            const input = document.getElementById(`blank_${idx}`);
            return input ? input.value.trim() : '';
        });
    } else {
        showCelebration('Exercise type not yet implemented', 'error');
        return;
    }
    
    // Validate answer using backend validator
    try {
        const validateResponse = await fetch(`${API_BASE}/exercises?action=validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exercise: currentExercise,
                userAnswer: userAnswer
            })
        });
        
        const validationResult = await validateResponse.json();
        
        // Submit answer to session
        if (currentSessionId) {
            await fetch(`${API_BASE}/session?action=answer&sessionId=${currentSessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAnswer: userAnswer,
                    validationResult: validationResult
                })
            });
        }
        
        // Handle result
        if (validationResult.correct) {
            exerciseScore++;
            addXP(Math.round(validationResult.score * (currentExercise.points || 10)), 'Correct answer');
            showCelebration(validationResult.feedback || '✅ Correct!', 'success');
            
            // Update UI
            updateExerciseFeedback(validationResult, true);
            
            setTimeout(async () => {
                exerciseIndex++;
                if (currentSessionId) {
                    await fetch(`${API_BASE}/session?action=next&sessionId=${currentSessionId}`, { method: 'PUT' });
                }
                showNextExercise();
            }, 2000);
        } else {
            exerciseMistakes++;
            if (loseHeart()) {
                exerciseHearts--;
            }
            showCelebration(validationResult.feedback || '❌ Wrong!', 'error');
            
            // Update UI
            updateExerciseFeedback(validationResult, false);
            
            if (exerciseHearts <= 0) {
                setTimeout(() => finishExerciseSession(), 3000);
            } else {
                setTimeout(async () => {
                    exerciseIndex++;
                    if (currentSessionId) {
                        await fetch(`${API_BASE}/session?action=next&sessionId=${currentSessionId}`, { method: 'PUT' });
                    }
                    showNextExercise();
                }, 3000);
            }
        }
        
        // Update spaced repetition
        if (currentExercise.word) {
            const wordId = `word-${currentExercise.word.japanese}`;
            updateSpacedRepetition(wordId, validationResult.correct);
        }
    } catch (error) {
        console.error('Error validating answer:', error);
        showCelebration('Error checking answer. Please try again.', 'error');
    }
}

function updateExerciseFeedback(validationResult, isCorrect) {
    const exerciseContent = document.getElementById('exerciseContent');
    if (!exerciseContent) return;
    
    // Add feedback styling
    if (currentExercise.type === 'multiple_choice') {
        const options = exerciseContent.querySelectorAll('.exercise-option');
        options.forEach((opt, idx) => {
            opt.classList.add('disabled');
            const optText = opt.textContent.trim();
            if (optText === validationResult.correctAnswer) {
                opt.classList.add('correct');
            } else if (optText === selectedOption && !isCorrect) {
                opt.classList.add('wrong');
            }
        });
    }
    
    // Show explanation if available
    if (currentExercise.explanation && !isCorrect) {
        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'exercise-explanation';
        explanationDiv.innerHTML = `<p><strong>Explanation:</strong> ${currentExercise.explanation}</p>`;
        exerciseContent.appendChild(explanationDiv);
    }
}

function finishExerciseSession() {
    const percentage = Math.round((exerciseScore / exerciseSet.length) * 100);
    const isPerfect = exerciseMistakes === 0;
    
    if (isPerfect) {
        studyStats.perfectLessons++;
        unlockAchievement('perfect_lesson');
        addXP(50, 'Perfect lesson');
    }
    
    studyStats.exercisesCompleted += exerciseSet.length;
    saveStudyStats();
    
    const exerciseContent = document.getElementById('exerciseContent');
    if (exerciseContent) {
        exerciseContent.innerHTML = `
            <div class="exercise-results">
                <h2>Exercise Complete! 🎉</h2>
                <div class="result-score">${exerciseScore} / ${exerciseSet.length}</div>
                <div class="result-percentage">${percentage}%</div>
                ${isPerfect ? '<div class="perfect-badge">💯 Perfect!</div>' : ''}
                <div class="result-xp">+${exerciseScore * 10} XP</div>
            </div>
        `;
    }
    
    checkAchievements();
}

// Achievements
async function loadAchievements() {
    try {
        const response = await fetch(`${API_BASE}/achievements`);
        const data = await response.json();
        
        const achievementsGrid = document.getElementById('achievementsGrid');
        const unlockedCount = document.getElementById('unlockedCount');
        const totalAchievements = document.getElementById('totalAchievements');
        
        if (totalAchievements) {
            totalAchievements.textContent = data.achievements.length;
        }
        
        let unlocked = 0;
        if (achievementsGrid) {
            achievementsGrid.innerHTML = data.achievements.map(achievement => {
                const isUnlocked = studyStats.achievements.includes(achievement.id);
                if (isUnlocked) unlocked++;
                
                return `
                    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-info">
                            <h4>${achievement.name}</h4>
                            <p>${achievement.description}</p>
                            <div class="achievement-xp">+${achievement.xp} XP</div>
                        </div>
                        ${isUnlocked ? '<div class="achievement-badge">✓</div>' : ''}
                    </div>
                `;
            }).join('');
        }
        
        if (unlockedCount) {
            unlockedCount.textContent = unlocked;
        }
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

function unlockAchievement(achievementId) {
    if (studyStats.achievements.includes(achievementId)) return;
    
    studyStats.achievements.push(achievementId);
    saveStudyStats();
    
    fetch(`${API_BASE}/achievements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementId })
    }).then(() => {
        showAchievementModal(achievementId);
    });
}

function showAchievementModal(achievementId) {
    // This would fetch achievement details, but for now use a simple version
    const modal = document.getElementById('achievementModal');
    const icon = document.getElementById('modalAchievementIcon');
    const name = document.getElementById('modalAchievementName');
    const desc = document.getElementById('modalAchievementDesc');
    const xp = document.getElementById('modalAchievementXP');
    
    // Simple achievement data (would come from API)
    const achievements = {
        perfect_lesson: { icon: '💯', name: 'Perfect Score', desc: 'Complete a lesson without mistakes', xp: 25 },
        first_word: { icon: '🌱', name: 'First Steps', desc: 'Study your first word', xp: 10 },
    };
    
    const achievement = achievements[achievementId] || { icon: '🏆', name: 'Achievement Unlocked!', desc: 'Great job!', xp: 10 };
    
    if (icon) icon.textContent = achievement.icon;
    if (name) name.textContent = achievement.name;
    if (desc) desc.textContent = achievement.desc;
    if (xp) xp.textContent = achievement.xp;
    
    if (modal) {
        modal.classList.remove('hidden');
        addXP(achievement.xp, 'Achievement');
    }
}

function closeAchievementModal() {
    const modal = document.getElementById('achievementModal');
    if (modal) modal.classList.add('hidden');
}

function checkAchievements() {
    // Check for various achievements
    if (studyStats.totalXP >= 1000 && !studyStats.achievements.includes('xp_1000')) {
        unlockAchievement('xp_1000');
    }
    if (studyStats.studyStreak >= 3 && !studyStats.achievements.includes('streak_3')) {
        unlockAchievement('streak_3');
    }
    if (studyStats.studyStreak >= 7 && !studyStats.achievements.includes('streak_7')) {
        unlockAchievement('streak_7');
    }
    if (studyStats.wordsStudied.size >= 1 && !studyStats.achievements.includes('first_word')) {
        unlockAchievement('first_word');
    }
}

// Daily Quests
async function loadDailyQuests() {
    try {
        const response = await fetch(`${API_BASE}/daily-quests`);
        const data = await response.json();
        
        const today = new Date().toDateString();
        if (studyStats.lastQuestDate !== today) {
            // Reset quests for new day
            studyStats.dailyQuests = {};
            studyStats.lastQuestDate = today;
        }
        
        const questsList = document.getElementById('questsList');
        const questsCompleted = document.getElementById('questsCompleted');
        const questsTotal = document.getElementById('questsTotal');
        
        if (questsTotal) {
            questsTotal.textContent = data.quests.length;
        }
        
        let completed = 0;
        if (questsList) {
            questsList.innerHTML = data.quests.map(quest => {
                const questProgress = studyStats.dailyQuests[quest.id] || { progress: 0, completed: false };
                if (questProgress.completed) completed++;
                
                return `
                    <div class="quest-card ${questProgress.completed ? 'completed' : ''}">
                        <div class="quest-icon">${quest.icon}</div>
                        <div class="quest-info">
                            <h4>${quest.name}</h4>
                            <p>${quest.description}</p>
                            <div class="quest-progress-bar">
                                <div class="quest-progress-fill" style="width: ${questProgress.completed ? 100 : 0}%"></div>
                            </div>
                        </div>
                        <div class="quest-reward">+${quest.xp} XP</div>
                    </div>
                `;
            }).join('');
        }
        
        if (questsCompleted) {
            questsCompleted.textContent = completed;
        }
    } catch (error) {
        console.error('Error loading daily quests:', error);
    }
}

function completeQuest(questId) {
    if (!studyStats.dailyQuests[questId]) {
        studyStats.dailyQuests[questId] = { progress: 0, completed: false };
    }
    
    if (!studyStats.dailyQuests[questId].completed) {
        studyStats.dailyQuests[questId].completed = true;
        saveStudyStats();
        loadDailyQuests();
    }
}

// Practice Hub
function loadPracticeHub() {
    const weakSkillsList = document.getElementById('weakSkillsList');
    const reviewSkillsList = document.getElementById('reviewSkillsList');
    const strengthenSkillsList = document.getElementById('strengthenSkillsList');
    
    const now = Date.now();
    const weakSkills = [];
    const reviewSkills = [];
    const strengthenSkills = [];
    
    Object.keys(studyStats.skillProgress).forEach(skillId => {
        const skill = studyStats.skillProgress[skillId];
        const daysSincePractice = Math.floor((now - (skill.lastPractice || 0)) / (1000 * 60 * 60 * 24));
        const strength = skill.strength || 100;
        
        if (strength < 50) {
            weakSkills.push({ id: skillId, ...skill });
        } else if (daysSincePractice > 3) {
            reviewSkills.push({ id: skillId, ...skill, daysSincePractice });
        } else if (strength < 100) {
            strengthenSkills.push({ id: skillId, ...skill });
        }
    });
    
    if (weakSkillsList) {
        weakSkillsList.innerHTML = weakSkills.length > 0 
            ? weakSkills.map(skill => renderSkillCard(skill)).join('')
            : '<p class="empty-message">No weak skills! Great job! 🎉</p>';
    }
    
    if (reviewSkillsList) {
        reviewSkillsList.innerHTML = reviewSkills.length > 0
            ? reviewSkills.map(skill => renderSkillCard(skill)).join('')
            : '<p class="empty-message">All skills are up to date! ✨</p>';
    }
    
    if (strengthenSkillsList) {
        strengthenSkillsList.innerHTML = strengthenSkills.length > 0
            ? strengthenSkills.map(skill => renderSkillCard(skill)).join('')
            : '<p class="empty-message">All skills at full strength! 💪</p>';
    }
}

function renderSkillCard(skill) {
    const crowns = '👑'.repeat(skill.crownLevel || 0);
    return `
        <div class="practice-skill-card">
            <div class="skill-header">
                <span class="skill-name">${skill.id}</span>
                <span class="skill-crowns">${crowns}</span>
            </div>
            <div class="skill-strength">
                <div class="strength-bar">
                    <div class="strength-fill" style="width: ${skill.strength || 0}%"></div>
                </div>
                <span class="strength-text">${skill.strength || 0}%</span>
            </div>
            <button class="premium-btn small" onclick="startExerciseSession('${skill.id}')">Practice</button>
        </div>
    `;
}

// Celebration System
function showCelebration(message, type = 'success') {
    const celebration = document.getElementById('celebration');
    const text = document.getElementById('celebrationText');
    const xp = document.getElementById('celebrationXP');
    
    if (celebration && text) {
        text.textContent = message;
        celebration.className = `celebration ${type}`;
        celebration.classList.remove('hidden');
        
        setTimeout(() => {
            celebration.classList.add('hidden');
        }, 3000);
    }
}


// Update save function
function saveStudyStats() {
    localStorage.setItem('studyStreak', studyStats.studyStreak.toString());
    localStorage.setItem('lastStudyDate', studyStats.lastStudyDate);
    localStorage.setItem('wordsStudied', JSON.stringify(Array.from(studyStats.wordsStudied)));
    localStorage.setItem('wordsMastered', JSON.stringify(Array.from(studyStats.wordsMastered)));
    localStorage.setItem('totalXP', studyStats.totalXP.toString());
    localStorage.setItem('dailyXP', studyStats.dailyXP.toString());
    localStorage.setItem('lastXPDate', studyStats.lastXPDate);
    localStorage.setItem('dayProgress', JSON.stringify(studyStats.dayProgress));
    localStorage.setItem('kanaProgress', JSON.stringify(studyStats.kanaProgress));
    localStorage.setItem('spacedRepetition', JSON.stringify(studyStats.spacedRepetition));
    localStorage.setItem('hearts', studyStats.hearts.toString());
    localStorage.setItem('lastHeartLoss', studyStats.lastHeartLoss.toString());
    localStorage.setItem('skillProgress', JSON.stringify(studyStats.skillProgress));
    localStorage.setItem('achievements', JSON.stringify(studyStats.achievements));
    localStorage.setItem('dailyQuests', JSON.stringify(studyStats.dailyQuests));
    localStorage.setItem('lastQuestDate', studyStats.lastQuestDate);
    localStorage.setItem('perfectLessons', studyStats.perfectLessons.toString());
    localStorage.setItem('exercisesCompleted', studyStats.exercisesCompleted.toString());
}

// Update load function
function loadStudyStats() {
    const studied = localStorage.getItem('wordsStudied');
    const mastered = localStorage.getItem('wordsMastered');
    
    if (studied) {
        studyStats.wordsStudied = new Set(JSON.parse(studied));
    }
    if (mastered) {
        studyStats.wordsMastered = new Set(JSON.parse(mastered));
    }
    
    // Load additional stats
    const dayProgress = localStorage.getItem('dayProgress');
    if (dayProgress) {
        studyStats.dayProgress = JSON.parse(dayProgress);
    }
    const kanaProgress = localStorage.getItem('kanaProgress');
    if (kanaProgress) {
        studyStats.kanaProgress = JSON.parse(kanaProgress);
    }
    const spacedRepetition = localStorage.getItem('spacedRepetition');
    if (spacedRepetition) {
        studyStats.spacedRepetition = JSON.parse(spacedRepetition);
    }
    const skillProgress = localStorage.getItem('skillProgress');
    if (skillProgress) {
        studyStats.skillProgress = JSON.parse(skillProgress);
    }
    const achievements = localStorage.getItem('achievements');
    if (achievements) {
        studyStats.achievements = JSON.parse(achievements);
    }
    const dailyQuests = localStorage.getItem('dailyQuests');
    if (dailyQuests) {
        studyStats.dailyQuests = JSON.parse(dailyQuests);
    }
}

// Update XP display to include header
function updateXPDisplay() {
    const totalXPEl = document.getElementById('totalXP');
    const headerXPEl = document.getElementById('headerXP');
    const dailyXPEl = document.getElementById('dailyXP');
    const dailyGoalEl = document.getElementById('dailyGoal');
    const dailyGoalProgress = document.getElementById('dailyGoalProgress');
    
    if (totalXPEl) totalXPEl.textContent = studyStats.totalXP;
    if (headerXPEl) headerXPEl.textContent = studyStats.totalXP;
    if (dailyXPEl) dailyXPEl.textContent = studyStats.dailyXP;
    if (dailyGoalEl) {
        const today = new Date();
        const startDate = localStorage.getItem('startDate') || today.toDateString();
        const daysSinceStart = Math.floor((today - new Date(startDate)) / (1000 * 60 * 60 * 24));
        const currentDayPlan = learningPlan.find(p => p.day === daysSinceStart + 1);
        if (currentDayPlan) {
            dailyGoalEl.textContent = currentDayPlan.xpGoal || 20;
            const goal = currentDayPlan.xpGoal || 20;
            const progress = Math.min(100, (studyStats.dailyXP / goal) * 100);
            if (dailyGoalProgress) {
                dailyGoalProgress.style.width = `${progress}%`;
            }
        }
    }
}
