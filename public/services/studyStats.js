// Study stats service - manages all study statistics
export const studyStats = {
    wordsStudied: new Set(),
    wordsMastered: new Set(),
    studyStreak: parseInt(localStorage.getItem('studyStreak') || '0'),
    lastStudyDate: localStorage.getItem('lastStudyDate') || null,
    totalXP: parseInt(localStorage.getItem('totalXP') || '0'),
    dailyXP: parseInt(localStorage.getItem('dailyXP') || '0'),
    lastXPDate: localStorage.getItem('lastXPDate') || null,
    dayProgress: JSON.parse(localStorage.getItem('dayProgress') || '{}'),
    kanaProgress: JSON.parse(localStorage.getItem('kanaProgress') || '{}'),
    spacedRepetition: JSON.parse(localStorage.getItem('spacedRepetition') || '{}'),
    hearts: parseInt(localStorage.getItem('hearts') || '5'),
    lastHeartLoss: parseInt(localStorage.getItem('lastHeartLoss') || Date.now()),
    skillProgress: JSON.parse(localStorage.getItem('skillProgress') || '{}'),
    achievements: JSON.parse(localStorage.getItem('achievements') || '[]'),
    dailyQuests: JSON.parse(localStorage.getItem('dailyQuests') || '{}'),
    lastQuestDate: localStorage.getItem('lastQuestDate') || null,
    perfectLessons: parseInt(localStorage.getItem('perfectLessons') || '0'),
    exercisesCompleted: parseInt(localStorage.getItem('exercisesCompleted') || '0'),
};

export function saveStudyStats() {
    localStorage.setItem('studyStreak', studyStats.studyStreak.toString());
    localStorage.setItem('lastStudyDate', studyStats.lastStudyDate);
    localStorage.setItem('wordsStudied', JSON.stringify(Array.from(studyStats.wordsStudied)));
    localStorage.setItem('wordsMastered', JSON.stringify(Array.from(studyStats.wordsMastered)));
    localStorage.setItem('totalXP', studyStats.totalXP.toString());
    localStorage.setItem('dailyXP', studyStats.dailyXP.toString());
    localStorage.setItem('lastXPDate', studyStats.lastXPDate);
    localStorage.setItem('dayProgress', JSON.stringify(studyStats.dayProgress));
    localStorage.setItem('kanaProgress', JSON.stringify(studyStats.kanaProgress));
    localStorage.setItem('spacedRepetition', JSON.stringify(studyStats.spacedRepetition));
    localStorage.setItem('hearts', studyStats.hearts.toString());
    localStorage.setItem('lastHeartLoss', studyStats.lastHeartLoss.toString());
    localStorage.setItem('skillProgress', JSON.stringify(studyStats.skillProgress));
    localStorage.setItem('achievements', JSON.stringify(studyStats.achievements));
    localStorage.setItem('dailyQuests', JSON.stringify(studyStats.dailyQuests));
    localStorage.setItem('lastQuestDate', studyStats.lastQuestDate);
    localStorage.setItem('perfectLessons', studyStats.perfectLessons.toString());
    localStorage.setItem('exercisesCompleted', studyStats.exercisesCompleted.toString());
}

export function loadStudyStats() {
    const studied = localStorage.getItem('wordsStudied');
    const mastered = localStorage.getItem('wordsMastered');
    
    if (studied) {
        studyStats.wordsStudied = new Set(JSON.parse(studied));
    }
    if (mastered) {
        studyStats.wordsMastered = new Set(JSON.parse(mastered));
    }
    
    const dayProgress = localStorage.getItem('dayProgress');
    if (dayProgress) {
        studyStats.dayProgress = JSON.parse(dayProgress);
    }
    const kanaProgress = localStorage.getItem('kanaProgress');
    if (kanaProgress) {
        studyStats.kanaProgress = JSON.parse(kanaProgress);
    }
    const spacedRepetition = localStorage.getItem('spacedRepetition');
    if (spacedRepetition) {
        studyStats.spacedRepetition = JSON.parse(spacedRepetition);
    }
    const skillProgress = localStorage.getItem('skillProgress');
    if (skillProgress) {
        studyStats.skillProgress = JSON.parse(skillProgress);
    }
    const achievements = localStorage.getItem('achievements');
    if (achievements) {
        studyStats.achievements = JSON.parse(achievements);
    }
    const dailyQuests = localStorage.getItem('dailyQuests');
    if (dailyQuests) {
        studyStats.dailyQuests = JSON.parse(dailyQuests);
    }
}

// Load on import
loadStudyStats();

