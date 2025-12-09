// Exercise Page Component
import api from '../utils/api.js';
import { showError, escapeHtml, showLoading } from '../utils/helpers.js';
import { studyStats, saveStudyStats } from '../services/studyStats.js';
// Import core systems (optional - can use window.stateManager, window.eventBus, window.apiClient instead)
// import { stateManager, eventBus, apiClient } from '../main.js';

// Exercise state
let currentExercise = null;
let exerciseIndex = 0;
let exerciseScore = 0;
let exerciseMistakes = 0;
let exerciseHearts = 5;
let exerciseSet = [];
let currentSessionId = null;
let selectedOption = null;
let selectedOptionIndex = null;

export async function init() {
    // Page initialization
}

export async function load() {
    // Clear any loading state
    const exerciseContent = document.getElementById('exerciseContent');
    if (exerciseContent) {
        // If no exercise is active, show empty state
        if (!currentExercise && exerciseSet.length === 0) {
            exerciseContent.innerHTML = `
                <div class="empty-state">
                    <h2>Ready to Practice?</h2>
                    <p>Start an exercise from the Learning Path or Practice Hub</p>
                </div>
            `;
        } else if (currentExercise) {
            // If there's a current exercise, show it
            showNextExercise();
        }
    }
}

export async function startExerciseSession(skillId = null, type = 'vocabulary') {
    // Switch to exercise mode first
    if (window.app && window.app.switchMode) {
        window.app.switchMode('exercise');
    }
    
    // Show loading state
    const exerciseContent = document.getElementById('exerciseContent');
    if (exerciseContent) {
        exerciseContent.innerHTML = `
            <div class="loading-state">
                <div class="premium-spinner"></div>
                <p>Loading exercises...</p>
            </div>
        `;
    }
    
    exerciseIndex = 0;
    exerciseScore = 0;
    exerciseMistakes = 0;
    exerciseHearts = 5;
    exerciseSet = [];
    currentExercise = null;
    currentSessionId = null;
    selectedOption = null;
    
    try {
        // Parse skillId - exercise generator expects "day-X" format for vocabulary
        // and "kana" or "kana-*" for kana exercises
        let parsedSkillId = skillId;
        if (type === 'kana') {
            // For kana exercises, use "kana" as skillId
            parsedSkillId = 'kana';
        } else if (skillId && skillId.startsWith('day-')) {
            // Keep "day-X" format for vocabulary (exercise generator expects this)
            parsedSkillId = skillId; // Keep as "day-1", not "day1"
        } else if (skillId && skillId.startsWith('day')) {
            // Convert "day1" to "day-1"
            const dayNum = skillId.replace('day', '');
            parsedSkillId = `day-${dayNum}`;
        }
        
        // Generate exercise set
        // Use apiClient if available, otherwise fall back to api
        const endpoint = `/exercises?type=${type}${parsedSkillId ? `&skillId=${parsedSkillId}` : ''}&count=10`;
        console.log('Fetching exercises from:', endpoint);
        const data = window.apiClient 
            ? await window.apiClient.get(endpoint)
            : await api.get(endpoint);
        
        if (data.exercises && data.exercises.length > 0) {
            exerciseSet = data.exercises;
            
            // Create session
            try {
                const sessionData = window.apiClient
                    ? await window.apiClient.post('/session', { userId: 'user_' + Date.now(), skillId: skillId || 'vocab', exercises: exerciseSet }, { action: 'create' })
                    : await api.post('/session?action=create', {
                        userId: 'user_' + Date.now(),
                        skillId: skillId || 'vocab',
                        exercises: exerciseSet
                    });
                
                if (sessionData.session) {
                    currentSessionId = sessionData.session.id;
                    exerciseHearts = sessionData.session.hearts;
                }
            } catch (error) {
                console.warn('Could not create session, continuing without session:', error);
            }
            
            showNextExercise();
        } else {
            const exerciseContent = document.getElementById('exerciseContent');
            if (exerciseContent) {
                exerciseContent.innerHTML = `
                    <div class="empty-state">
                        <h2>No Exercises Available</h2>
                        <p>Unable to load exercises. Please try again later.</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading exercises:', error);
        const exerciseContent = document.getElementById('exerciseContent');
        if (exerciseContent) {
            exerciseContent.innerHTML = `
                <div class="empty-state">
                    <h2>⚠️ Error Loading Exercises</h2>
                    <p>${escapeHtml(error.message)}</p>
                    <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-muted);">
                        Make sure the server is running and try again.
                    </p>
                </div>
            `;
        }
    }
}

async function showNextExercise() {
    // Check if session is complete
    if (currentSessionId) {
        try {
            const summaryData = await api.get(`/session?sessionId=${currentSessionId}&action=summary`);
            if (summaryData.summary && summaryData.summary.completed) {
                finishExerciseSession();
                return;
            }
        } catch (error) {
            console.warn('Could not check session summary:', error);
        }
    }
    
    if (exerciseIndex >= exerciseSet.length || exerciseHearts <= 0) {
        finishExerciseSession();
        return;
    }
    
    // Get current exercise from session if available
    if (currentSessionId) {
        try {
            const exerciseData = await api.get(`/session?sessionId=${currentSessionId}&action=current`);
            if (exerciseData.exercise) {
                currentExercise = exerciseData.exercise;
                exerciseIndex = exerciseSet.findIndex(e => e.id === currentExercise.id);
            } else {
                currentExercise = exerciseSet[exerciseIndex];
            }
        } catch (error) {
            console.warn('Could not get exercise from session:', error);
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
                        checkExerciseAnswer(matchedPairs);
                    }
                );
            }
        }
    }
    
    if (exerciseActions) {
        exerciseActions.innerHTML = '<button class="premium-btn" onclick="window.exercisePage.checkAnswer()">Check</button>';
    }
    
    updateHeartsDisplay();
    selectedOption = null;
    selectedOptionIndex = null;
}

function renderExercise(exercise) {
    switch (exercise.type) {
        case 'multiple_choice':
            return `
                <div class="exercise-question">
                    <h3>${escapeHtml(exercise.question)}</h3>
                    ${exercise.kana ? `<div class="exercise-kana">${exercise.kana.char}</div>` : ''}
                    <div class="exercise-options" id="exerciseOptions">
                        ${exercise.options.map((opt, idx) => `
                            <button class="exercise-option" data-option-index="${idx}" data-option-value="${escapeHtml(opt)}" onclick="window.exercisePage.selectOption(${idx})">
                                ${escapeHtml(opt)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        case 'translation':
            // Try to get anime sentence context if available
            let animeContext = null;
            if (window.animeSentenceService && exercise.word) {
                const sentences = window.animeSentenceService.getAnimeSentences();
                const matchingSentence = sentences.find(s => 
                    s.japanese.includes(exercise.word.japanese) || 
                    exercise.word.japanese.includes(s.japanese.split(' ')[0])
                );
                if (matchingSentence) {
                    animeContext = matchingSentence;
                }
            }
            
            return `
                ${animeContext ? `
                    <div class="anime-sentence-card">
                        <div class="anime-context">
                            <span class="anime-character">${escapeHtml(animeContext.character)}</span>
                            <span>•</span>
                            <span class="anime-scene">${escapeHtml(animeContext.context)}</span>
                        </div>
                        <div class="anime-sentence-japanese">${escapeHtml(animeContext.japanese)}</div>
                        ${animeContext.furigana ? `<div class="anime-sentence-furigana">${escapeHtml(animeContext.furigana)}</div>` : ''}
                        <div class="anime-sentence-translation">${escapeHtml(animeContext.translation)}</div>
                    </div>
                ` : ''}
                <div class="exercise-question">
                    <h3>${escapeHtml(exercise.question)}</h3>
                    ${exercise.questionAudio ? `
                        <button class="premium-btn audio-btn" onclick="window.speakJapanese && window.speakJapanese('${escapeHtml(exercise.questionAudio)}')">
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
                           onkeypress="if(event.key==='Enter') window.exercisePage.checkAnswer()">
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
                            const parts = exercise.sentence.split('____');
                            const beforeText = parts[idx] || '';
                            const afterText = parts[idx + 1] || '';
                            
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
                            <button class="premium-btn large audio-btn" id="playAudioBtn" onclick="window.exercisePage.playAudio('${escapeHtml(audioText)}')">
                                🔊 Play Audio
                            </button>
                            <button class="premium-btn small" onclick="window.exercisePage.repeatAudio('${escapeHtml(audioText)}')" title="Repeat">
                                🔁
                            </button>
                            <div class="speed-control">
                                <label>Speed:</label>
                                <select id="audioSpeed" onchange="window.exercisePage.setSpeed(this.value)">
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
                                <button class="exercise-option" data-option-index="${idx}" data-option-value="${escapeHtml(opt)}" onclick="window.exercisePage.selectOption(${idx})">
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
                            <button class="premium-btn large audio-btn" id="playAudioBtn" onclick="window.exercisePage.playAudio('${escapeHtml(audioText)}')">
                                🔊 Play Audio
                            </button>
                            <button class="premium-btn small" onclick="window.exercisePage.repeatAudio('${escapeHtml(audioText)}')" title="Repeat">
                                🔁
                            </button>
                            <div class="speed-control">
                                <label>Speed:</label>
                                <select id="audioSpeed" onchange="window.exercisePage.setSpeed(this.value)">
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
                               onkeypress="if(event.key==='Enter') window.exercisePage.checkAnswer()">
                        ${exercise.hint ? `<p class="exercise-hint">💡 Hint: ${escapeHtml(exercise.hint)}</p>` : ''}
                    </div>
                `;
            }
        default:
            return `<div class="exercise-question"><h3>${escapeHtml(exercise.question || 'Exercise')}</h3><p>Exercise type "${exercise.type}" is coming soon!</p></div>`;
    }
}

export function selectOption(index) {
    // Get the value from the exercise options array (most reliable)
    if (currentExercise && currentExercise.options && currentExercise.options[index] !== undefined) {
        selectedOption = currentExercise.options[index];
        selectedOptionIndex = index;
    } else {
        // Fallback: get from button's data attribute or textContent
        const btn = document.querySelector(`.exercise-option[data-option-index="${index}"]`);
        if (btn) {
            selectedOption = btn.dataset.optionValue || btn.textContent.trim();
            selectedOptionIndex = index;
        } else {
            console.error('Could not find option button at index:', index);
            return;
        }
    }
    
    // Update visual selection
    document.querySelectorAll('.exercise-option').forEach((btn, idx) => {
        btn.classList.toggle('selected', idx === index);
    });
    
    console.log('Option selected:', index, 'Value:', selectedOption);
}

export async function checkAnswer(matchedPairs = null) {
    if (!currentExercise) return;
    
    let userAnswer = '';
    
    // Get user answer based on exercise type
    if (currentExercise.type === 'multiple_choice') {
        // For multiple choice, validator expects the INDEX (number), not the value
        if (selectedOptionIndex === null || selectedOptionIndex === undefined) {
            // Try to get index from selected button
            const selectedBtn = document.querySelector('.exercise-option.selected');
            if (selectedBtn) {
                const btnIndex = parseInt(selectedBtn.dataset.optionIndex);
                if (!isNaN(btnIndex)) {
                    selectedOptionIndex = btnIndex;
                    selectedOption = currentExercise.options[btnIndex];
                } else {
                    showCelebration('Please select an answer', 'error');
                    return;
                }
            } else {
                showCelebration('Please select an answer', 'error');
                return;
            }
        }
        
        // Send the INDEX to the validator (it expects a number)
        userAnswer = selectedOptionIndex;
        
        console.log('Submitting multiple choice answer - Index:', userAnswer, 'Value:', currentExercise.options[userAnswer]);
    } else if (currentExercise.type === 'translation' || currentExercise.type === 'listen') {
        const answerInput = document.getElementById('exerciseAnswer');
        userAnswer = answerInput ? answerInput.value.trim() : '';
        if (!userAnswer) {
            showCelebration('Please enter an answer', 'error');
            return;
        }
    } else if (currentExercise.type === 'match') {
        if (matchedPairs) {
            userAnswer = matchedPairs;
        } else if (window.currentMatchingExercise) {
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
        const validationResult = await api.post('/exercises?action=validate', {
            exercise: currentExercise,
            userAnswer: userAnswer
        });
        
        // Submit answer to session
        if (currentSessionId) {
            try {
                await api.post(`/session?action=answer&sessionId=${currentSessionId}`, {
                    userAnswer: userAnswer,
                    validationResult: validationResult
                });
            } catch (error) {
                console.warn('Could not submit answer to session:', error);
            }
        }
        
        // Handle result - IMPORTANT: Check validationResult.correct properly
        console.log('Validation result:', validationResult);
        console.log('Is correct?', validationResult.correct, 'Type:', typeof validationResult.correct);
        
        // Ensure we're checking the correct property (handle both boolean true and string "true")
        const isCorrect = validationResult.correct === true || validationResult.correct === 'true' || validationResult.correct === 1;
        
        if (isCorrect) {
            // CORRECT ANSWER - Do NOT lose hearts
            exerciseScore++;
            
            // Use eventBus to emit XP gain event (if available)
            const xpGained = Math.round(validationResult.score * (currentExercise.points || 10));
            if (window.eventBus) {
                window.eventBus.emit('xp-gained', { amount: xpGained, reason: 'Correct answer' });
            }
            
            // Also use xpService for backward compatibility
            if (window.xpService) {
                window.xpService.addXP(xpGained, 'Correct answer');
            }
            
            // Update skill strength (if service available)
            if (window.skillStrengthService && currentSessionId) {
                // Get skill ID from session or current exercise
                const skillId = currentExercise.skillId || (currentSessionId ? `day-${currentSessionId}` : null);
                if (skillId) {
                    window.skillStrengthService.updateSkillStrength(skillId, true, 1);
                }
            }
            
            // Show positive feedback
            const feedbackMessage = validationResult.feedback || '✅ Correct!';
            showCelebration(feedbackMessage, 'success');
            console.log('✅ Correct answer! Score:', exerciseScore, 'XP gained:', xpGained);
            
            // Update UI to show correct answer
            updateExerciseFeedback(validationResult, true);
            
            setTimeout(async () => {
                exerciseIndex++;
                if (currentSessionId) {
                    try {
                        await api.put(`/session?action=next&sessionId=${currentSessionId}`);
                    } catch (error) {
                        console.warn('Could not advance session:', error);
                    }
                }
                showNextExercise();
            }, 2000);
        } else {
            // WRONG ANSWER - Lose a heart
            exerciseMistakes++;
            console.log('❌ Wrong answer. Mistakes:', exerciseMistakes);
            
            // Only lose heart if we actually have hearts to lose
            const heartLost = loseHeart();
            if (heartLost) {
                exerciseHearts--;
                console.log('💔 Heart lost. Remaining:', exerciseHearts);
            }
            
            // Update skill strength for incorrect answer
            if (window.skillStrengthService && currentSessionId) {
                const skillId = currentExercise.skillId || (currentSessionId ? `day-${currentSessionId}` : null);
                if (skillId) {
                    window.skillStrengthService.updateSkillStrength(skillId, false, 1);
                }
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
                        try {
                            await api.put(`/session?action=next&sessionId=${currentSessionId}`);
                        } catch (error) {
                            console.warn('Could not advance session:', error);
                        }
                    }
                    showNextExercise();
                }, 3000);
            }
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
        const correctAnswerText = validationResult.correctAnswer || currentExercise.options[currentExercise.correctIndex];
        
        options.forEach((opt, idx) => {
            opt.classList.add('disabled');
            const optText = opt.textContent.trim();
            
            // Highlight correct answer (always show which one was correct)
            if (optText === correctAnswerText || idx === currentExercise.correctIndex) {
                opt.classList.add('correct');
            }
            
            // Highlight wrong answer if user selected incorrectly
            if (!isCorrect && (optText === selectedOption || idx === selectedOptionIndex)) {
                opt.classList.add('wrong');
            }
        });
        
        // Add visual feedback message
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = `exercise-feedback-message ${isCorrect ? 'correct' : 'wrong'}`;
        feedbackDiv.innerHTML = `
            <p><strong>${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</strong></p>
            ${!isCorrect && correctAnswerText ? `<p>The correct answer is: <strong>${escapeHtml(correctAnswerText)}</strong></p>` : ''}
        `;
        exerciseContent.appendChild(feedbackDiv);
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
    
    // Update streak when exercise is completed
    if (window.streakService) {
        window.streakService.updateStreak();
    }
    
    // Record challenge progress
    if (window.challengesPage && window.challengesPage.recordChallengeProgress) {
        window.challengesPage.recordChallengeProgress('xp', Math.floor(exerciseScore * 10));
        if (isPerfect) {
            window.challengesPage.recordChallengeProgress('perfect', 1);
        }
    }
    
    // Update skill strength based on performance
    if (window.skillStrengthService && exerciseSet.length > 0) {
        const firstExercise = exerciseSet[0];
        const skillId = firstExercise.skillId || (currentSessionId ? `day-${currentSessionId}` : null);
        if (skillId) {
            // Update strength based on overall performance
            const performanceRatio = exerciseScore / exerciseSet.length;
            const difficulty = performanceRatio > 0.8 ? 2 : performanceRatio > 0.6 ? 1.5 : 1;
            
            // Update strength for each correct answer
            for (let i = 0; i < exerciseScore; i++) {
                window.skillStrengthService.updateSkillStrength(skillId, true, difficulty);
            }
            
            // Update strength for each mistake
            for (let i = 0; i < exerciseMistakes; i++) {
                window.skillStrengthService.updateSkillStrength(skillId, false, 1);
            }
        }
    }
    
    if (isPerfect) {
        studyStats.perfectLessons++;
        if (window.achievementsPage && window.achievementsPage.unlockAchievement) {
            window.achievementsPage.unlockAchievement('perfect_lesson');
        }
        if (window.xpService) {
            window.xpService.addXP(50, 'Perfect lesson');
        }
        
        // Show perfect lesson celebration
        if (window.celebrationService) {
            window.celebrationService.showPerfectLessonCelebration();
        }
    }
    
    studyStats.exercisesCompleted += exerciseSet.length;
    saveStudyStats();
    
    // Refresh path page to show updated skill strengths
    if (window.pathPage && window.pathPage.renderSkillTree) {
        setTimeout(() => {
            window.pathPage.renderSkillTree();
        }, 1000);
    }
    
    const exerciseContent = document.getElementById('exerciseContent');
    if (exerciseContent) {
        exerciseContent.innerHTML = `
            <div class="exercise-results">
                <h2>Exercise Complete! 🎉</h2>
                <div class="result-score">${exerciseScore} / ${exerciseSet.length}</div>
                <div class="result-percentage">${percentage}%</div>
                ${isPerfect ? '<div class="perfect-badge">💯 Perfect!</div>' : ''}
                <div class="result-xp">+${exerciseScore * 10} XP</div>
                <div style="margin-top: 2rem;">
                    <button class="premium-btn" onclick="window.app.switchMode('path')">
                        Back to Path
                    </button>
                </div>
            </div>
        `;
    }
}

function loseHeart() {
    const currentHearts = studyStats.hearts || 5;
    if (currentHearts <= 0) return false;
    
    // Use StateManager if available, otherwise use studyStats
    if (window.stateManager) {
        const hearts = window.stateManager.get('hearts') || 5;
        if (hearts <= 0) return false;
        window.stateManager.update('hearts', hearts - 1);
        window.stateManager.update('lastHeartLoss', Date.now());
        
        // Sync to studyStats for compatibility
        studyStats.hearts = hearts - 1;
        studyStats.lastHeartLoss = Date.now();
        
        // Emit event
        if (window.eventBus) {
            window.eventBus.emit('hearts-changed', { hearts: hearts - 1 });
        }
    } else {
        studyStats.hearts = currentHearts - 1;
        studyStats.lastHeartLoss = Date.now();
    }
    
    saveStudyStats();
    if (window.app && window.app.updateHeartsDisplay) {
        window.app.updateHeartsDisplay();
    }
    
    const newHearts = window.stateManager ? window.stateManager.get('hearts') : studyStats.hearts;
    if (newHearts === 0) {
        showCelebration('💔 Out of hearts! They refill every 4 hours.', 'error');
    }
    
    return true;
}

function updateHeartsDisplay() {
    const exerciseHeartsEl = document.getElementById('exerciseHearts');
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

function showCelebration(message, type = 'success') {
    const celebration = document.getElementById('celebration');
    const text = document.getElementById('celebrationText');
    
    if (celebration && text) {
        text.textContent = message;
        celebration.className = `celebration ${type}`;
        celebration.classList.remove('hidden');
        
        setTimeout(() => {
            celebration.classList.add('hidden');
        }, 3000);
    }
}

// Audio functions
export function playAudio(text) {
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
    } else if (window.speakJapanese) {
        window.speakJapanese(text);
    }
}

export function repeatAudio(text) {
    if (window.audioPlayer) {
        window.audioPlayer.repeat().catch(err => {
            console.error('Audio repeat error:', err);
        });
    } else if (window.speakJapanese) {
        window.speakJapanese(text);
    }
}

export function setSpeed(speed) {
    if (window.audioPlayer) {
        window.audioPlayer.setSpeed(parseFloat(speed));
    }
}

// Export for global access
window.exercisePage = { 
    init, 
    load, 
    startExerciseSession, 
    selectOption, 
    checkAnswer,
    playAudio,
    repeatAudio,
    setSpeed
};
