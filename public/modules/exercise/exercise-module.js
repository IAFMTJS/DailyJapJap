// Exercise Module - Handles all exercise functionality
class ExerciseModule {
    constructor(appManager) {
        this.appManager = appManager;
        this.state = appManager.getState();
        this.api = appManager.getAPI();
        this.events = appManager.getEventBus();
        this.initialized = false;
        
        // Exercise state
        this.currentExercise = null;
        this.exerciseIndex = 0;
        this.exerciseSet = [];
        this.exerciseScore = 0;
        this.exerciseMistakes = 0;
        this.exerciseHearts = 5;
        this.currentSessionId = null;
        this.selectedOption = null;
    }
    
    async init() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        this.initialized = true;
    }
    
    async activate() {
        await this.init();
        // Exercise mode is activated when a lesson is started
    }
    
    deactivate() {
        // Clean up exercise state if needed
    }
    
    /**
     * Start an exercise session
     */
    async startExerciseSession(skillId = null, type = 'vocabulary') {
        this.exerciseIndex = 0;
        this.exerciseScore = 0;
        this.exerciseMistakes = 0;
        this.exerciseHearts = 5;
        this.exerciseSet = [];
        this.currentExercise = null;
        this.currentSessionId = null;
        this.selectedOption = null;
        
        // Switch to exercise mode
        await this.appManager.activateModule('exercise');
        
        try {
            // Generate exercise set
            const data = await this.api.get('/exercises', {
                type: type,
                skillId: skillId,
                count: 10
            });
            
            if (data.exercises && data.exercises.length > 0) {
                this.exerciseSet = data.exercises;
                
                // Create session
                const sessionData = await this.api.post('/session', {
                    userId: 'user_' + Date.now(),
                    skillId: skillId || 'vocab',
                    exercises: this.exerciseSet
                }, { action: 'create' });
                
                if (sessionData.session) {
                    this.currentSessionId = sessionData.session.id;
                    this.exerciseHearts = sessionData.session.hearts;
                }
                
                this.showNextExercise();
            } else {
                this.showError('No exercises available');
            }
        } catch (error) {
            console.error('Error loading exercises:', error);
            this.showError('Failed to load exercises: ' + error.message);
        }
    }
    
    /**
     * Start a lesson (called from path module)
     */
    async startLesson(day, type) {
        const skillId = `day-${day}`;
        const exerciseType = type === 'hiragana' || type === 'katakana' ? 'kana' : 'vocabulary';
        await this.startExerciseSession(skillId, exerciseType);
        
        // Mark lesson as started
        this.completeLesson(skillId);
    }
    
    async showNextExercise() {
        // Check if session is complete
        if (this.currentSessionId) {
            try {
                const summaryData = await this.api.get('/session', {
                    sessionId: this.currentSessionId,
                    action: 'summary'
                });
                if (summaryData.summary && summaryData.summary.completed) {
                    this.finishExerciseSession();
                    return;
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
        }
        
        if (this.exerciseIndex >= this.exerciseSet.length || this.exerciseHearts <= 0) {
            this.finishExerciseSession();
            return;
        }
        
        // Get current exercise
        if (this.currentSessionId) {
            try {
                const exerciseData = await this.api.get('/session', {
                    sessionId: this.currentSessionId,
                    action: 'current'
                });
                if (exerciseData.exercise) {
                    this.currentExercise = exerciseData.exercise;
                    this.exerciseIndex = this.exerciseSet.findIndex(e => e.id === this.currentExercise.id);
                } else {
                    this.currentExercise = this.exerciseSet[this.exerciseIndex];
                }
            } catch (error) {
                this.currentExercise = this.exerciseSet[this.exerciseIndex];
            }
        } else {
            this.currentExercise = this.exerciseSet[this.exerciseIndex];
        }
        
        this.renderExercise();
        this.selectedOption = null;
    }
    
    renderExercise() {
        const exerciseContent = document.getElementById('exerciseContent');
        const exerciseActions = document.getElementById('exerciseActions');
        const exerciseProgress = document.getElementById('exerciseProgress');
        const exerciseCounter = document.getElementById('exerciseCounter');
        
        if (exerciseCounter) {
            exerciseCounter.textContent = `${this.exerciseIndex + 1}/${this.exerciseSet.length}`;
        }
        
        if (exerciseProgress) {
            const progress = ((this.exerciseIndex + 1) / this.exerciseSet.length) * 100;
            exerciseProgress.style.width = `${progress}%`;
        }
        
        if (exerciseContent) {
            exerciseContent.innerHTML = this.renderExerciseHTML(this.currentExercise);
            
            // Initialize exercise-specific components
            if (this.currentExercise.type === 'match' && this.currentExercise.pairs) {
                this.initMatchingExercise();
            }
        }
        
        if (exerciseActions) {
            exerciseActions.innerHTML = '<button class="premium-btn" onclick="window.appManager.getModule(\'exercise\').checkAnswer()">Check</button>';
        }
        
        this.updateHeartsDisplay();
    }
    
    renderExerciseHTML(exercise) {
        if (!exercise) return '<div class="exercise-question"><p>Loading exercise...</p></div>';
        
        // Use the existing renderExercise function logic
        // This is a simplified version - full implementation would be in a separate renderer
        switch (exercise.type) {
            case 'multiple_choice':
                return this.renderMultipleChoice(exercise);
            case 'translation':
                return this.renderTranslation(exercise);
            case 'listen':
                return this.renderListening(exercise);
            case 'match':
                return this.renderMatching(exercise);
            case 'fill_blank':
                return this.renderFillBlank(exercise);
            default:
                return `<div class="exercise-question"><h3>${this.escapeHtml(exercise.question || 'Exercise')}</h3><p>Exercise type "${exercise.type}" is coming soon!</p></div>`;
        }
    }
    
    renderMultipleChoice(exercise) {
        return `
            <div class="exercise-question">
                <h3>${this.escapeHtml(exercise.question)}</h3>
                ${exercise.questionAudio ? `
                    <button class="premium-btn audio-btn" onclick="speakJapanese('${this.escapeHtml(exercise.questionAudio)}')">
                        🔊 Play Audio
                    </button>
                ` : ''}
                ${exercise.word && exercise.word.japanese ? `
                    <div class="exercise-japanese-display">
                        <div class="japanese-text">${this.escapeHtml(exercise.word.japanese)}</div>
                        ${exercise.word.furigana ? `<div class="furigana-text">${this.escapeHtml(exercise.word.furigana)}</div>` : ''}
                    </div>
                ` : ''}
                <div class="exercise-options" id="exerciseOptions">
                    ${exercise.options.map((opt, idx) => `
                        <button class="exercise-option" onclick="window.appManager.getModule('exercise').selectOption(${idx}, '${this.escapeHtml(opt)}')">
                            ${this.escapeHtml(opt)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderTranslation(exercise) {
        return `
            <div class="exercise-question">
                <h3>${this.escapeHtml(exercise.question)}</h3>
                ${exercise.direction === 'jp_to_en' && exercise.word ? `
                    <div class="exercise-japanese-display">
                        <div class="japanese-text">${this.escapeHtml(exercise.word.japanese)}</div>
                        ${exercise.word.furigana ? `<div class="furigana-text">${this.escapeHtml(exercise.word.furigana)}</div>` : ''}
                    </div>
                ` : ''}
                <input type="text" 
                       id="exerciseAnswer" 
                       class="premium-input" 
                       placeholder="${exercise.direction === 'jp_to_en' ? 'Type the English translation...' : 'Type in Japanese...'}"
                       autocomplete="off"
                       onkeypress="if(event.key==='Enter') window.appManager.getModule('exercise').checkAnswer()">
                ${exercise.hint ? `<p class="exercise-hint">💡 Hint: ${this.escapeHtml(exercise.hint)}</p>` : ''}
            </div>
        `;
    }
    
    renderListening(exercise) {
        const audioText = exercise.audioUrl || exercise.questionAudio || exercise.word?.japanese || '';
        if (exercise.exerciseType === 'listen_select') {
            return `
                <div class="exercise-question">
                    <h3>${this.escapeHtml(exercise.question)}</h3>
                    <div class="audio-controls-container">
                        <button class="premium-btn large audio-btn" onclick="playExerciseAudio('${this.escapeHtml(audioText)}')">
                            🔊 Play Audio
                        </button>
                        <button class="premium-btn small" onclick="repeatExerciseAudio('${this.escapeHtml(audioText)}')">🔁</button>
                    </div>
                    <div class="exercise-options" id="exerciseOptions">
                        ${exercise.options.map((opt, idx) => `
                            <button class="exercise-option" onclick="window.appManager.getModule('exercise').selectOption(${idx}, '${this.escapeHtml(opt)}')">
                                ${this.escapeHtml(opt)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="exercise-question">
                    <h3>${this.escapeHtml(exercise.question)}</h3>
                    <div class="audio-controls-container">
                        <button class="premium-btn large audio-btn" onclick="playExerciseAudio('${this.escapeHtml(audioText)}')">
                            🔊 Play Audio
                        </button>
                        <button class="premium-btn small" onclick="repeatExerciseAudio('${this.escapeHtml(audioText)}')">🔁</button>
                    </div>
                    <input type="text" 
                           id="exerciseAnswer" 
                           class="premium-input" 
                           placeholder="Type what you hear in Japanese..."
                           autocomplete="off"
                           onkeypress="if(event.key==='Enter') window.appManager.getModule('exercise').checkAnswer()">
                </div>
            `;
        }
    }
    
    renderMatching(exercise) {
        return `
            <div class="exercise-question">
                <h3>${this.escapeHtml(exercise.explanation || 'Match the pairs')}</h3>
                <div id="matchingExerciseContainer"></div>
            </div>
        `;
    }
    
    renderFillBlank(exercise) {
        return `
            <div class="exercise-question">
                <h3>${this.escapeHtml(exercise.context || 'Fill in the blank')}</h3>
                <div class="fill-blank-sentence">
                    ${exercise.blanks.map((blank, idx) => {
                        const beforeText = exercise.sentence.split('____')[idx] || '';
                        if (exercise.blankType === 'select') {
                            return `
                                ${beforeText}
                                <select id="blank_${idx}" class="blank-select">
                                    <option value="">Select...</option>
                                    ${blank.options.map(opt => `
                                        <option value="${this.escapeHtml(opt)}">${this.escapeHtml(opt)}</option>
                                    `).join('')}
                                </select>
                            `;
                        } else {
                            return `
                                ${beforeText}
                                <input type="text" 
                                       id="blank_${idx}" 
                                       class="blank-input" 
                                       placeholder="____"
                                       autocomplete="off">
                            `;
                        }
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    selectOption(index, value) {
        this.selectedOption = value;
        document.querySelectorAll('.exercise-option').forEach((btn, idx) => {
            btn.classList.toggle('selected', idx === index);
        });
    }
    
    async checkAnswer() {
        if (!this.currentExercise) return;
        
        let userAnswer = '';
        
        if (this.currentExercise.type === 'multiple_choice') {
            if (this.selectedOption === null) {
                this.showCelebration('Please select an answer', 'error');
                return;
            }
            userAnswer = this.selectedOption;
        } else if (this.currentExercise.type === 'translation' || this.currentExercise.type === 'listen') {
            const answerInput = document.getElementById('exerciseAnswer');
            userAnswer = answerInput ? answerInput.value.trim() : '';
            if (!userAnswer) {
                this.showCelebration('Please enter an answer', 'error');
                return;
            }
        } else if (this.currentExercise.type === 'fill_blank') {
            const blanks = this.currentExercise.blanks || [];
            userAnswer = blanks.map((blank, idx) => {
                const input = document.getElementById(`blank_${idx}`);
                return input ? input.value.trim() : '';
            });
        } else {
            this.showCelebration('Exercise type not yet implemented', 'error');
            return;
        }
        
        // Validate answer
        try {
            const validationResult = await this.api.post('/exercises', {
                exercise: this.currentExercise,
                userAnswer: userAnswer
            }, { action: 'validate' });
            
            // Submit to session
            if (this.currentSessionId) {
                await this.api.post('/session', {
                    userAnswer: userAnswer,
                    validationResult: validationResult
                }, { action: 'answer', sessionId: this.currentSessionId });
            }
            
            // Handle result
            if (validationResult.correct) {
                this.exerciseScore++;
                this.addXP(Math.round(validationResult.score * (this.currentExercise.points || 10)), 'Correct answer');
                this.showCelebration(validationResult.feedback || '✅ Correct!', 'success');
                this.updateExerciseFeedback(validationResult, true);
                
                setTimeout(async () => {
                    this.exerciseIndex++;
                    if (this.currentSessionId) {
                        await this.api.put('/session', {}, { action: 'next', sessionId: this.currentSessionId });
                    }
                    this.showNextExercise();
                }, 2000);
            } else {
                this.exerciseMistakes++;
                this.loseHeart();
                this.showCelebration(validationResult.feedback || '❌ Wrong!', 'error');
                this.updateExerciseFeedback(validationResult, false);
                
                if (this.exerciseHearts <= 0) {
                    setTimeout(() => this.finishExerciseSession(), 3000);
                } else {
                    setTimeout(async () => {
                        this.exerciseIndex++;
                        if (this.currentSessionId) {
                            await this.api.put('/session', {}, { action: 'next', sessionId: this.currentSessionId });
                        }
                        this.showNextExercise();
                    }, 3000);
                }
            }
        } catch (error) {
            console.error('Error validating answer:', error);
            this.showCelebration('Error checking answer. Please try again.', 'error');
        }
    }
    
    updateExerciseFeedback(validationResult, isCorrect) {
        const exerciseContent = document.getElementById('exerciseContent');
        if (!exerciseContent) return;
        
        if (this.currentExercise.type === 'multiple_choice') {
            const options = exerciseContent.querySelectorAll('.exercise-option');
            options.forEach((opt, idx) => {
                opt.classList.add('disabled');
                const optText = opt.textContent.trim();
                if (optText === validationResult.correctAnswer) {
                    opt.classList.add('correct');
                } else if (optText === this.selectedOption && !isCorrect) {
                    opt.classList.add('wrong');
                }
            });
        }
        
        if (this.currentExercise.explanation && !isCorrect) {
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'exercise-explanation';
            explanationDiv.innerHTML = `<p><strong>Explanation:</strong> ${this.currentExercise.explanation}</p>`;
            exerciseContent.appendChild(explanationDiv);
        }
    }
    
    initMatchingExercise() {
        const container = document.getElementById('matchingExerciseContainer');
        if (container && window.MatchingExercise) {
            window.currentMatchingExercise = new MatchingExercise(
                container,
                this.currentExercise.pairs,
                (matchedPairs) => {
                    this.userAnswer = matchedPairs;
                    this.checkAnswer();
                }
            );
        }
    }
    
    finishExerciseSession() {
        const percentage = Math.round((this.exerciseScore / this.exerciseSet.length) * 100);
        const isPerfect = this.exerciseMistakes === 0;
        
        if (isPerfect) {
            this.events.emit('perfect-lesson', { score: this.exerciseScore });
        }
        
        const exerciseContent = document.getElementById('exerciseContent');
        if (exerciseContent) {
            exerciseContent.innerHTML = `
                <div class="exercise-results">
                    <h2>Exercise Complete! 🎉</h2>
                    <div class="result-score">${this.exerciseScore} / ${this.exerciseSet.length}</div>
                    <div class="result-percentage">${percentage}%</div>
                    ${isPerfect ? '<div class="perfect-badge">💯 Perfect!</div>' : ''}
                    <div class="result-xp">+${this.exerciseScore * 10} XP</div>
                </div>
            `;
        }
    }
    
    loseHeart() {
        const currentHearts = this.state.get('hearts');
        if (currentHearts <= 0) return false;
        
        this.state.update('hearts', currentHearts - 1);
        this.state.update('lastHeartLoss', Date.now());
        this.exerciseHearts--;
        this.updateHeartsDisplay();
        
        if (this.state.get('hearts') === 0) {
            this.showCelebration('💔 Out of hearts! They refill every 4 hours.', 'error');
        }
        
        return true;
    }
    
    addXP(amount, reason = '') {
        const totalXP = this.state.get('totalXP') || 0;
        const dailyXP = this.state.get('dailyXP') || 0;
        
        this.state.update('totalXP', totalXP + amount);
        this.state.update('dailyXP', dailyXP + amount);
        this.state.update('lastXPDate', new Date().toDateString());
        
        this.events.emit('xp-gained', { amount, reason, total: totalXP + amount });
    }
    
    completeLesson(skillId) {
        const skillProgress = this.state.get('skillProgress') || {};
        if (!skillProgress[skillId]) {
            skillProgress[skillId] = { crownLevel: 0, lessonsCompleted: 0, strength: 100 };
        }
        
        skillProgress[skillId].lessonsCompleted++;
        skillProgress[skillId].lastPractice = Date.now();
        skillProgress[skillId].strength = 100;
        
        this.state.update('skillProgress', skillProgress);
    }
    
    updateHeartsDisplay() {
        const hearts = this.state.get('hearts');
        const heartsContainer = document.getElementById('heartsContainer');
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
        
        if (exerciseHeartsEl) {
            exerciseHeartsEl.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const heart = document.createElement('span');
                heart.className = 'heart';
                heart.textContent = i < this.exerciseHearts ? '❤️' : '🤍';
                exerciseHeartsEl.appendChild(heart);
            }
        }
    }
    
    showCelebration(message, type = 'success') {
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
    
    showError(message) {
        console.error(message);
        this.showCelebration(message, 'error');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    setupEventListeners() {
        // Listen for XP updates
        this.events.on('xp-gained', (data) => {
            this.appManager.updateHeaderStats();
        });
    }
}

// Export for registration
if (typeof window !== 'undefined') {
    window.ExerciseModule = ExerciseModule;
}

