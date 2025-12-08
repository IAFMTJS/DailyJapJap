// Enhanced Challenges Service - More challenge types like Duolingo
import { studyStats, saveStudyStats } from './studyStats.js';

const CHALLENGE_TYPES = {
    SKILL_SPECIFIC: 'skill-specific',
    TIME_BASED: 'time-based',
    COMBO: 'combo',
    PERFECT_STREAK: 'perfect-streak',
    BOSS: 'boss',
    WEEKLY_TOURNAMENT: 'weekly-tournament',
    SPEED_ROUND: 'speed-round',
    PERFECT_GAME: 'perfect-game'
};

let activeChallenges = [];
let challengeHistory = [];

export function generateSkillSpecificChallenge(skillId, skillName) {
    return {
        id: `skill-${skillId}-${Date.now()}`,
        type: CHALLENGE_TYPES.SKILL_SPECIFIC,
        title: `${skillName} Master`,
        description: `Complete all exercises in ${skillName} with 80% accuracy`,
        skillId: skillId,
        skillName: skillName,
        target: 10, // 10 exercises
        current: 0,
        accuracy: 0,
        requiredAccuracy: 80,
        reward: { xp: 100, coins: 50 },
        icon: '🎯',
        difficulty: 'medium',
        timeLimit: null
    };
}

export function generateTimeBasedChallenge(duration, exercises) {
    return {
        id: `time-${Date.now()}`,
        type: CHALLENGE_TYPES.TIME_BASED,
        title: `Speed Challenge: ${duration} Minutes`,
        description: `Complete ${exercises} exercises in ${duration} minutes`,
        duration: duration * 60, // Convert to seconds
        exercises: exercises,
        current: 0,
        startTime: null,
        reward: { xp: 150, coins: 75 },
        icon: '⏱️',
        difficulty: 'hard',
        timeLimit: duration * 60
    };
}

export function generateComboChallenge(comboCount) {
    return {
        id: `combo-${Date.now()}`,
        type: CHALLENGE_TYPES.COMBO,
        title: `Combo Master`,
        description: `Get ${comboCount} correct answers in a row`,
        comboCount: comboCount,
        current: 0,
        maxCombo: 0,
        reward: { xp: 200, coins: 100 },
        icon: '🔥',
        difficulty: 'hard',
        timeLimit: null
    };
}

export function generatePerfectStreakChallenge(streakCount) {
    return {
        id: `perfect-${Date.now()}`,
        type: CHALLENGE_TYPES.PERFECT_STREAK,
        title: `Perfect Streak`,
        description: `Get ${streakCount} perfect lessons in a row`,
        streakCount: streakCount,
        current: 0,
        reward: { xp: 250, coins: 125 },
        icon: '💯',
        difficulty: 'very-hard',
        timeLimit: null
    };
}

export function generateBossChallenge(chapterId, chapterName) {
    return {
        id: `boss-${chapterId}-${Date.now()}`,
        type: CHALLENGE_TYPES.BOSS,
        title: `${chapterName} Boss Battle`,
        description: `Defeat the boss to unlock ${chapterName}`,
        chapterId: chapterId,
        chapterName: chapterName,
        questions: 10,
        correct: 0,
        health: 100,
        requiredAccuracy: 80,
        reward: { xp: 500, coins: 250, unlock: chapterId },
        icon: '👹',
        difficulty: 'boss',
        timeLimit: null
    };
}

export function generateSpeedRoundChallenge() {
    return {
        id: `speed-${Date.now()}`,
        type: CHALLENGE_TYPES.SPEED_ROUND,
        title: `Speed Round`,
        description: `Answer 20 questions as fast as possible`,
        questions: 20,
        current: 0,
        correct: 0,
        startTime: null,
        bestTime: null,
        reward: { xp: 300, coins: 150 },
        icon: '⚡',
        difficulty: 'hard',
        timeLimit: null
    };
}

export function generatePerfectGameChallenge() {
    return {
        id: `perfect-game-${Date.now()}`,
        type: CHALLENGE_TYPES.PERFECT_GAME,
        title: `Perfect Game`,
        description: `Complete a full game with 100% accuracy`,
        questions: 10,
        current: 0,
        correct: 0,
        requiredAccuracy: 100,
        reward: { xp: 400, coins: 200 },
        icon: '💎',
        difficulty: 'very-hard',
        timeLimit: null
    };
}

export function startChallenge(challenge) {
    challenge.startTime = Date.now();
    challenge.current = 0;
    if (challenge.type === CHALLENGE_TYPES.TIME_BASED) {
        challenge.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - challenge.startTime) / 1000);
            const remaining = challenge.duration - elapsed;
            if (remaining <= 0) {
                completeChallenge(challenge, false);
            }
        }, 1000);
    }
    activeChallenges.push(challenge);
    saveChallenges();
    return challenge;
}

export function updateChallengeProgress(challengeId, isCorrect, isPerfect = false) {
    const challenge = activeChallenges.find(c => c.id === challengeId);
    if (!challenge) return null;
    
    switch (challenge.type) {
        case CHALLENGE_TYPES.SKILL_SPECIFIC:
            challenge.current++;
            if (isCorrect) {
                challenge.correct = (challenge.correct || 0) + 1;
                challenge.accuracy = Math.round((challenge.correct / challenge.current) * 100);
            }
            if (challenge.current >= challenge.target) {
                if (challenge.accuracy >= challenge.requiredAccuracy) {
                    completeChallenge(challenge, true);
                } else {
                    completeChallenge(challenge, false);
                }
            }
            break;
            
        case CHALLENGE_TYPES.TIME_BASED:
            challenge.current++;
            if (challenge.current >= challenge.exercises) {
                completeChallenge(challenge, true);
            }
            break;
            
        case CHALLENGE_TYPES.COMBO:
            if (isCorrect) {
                challenge.current++;
                challenge.maxCombo = Math.max(challenge.maxCombo, challenge.current);
            } else {
                challenge.current = 0;
            }
            if (challenge.current >= challenge.comboCount) {
                completeChallenge(challenge, true);
            }
            break;
            
        case CHALLENGE_TYPES.PERFECT_STREAK:
            if (isPerfect) {
                challenge.current++;
            } else {
                challenge.current = 0;
            }
            if (challenge.current >= challenge.streakCount) {
                completeChallenge(challenge, true);
            }
            break;
            
        case CHALLENGE_TYPES.BOSS:
            challenge.current++;
            if (isCorrect) {
                challenge.correct++;
                challenge.health = Math.max(0, challenge.health - 10);
            }
            if (challenge.current >= challenge.questions) {
                const accuracy = (challenge.correct / challenge.questions) * 100;
                if (accuracy >= challenge.requiredAccuracy) {
                    completeChallenge(challenge, true);
                } else {
                    completeChallenge(challenge, false);
                }
            }
            break;
            
        case CHALLENGE_TYPES.SPEED_ROUND:
            challenge.current++;
            if (isCorrect) challenge.correct++;
            if (challenge.current >= challenge.questions) {
                const time = Math.floor((Date.now() - challenge.startTime) / 1000);
                challenge.bestTime = time;
                completeChallenge(challenge, true);
            }
            break;
            
        case CHALLENGE_TYPES.PERFECT_GAME:
            challenge.current++;
            if (isCorrect) {
                challenge.correct++;
            } else {
                // Failed perfect game
                completeChallenge(challenge, false);
                return;
            }
            if (challenge.current >= challenge.questions) {
                completeChallenge(challenge, true);
            }
            break;
    }
    
    saveChallenges();
    return challenge;
}

function completeChallenge(challenge, success) {
    if (challenge.timer) {
        clearInterval(challenge.timer);
    }
    
    challenge.completed = true;
    challenge.success = success;
    challenge.completedAt = Date.now();
    
    if (success) {
        // Award rewards
        if (challenge.reward.xp) {
            studyStats.totalXP = (studyStats.totalXP || 0) + challenge.reward.xp;
        }
        if (challenge.reward.coins) {
            studyStats.coins = (studyStats.coins || 0) + challenge.reward.coins;
        }
        if (challenge.reward.unlock) {
            // Unlock content
            studyStats.unlockedChapters = studyStats.unlockedChapters || [];
            if (!studyStats.unlockedChapters.includes(challenge.reward.unlock)) {
                studyStats.unlockedChapters.push(challenge.reward.unlock);
            }
        }
        saveStudyStats();
    }
    
    challengeHistory.push(challenge);
    activeChallenges = activeChallenges.filter(c => c.id !== challenge.id);
    saveChallenges();
    
    // Trigger event
    if (typeof window !== 'undefined' && window.eventBus) {
        window.eventBus.emit('challenge-completed', { challenge, success });
    }
    
    return challenge;
}

export function getActiveChallenges() {
    return activeChallenges;
}

export function getChallengeHistory() {
    return challengeHistory;
}

export function getChallengeById(challengeId) {
    return activeChallenges.find(c => c.id === challengeId) || 
           challengeHistory.find(c => c.id === challengeId);
}

function saveChallenges() {
    localStorage.setItem('activeChallenges', JSON.stringify(activeChallenges));
    localStorage.setItem('challengeHistory', JSON.stringify(challengeHistory));
}

function loadChallenges() {
    const saved = localStorage.getItem('activeChallenges');
    if (saved) {
        activeChallenges = JSON.parse(saved);
    }
    const savedHistory = localStorage.getItem('challengeHistory');
    if (savedHistory) {
        challengeHistory = JSON.parse(savedHistory);
    }
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        loadChallenges();
    });
}

// Export for global access
window.enhancedChallengesService = {
    generateSkillSpecificChallenge,
    generateTimeBasedChallenge,
    generateComboChallenge,
    generatePerfectStreakChallenge,
    generateBossChallenge,
    generateSpeedRoundChallenge,
    generatePerfectGameChallenge,
    startChallenge,
    updateChallengeProgress,
    getActiveChallenges,
    getChallengeHistory,
    getChallengeById,
    CHALLENGE_TYPES
};

