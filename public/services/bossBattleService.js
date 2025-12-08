// Boss Battle Service - Create unique boss battles for different chapters
import { studyStats, saveStudyStats } from './studyStats.js';
import { generateBossChallenge, startChallenge, updateChallengeProgress } from './enhancedChallengesService.js';

const BOSSES = {
    'chapter-1': {
        id: 'chapter-1',
        name: 'Hiragana Master',
        emoji: '🎌',
        description: 'Master of Hiragana characters',
        health: 100,
        questions: 10,
        requiredAccuracy: 80,
        rewards: { xp: 500, coins: 250 },
        theme: 'hiragana',
        difficulty: 'easy'
    },
    'chapter-2': {
        id: 'chapter-2',
        name: 'Katakana Warrior',
        emoji: '⚔️',
        description: 'Guardian of Katakana',
        health: 120,
        questions: 12,
        requiredAccuracy: 75,
        rewards: { xp: 600, coins: 300 },
        theme: 'katakana',
        difficulty: 'medium'
    },
    'chapter-3': {
        id: 'chapter-3',
        name: 'Vocabulary Demon',
        emoji: '👹',
        description: 'Keeper of Japanese vocabulary',
        health: 150,
        questions: 15,
        requiredAccuracy: 80,
        rewards: { xp: 750, coins: 375 },
        theme: 'vocabulary',
        difficulty: 'hard'
    },
    'chapter-4': {
        id: 'chapter-4',
        name: 'Grammar Guardian',
        emoji: '🛡️',
        description: 'Protector of Japanese grammar',
        health: 180,
        questions: 18,
        requiredAccuracy: 85,
        rewards: { xp: 900, coins: 450 },
        theme: 'grammar',
        difficulty: 'very-hard'
    },
    'chapter-5': {
        id: 'chapter-5',
        name: 'Sentence Sensei',
        emoji: '🧙',
        description: 'Master of sentence construction',
        health: 200,
        questions: 20,
        requiredAccuracy: 90,
        rewards: { xp: 1000, coins: 500 },
        theme: 'sentences',
        difficulty: 'expert'
    },
    'chapter-6': {
        id: 'chapter-6',
        name: 'Anime Oracle',
        emoji: '🔮',
        description: 'Keeper of anime knowledge',
        health: 250,
        questions: 25,
        requiredAccuracy: 85,
        rewards: { xp: 1250, coins: 625 },
        theme: 'anime',
        difficulty: 'legendary'
    }
};

export function getBoss(chapterId) {
    return BOSSES[chapterId] || null;
}

export function getAllBosses() {
    return Object.values(BOSSES);
}

export function startBossBattle(chapterId) {
    const boss = getBoss(chapterId);
    if (!boss) {
        throw new Error(`Boss not found for chapter: ${chapterId}`);
    }
    
    const challenge = generateBossChallenge(chapterId, boss.name);
    challenge.boss = boss;
    return startChallenge(challenge);
}

export function getBossBattleData(chapterId) {
    const boss = getBoss(chapterId);
    if (!boss) return null;
    
    // Check if boss is already defeated
    const defeatedBosses = studyStats.defeatedBosses || [];
    const isDefeated = defeatedBosses.includes(chapterId);
    
    return {
        ...boss,
        isDefeated,
        isUnlocked: checkBossUnlock(chapterId)
    };
}

function checkBossUnlock(chapterId) {
    // Boss is unlocked if previous chapter boss is defeated
    const chapterNum = parseInt(chapterId.split('-')[1]);
    if (chapterNum === 1) return true; // First boss is always unlocked
    
    const previousChapter = `chapter-${chapterNum - 1}`;
    const defeatedBosses = studyStats.defeatedBosses || [];
    return defeatedBosses.includes(previousChapter);
}

export function defeatBoss(chapterId) {
    if (!studyStats.defeatedBosses) {
        studyStats.defeatedBosses = [];
    }
    
    if (!studyStats.defeatedBosses.includes(chapterId)) {
        studyStats.defeatedBosses.push(chapterId);
        
        const boss = getBoss(chapterId);
        if (boss && boss.rewards) {
            if (boss.rewards.xp) {
                studyStats.totalXP = (studyStats.totalXP || 0) + boss.rewards.xp;
            }
            if (boss.rewards.coins) {
                studyStats.coins = (studyStats.coins || 0) + boss.rewards.coins;
            }
        }
        
        saveStudyStats();
        
        // Trigger event
        if (typeof window !== 'undefined' && window.eventBus) {
            window.eventBus.emit('boss-defeated', { chapterId, boss });
        }
    }
}

// Export for global access
window.bossBattleService = {
    getBoss,
    getAllBosses,
    startBossBattle,
    getBossBattleData,
    defeatBoss,
    BOSSES
};

