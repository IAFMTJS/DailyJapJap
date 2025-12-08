// Chapter Test Page Component
import api from '../utils/api.js';
import { showError, escapeHtml } from '../utils/helpers.js';
import { studyStats, saveStudyStats } from '../services/studyStats.js';

let currentTest = null;
let testAnswers = [];
let currentQuestionIndex = 0;
let testStartTime = null;
let timeRemaining = null;
let timerInterval = null;

export async function init() {
    console.log('ChapterTestPage.init called');
}

export async function load() {
    console.log('ChapterTestPage.load called');
    const testContent = document.getElementById('testContent');
    if (testContent) {
        testContent.innerHTML = `
            <div class="empty-state">
                <h2>Chapter Test</h2>
                <p>Select a chapter to take its test.</p>
            </div>
        `;
    }
}

export async function startChapterTest(chapterId) {
    try {
        console.log('Starting chapter test for:', chapterId);
        
        // Check if chapter is unlocked
        if (!window.chapterService) {
            showError('Chapter service not available');
            return;
        }
        
        const chapter = window.chapterService.getChapter(chapterId);
        if (!chapter) {
            showError('Chapter not found');
            return;
        }
        
        const chapterData = studyStats.chapters?.[chapterId];
        if (!chapterData || !chapterData.unlocked) {
            showError('This chapter is not unlocked yet. Complete previous chapters first!');
            return;
        }
        
        // Generate test
        if (!window.testService) {
            showError('Test service not available');
            return;
        }
        
        const testContent = document.getElementById('testContent');
        if (testContent) {
            testContent.innerHTML = `
                <div class="loading-state">
                    <div class="premium-spinner"></div>
                    <p>Generating chapter test...</p>
                </div>
            `;
        }
        
        currentTest = await window.testService.generateChapterTest(chapterId);
        testAnswers = new Array(currentTest.questions.length).fill(null);
        currentQuestionIndex = 0;
        testStartTime = Date.now();
        timeRemaining = currentTest.timeLimit;
        
        // Start timer
        startTimer();
        
        // Render test
        renderTest();
        
        // Switch to test mode if needed
        if (window.app && window.app.switchMode) {
            window.app.switchMode('test');
        }
        
    } catch (error) {
        console.error('Error starting chapter test:', error);
        showError(`Failed to start test: ${error.message}`);
    }
}

function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        
        // Update timer display
        const timerEl = document.getElementById('testTimer');
        if (timerEl) {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Warning when time is low
            if (timeRemaining <= 60) {
                timerEl.style.color = 'var(--danger)';
                timerEl.classList.add('warning');
            }
        }
        
        // Auto-submit when time runs out
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

function renderTest() {
    const testContent = document.getElementById('testContent');
    if (!testContent || !currentTest) return;
    
    const question = currentTest.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / currentTest.questions.length) * 100;
    
    testContent.innerHTML = `
        <div class="test-container">
            <div class="test-header glass">
                <div class="test-info">
                    <h2>Chapter ${currentTest.chapterNumber} Test</h2>
                    <p class="test-subtitle">${escapeHtml(currentTest.chapterTitle)}</p>
                </div>
                <div class="test-stats">
                    <div class="test-stat">
                        <span class="stat-label">Question</span>
                        <span class="stat-value">${currentQuestionIndex + 1} / ${currentTest.questions.length}</span>
                    </div>
                    <div class="test-stat">
                        <span class="stat-label">Time</span>
                        <span class="stat-value" id="testTimer">${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div class="test-stat">
                        <span class="stat-label">Passing</span>
                        <span class="stat-value">${currentTest.passingScore}%</span>
                    </div>
                </div>
                <div class="test-progress-bar">
                    <div class="test-progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="test-question-container">
                ${renderQuestion(question)}
            </div>
            
            <div class="test-navigation">
                <button class="premium-btn" onclick="window.chapterTestPage.previousQuestion()" 
                        ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
                <div class="question-indicators">
                    ${currentTest.questions.map((q, idx) => `
                        <button class="question-indicator ${idx === currentQuestionIndex ? 'active' : ''} ${testAnswers[idx] !== null ? 'answered' : ''}"
                                onclick="window.chapterTestPage.goToQuestion(${idx})">
                            ${idx + 1}
                        </button>
                    `).join('')}
                </div>
                ${currentQuestionIndex === currentTest.questions.length - 1 ? 
                    `<button class="premium-btn" onclick="window.chapterTestPage.submitTest()">Submit Test</button>` :
                    `<button class="premium-btn" onclick="window.chapterTestPage.nextQuestion()">Next →</button>`
                }
            </div>
        </div>
    `;
}

function renderQuestion(question) {
    let questionHTML = '';
    
    switch (question.type) {
        case 'multiple_choice':
            questionHTML = `
                <div class="test-question">
                    <h3 class="question-text">${escapeHtml(question.question)}</h3>
                    ${question.word?.japanese ? `<div class="japanese-display">${escapeHtml(question.word.japanese)}</div>` : ''}
                    ${question.word?.furigana ? `<div class="furigana-display">${escapeHtml(question.word.furigana)}</div>` : ''}
                    <div class="test-options">
                        ${question.options.map((option, idx) => `
                            <button class="test-option ${testAnswers[currentQuestionIndex] === option ? 'selected' : ''}"
                                    onclick="window.chapterTestPage.selectAnswer('${escapeHtml(option)}')">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'translation':
            questionHTML = `
                <div class="test-question">
                    <h3 class="question-text">${escapeHtml(question.question)}</h3>
                    ${question.word?.japanese ? `<div class="japanese-display large">${escapeHtml(question.word.japanese)}</div>` : ''}
                    ${question.word?.furigana ? `<div class="furigana-display">${escapeHtml(question.word.furigana)}</div>` : ''}
                    <div class="test-input-container">
                        <input type="text" id="testAnswerInput" class="premium-input" 
                               placeholder="Enter translation..." 
                               value="${testAnswers[currentQuestionIndex] || ''}"
                               onkeypress="if(event.key==='Enter') window.chapterTestPage.selectAnswer(this.value)">
                    </div>
                </div>
            `;
            break;
            
        case 'fill_blank':
            questionHTML = `
                <div class="test-question">
                    <h3 class="question-text">${escapeHtml(question.question)}</h3>
                    <div class="test-options">
                        ${question.options.map((option, idx) => `
                            <button class="test-option ${testAnswers[currentQuestionIndex] === option ? 'selected' : ''}"
                                    onclick="window.chapterTestPage.selectAnswer('${escapeHtml(option)}')">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'listening':
            questionHTML = `
                <div class="test-question">
                    <h3 class="question-text">${escapeHtml(question.question)}</h3>
                    <div class="audio-question-container">
                        <button class="premium-btn large audio-btn" onclick="speakJapanese('${escapeHtml(question.audioText)}')">
                            🔊 Play Audio
                        </button>
                        <button class="premium-btn small" onclick="speakJapanese('${escapeHtml(question.audioText)}')" title="Repeat">
                            🔁
                        </button>
                    </div>
                    <div class="test-options">
                        ${question.options.map((option, idx) => `
                            <button class="test-option ${testAnswers[currentQuestionIndex] === option ? 'selected' : ''}"
                                    onclick="window.chapterTestPage.selectAnswer('${escapeHtml(option)}')">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        default:
            questionHTML = `<div class="test-question"><p>Unknown question type: ${question.type}</p></div>`;
    }
    
    return questionHTML;
}

export function selectAnswer(answer) {
    if (!currentTest) return;
    
    testAnswers[currentQuestionIndex] = answer;
    
    // Update UI
    const options = document.querySelectorAll('.test-option');
    options.forEach(opt => {
        opt.classList.remove('selected');
        if (opt.textContent.trim() === answer || opt.onclick?.toString().includes(answer)) {
            opt.classList.add('selected');
        }
    });
    
    // Update question indicator
    const indicators = document.querySelectorAll('.question-indicator');
    if (indicators[currentQuestionIndex]) {
        indicators[currentQuestionIndex].classList.add('answered');
    }
}

export function nextQuestion() {
    if (!currentTest) return;
    
    if (currentQuestionIndex < currentTest.questions.length - 1) {
        currentQuestionIndex++;
        renderTest();
    }
}

export function previousQuestion() {
    if (!currentTest) return;
    
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderTest();
    }
}

export function goToQuestion(index) {
    if (!currentTest) return;
    
    if (index >= 0 && index < currentTest.questions.length) {
        currentQuestionIndex = index;
        renderTest();
    }
}

export async function submitTest() {
    if (!currentTest || !window.testService) return;
    
    // Clear timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Check if all questions answered
    const unanswered = testAnswers.filter(a => a === null || a === '').length;
    if (unanswered > 0) {
        if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
            return;
        }
    }
    
    // Calculate score
    const results = window.testService.calculateTestScore(testAnswers, currentTest.questions);
    
    // Save test results
    if (window.chapterService) {
        window.chapterService.passChapterTest(currentTest.chapterId, results.score);
    }
    
    // Show results
    showTestResults(results);
}

function showTestResults(results) {
    const testContent = document.getElementById('testContent');
    if (!testContent) return;
    
    const passed = results.passed;
    const timeSpent = Math.floor((Date.now() - testStartTime) / 1000);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    
    testContent.innerHTML = `
        <div class="test-results-container">
            <div class="test-results ${passed ? 'passed' : 'failed'}">
                <div class="results-icon">${passed ? '🎉' : '😔'}</div>
                <h2>${passed ? 'Test Passed!' : 'Test Failed'}</h2>
                <div class="results-score">
                    <div class="score-large">${results.score}%</div>
                    <div class="score-detail">${results.correct} / ${results.total} correct</div>
                </div>
                <div class="results-time">
                    Time: ${minutes}:${seconds.toString().padStart(2, '0')}
                </div>
                
                ${passed ? `
                    <div class="results-success">
                        <p>Congratulations! You've passed Chapter ${currentTest.chapterNumber}!</p>
                        <p>You can now proceed to the next chapter.</p>
                    </div>
                ` : `
                    <div class="results-failure">
                        <p>You need ${currentTest.passingScore}% to pass. You got ${results.score}%.</p>
                        <p>Review the chapter and try again!</p>
                    </div>
                `}
                
                <div class="results-actions">
                    ${passed ? `
                        <button class="premium-btn" onclick="window.app.switchMode('path')">
                            Continue Learning
                        </button>
                    ` : `
                        <button class="premium-btn" onclick="window.chapterTestPage.startChapterTest('${currentTest.chapterId}')">
                            Retake Test
                        </button>
                        <button class="premium-btn secondary" onclick="window.app.switchMode('path')">
                            Review Chapter
                        </button>
                    `}
                </div>
                
                <div class="results-breakdown">
                    <h3>Question Breakdown</h3>
                    <div class="breakdown-list">
                        ${results.results.map((result, idx) => `
                            <div class="breakdown-item ${result.correct ? 'correct' : 'incorrect'}">
                                <div class="breakdown-number">Q${idx + 1}</div>
                                <div class="breakdown-content">
                                    <div class="breakdown-status">${result.correct ? '✓ Correct' : '✗ Incorrect'}</div>
                                    ${!result.correct ? `
                                        <div class="breakdown-detail">
                                            <div>Your answer: <strong>${escapeHtml(result.userAnswer || 'No answer')}</strong></div>
                                            <div>Correct answer: <strong>${escapeHtml(result.correctAnswer)}</strong></div>
                                        </div>
                                    ` : ''}
                                    ${result.explanation ? `<div class="breakdown-explanation">${escapeHtml(result.explanation)}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Show celebration if passed
    if (passed && window.celebrationService) {
        window.celebrationService.celebrate(`Chapter ${currentTest.chapterNumber} Test Passed! 🎌`, 'achievement');
    }
}

// Export for global access
window.chapterTestPage = {
    init,
    load,
    startChapterTest,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    submitTest
};

