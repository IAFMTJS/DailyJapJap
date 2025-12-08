// Progress Service - Real progress tracking with meaningful markers
import { studyStats, saveStudyStats } from './studyStats.js';

// XP Level System
const XP_PER_LEVEL = 100; // Base XP per level (increases with level)
const LEVEL_MULTIPLIER = 1.2; // Each level requires 20% more XP

export function calculateLevel(totalXP) {
    let level = 1;
    let xpForNextLevel = XP_PER_LEVEL;
    let xpInCurrentLevel = totalXP;
    
    while (xpInCurrentLevel >= xpForNextLevel) {
        xpInCurrentLevel -= xpForNextLevel;
        level++;
        xpForNextLevel = Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, level - 1));
    }
    
    return {
        level,
        xpInCurrentLevel,
        xpForNextLevel,
        progress: (xpInCurrentLevel / xpForNextLevel) * 100
    };
}

// Progress Milestones
const MILESTONES = [
    { xp: 100, title: 'First Steps', icon: '👶', description: 'You\'ve started your journey!' },
    { xp: 250, title: 'Getting Started', icon: '🌱', description: 'You\'re making progress!' },
    { xp: 500, title: 'On the Path', icon: '🚶', description: 'You\'re on your way!' },
    { xp: 1000, title: 'Dedicated Learner', icon: '📚', description: 'You\'re committed!' },
    { xp: 2000, title: 'Serious Student', icon: '🎓', description: 'You\'re serious about learning!' },
    { xp: 3500, title: 'Advanced Learner', icon: '⭐', description: 'You\'re advanced!' },
    { xp: 5000, title: 'Expert', icon: '🏆', description: 'You\'re an expert!' },
    { xp: 7500, title: 'Master', icon: '👑', description: 'You\'re a master!' },
    { xp: 10000, title: 'Grand Master', icon: '💎', description: 'You\'re a grand master!' },
    { xp: 15000, title: 'Legend', icon: '🌟', description: 'You\'re a legend!' }
];

export function getCurrentMilestone(totalXP) {
    let currentMilestone = null;
    let nextMilestone = null;
    
    for (let i = 0; i < MILESTONES.length; i++) {
        if (totalXP >= MILESTONES[i].xp) {
            currentMilestone = MILESTONES[i];
        } else {
            nextMilestone = MILESTONES[i];
            break;
        }
    }
    
    return {
        current: currentMilestone,
        next: nextMilestone,
        progress: nextMilestone ? ((totalXP - (currentMilestone?.xp || 0)) / (nextMilestone.xp - (currentMilestone?.xp || 0))) * 100 : 100
    };
}

// Chapter Progress Tracking
export function getChapterProgress() {
    if (!window.chapterService) {
        return { completed: 0, total: 0, progress: 0 };
    }
    
    const stats = window.chapterService.getChapterStats();
    return {
        completed: stats.testPassed,
        total: stats.total,
        progress: stats.progress,
        currentChapter: stats.currentChapter
    };
}

// Words Mastered Tracking
export function getWordsMastered() {
    return {
        total: studyStats.wordsMastered.size,
        studied: studyStats.wordsStudied.size,
        progress: studyStats.wordsMastered.size > 0 ? 
            (studyStats.wordsMastered.size / Math.max(studyStats.wordsStudied.size, 1)) * 100 : 0
    };
}

// Overall Progress Calculation
export function getOverallProgress() {
    const levelInfo = calculateLevel(studyStats.totalXP);
    const milestoneInfo = getCurrentMilestone(studyStats.totalXP);
    const chapterInfo = getChapterProgress();
    const wordsInfo = getWordsMastered();
    
    // Calculate overall progress (weighted average)
    const weights = {
        level: 0.3,
        chapters: 0.3,
        words: 0.2,
        streak: 0.1,
        achievements: 0.1
    };
    
    const levelProgress = (levelInfo.level / 100) * 100; // Assuming max level 100
    const chapterProgress = chapterInfo.progress;
    const wordsProgress = wordsInfo.progress;
    const streakProgress = Math.min((studyStats.studyStreak / 365) * 100, 100); // Max at 365 days
    const achievementsProgress = studyStats.achievements ? 
        (studyStats.achievements.length / 50) * 100 : 0; // Assuming 50 total achievements
    
    const overallProgress = 
        (levelProgress * weights.level) +
        (chapterProgress * weights.chapters) +
        (wordsProgress * weights.words) +
        (streakProgress * weights.streak) +
        (achievementsProgress * weights.achievements);
    
    return {
        overall: Math.round(overallProgress),
        level: levelInfo,
        milestone: milestoneInfo,
        chapters: chapterInfo,
        words: wordsInfo,
        streak: {
            current: studyStats.studyStreak,
            progress: streakProgress
        },
        achievements: {
            unlocked: studyStats.achievements?.length || 0,
            progress: achievementsProgress
        }
    };
}

// Progress Markers (Real achievements)
export function getProgressMarkers() {
    const progress = getOverallProgress();
    const markers = [];
    
    // Level markers
    if (progress.level.level >= 5) markers.push({ type: 'level', value: 5, title: 'Level 5 Reached', icon: '⭐' });
    if (progress.level.level >= 10) markers.push({ type: 'level', value: 10, title: 'Level 10 Reached', icon: '🌟' });
    if (progress.level.level >= 25) markers.push({ type: 'level', value: 25, title: 'Level 25 Reached', icon: '💫' });
    if (progress.level.level >= 50) markers.push({ type: 'level', value: 50, title: 'Level 50 Reached', icon: '👑' });
    
    // Chapter markers
    if (progress.chapters.completed >= 1) markers.push({ type: 'chapter', value: 1, title: 'First Chapter Complete', icon: '📖' });
    if (progress.chapters.completed >= 5) markers.push({ type: 'chapter', value: 5, title: '5 Chapters Complete', icon: '📚' });
    if (progress.chapters.completed >= 10) markers.push({ type: 'chapter', value: 10, title: 'All Chapters Complete!', icon: '🎓' });
    
    // Words markers
    if (progress.words.total >= 50) markers.push({ type: 'words', value: 50, title: '50 Words Mastered', icon: '💪' });
    if (progress.words.total >= 100) markers.push({ type: 'words', value: 100, title: '100 Words Mastered', icon: '🔥' });
    if (progress.words.total >= 250) markers.push({ type: 'words', value: 250, title: '250 Words Mastered', icon: '⚡' });
    if (progress.words.total >= 500) markers.push({ type: 'words', value: 500, title: '500 Words Mastered!', icon: '💎' });
    
    // Streak markers
    if (progress.streak.current >= 7) markers.push({ type: 'streak', value: 7, title: '7 Day Streak', icon: '🔥' });
    if (progress.streak.current >= 30) markers.push({ type: 'streak', value: 30, title: '30 Day Streak!', icon: '🔥🔥' });
    if (progress.streak.current >= 100) markers.push({ type: 'streak', value: 100, title: '100 Day Streak!!', icon: '🔥🔥🔥' });
    
    return markers.sort((a, b) => b.value - a.value); // Sort by value descending
}

// Check for new milestones
export function checkMilestones(oldXP, newXP) {
    const newMilestones = [];
    
    MILESTONES.forEach(milestone => {
        if (oldXP < milestone.xp && newXP >= milestone.xp) {
            newMilestones.push(milestone);
        }
    });
    
    return newMilestones;
}

// Export for global access
window.progressService = {
    calculateLevel,
    getCurrentMilestone,
    getChapterProgress,
    getWordsMastered,
    getOverallProgress,
    getProgressMarkers,
    checkMilestones
};

