// API base URL
const API_BASE = 'http://localhost:5000/api';

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
            select.innerHTML = '<option value="">Select a day...</option>';
            data.days.forEach(day => {
                const option = document.createElement('option');
                option.value = day.day;
                option.textContent = `Day ${day.day} - ${day.title}`;
                select.appendChild(option);
            });
            
            // Add "All Days" option for flashcard and quiz
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
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        const voices = window.speechSynthesis.getVoices();
        const japaneseVoice = voices.find(voice => 
            voice.lang.startsWith('ja') || 
            voice.name.toLowerCase().includes('japanese')
        );
        
        if (japaneseVoice) {
            utterance.voice = japaneseVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert('Text-to-speech is not supported in your browser.');
    }
}

// Load voices when available
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        console.log('Voices loaded:', window.speechSynthesis.getVoices().length);
    };
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
        loadFlashcards();
    } else if (mode === 'quiz') {
        resetQuiz();
    } else if (mode === 'stats') {
        updateStatistics();
    }
}

// Flashcard functions
async function loadFlashcards() {
    const daySelect = document.getElementById('flashcardDaySelect');
    const selectedDay = daySelect.value;
    
    if (selectedDay) {
        const response = await fetch(`${API_BASE}/words/${selectedDay}`);
        const data = await response.json();
        flashcardWords = data.words || [];
    } else {
        // Load all words from all days
        flashcardWords = [];
        for (const dayNum of Object.keys(allDaysData).sort((a, b) => parseInt(a) - parseInt(b))) {
            const response = await fetch(`${API_BASE}/words/${dayNum}`);
            const data = await response.json();
            if (data.words) {
                flashcardWords = flashcardWords.concat(data.words);
            }
        }
    }
    
    // Shuffle cards
    flashcardWords = shuffleArray([...flashcardWords]);
    currentFlashcardIndex = 0;
    showFlashcard();
}

function showFlashcard() {
    if (flashcardWords.length === 0) {
        document.getElementById('flashcardWrapper').innerHTML = 
            '<div class="empty-state"><h2>No words available</h2></div>';
        return;
    }
    
    const card = flashcardWords[currentFlashcardIndex];
    const flashcard = document.getElementById('flashcard');
    
    // Reset flip state
    flashcard.classList.remove('flipped');
    
    // Update front
    document.getElementById('flashcardJapanese').textContent = card.japanese;
    document.getElementById('flashcardFurigana').textContent = card.furigana || '';
    
    // Update back
    document.getElementById('flashcardJapaneseBack').textContent = card.japanese;
    document.getElementById('flashcardFuriganaBack').textContent = card.furigana || '';
    document.getElementById('flashcardTranslation').textContent = card.translation;
    
    // Update progress
    document.getElementById('flashcardProgress').textContent = 
        `${currentFlashcardIndex + 1} / ${flashcardWords.length}`;
}

function flipCard() {
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.toggle('flipped');
}

function nextCard() {
    if (currentFlashcardIndex < flashcardWords.length - 1) {
        currentFlashcardIndex++;
        showFlashcard();
    }
}

function previousCard() {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        showFlashcard();
    }
}

function rateCard(isEasy) {
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
