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
                
                <div class="game-card" onclick="window.gamesPage.startGame('combo-game')">
                    <div class="game-icon">🔥</div>
                    <h3>Combo Chain</h3>
                    <p>Chain correct answers for massive combos!</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('combo-game')}</span>
                    </div>
                </div>
                
                <div class="game-card" onclick="window.gamesPage.startGame('speed-typing')">
                    <div class="game-icon">⌨️</div>
                    <h3>Speed Typing</h3>
                    <p>Type Japanese words as fast as you can!</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('speed-typing')}</span>
                    </div>
                </div>
                
                <div class="game-card" onclick="window.gamesPage.startGame('word-association')">
                    <div class="game-icon">🔗</div>
                    <h3>Word Association</h3>
                    <p>Connect related Japanese words</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('word-association')}</span>
                    </div>
                </div>
                
                <div class="game-card" onclick="window.gamesPage.startGame('sentence-completion')">
                    <div class="game-icon">✍️</div>
                    <h3>Sentence Completion</h3>
                    <p>Complete anime sentences correctly</p>
                    <div class="game-stats">
                        <span>High Score: ${getHighScore('sentence-completion')}</span>
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
            case 'combo-game':
                startComboGame();
                break;
            case 'speed-typing':
                startSpeedTypingGame();
                break;
            case 'word-association':
                startWordAssociationGame();
                break;
            case 'sentence-completion':
                startSentenceCompletionGame();
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
                        <button class="premium-btn audio-btn" onclick="window.speakJapanese && window.speakJapanese('${escapeHtml(word.japanese)}')">
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
                        <button class="premium-btn audio-btn" onclick="window.speakJapanese && window.speakJapanese('${escapeHtml(template.japanese)}')">
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
                            <button class="premium-btn audio-btn" onclick="window.speakJapanese && window.speakJapanese('${escapeHtml(question.word)}')">
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
                        <button class="premium-btn audio-btn" onclick="window.speakJapanese && window.speakJapanese('${escapeHtml(scenario.sentence)}')">
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

// Combo Game - Chain correct answers for massive combos
function startComboGame() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    let currentWordIndex = 0;
    let combo = 0;
    let maxCombo = 0;
    let timeLeft = 60; // 60 seconds
    let timerInterval = null;
    
    function updateComboDisplay() {
        const comboDisplay = document.getElementById('comboDisplay');
        if (comboDisplay) {
            comboDisplay.innerHTML = `
                <div class="combo-counter">
                    <span class="combo-label">🔥 COMBO</span>
                    <span class="combo-value">${combo}</span>
                    <span class="combo-multiplier">x${Math.floor(combo / 5) + 1}</span>
                </div>
            `;
        }
    }
    
    function showComboAnimation() {
        if (combo > 0 && combo % 5 === 0) {
            const comboText = document.createElement('div');
            comboText.className = 'combo-display';
            comboText.innerHTML = `<div class="combo-text">${combo} COMBO!</div>`;
            document.body.appendChild(comboText);
            setTimeout(() => comboText.remove(), 1000);
        }
    }
    
    function renderRound() {
        if (timeLeft <= 0 || currentWordIndex >= gameWords.length) {
            clearInterval(timerInterval);
            endGame('combo-game', gameScore);
            return;
        }
        
        const word = gameWords[currentWordIndex];
        const wrongOptions = shuffleArray(gameWords.filter(w => w.japanese !== word.japanese)).slice(0, 3);
        const allOptions = shuffleArray([word.translation, ...wrongOptions.map(w => w.translation)]);
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>🔥 Combo Chain</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-timer">⏱️ ${timeLeft}s</div>
                </div>
                
                <div id="comboDisplay"></div>
                
                <div class="combo-game">
                    <div class="japanese-word-display">
                        <div class="japanese-text-large">${escapeHtml(word.japanese)}</div>
                        ${word.furigana ? `<div class="furigana-text">${escapeHtml(word.furigana)}</div>` : ''}
                    </div>
                    
                    <div class="match-options">
                        ${allOptions.map((option, idx) => `
                            <button class="match-option" onclick="window.gamesPage.selectComboAnswer('${escapeHtml(option)}', '${escapeHtml(word.translation)}', ${currentWordIndex})">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        updateComboDisplay();
    }
    
    // Start timer
    timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.querySelector('.game-timer');
        if (timerEl) timerEl.textContent = `⏱️ ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            renderRound();
        }
    }, 1000);
    
    window.gamesPage.selectComboAnswer = (selected, correct, roundIndex) => {
        if (roundIndex !== currentWordIndex) return;
        
        const isCorrect = selected === correct;
        if (isCorrect) {
            combo++;
            maxCombo = Math.max(maxCombo, combo);
            const multiplier = Math.floor(combo / 5) + 1;
            gameScore += 10 * multiplier;
            
            showComboAnimation();
            updateComboDisplay();
            
            if (window.celebrationService) {
                window.celebrationService.celebrate(`+${10 * multiplier} (${combo} combo!)`, 'success', 1000);
            }
        } else {
            combo = 0;
            updateComboDisplay();
            if (window.celebrationService) {
                window.celebrationService.celebrate('Combo broken!', 'error', 1000);
            }
        }
        
        setTimeout(() => {
            currentWordIndex++;
            renderRound();
        }, 1500);
    };
    
    renderRound();
}

// Speed Typing Game
function startSpeedTypingGame() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    let currentWordIndex = 0;
    let correctTypings = 0;
    let startTime = Date.now();
    let userInput = '';
    
    function renderRound() {
        if (currentWordIndex >= 20 || currentWordIndex >= gameWords.length) {
            const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
            const wpm = Math.round((correctTypings / timeElapsed) * 60);
            gameScore = correctTypings * 10 + wpm;
            endGame('speed-typing', gameScore);
            return;
        }
        
        const word = gameWords[currentWordIndex];
        userInput = '';
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>⌨️ Speed Typing</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-progress">Word ${currentWordIndex + 1} / 20</div>
                </div>
                
                <div class="speed-typing-game">
                    <div class="word-to-type">
                        <div class="japanese-text-large">${escapeHtml(word.japanese)}</div>
                        <div class="word-translation">${escapeHtml(word.translation)}</div>
                        ${word.furigana ? `<div class="furigana-text">${escapeHtml(word.furigana)}</div>` : ''}
                    </div>
                    
                    <div class="typing-input-container">
                        <input type="text" id="typingInput" class="typing-input" placeholder="Type the Japanese word..." autofocus>
                        <div class="typing-hint">Type: <strong>${escapeHtml(word.japanese)}</strong></div>
                    </div>
                    
                    <div class="typing-stats">
                        <div>Correct: ${correctTypings}</div>
                        <div>Time: ${Math.floor((Date.now() - startTime) / 1000)}s</div>
                    </div>
                </div>
            </div>
        `;
        
        const input = document.getElementById('typingInput');
        if (input) {
            input.addEventListener('input', (e) => {
                userInput = e.target.value;
                if (userInput === word.japanese) {
                    correctTypings++;
                    gameScore += 10;
                    if (window.celebrationService) {
                        window.celebrationService.celebrate('Correct!', 'success', 500);
                    }
                    setTimeout(() => {
                        currentWordIndex++;
                        renderRound();
                    }, 500);
                }
            });
            
            input.focus();
        }
    }
    
    renderRound();
}

// Word Association Game
function startWordAssociationGame() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    let currentRound = 0;
    let correctAssociations = 0;
    const maxRounds = 10;
    
    // Create word associations
    const associations = [
        { word: '食べ物', translation: 'food', related: ['ご飯', 'お茶', '果物'] },
        { word: '学校', translation: 'school', related: ['学生', '先生', '勉強'] },
        { word: '家族', translation: 'family', related: ['父', '母', '兄弟'] },
        { word: '時間', translation: 'time', related: ['朝', '昼', '夜'] },
        { word: '色', translation: 'color', related: ['赤', '青', '緑'] }
    ];
    
    function renderRound() {
        if (currentRound >= maxRounds || currentRound >= associations.length) {
            endGame('word-association', gameScore);
            return;
        }
        
        const association = associations[currentRound % associations.length];
        const allWords = shuffleArray([...association.related, ...gameWords.slice(0, 5).map(w => w.japanese)]);
        const correctWords = association.related;
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>🔗 Word Association</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-progress">Round ${currentRound + 1} / ${maxRounds}</div>
                </div>
                
                <div class="word-association-game">
                    <div class="association-prompt">
                        <h3>Find words related to:</h3>
                        <div class="japanese-text-large">${escapeHtml(association.word)}</div>
                        <div class="word-translation">${escapeHtml(association.translation)}</div>
                    </div>
                    
                    <div class="association-words">
                        ${allWords.map((word, idx) => {
                            const isCorrect = correctWords.includes(word);
                            return `
                                <button class="association-word" 
                                    onclick="window.gamesPage.selectAssociation('${escapeHtml(word)}', ${isCorrect}, ${currentRound})">
                                    ${escapeHtml(word)}
                                </button>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="selected-words" id="selectedWords">
                        <p>Selected: <span id="selectedCount">0</span> / ${correctWords.length}</p>
                    </div>
                    
                    <button class="premium-btn primary" onclick="window.gamesPage.checkAssociation(${currentRound}, ${correctWords.length})">
                        Check
                    </button>
                </div>
            </div>
        `;
        
        window.gamesPage.selectedAssociations = [];
    }
    
    window.gamesPage.selectAssociation = (word, isCorrect, roundIndex) => {
        if (roundIndex !== currentRound) return;
        
        const selected = window.gamesPage.selectedAssociations || [];
        if (selected.includes(word)) {
            window.gamesPage.selectedAssociations = selected.filter(w => w !== word);
        } else {
            window.gamesPage.selectedAssociations = [...selected, word];
        }
        
        const countEl = document.getElementById('selectedCount');
        if (countEl) countEl.textContent = window.gamesPage.selectedAssociations.length;
    };
    
    window.gamesPage.checkAssociation = (roundIndex, correctCount) => {
        if (roundIndex !== currentRound) return;
        
        const selected = window.gamesPage.selectedAssociations || [];
        const correct = associations[currentRound % associations.length].related;
        const selectedCorrect = selected.filter(w => correct.includes(w)).length;
        
        if (selectedCorrect === correctCount && selected.length === correctCount) {
            gameScore += 20;
            correctAssociations++;
            if (window.celebrationService) {
                window.celebrationService.celebrate('Perfect!', 'success', 1000);
            }
        } else {
            if (window.celebrationService) {
                window.celebrationService.celebrate('Try again!', 'error', 1000);
            }
        }
        
        setTimeout(() => {
            currentRound++;
            renderRound();
        }, 1500);
    };
    
    renderRound();
}

// Sentence Completion Game
function startSentenceCompletionGame() {
    const gamesContent = document.getElementById('gamesContent');
    if (!gamesContent) return;
    
    // Use anime sentences if available
    let animeSentences = [];
    if (window.animeSentenceService) {
        animeSentences = window.animeSentenceService.getAnimeSentences(null, 20);
    }
    
    // Fallback sentences
    const fallbackSentences = [
        { japanese: 'こんにちは、___ですか？', translation: 'Hello, how are you?', missing: '元気', options: ['元気', '時間', '学校'] },
        { japanese: '今日はいい___ですね', translation: 'The weather is nice today', missing: '天気', options: ['天気', '時間', '食べ物'] },
        { japanese: '___ございます', translation: 'Thank you very much', missing: 'ありがとう', options: ['ありがとう', 'おはよう', 'おやすみ'] },
        { japanese: '___ございます', translation: 'Good morning', missing: 'おはよう', options: ['おはよう', 'ありがとう', 'おやすみ'] }
    ];
    
    const sentences = animeSentences.length > 0 ? animeSentences.map(s => ({
        japanese: s.japanese.replace(/\w+/g, '___'),
        translation: s.translation,
        missing: s.japanese.split(' ')[0],
        options: [s.japanese.split(' ')[0], ...gameWords.slice(0, 3).map(w => w.japanese)]
    })) : fallbackSentences;
    
    let currentRound = 0;
    let correctCompletions = 0;
    const maxRounds = Math.min(10, sentences.length);
    
    function renderRound() {
        if (currentRound >= maxRounds) {
            endGame('sentence-completion', gameScore);
            return;
        }
        
        const sentence = sentences[currentRound];
        const shuffledOptions = shuffleArray(sentence.options);
        
        gamesContent.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <h2>✍️ Sentence Completion</h2>
                    <div class="game-score">Score: ${gameScore}</div>
                    <div class="game-progress">Round ${currentRound + 1} / ${maxRounds}</div>
                </div>
                
                <div class="sentence-completion-game">
                    <div class="sentence-display">
                        <div class="anime-sentence-card">
                            <div class="anime-sentence-japanese">${escapeHtml(sentence.japanese)}</div>
                            <div class="anime-sentence-translation">${escapeHtml(sentence.translation)}</div>
                        </div>
                    </div>
                    
                    <div class="completion-options">
                        <h3>Complete the sentence:</h3>
                        ${shuffledOptions.map((option, idx) => `
                            <button class="completion-option" 
                                onclick="window.gamesPage.selectCompletion('${escapeHtml(option)}', '${escapeHtml(sentence.missing)}', ${currentRound})">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    window.gamesPage.selectCompletion = (selected, correct, roundIndex) => {
        if (roundIndex !== currentRound) return;
        
        const isCorrect = selected === correct;
        if (isCorrect) {
            gameScore += 15;
            correctCompletions++;
            if (window.celebrationService) {
                window.celebrationService.celebrate('Perfect!', 'success', 1000);
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

