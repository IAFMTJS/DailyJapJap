// Learning Path Module
class PathModule {
    constructor(appManager) {
        this.appManager = appManager;
        this.state = appManager.getState();
        this.api = appManager.getAPI();
        this.events = appManager.getEventBus();
        this.initialized = false;
        this.learningPlan = [];
    }
    
    async init() {
        if (this.initialized) return;
        
        this.setupEventListeners();
        await this.loadLearningPlan();
        this.initialized = true;
    }
    
    async activate() {
        await this.init();
        this.render();
    }
    
    deactivate() {
        // Nothing to clean up
    }
    
    async loadLearningPlan() {
        // Prevent multiple simultaneous loads
        if (this.loadingPlan) {
            return;
        }
        
        this.loadingPlan = true;
        try {
            // APIClient automatically prepends /api, so just use /learning-plan
            const data = await this.api.get('/learning-plan');
            if (data.plan && Array.isArray(data.plan)) {
                this.learningPlan = data.plan;
                this.state.update('learningPlan', data.plan);
                this.loadFailed = false;
            }
        } catch (error) {
            console.error('Error loading learning plan:', error);
            this.learningPlan = [];
            this.loadFailed = true;
        } finally {
            this.loadingPlan = false;
        }
    }
    
    render() {
        const skillTreeEl = document.getElementById('skillTree');
        if (!skillTreeEl) return;
        
        // If plan is empty and we haven't tried loading yet, or if previous load failed, try loading
        if (this.learningPlan.length === 0 && !this.loadingPlan && !this.loadFailed) {
            skillTreeEl.innerHTML = `
                <div class="empty-state">
                    <div class="premium-spinner"></div>
                    <p>Loading learning path...</p>
                </div>
            `;
            this.loadLearningPlan().then(() => {
                // Only re-render if we successfully loaded data
                if (this.learningPlan.length > 0) {
                    this.render();
                } else {
                    // Show error state instead of infinite loop
                    skillTreeEl.innerHTML = `
                        <div class="empty-state">
                            <h2>⚠️ Error Loading Learning Path</h2>
                            <p>Could not load the learning plan. Please check if the server is running.</p>
                            <button class="premium-btn" onclick="window.pathPage?.load()">Retry</button>
                        </div>
                    `;
                }
            });
            return;
        }
        
        // If load failed, show error
        if (this.loadFailed && this.learningPlan.length === 0) {
            skillTreeEl.innerHTML = `
                <div class="empty-state">
                    <h2>⚠️ Error Loading Learning Path</h2>
                    <p>Could not load the learning plan. Please check if the server is running.</p>
                    <button class="premium-btn" onclick="window.pathPage?.load()">Retry</button>
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
        const dayProgress = this.state.get('dayProgress') || {};
        const skillProgress = this.state.get('skillProgress') || {};
        const completedDays = Object.keys(dayProgress).filter(d => dayProgress[d].completed).length;
        
        // Update stats
        const daysCompletedEl = document.getElementById('daysCompleted');
        if (daysCompletedEl) daysCompletedEl.textContent = completedDays;
        
        skillTreeEl.innerHTML = this.learningPlan.map((lesson, index) => {
            const isUnlocked = index === 0 || 
                              this.learningPlan[index - 1].day <= currentDay || 
                              dayProgress[this.learningPlan[index - 1].day]?.completed;
            const isCompleted = dayProgress[lesson.day]?.completed || false;
            const isCurrent = lesson.day === currentDay;
            const progress = dayProgress[lesson.day]?.progress || 0;
            const skillId = `day-${lesson.day}`;
            const crownLevel = skillProgress[skillId]?.crownLevel || 0;
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
                    ${isUnlocked ? `<button class="premium-btn skill-btn" onclick="window.appManager.getModule('exercise').startLesson(${lesson.day}, '${lesson.type}')">
                        ${isCompleted ? 'Review' : isCurrent ? 'Start' : 'Continue'}
                    </button>` : '<div class="skill-locked">🔒</div>'}
                </div>
            `;
        }).join('');
    }
    
    setupEventListeners() {
        // Listen for progress updates
        this.events.on('day-progress-updated', () => {
            this.render();
        });
        
        // Listen for skill progress updates
        this.state.subscribe('skillProgress', () => {
            this.render();
        });
    }
}

// Export for registration
if (typeof window !== 'undefined') {
    window.PathModule = PathModule;
}

