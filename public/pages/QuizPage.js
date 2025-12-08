// Quiz Page Component
import api from '../utils/api.js';
import { escapeHtml, shuffleArray } from '../utils/helpers.js';

let quizWords = [];
let currentQuizIndex = 0;
let quizScore = 0;
let quizAnswers = [];
let isQuizActive = false;
let allDaysData = {};

export async function init() {
    // Don't block on studyPage - quiz can work independently
    console.log('QuizPage.init called');
}

export async function load() {
    console.log('QuizPage.load called');
    
    // Ensure days are loaded for the day selector
    const quizDaySelect = document.getElementById('quizDaySelect');
    if (quizDaySelect && quizDaySelect.options.length <= 1) {
        // Try to get from studyPage first
        if (window.studyPage && window.studyPage.getAllDaysData) {
            try {
                await window.studyPage.load();
                const daysData = window.studyPage.getAllDaysData();
                if (Object.keys(daysData).length > 0) {
                    quizDaySelect.innerHTML = '<option value="">All Days</option>';
                    Object.keys(daysData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
                        const option = document.createElement('option');
                        option.value = day;
                        option.textContent = `Day ${day} - ${daysData[day].title}`;
                        quizDaySelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.warn('Could not load days from studyPage:', error);
            }
        }
        
        // If still empty, load days directly
        if (quizDaySelect.options.length <= 1) {
            try {
                const daysData = await api.get('/days');
                if (daysData.days && daysData.days.length > 0) {
                    quizDaySelect.innerHTML = '<option value="">All Days</option>';
                    daysData.days.forEach(day => {
                        const option = document.createElement('option');
                        option.value = day.day;
                        option.textContent = `Day ${day.day} - ${day.title}`;
                        quizDaySelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.warn('Could not load days for quiz selector:', error);
            }
        }
    }
    
    // Reset quiz state
    resetQuiz();
}

export function startQuiz() {
    const daySelect = document.getElementById('quizDaySelect');
    const selectedDay = daySelect?.value;
    
    (async () => {
        try {
            if (selectedDay) {
                const data = await api.get(`/words/${selectedDay}`);
                quizWords = data.words || [];
            } else {
                // Load all words
                quizWords = [];
                const daysData = await api.get('/days');
                for (const dayInfo of daysData.days || []) {
                    try {
                        const data = await api.get(`/words/${dayInfo.day}`);
                        if (data.words) {
                            quizWords = quizWords.concat(data.words);
                        }
                    } catch (error) {
                        console.error(`Error loading words for day ${dayInfo.day}:`, error);
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
        } catch (error) {
            console.error('Error starting quiz:', error);
            alert('Failed to start quiz: ' + error.message);
        }
    })();
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
    
    // Generate options
    const options = [question];
    const otherWords = quizWords.filter((w, i) => i !== currentQuizIndex);
    const wrongOptions = shuffleArray([...otherWords]).slice(0, 3);
    const allOptions = shuffleArray([...options, ...wrongOptions]);
    
    const optionsContainer = document.getElementById('quizOptions');
    optionsContainer.innerHTML = allOptions.map((word, index) => `
        <div class="quiz-option" onclick="window.quizPage.selectAnswer(${index}, '${escapeHtml(word.translation)}')">
            ${escapeHtml(word.translation)}
        </div>
    `).join('');
    
    document.getElementById('quizFeedback').textContent = '';
    document.getElementById('quizFeedback').className = 'quiz-feedback';
}

export function selectAnswer(optionIndex, selectedTranslation) {
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

export function nextQuestion() {
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
            <button class="btn btn-primary" onclick="window.quizPage.resetQuiz()">Try Again</button>
        </div>
    `;
    
    document.getElementById('quizQuestion').style.display = 'none';
    document.getElementById('quizFeedback').textContent = '';
}

export function resetQuiz() {
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

// Export for global access
window.quizPage = { init, load, startQuiz, selectAnswer, nextQuestion, resetQuiz };

