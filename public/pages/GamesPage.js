// Games Page Component - Anime/Manga themed learning games
import api from '../utils/api.js';
import { showError, escapeHtml, shuffleArray } from '../utils/helpers.js';
import { studyStats, saveStudyStats } from '../services/studyStats.js';
import { addXP } from '../services/xpService.js';

let currentGame = null;
let gameScore = 0;
let gameWords = [];

export async function init() {
    console.log('GamesPage.init called');
}

export async function load() {
    console.log('GamesPage.load called');
    renderGamesHub();
}

function renderGamesHub() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    gamesContent.innerHTML = `
        <div class="games-hub">
            <div class="games-header glass">
                <h2>🎮 Anime Learning Games</h2>
                <p>Learn Japanese through fun anime-themed games!</p>
            </div>
            
            <div class="games-grid">
                <div class="game-card" onclick="window.gamesPage.startGame('word-match')">
                    <div class="game-icon">🎯</div>
                    <h3>Word Match</h3>
                    <p>Match Japanese words to anime scenes</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('word-match')}</span>
                    </div>
                </div>
                
                <div class="game-card" onclick="window.gamesPage.startGame('sentence-builder')">
                    <div class="game-icon">🧩</div>
                    <h3>Sentence Builder</h3>
                    <p>Build sentences from anime dialogue</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('sentence-builder')}</span>
                    </div>
                </div>
                
                <div class="game-card" onclick="window.gamesPage.startGame('speed-challenge')">
                    <div class="game-icon">⚡</div>
                    <h3>Speed Challenge</h3>
                    <p>Race against time to match words</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('speed-challenge')}</span>
                    </div>
                </div>
                
                <div class="game-card" onclick="window.gamesPage.startGame('memory-game')">
                    <div class="game-icon">🧠</div>
                    <h3>Memory Game</h3>
                    <p>Remember words from anime scenes</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('memory-game')}</span>
                    </div>
                </div>
                
                <div class="game-card" onclick="window.gamesPage.startGame('character-quiz')">
                    <div class="game-icon">👤</div>
                    <h3>Character Quiz</h3>
                    <p>Learn words through anime characters</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('character-quiz')}</span>
                    </div>
                </div>
                
                <div class="game-card" onclick="window.gamesPage.startGame('context-guess')">
                    <div class="game-icon">🎬</div>
                    <h3>Context Guess</h3>
                    <p>Guess meaning from anime context</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('context-guess')}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export async function startGame(gameType) {
    currentGame = gameType;
    gameScore = 0;
    
    try {
        // Load words for the game
        const daysData = await api.get('/days');
        if (!daysData.days || daysData.days.length === 0) {
            showError('No words available for games');
            return;
        }
        
        // Get words from multiple days
        gameWords = [];
        for (const dayInfo of daysData.days.slice(0, 5)) {
            try {
                const wordsData = await api.get(`/words/${dayInfo.day}`);
                if (wordsData.words) {
                    gameWords = gameWords.concat(wordsData.words);
                }
            } catch (error) {
                console.error(`Error loading words for day ${dayInfo.day}:`, error);
            }
        }
        
        if (gameWords.length === 0) {
            showError('No words available');
            return;
        }
        
        // Shuffle words
        gameWords = shuffleArray(gameWords);
        
        // Switch to game mode
        if (window.app && window.app.switchMode) {
            window.app.switchMode('games');
        }
        
        // Start specific game
        switch (gameType) {
            case 'word-match':
                startWordMatchGame();
                break;
            case 'sentence-builder':
                startSentenceBuilderGame();
                break;
            case 'speed-challenge':
                startSpeedChallengeGame();
                break;
            case 'memory-game':
                startMemoryGame();
                break;
            case 'character-quiz':
                startCharacterQuiz();
                break;
            case 'context-guess':
                startContextGuessGame();
                break;
            default:
                showError('Unknown game type');
        }
        
    } catch (error) {
        console.error('Error starting game:', error);
        showError(`Failed to start game: ${error.message}`);
    }
}

function startWordMatchGame() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    let currentWordIndex = 0;
    let correctMatches = 0;
    const maxRounds = 10;
    
    function renderRound() {
        if (currentWordIndex >= maxRounds || currentWordIndex >= gameWords.length) {
            endGame('word-match', gameScore);
            return;
        }
        
        const word = gameWords[currentWordIndex];
        const wrongOptions = shuffleArray(gameWords.filter(w => w.japanese !== word.japanese)).slice(0, 3);
        const allOptions = shuffleArray([word.translation, ...wrongOptions.map(w => w.translation)]);
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>🎯 Word Match</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-progress">Round ${currentWordIndex + 1} / ${maxRounds}</div>
                </div>
                
                <div class="word-match-game">
                    <div class="japanese-word-display">
                        <div class="japanese-text-large">${escapeHtml(word.japanese)}</div>
                        ${word.furigana ? `<div class="furigana-text">${escapeHtml(word.furigana)}</div>` : ''}
                        <button class="premium-btn audio-btn" onclick="speakJapanese('${escapeHtml(word.japanese)}')">
                            🔊 Listen
                        </button>
                    </div>
                    
                    <div class="match-options">
                        ${allOptions.map((option, idx) => `
                            <button class="match-option" onclick="window.gamesPage.selectMatch('${escapeHtml(option)}', '${escapeHtml(word.translation)}', ${currentWordIndex})">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    window.gamesPage.selectMatch = (selected, correct, roundIndex) => {
        if (roundIndex !== currentWordIndex) return; // Prevent double-clicking
        
        const isCorrect = selected === correct;
        if (isCorrect) {
            gameScore += 10;
            correctMatches++;
            if (window.celebrationService) {
                window.celebrationService.celebrate('Correct! +10', 'success', 1000);
            }
        } else {
            if (window.celebrationService) {
                window.celebrationService.celebrate('Wrong!', 'error', 1000);
            }
        }
        
        setTimeout(() => {
            currentWordIndex++;
            renderRound();
        }, 1500);
    };
    
    renderRound();
}

function startSentenceBuilderGame() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    let currentRound = 0;
    let correctSentences = 0;
    const maxRounds = 8;
    
    // Create sentence templates from anime context
    const sentenceTemplates = [
        { japanese: 'こんにちは、元気ですか？', english: 'Hello, how are you?', parts: ['Hello', 'how are you?'] },
        { japanese: '今日はいい天気ですね', english: 'The weather is nice today', parts: ['The weather', 'is nice', 'today'] },
        { japanese: 'ありがとうございます', english: 'Thank you very much', parts: ['Thank you', 'very much'] },
        { japanese: 'おはようございます', english: 'Good morning', parts: ['Good', 'morning'] },
        { japanese: 'おやすみなさい', english: 'Good night', parts: ['Good', 'night'] },
        { japanese: 'すみません', english: 'Excuse me', parts: ['Excuse', 'me'] },
        { japanese: '頑張ってください', english: 'Do your best', parts: ['Do', 'your', 'best'] },
        { japanese: '大丈夫です', english: "It's okay", parts: ["It's", 'okay'] }
    ];
    
    function renderRound() {
        if (currentRound >= maxRounds || currentRound >= sentenceTemplates.length) {
            endGame('sentence-builder', gameScore);
            return;
        }
        
        const template = sentenceTemplates[currentRound];
        const shuffledParts = shuffleArray([...template.parts]);
        const wrongParts = shuffleArray(gameWords.slice(0, 6).map(w => w.translation)).slice(0, 3);
        const allParts = shuffleArray([...shuffledParts, ...wrongParts]);
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>🧩 Sentence Builder</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-progress">Round ${currentRound + 1} / ${maxRounds}</div>
                </div>
                
                <div class="sentence-builder-game">
                    <div class="sentence-display">
                        <div class="japanese-sentence">${escapeHtml(template.japanese)}</div>
                        <button class="premium-btn audio-btn" onclick="speakJapanese('${escapeHtml(template.japanese)}')">
                            🔊 Listen
                        </button>
                    </div>
                    
                    <div class="sentence-parts-container">
                        <h3>Build the sentence:</h3>
                        <div class="sentence-parts-available" id="availableParts">
                            ${allParts.map((part, idx) => `
                                <button class="sentence-part" data-part="${escapeHtml(part)}" onclick="window.gamesPage.selectPart('${escapeHtml(part)}', ${currentRound})">
                                    ${escapeHtml(part)}
                                </button>
                            `).join('')}
                        </div>
                        
                        <div class="sentence-builder-area" id="builderArea">
                            <p class="builder-hint">Click parts to build the sentence</p>
                            <div class="built-sentence" id="builtSentence"></div>
                        </div>
                        
                        <div class="sentence-actions">
                            <button class="premium-btn" onclick="window.gamesPage.clearSentence(${currentRound})">Clear</button>
                            <button class="premium-btn primary" onclick="window.gamesPage.checkSentence(${currentRound}, '${escapeHtml(template.english)}')">Check</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        window.gamesPage.selectedParts = [];
    }
    
    window.gamesPage.selectPart = (part, roundIndex) => {
        if (roundIndex !== currentRound) return;
        
        if (!window.gamesPage.selectedParts) window.gamesPage.selectedParts = [];
        
        // Remove from available, add to built
        const partBtn = document.querySelector(`[data-part="${escapeHtml(part)}"]`);
        if (partBtn && partBtn.parentElement.id === 'availableParts') {
            partBtn.remove();
            window.gamesPage.selectedParts.push(part);
            
            // Add to built sentence
            const builtArea = document.getElementById('builtSentence');
            if (builtArea) {
                const partEl = document.createElement('button');
                partEl.className = 'sentence-part built';
                partEl.textContent = part;
                partEl.onclick = () => {
                    partEl.remove();
                    window.gamesPage.selectedParts = window.gamesPage.selectedParts.filter(p => p !== part);
                    document.getElementById('availableParts').appendChild(partBtn);
                };
                builtArea.appendChild(partEl);
            }
        }
    };
    
    window.gamesPage.clearSentence = (roundIndex) => {
        if (roundIndex !== currentRound) return;
        window.gamesPage.selectedParts = [];
        renderRound();
    };
    
    window.gamesPage.checkSentence = (roundIndex, correctAnswer) => {
        if (roundIndex !== currentRound) return;
        
        const builtSentence = window.gamesPage.selectedParts.join(' ').toLowerCase().trim();
        const correct = correctAnswer.toLowerCase().trim();
        const isCorrect = builtSentence === correct || 
                         builtSentence.replace(/[^\w\s]/g, '') === correct.replace(/[^\w\s]/g, '');
        
        if (isCorrect) {
            gameScore += 15;
            correctSentences++;
            if (window.celebrationService) {
                window.celebrationService.celebrate('Perfect! +15', 'success', 1000);
            }
        } else {
            if (window.celebrationService) {
                window.celebrationService.celebrate('Not quite right', 'error', 1000);
            }
        }
        
        setTimeout(() => {
            currentRound++;
            renderRound();
        }, 2000);
    };
    
    renderRound();
}

function startSpeedChallengeGame() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    let timeLeft = 60; // 60 seconds
    let currentWordIndex = 0;
    let correctAnswers = 0;
    
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('speedTimer');
        if (timerEl) {
            timerEl.textContent = timeLeft;
            if (timeLeft <= 10) {
                timerEl.style.color = 'var(--danger)';
            }
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endGame('speed-challenge', gameScore);
        }
    }, 1000);
    
    function renderRound() {
        if (currentWordIndex >= gameWords.length || timeLeft <= 0) {
            clearInterval(timerInterval);
            endGame('speed-challenge', gameScore);
            return;
        }
        
        const word = gameWords[currentWordIndex];
        const wrongOptions = shuffleArray(gameWords.filter(w => w.japanese !== word.japanese)).slice(0, 3);
        const allOptions = shuffleArray([word.translation, ...wrongOptions.map(w => w.translation)]);
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>⚡ Speed Challenge</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-timer" id="speedTimer">${timeLeft}</div>
                </div>
                
                <div class="speed-game">
                    <div class="japanese-word-display">
                        <div class="japanese-text-large">${escapeHtml(word.japanese)}</div>
                        ${word.furigana ? `<div class="furigana-text">${escapeHtml(word.furigana)}</div>` : ''}
                    </div>
                    
                    <div class="speed-options">
                        ${allOptions.map((option, idx) => `
                            <button class="speed-option" onclick="window.gamesPage.selectSpeedAnswer('${escapeHtml(option)}', '${escapeHtml(word.translation)}', ${currentWordIndex}, ${timerInterval})">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    window.gamesPage.selectSpeedAnswer = (selected, correct, roundIndex, interval) => {
        if (roundIndex !== currentWordIndex) return;
        
        const isCorrect = selected === correct;
        if (isCorrect) {
            gameScore += Math.max(5, Math.floor(timeLeft / 10)); // Bonus for speed
            correctAnswers++;
            currentWordIndex++;
            renderRound();
        } else {
            // Wrong answer - lose time
            timeLeft = Math.max(0, timeLeft - 5);
            currentWordIndex++;
            renderRound();
        }
    };
    
    renderRound();
}

function startMemoryGame() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    let currentRound = 0;
    let matchedPairs = 0;
    let flippedCards = [];
    let matchedCards = new Set();
    const maxRounds = 6;
    const cardsPerRound = 8; // 4 pairs
    
    function createMemoryCards() {
        const selectedWords = gameWords.slice(currentRound * 4, (currentRound + 1) * 4);
        const cards = [];
        
        selectedWords.forEach(word => {
            cards.push({ type: 'japanese', content: word.japanese, pair: word.translation, id: `j-${word.japanese}` });
            cards.push({ type: 'translation', content: word.translation, pair: word.japanese, id: `t-${word.translation}` });
        });
        
        return shuffleArray(cards);
    }
    
    function renderRound() {
        if (currentRound >= maxRounds) {
            endGame('memory-game', gameScore);
            return;
        }
        
        const cards = createMemoryCards();
        flippedCards = [];
        matchedCards.clear();
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>🧠 Memory Game</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-progress">Round ${currentRound + 1} / ${maxRounds}</div>
                </div>
                
                <div class="memory-game">
                    <p class="game-instruction">Match Japanese words with their translations!</p>
                    <div class="memory-grid" id="memoryGrid">
                        ${cards.map((card, idx) => `
                            <div class="memory-card" data-card-id="${card.id}" data-pair="${escapeHtml(card.pair)}" onclick="window.gamesPage.flipMemoryCard(${idx}, '${card.id}', '${escapeHtml(card.type)}', '${escapeHtml(card.content)}', '${escapeHtml(card.pair)}', ${currentRound})">
                                <div class="memory-card-front">?</div>
                                <div class="memory-card-back">${escapeHtml(card.content)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    window.gamesPage.flipMemoryCard = (index, cardId, type, content, pair, roundIndex) => {
        if (roundIndex !== currentRound) return;
        if (matchedCards.has(cardId) || flippedCards.length >= 2) return;
        
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        if (!card || card.classList.contains('flipped') || card.classList.contains('matched')) return;
        
        card.classList.add('flipped');
        flippedCards.push({ cardId, type, content, pair, element: card });
        
        if (flippedCards.length === 2) {
            const [card1, card2] = flippedCards;
            const isMatch = (card1.type === 'japanese' && card2.content === card1.pair) ||
                          (card1.type === 'translation' && card2.content === card1.pair) ||
                          (card2.type === 'japanese' && card1.content === card2.pair) ||
                          (card2.type === 'translation' && card1.content === card2.pair);
            
            setTimeout(() => {
                if (isMatch) {
                    card1.element.classList.add('matched');
                    card2.element.classList.add('matched');
                    matchedCards.add(card1.cardId);
                    matchedCards.add(card2.cardId);
                    gameScore += 20;
                    matchedPairs++;
                    
                    if (matchedPairs === 4) {
                        setTimeout(() => {
                            currentRound++;
                            matchedPairs = 0;
                            renderRound();
                        }, 1000);
                    }
                } else {
                    card1.element.classList.remove('flipped');
                    card2.element.classList.remove('flipped');
                }
                flippedCards = [];
            }, 1000);
        }
    };
    
    renderRound();
}

function startCharacterQuiz() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    let currentRound = 0;
    let correctAnswers = 0;
    const maxRounds = 10;
    
    // Character-themed questions
    const characterQuestions = [
        { character: '👨‍🎓 Student', context: 'In school, a student says:', word: '先生', translation: 'teacher' },
        { character: '👨‍🍳 Chef', context: 'In a restaurant, a chef says:', word: '美味しい', translation: 'delicious' },
        { character: '⚔️ Warrior', context: 'In battle, a warrior says:', word: '頑張る', translation: 'to do one\'s best' },
        { character: '👩‍🎨 Artist', context: 'Creating art, an artist says:', word: '美しい', translation: 'beautiful' },
        { character: '🏃 Runner', context: 'Running, an athlete says:', word: '速い', translation: 'fast' },
        { character: '😊 Friend', context: 'Greeting a friend, they say:', word: '元気', translation: 'energetic/healthy' },
        { character: '🎭 Actor', context: 'On stage, an actor says:', word: '面白い', translation: 'interesting/funny' },
        { character: '📚 Scholar', context: 'Studying, a scholar says:', word: '勉強', translation: 'study' },
        { character: '🍱 Foodie', context: 'Eating, a foodie says:', word: 'お腹', translation: 'stomach' },
        { character: '🌙 Night Owl', context: 'At night, someone says:', word: '眠い', translation: 'sleepy' }
    ];
    
    function renderRound() {
        if (currentRound >= maxRounds || currentRound >= characterQuestions.length) {
            endGame('character-quiz', gameScore);
            return;
        }
        
        const question = characterQuestions[currentRound];
        const wrongOptions = shuffleArray(gameWords.filter(w => w.translation !== question.translation))
            .slice(0, 3)
            .map(w => w.translation);
        const allOptions = shuffleArray([question.translation, ...wrongOptions]);
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>👤 Character Quiz</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-progress">Round ${currentRound + 1} / ${maxRounds}</div>
                </div>
                
                <div class="character-quiz-game">
                    <div class="character-display">
                        <div class="character-icon">${question.character}</div>
                        <div class="character-context">${escapeHtml(question.context)}</div>
                        <div class="japanese-word-display">
                            <div class="japanese-text-large">${escapeHtml(question.word)}</div>
                            <button class="premium-btn audio-btn" onclick="speakJapanese('${escapeHtml(question.word)}')">
                                🔊 Listen
                            </button>
                        </div>
                    </div>
                    
                    <div class="quiz-question">
                        <h3>What does this word mean in this context?</h3>
                    </div>
                    
                    <div class="character-options">
                        ${allOptions.map((option, idx) => `
                            <button class="character-option" onclick="window.gamesPage.selectCharacterAnswer('${escapeHtml(option)}', '${escapeHtml(question.translation)}', ${currentRound})">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    window.gamesPage.selectCharacterAnswer = (selected, correct, roundIndex) => {
        if (roundIndex !== currentRound) return;
        
        const isCorrect = selected === correct;
        if (isCorrect) {
            gameScore += 12;
            correctAnswers++;
            if (window.celebrationService) {
                window.celebrationService.celebrate('Correct! +12', 'success', 1000);
            }
        } else {
            if (window.celebrationService) {
                window.celebrationService.celebrate('Wrong!', 'error', 1000);
            }
        }
        
        setTimeout(() => {
            currentRound++;
            renderRound();
        }, 1500);
    };
    
    renderRound();
}

function startContextGuessGame() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    let currentRound = 0;
    let correctGuesses = 0;
    const maxRounds = 10;
    
    // Anime/manga context scenarios
    const contextScenarios = [
        { 
            scene: '🏫 School Scene',
            context: 'A student enters the classroom and greets the teacher.',
            sentence: 'こんにちは、先生',
            blankWord: '先生',
            translation: 'teacher',
            options: ['teacher', 'student', 'friend', 'classmate']
        },
        {
            scene: '🍱 Lunch Scene',
            context: 'Friends are eating lunch together.',
            sentence: 'この料理は美味しい',
            blankWord: '美味しい',
            translation: 'delicious',
            options: ['delicious', 'hot', 'cold', 'big']
        },
        {
            scene: '⚔️ Battle Scene',
            context: 'A warrior prepares for battle.',
            sentence: '頑張ります',
            blankWord: '頑張ります',
            translation: 'I will do my best',
            options: ['I will do my best', 'I am tired', 'I am scared', 'I am happy']
        },
        {
            scene: '🌙 Evening Scene',
            context: 'It\'s getting late, someone is tired.',
            sentence: 'おやすみなさい',
            blankWord: 'おやすみなさい',
            translation: 'good night',
            options: ['good night', 'good morning', 'good afternoon', 'goodbye']
        },
        {
            scene: '🎉 Celebration Scene',
            context: 'Friends are celebrating together.',
            sentence: 'おめでとうございます',
            blankWord: 'おめでとう',
            translation: 'congratulations',
            options: ['congratulations', 'thank you', 'excuse me', 'sorry']
        },
        {
            scene: '📚 Study Scene',
            context: 'A student is studying hard.',
            sentence: '勉強します',
            blankWord: '勉強',
            translation: 'study',
            options: ['study', 'play', 'eat', 'sleep']
        },
        {
            scene: '🤝 Friendship Scene',
            context: 'Friends meet and greet each other.',
            sentence: '元気ですか？',
            blankWord: '元気',
            translation: 'energetic/healthy',
            options: ['energetic/healthy', 'sad', 'angry', 'confused']
        },
        {
            scene: '🍜 Food Scene',
            context: 'Someone is very hungry.',
            sentence: 'お腹が空きました',
            blankWord: 'お腹',
            translation: 'stomach',
            options: ['stomach', 'head', 'hand', 'foot']
        },
        {
            scene: '🌅 Morning Scene',
            context: 'It\'s early morning, someone greets.',
            sentence: 'おはようございます',
            blankWord: 'おはよう',
            translation: 'good morning',
            options: ['good morning', 'good evening', 'good night', 'hello']
        },
        {
            scene: '💪 Training Scene',
            context: 'Someone is training hard.',
            sentence: '速く走ります',
            blankWord: '速く',
            translation: 'fast',
            options: ['fast', 'slow', 'carefully', 'loudly']
        }
    ];
    
    function renderRound() {
        if (currentRound >= maxRounds || currentRound >= contextScenarios.length) {
            endGame('context-guess', gameScore);
            return;
        }
        
        const scenario = contextScenarios[currentRound];
        const sentenceWithBlank = scenario.sentence.replace(scenario.blankWord, '______');
        const shuffledOptions = shuffleArray([...scenario.options]);
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>🎬 Context Guess</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-progress">Round ${currentRound + 1} / ${maxRounds}</div>
                </div>
                
                <div class="context-guess-game">
                    <div class="context-scene">
                        <div class="scene-icon">${scenario.scene}</div>
                        <div class="scene-context">${escapeHtml(scenario.context)}</div>
                    </div>
                    
                    <div class="context-sentence">
                        <div class="japanese-sentence">${escapeHtml(sentenceWithBlank)}</div>
                        <button class="premium-btn audio-btn" onclick="speakJapanese('${escapeHtml(scenario.sentence)}')">
                            🔊 Listen
                        </button>
                    </div>
                    
                    <div class="context-question">
                        <h3>What word fits in the blank based on the context?</h3>
                    </div>
                    
                    <div class="context-options">
                        ${shuffledOptions.map((option, idx) => `
                            <button class="context-option" onclick="window.gamesPage.selectContextAnswer('${escapeHtml(option)}', '${escapeHtml(scenario.translation)}', ${currentRound})">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    window.gamesPage.selectContextAnswer = (selected, correct, roundIndex) => {
        if (roundIndex !== currentRound) return;
        
        const isCorrect = selected.toLowerCase().trim() === correct.toLowerCase().trim();
        if (isCorrect) {
            gameScore += 15;
            correctGuesses++;
            if (window.celebrationService) {
                window.celebrationService.celebrate('Perfect! +15', 'success', 1000);
            }
        } else {
            if (window.celebrationService) {
                window.celebrationService.celebrate('Not quite', 'error', 1000);
            }
        }
        
        setTimeout(() => {
            currentRound++;
            renderRound();
        }, 1500);
    };
    
    renderRound();
}

function endGame(gameType, finalScore) {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    // Save high score
    const highScore = getHighScore(gameType);
    if (finalScore > highScore) {
        saveHighScore(gameType, finalScore);
    }
    
    // Award XP
    const xpGained = Math.floor(finalScore / 10);
    if (window.xpService) {
        window.xpService.addXP(xpGained, `${gameType} game`);
    }
    
    gamesContent.innerHTML = `
        <div class="game-results">
            <div class="results-icon">🎮</div>
            <h2>Game Over!</h2>
            <div class="final-score">Final Score: ${finalScore}</div>
            <div class="xp-gained">+${xpGained} XP</div>
            ${finalScore > highScore ? '<div class="new-record">🏆 New High Score!</div>' : ''}
            <div class="game-actions">
                <button class="premium-btn" onclick="window.gamesPage.startGame('${gameType}')">Play Again</button>
                <button class="premium-btn secondary" onclick="window.gamesPage.renderGamesHub()">Back to Games</button>
            </div>
        </div>
    `;
    
    if (finalScore > highScore && window.celebrationService) {
        window.celebrationService.celebrate('New High Score! 🏆', 'achievement');
    }
}

function getHighScore(gameType) {
    const highScores = JSON.parse(localStorage.getItem('gameHighScores') || '{}');
    return highScores[gameType] || 0;
}

function saveHighScore(gameType, score) {
    const highScores = JSON.parse(localStorage.getItem('gameHighScores') || '{}');
    highScores[gameType] = score;
    localStorage.setItem('gameHighScores', JSON.stringify(highScores));
}

// Export for global access
window.gamesPage = {
    init,
    load,
    startGame,
    renderGamesHub,
    selectMatch: null,
    selectSpeedAnswer: null
};

