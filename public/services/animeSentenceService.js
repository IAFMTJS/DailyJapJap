// Anime Sentence Service - Real anime quotes and dialogue
// This service provides anime sentences for learning context

const ANIME_SENTENCES = [
    // Greetings & Common Phrases
    {
        japanese: 'おはようございます',
        furigana: 'おはようございます',
        translation: 'Good morning',
        context: 'School Scene',
        character: 'Student',
        anime: 'Slice of Life',
        category: 'greetings'
    },
    {
        japanese: 'ありがとうございます',
        furigana: 'ありがとうございます',
        translation: 'Thank you very much',
        context: 'Gratitude Scene',
        character: 'Friend',
        anime: 'General',
        category: 'gratitude'
    },
    {
        japanese: 'すみません',
        furigana: 'すみません',
        translation: 'Excuse me / Sorry',
        context: 'Apology Scene',
        character: 'Main Character',
        anime: 'General',
        category: 'apology'
    },
    {
        japanese: '大丈夫ですか？',
        furigana: 'だいじょうぶですか',
        translation: 'Are you okay?',
        context: 'Concern Scene',
        character: 'Friend',
        anime: 'Slice of Life',
        category: 'concern'
    },
    {
        japanese: '頑張ってください',
        furigana: 'がんばってください',
        translation: 'Do your best / Good luck',
        context: 'Encouragement Scene',
        character: 'Teacher',
        anime: 'School',
        category: 'encouragement'
    },
    
    // School Life
    {
        japanese: '今日は何を勉強しますか？',
        furigana: 'きょうはなにをべんきょうしますか',
        translation: 'What will we study today?',
        context: 'Classroom Scene',
        character: 'Student',
        anime: 'School',
        category: 'school'
    },
    {
        japanese: '宿題を忘れました',
        furigana: 'しゅくだいをわすれました',
        translation: 'I forgot my homework',
        context: 'School Scene',
        character: 'Student',
        anime: 'School',
        category: 'school'
    },
    {
        japanese: '一緒に帰りましょう',
        furigana: 'いっしょにかえりましょう',
        translation: 'Let\'s go home together',
        context: 'After School Scene',
        character: 'Friend',
        anime: 'School',
        category: 'school'
    },
    
    // Food & Eating
    {
        japanese: 'いただきます',
        furigana: 'いただきます',
        translation: 'Thank you for the food (before eating)',
        context: 'Meal Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'food'
    },
    {
        japanese: 'ごちそうさまでした',
        furigana: 'ごちそうさまでした',
        translation: 'Thank you for the meal (after eating)',
        context: 'After Meal Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'food'
    },
    {
        japanese: '美味しい！',
        furigana: 'おいしい',
        translation: 'Delicious!',
        context: 'Eating Scene',
        character: 'Food Lover',
        anime: 'Food Anime',
        category: 'food'
    },
    {
        japanese: 'お腹が空きました',
        furigana: 'おなかがすきました',
        translation: 'I\'m hungry',
        context: 'Hunger Scene',
        character: 'Main Character',
        anime: 'General',
        category: 'food'
    },
    
    // Emotions & Feelings
    {
        japanese: '嬉しいです',
        furigana: 'うれしいです',
        translation: 'I\'m happy',
        context: 'Happy Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'emotions'
    },
    {
        japanese: '悲しいです',
        furigana: 'かなしいです',
        translation: 'I\'m sad',
        context: 'Sad Scene',
        character: 'Main Character',
        anime: 'Drama',
        category: 'emotions'
    },
    {
        japanese: '怖いです',
        furigana: 'こわいです',
        translation: 'I\'m scared',
        context: 'Scary Scene',
        character: 'Main Character',
        anime: 'Horror/Thriller',
        category: 'emotions'
    },
    {
        japanese: '楽しいです',
        furigana: 'たのしいです',
        translation: 'It\'s fun / I\'m having fun',
        context: 'Fun Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'emotions'
    },
    
    // Action & Adventure
    {
        japanese: '行きましょう',
        furigana: 'いきましょう',
        translation: 'Let\'s go',
        context: 'Adventure Scene',
        character: 'Hero',
        anime: 'Adventure',
        category: 'action'
    },
    {
        japanese: '頑張ります',
        furigana: 'がんばります',
        translation: 'I will do my best',
        context: 'Determination Scene',
        character: 'Hero',
        anime: 'Shounen',
        category: 'action'
    },
    {
        japanese: '負けません',
        furigana: 'まけません',
        translation: 'I won\'t lose',
        context: 'Battle Scene',
        character: 'Fighter',
        anime: 'Action',
        category: 'action'
    },
    {
        japanese: '信じてください',
        furigana: 'しんじてください',
        translation: 'Please believe in me',
        context: 'Dramatic Scene',
        character: 'Hero',
        anime: 'Shounen',
        category: 'action'
    },
    
    // Friendship
    {
        japanese: '友達になりましょう',
        furigana: 'ともだちになりましょう',
        translation: 'Let\'s become friends',
        context: 'Friendship Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'friendship'
    },
    {
        japanese: '一緒にいましょう',
        furigana: 'いっしょにいましょう',
        translation: 'Let\'s stay together',
        context: 'Bonding Scene',
        character: 'Friend',
        anime: 'Slice of Life',
        category: 'friendship'
    },
    {
        japanese: '助け合いましょう',
        furigana: 'たすけあいましょう',
        translation: 'Let\'s help each other',
        context: 'Cooperation Scene',
        character: 'Team Member',
        anime: 'Adventure',
        category: 'friendship'
    },
    
    // Time & Daily Life
    {
        japanese: '今何時ですか？',
        furigana: 'いまなんじですか',
        translation: 'What time is it now?',
        context: 'Daily Life Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    {
        japanese: 'おやすみなさい',
        furigana: 'おやすみなさい',
        translation: 'Good night',
        context: 'Bedtime Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    {
        japanese: 'また明日',
        furigana: 'またあした',
        translation: 'See you tomorrow',
        context: 'Parting Scene',
        character: 'Friend',
        anime: 'Slice of Life',
        category: 'daily'
    },
    
    // Expanded Vocabulary - More Common Words
    {
        japanese: '水',
        furigana: 'みず',
        translation: 'Water',
        context: 'Daily Life Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    {
        japanese: '本',
        furigana: 'ほん',
        translation: 'Book',
        context: 'School Scene',
        character: 'Student',
        anime: 'School',
        category: 'school'
    },
    {
        japanese: '車',
        furigana: 'くるま',
        translation: 'Car',
        context: 'Travel Scene',
        character: 'Main Character',
        anime: 'Adventure',
        category: 'daily'
    },
    {
        japanese: '家',
        furigana: 'いえ',
        translation: 'House / Home',
        context: 'Home Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    {
        japanese: '学校',
        furigana: 'がっこう',
        translation: 'School',
        context: 'School Scene',
        character: 'Student',
        anime: 'School',
        category: 'school'
    },
    {
        japanese: '友達',
        furigana: 'ともだち',
        translation: 'Friend',
        context: 'Friendship Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'friendship'
    },
    {
        japanese: '先生',
        furigana: 'せんせい',
        translation: 'Teacher',
        context: 'Classroom Scene',
        character: 'Teacher',
        anime: 'School',
        category: 'school'
    },
    {
        japanese: '学生',
        furigana: 'がくせい',
        translation: 'Student',
        context: 'School Scene',
        character: 'Student',
        anime: 'School',
        category: 'school'
    },
    {
        japanese: '勉強',
        furigana: 'べんきょう',
        translation: 'Study / Learning',
        context: 'Study Scene',
        character: 'Student',
        anime: 'School',
        category: 'school'
    },
    {
        japanese: '宿題',
        furigana: 'しゅくだい',
        translation: 'Homework',
        context: 'School Scene',
        character: 'Student',
        anime: 'School',
        category: 'school'
    },
    
    // Food & Eating - Expanded
    {
        japanese: 'ご飯',
        furigana: 'ごはん',
        translation: 'Rice / Meal',
        context: 'Meal Scene',
        character: 'Main Character',
        anime: 'Food Anime',
        category: 'food'
    },
    {
        japanese: 'お茶',
        furigana: 'おちゃ',
        translation: 'Tea',
        context: 'Tea Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'food'
    },
    {
        japanese: '果物',
        furigana: 'くだもの',
        translation: 'Fruit',
        context: 'Food Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'food'
    },
    {
        japanese: '肉',
        furigana: 'にく',
        translation: 'Meat',
        context: 'Meal Scene',
        character: 'Main Character',
        anime: 'Food Anime',
        category: 'food'
    },
    {
        japanese: '魚',
        furigana: 'さかな',
        translation: 'Fish',
        context: 'Meal Scene',
        character: 'Main Character',
        anime: 'Food Anime',
        category: 'food'
    },
    
    // Family
    {
        japanese: '父',
        furigana: 'ちち',
        translation: 'Father',
        context: 'Family Scene',
        character: 'Family Member',
        anime: 'Slice of Life',
        category: 'family'
    },
    {
        japanese: '母',
        furigana: 'はは',
        translation: 'Mother',
        context: 'Family Scene',
        character: 'Family Member',
        anime: 'Slice of Life',
        category: 'family'
    },
    {
        japanese: '兄弟',
        furigana: 'きょうだい',
        translation: 'Siblings',
        context: 'Family Scene',
        character: 'Family Member',
        anime: 'Slice of Life',
        category: 'family'
    },
    
    // Time
    {
        japanese: '朝',
        furigana: 'あさ',
        translation: 'Morning',
        context: 'Morning Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    {
        japanese: '昼',
        furigana: 'ひる',
        translation: 'Noon / Afternoon',
        context: 'Afternoon Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    {
        japanese: '夜',
        furigana: 'よる',
        translation: 'Night',
        context: 'Night Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    {
        japanese: '今日',
        furigana: 'きょう',
        translation: 'Today',
        context: 'Daily Life Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    {
        japanese: '明日',
        furigana: 'あした',
        translation: 'Tomorrow',
        context: 'Planning Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    {
        japanese: '昨日',
        furigana: 'きのう',
        translation: 'Yesterday',
        context: 'Recollection Scene',
        character: 'Main Character',
        anime: 'Slice of Life',
        category: 'daily'
    },
    
    // Colors
    {
        japanese: '赤',
        furigana: 'あか',
        translation: 'Red',
        context: 'Color Scene',
        character: 'Main Character',
        anime: 'General',
        category: 'colors'
    },
    {
        japanese: '青',
        furigana: 'あお',
        translation: 'Blue',
        context: 'Color Scene',
        character: 'Main Character',
        anime: 'General',
        category: 'colors'
    },
    {
        japanese: '緑',
        furigana: 'みどり',
        translation: 'Green',
        context: 'Color Scene',
        character: 'Main Character',
        anime: 'General',
        category: 'colors'
    },
    {
        japanese: '白',
        furigana: 'しろ',
        translation: 'White',
        context: 'Color Scene',
        character: 'Main Character',
        anime: 'General',
        category: 'colors'
    },
    {
        japanese: '黒',
        furigana: 'くろ',
        translation: 'Black',
        context: 'Color Scene',
        character: 'Main Character',
        anime: 'General',
        category: 'colors'
    },
    
    // Action & Adventure - Expanded
    {
        japanese: '戦う',
        furigana: 'たたかう',
        translation: 'To fight',
        context: 'Battle Scene',
        character: 'Hero',
        anime: 'Shounen',
        category: 'action'
    },
    {
        japanese: '勝つ',
        furigana: 'かつ',
        translation: 'To win',
        context: 'Victory Scene',
        character: 'Hero',
        anime: 'Shounen',
        category: 'action'
    },
    {
        japanese: '助ける',
        furigana: 'たすける',
        translation: 'To help / To save',
        context: 'Rescue Scene',
        character: 'Hero',
        anime: 'Shounen',
        category: 'action'
    },
    {
        japanese: '守る',
        furigana: 'まもる',
        translation: 'To protect',
        context: 'Protection Scene',
        character: 'Hero',
        anime: 'Shounen',
        category: 'action'
    },
    
    // More Emotions
    {
        japanese: '怒り',
        furigana: 'いかり',
        translation: 'Anger',
        context: 'Angry Scene',
        character: 'Main Character',
        anime: 'Drama',
        category: 'emotions'
    },
    {
        japanese: '驚き',
        furigana: 'おどろき',
        translation: 'Surprise',
        context: 'Surprise Scene',
        character: 'Main Character',
        anime: 'Comedy',
        category: 'emotions'
    },
    {
        japanese: '愛',
        furigana: 'あい',
        translation: 'Love',
        context: 'Romance Scene',
        character: 'Main Character',
        anime: 'Romance',
        category: 'emotions'
    }
];

export function getAnimeSentences(category = null, limit = null) {
    let sentences = ANIME_SENTENCES;
    
    if (category) {
        sentences = sentences.filter(s => s.category === category);
    }
    
    if (limit) {
        sentences = sentences.slice(0, limit);
    }
    
    return sentences;
}

export function getRandomAnimeSentence(category = null) {
    let sentences = ANIME_SENTENCES;
    
    if (category) {
        sentences = sentences.filter(s => s.category === category);
    }
    
    if (sentences.length === 0) {
        return null;
    }
    
    return sentences[Math.floor(Math.random() * sentences.length)];
}

export function getSentencesByContext(context) {
    return ANIME_SENTENCES.filter(s => s.context === context);
}

export function getSentencesByAnime(anime) {
    return ANIME_SENTENCES.filter(s => s.anime === anime);
}

export function getCategories() {
    return [...new Set(ANIME_SENTENCES.map(s => s.category))];
}

// Export for global access
window.animeSentenceService = {
    getAnimeSentences,
    getRandomAnimeSentence,
    getSentencesByContext,
    getSentencesByAnime,
    getCategories
};

