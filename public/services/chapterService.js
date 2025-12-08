// Chapter Service - Manages chapter-based learning progression
import { studyStats, saveStudyStats } from './studyStats.js';

// Chapter structure - organized by themes
const CHAPTERS = [
    {
        id: 'chapter-1',
        number: 1,
        title: '初めての挨拶 (First Greetings)',
        description: 'Learn basic greetings and introductions',
        theme: 'slice-of-life',
        words: 20,
        kana: 'hiragana-basics',
        unlocked: true, // First chapter always unlocked
        xpRequired: 0,
        prerequisites: []
    },
    {
        id: 'chapter-2',
        number: 2,
        title: '学校生活 (School Life)',
        description: 'School-related vocabulary and phrases',
        theme: 'school',
        words: 25,
        kana: 'hiragana-intermediate',
        unlocked: false,
        xpRequired: 100,
        prerequisites: ['chapter-1']
    },
    {
        id: 'chapter-3',
        number: 3,
        title: '日常会話 (Daily Conversation)',
        description: 'Common daily phrases and expressions',
        theme: 'daily-life',
        words: 30,
        kana: 'katakana-basics',
        unlocked: false,
        xpRequired: 250,
        prerequisites: ['chapter-2']
    },
    {
        id: 'chapter-4',
        number: 4,
        title: '感情表現 (Emotions)',
        description: 'Expressing feelings and emotions',
        theme: 'emotions',
        words: 25,
        kana: 'katakana-intermediate',
        unlocked: false,
        xpRequired: 400,
        prerequisites: ['chapter-3']
    },
    {
        id: 'chapter-5',
        number: 5,
        title: '食べ物 (Food)',
        description: 'Food vocabulary from anime and manga',
        theme: 'food',
        words: 35,
        kana: 'hiragana-advanced',
        unlocked: false,
        xpRequired: 600,
        prerequisites: ['chapter-4']
    },
    {
        id: 'chapter-6',
        number: 6,
        title: 'アクション (Action)',
        description: 'Action words from shounen anime',
        theme: 'action',
        words: 30,
        kana: 'katakana-advanced',
        unlocked: false,
        xpRequired: 800,
        prerequisites: ['chapter-5']
    },
    {
        id: 'chapter-7',
        number: 7,
        title: '友情 (Friendship)',
        description: 'Words about friendship and bonds',
        theme: 'friendship',
        words: 25,
        kana: 'mixed',
        unlocked: false,
        xpRequired: 1000,
        prerequisites: ['chapter-6']
    },
    {
        id: 'chapter-8',
        number: 8,
        title: '冒険 (Adventure)',
        description: 'Adventure and journey vocabulary',
        theme: 'adventure',
        words: 35,
        kana: 'mixed',
        unlocked: false,
        xpRequired: 1250,
        prerequisites: ['chapter-7']
    },
    {
        id: 'chapter-9',
        number: 9,
        title: '戦闘 (Combat)',
        description: 'Combat and battle terms',
        theme: 'combat',
        words: 30,
        kana: 'mixed',
        unlocked: false,
        xpRequired: 1500,
        prerequisites: ['chapter-8']
    },
    {
        id: 'chapter-10',
        number: 10,
        title: '最終章 (Final Chapter)',
        description: 'Master level vocabulary and expressions',
        theme: 'mastery',
        words: 40,
        kana: 'all',
        unlocked: false,
        xpRequired: 2000,
        prerequisites: ['chapter-9']
    }
];

// Initialize chapter progress
function initializeChapters() {
    if (!studyStats.chapters) {
        studyStats.chapters = {};
    }
    
    CHAPTERS.forEach(chapter => {
        if (!studyStats.chapters[chapter.id]) {
            studyStats.chapters[chapter.id] = {
                unlocked: chapter.unlocked,
                completed: false,
                testPassed: false,
                testScore: 0,
                progress: 0,
                wordsStudied: 0,
                wordsMastered: 0,
                xpEarned: 0,
                completedAt: null,
                testAttempts: 0
            };
        }
    });
    
    saveStudyStats();
}

// Check and update chapter unlocks
export function updateChapterUnlocks() {
    initializeChapters();
    
    CHAPTERS.forEach(chapter => {
        const chapterData = studyStats.chapters[chapter.id];
        
        // Check if already unlocked
        if (chapterData.unlocked) return;
        
        // Check prerequisites
        const prerequisitesMet = chapter.prerequisites.every(prereq => {
            const prereqData = studyStats.chapters[prereq];
            return prereqData && prereqData.testPassed;
        });
        
        // Check XP requirement
        const xpMet = studyStats.totalXP >= chapter.xpRequired;
        
        if (prerequisitesMet && xpMet) {
            chapterData.unlocked = true;
            unlockChapterCelebration(chapter);
        }
    });
    
    saveStudyStats();
}

// Get current chapter
export function getCurrentChapter() {
    initializeChapters();
    
    // Find first incomplete chapter
    for (const chapter of CHAPTERS) {
        const chapterData = studyStats.chapters[chapter.id];
        if (chapterData && chapterData.unlocked && !chapterData.completed) {
            return chapter;
        }
    }
    
    // If all completed, return last chapter
    return CHAPTERS[CHAPTERS.length - 1];
}

// Get chapter by ID
export function getChapter(chapterId) {
    return CHAPTERS.find(c => c.id === chapterId);
}

// Get all chapters
export function getAllChapters() {
    initializeChapters();
    return CHAPTERS.map(chapter => ({
        ...chapter,
        progress: studyStats.chapters[chapter.id] || {
            unlocked: chapter.unlocked,
            completed: false,
            testPassed: false,
            progress: 0
        }
    }));
}

// Update chapter progress
export function updateChapterProgress(chapterId, progress) {
    initializeChapters();
    
    if (!studyStats.chapters[chapterId]) {
        studyStats.chapters[chapterId] = {
            unlocked: true,
            completed: false,
            testPassed: false,
            progress: 0,
            wordsStudied: 0,
            wordsMastered: 0,
            xpEarned: 0
        };
    }
    
    const chapterData = studyStats.chapters[chapterId];
    chapterData.progress = Math.max(chapterData.progress, progress);
    
    // Mark as completed if progress is 100%
    if (chapterData.progress >= 100 && !chapterData.completed) {
        chapterData.completed = true;
        chapterData.completedAt = Date.now();
    }
    
    saveStudyStats();
}

// Mark chapter test as passed
export function passChapterTest(chapterId, score) {
    initializeChapters();
    
    if (!studyStats.chapters[chapterId]) {
        studyStats.chapters[chapterId] = {
            unlocked: true,
            completed: false,
            testPassed: false,
            progress: 0
        };
    }
    
    const chapterData = studyStats.chapters[chapterId];
    chapterData.testAttempts = (chapterData.testAttempts || 0) + 1;
    chapterData.testScore = Math.max(chapterData.testScore || 0, score);
    
    if (score >= 80) {
        chapterData.testPassed = true;
        chapterData.completed = true;
        chapterData.completedAt = Date.now();
        
        // Unlock next chapters
        updateChapterUnlocks();
        
        // Show celebration
        if (window.celebrationService) {
            window.celebrationService.celebrate(`Chapter ${getChapter(chapterId).number} Complete! 🎉`, 'achievement');
        }
        
        // Award XP
        if (window.xpService) {
            const chapter = getChapter(chapterId);
            window.xpService.addXP(100 + (chapter.number * 10), `Chapter ${chapter.number} completed`);
        }
    }
    
    saveStudyStats();
    return chapterData.testPassed;
}

// Get chapter statistics
export function getChapterStats() {
    initializeChapters();
    
    const totalChapters = CHAPTERS.length;
    const unlockedChapters = CHAPTERS.filter(c => 
        studyStats.chapters[c.id]?.unlocked
    ).length;
    const completedChapters = CHAPTERS.filter(c => 
        studyStats.chapters[c.id]?.completed
    ).length;
    const testPassedChapters = CHAPTERS.filter(c => 
        studyStats.chapters[c.id]?.testPassed
    ).length;
    
    const overallProgress = (completedChapters / totalChapters) * 100;
    
    return {
        total: totalChapters,
        unlocked: unlockedChapters,
        completed: completedChapters,
        testPassed: testPassedChapters,
        progress: overallProgress,
        currentChapter: getCurrentChapter()
    };
}

function unlockChapterCelebration(chapter) {
    if (window.celebrationService) {
        window.celebrationService.celebrate(
            `New Chapter Unlocked: ${chapter.title}! 🎌`,
            'achievement'
        );
    }
}

// Initialize on load
initializeChapters();
updateChapterUnlocks();

// Export for global access
window.chapterService = {
    updateChapterUnlocks,
    getCurrentChapter,
    getChapter,
    getAllChapters,
    updateChapterProgress,
    passChapterTest,
    getChapterStats,
    initializeChapters
};

