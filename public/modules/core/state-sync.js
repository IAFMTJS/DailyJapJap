// State synchronization between StateManager and studyStats
// This ensures backward compatibility while using the new modular system

export function syncStudyStatsToStateManager(stateManager, studyStats) {
    if (!stateManager || !studyStats) return;
    
    stateManager.updateMultiple({
        totalXP: studyStats.totalXP || 0,
        dailyXP: studyStats.dailyXP || 0,
        studyStreak: studyStats.studyStreak || 0,
        lastStudyDate: studyStats.lastStudyDate || null,
        hearts: studyStats.hearts || 5,
        lastHeartLoss: studyStats.lastHeartLoss || Date.now(),
        dayProgress: studyStats.dayProgress || {},
        kanaProgress: studyStats.kanaProgress || {},
        skillProgress: studyStats.skillProgress || {},
        achievements: studyStats.achievements || [],
        dailyQuests: studyStats.dailyQuests || {},
        spacedRepetition: studyStats.spacedRepetition || {}
    });
}

export function syncStateManagerToStudyStats(stateManager, studyStats, saveStudyStats) {
    if (!stateManager || !studyStats) return;
    
    studyStats.totalXP = stateManager.get('totalXP') || 0;
    studyStats.dailyXP = stateManager.get('dailyXP') || 0;
    studyStats.studyStreak = stateManager.get('studyStreak') || 0;
    studyStats.lastStudyDate = stateManager.get('lastStudyDate') || null;
    studyStats.hearts = stateManager.get('hearts') || 5;
    studyStats.lastHeartLoss = stateManager.get('lastHeartLoss') || Date.now();
    studyStats.dayProgress = stateManager.get('dayProgress') || {};
    studyStats.kanaProgress = stateManager.get('kanaProgress') || {};
    studyStats.skillProgress = stateManager.get('skillProgress') || {};
    studyStats.achievements = stateManager.get('achievements') || [];
    studyStats.dailyQuests = stateManager.get('dailyQuests') || {};
    studyStats.spacedRepetition = stateManager.get('spacedRepetition') || {};
    
    if (saveStudyStats) {
        saveStudyStats();
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.syncStudyStatsToStateManager = syncStudyStatsToStateManager;
    window.syncStateManagerToStudyStats = syncStateManagerToStudyStats;
}

