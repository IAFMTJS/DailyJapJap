// Level Completion Service - Games required to complete levels
import { studyStats, saveStudyStats } from './studyStats.js';
import { generateBossChallenge, startChallenge, updateChallengeProgress } from './enhancedChallengesService.js';

let levelCompletionData = {};

export function checkLevelCompletion(levelId) {
    const level = levelCompletionData[levelId];
    if (!level) return { completed: false, requirements: [] };
    
    const requirements = getLevelRequirements(levelId);
    const completed = requirements.every(req => req.completed);
    
    return {
        completed,
        requirements,
        progress: calculateProgress(requirements)
    };
}

export function getLevelRequirements(levelId) {
    const level = levelCompletionData[levelId];
    if (!level) return [];
    
    const requirements = [];
    
    // Requirement 1: Complete all exercises
    const exercisesCompleted = studyStats.levelProgress?.[levelId]?.exercisesCompleted || 0;
    requirements.push({
        type: 'exercises',
        description: `Complete ${level.requiredExercises} exercises`,
        required: level.requiredExercises,
        current: exercisesCompleted,
        completed: exercisesCompleted >= level.requiredExercises
    });
    
    // Requirement 2: Achieve minimum accuracy
    const accuracy = studyStats.levelProgress?.[levelId]?.accuracy || 0;
    requirements.push({
        type: 'accuracy',
        description: `Achieve ${level.requiredAccuracy}% accuracy`,
        required: level.requiredAccuracy,
        current: accuracy,
        completed: accuracy >= level.requiredAccuracy
    });
    
    // Requirement 3: Complete boss battle
    const bossCompleted = studyStats.levelProgress?.[levelId]?.bossCompleted || false;
    requirements.push({
        type: 'boss',
        description: `Defeat the ${level.name} Boss`,
        required: 1,
        current: bossCompleted ? 1 : 0,
        completed: bossCompleted
    });
    
    // Requirement 4: Complete level game
    const gameCompleted = studyStats.levelProgress?.[levelId]?.gameCompleted || false;
    if (level.requiredGame) {
        requirements.push({
            type: 'game',
            description: `Complete ${level.requiredGame} game`,
            required: 1,
            current: gameCompleted ? 1 : 0,
            completed: gameCompleted
        });
    }
    
    return requirements;
}

function calculateProgress(requirements) {
    if (requirements.length === 0) return 0;
    const completed = requirements.filter(r => r.completed).length;
    return Math.round((completed / requirements.length) * 100);
}

export function startBossBattle(levelId) {
    const level = levelCompletionData[levelId];
    if (!level) return null;
    
    const bossChallenge = generateBossChallenge(levelId, level.name);
    return startChallenge(bossChallenge);
}

export function completeBossBattle(levelId, success) {
    if (!studyStats.levelProgress) {
        studyStats.levelProgress = {};
    }
    if (!studyStats.levelProgress[levelId]) {
        studyStats.levelProgress[levelId] = {};
    }
    
    studyStats.levelProgress[levelId].bossCompleted = success;
    saveStudyStats();
    
    // Check if level is now complete
    const completion = checkLevelCompletion(levelId);
    if (completion.completed) {
        completeLevel(levelId);
    }
    
    return completion;
}

export function completeLevel(levelId) {
    const level = levelCompletionData[levelId];
    if (!level) return;
    
    if (!studyStats.completedLevels) {
        studyStats.completedLevels = [];
    }
    if (!studyStats.completedLevels.includes(levelId)) {
        studyStats.completedLevels.push(levelId);
        
        // Award rewards
        if (level.rewards) {
            if (level.rewards.xp) {
                studyStats.totalXP = (studyStats.totalXP || 0) + level.rewards.xp;
            }
            if (level.rewards.coins) {
                studyStats.coins = (studyStats.coins || 0) + level.rewards.coins;
            }
            if (level.rewards.unlock) {
                studyStats.unlockedLevels = studyStats.unlockedLevels || [];
                if (!studyStats.unlockedLevels.includes(level.rewards.unlock)) {
                    studyStats.unlockedLevels.push(level.rewards.unlock);
                }
            }
        }
        
        saveStudyStats();
        
        // Trigger event
        if (typeof window !== 'undefined' && window.eventBus) {
            window.eventBus.emit('level-completed', { levelId, level });
        }
    }
}

export function initializeLevel(levelId, levelData) {
    levelCompletionData[levelId] = levelData;
}

export function getLevelData(levelId) {
    return levelCompletionData[levelId];
}

export function getAllLevels() {
    return Object.keys(levelCompletionData).map(id => ({
        id,
        ...levelCompletionData[id],
        completion: checkLevelCompletion(id)
    }));
}

// Initialize default levels
export function initializeDefaultLevels() {
    // This would be called with actual level data from the learning path
    // For now, it's a placeholder
}

// Export for global access
window.levelCompletionService = {
    checkLevelCompletion,
    getLevelRequirements,
    startBossBattle,
    completeBossBattle,
    completeLevel,
    initializeLevel,
    getLevelData,
    getAllLevels,
    initializeDefaultLevels
};

