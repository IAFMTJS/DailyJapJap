// Modular App Entry Point
// This replaces the old monolithic app.js

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing modular app...');
    
    try {
        // Initialize core systems
        const appManager = new AppManager();
        window.appManager = appManager;
        
        // Register all modules
        appManager.registerModule('path', PathModule);
        appManager.registerModule('exercise', ExerciseModule);
        appManager.registerModule('study', StudyModule);
        appManager.registerModule('flashcards', FlashcardsModule);
        // Add other modules as they're created:
        // appManager.registerModule('kana', KanaModule);
        // appManager.registerModule('quiz', QuizModule);
        // appManager.registerModule('practice', PracticeModule);
        // appManager.registerModule('achievements', AchievementsModule);
        // appManager.registerModule('quests', QuestsModule);
        // appManager.registerModule('stats', StatsModule);
        
        // Initialize app
        await appManager.init();
        
        console.log('✅ App initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
});

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--danger); color: white; padding: 1rem; border-radius: 8px; z-index: 10000;';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

