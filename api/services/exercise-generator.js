// Smart exercise generation service
const extractPdfContent = require('../_pdf-extractor');
const { EXERCISE_TYPES } = require('../_game-mechanics');
const distractorGenerator = require('./distractor-generator');
const { getAllHiragana, getAllKatakana } = require('../_kana-data');

class ExerciseGenerator {
    constructor() {
        this.wordBank = null;
        this.exerciseHistory = new Set(); // Track recently used words
    }
    
    /**
     * Initialize word bank
     */
    async initializeWordBank() {
        if (this.wordBank) return this.wordBank;
        
        try {
            const wordsData = await extractPdfContent();
            
            // Check for errors
            if (wordsData.error) {
                console.error(`[ExerciseGenerator] PDF extraction error: ${wordsData.error}`);
                this.wordBank = [];
                return [];
            }
            
            this.wordBank = Object.values(wordsData).flatMap(day => day.words || []);
            return this.wordBank;
        } catch (error) {
            console.error('[ExerciseGenerator] Error loading word bank:', error);
            this.wordBank = [];
            return [];
        }
    }
    
    /**
     * Generate a set of exercises for a skill
     * @param {string} skillId - Skill identifier
     * @param {number} count - Number of exercises
     * @param {number} difficulty - Difficulty level (1-5)
     * @param {string} type - Exercise type filter (optional)
     * @returns {Promise<Array>} Array of exercises
     */
    async generateExerciseSet(skillId, count = 10, difficulty = 1, type = null) {
        try {
            await this.initializeWordBank();
            
            const exercises = [];
            const words = await this.getWordsForSkill(skillId);
            
            console.log(`[ExerciseGenerator] skillId=${skillId}, words.length=${words?.length || 0}, count=${count}`);
            
            if (!words || words.length === 0) {
                console.error(`[ExerciseGenerator] No words found for skillId: ${skillId}`);
                return exercises;
            }
            
            const exerciseTypes = this.getExerciseTypesForDifficulty(difficulty, type);
            
            if (!exerciseTypes || exerciseTypes.length === 0) {
                console.error(`[ExerciseGenerator] No exercise types available for difficulty ${difficulty}`);
                return exercises;
            }
            
            // Reset history if it gets too large
            if (this.exerciseHistory.size > 100) {
                this.exerciseHistory.clear();
            }
            
            for (let i = 0; i < count; i++) {
                const word = this.selectWord(words, exercises);
                if (!word) {
                    console.warn(`[ExerciseGenerator] No word available at index ${i}, breaking`);
                    break; // No more words available
                }
                
                const exerciseType = this.selectExerciseType(exerciseTypes, i);
                try {
                    const exercise = await this.generateExercise(word, exerciseType, difficulty, skillId);
                    
                    if (exercise) {
                        exercises.push(exercise);
                        this.exerciseHistory.add(word.japanese);
                    } else {
                        console.warn(`[ExerciseGenerator] Failed to generate exercise for word: ${word.japanese || word.char}`);
                    }
                } catch (exError) {
                    console.error(`[ExerciseGenerator] Error generating exercise at index ${i}:`, exError);
                    console.error(`[ExerciseGenerator] Stack:`, exError.stack);
                    // Continue to next exercise instead of failing completely
                }
            }
            
            console.log(`[ExerciseGenerator] Generated ${exercises.length} exercises`);
            return exercises;
        } catch (error) {
            console.error(`[ExerciseGenerator] Fatal error in generateExerciseSet:`, error);
            console.error(`[ExerciseGenerator] Stack:`, error.stack);
            throw error; // Re-throw to be caught by API handler
        }
    }
    
    /**
     * Get words for a specific skill
     */
    async getWordsForSkill(skillId) {
        await this.initializeWordBank();
        
        if (skillId.startsWith('day-')) {
            const dayNum = parseInt(skillId.replace('day-', ''));
            const wordsData = await extractPdfContent();
            
            // Check for errors
            if (wordsData.error) {
                console.error(`[ExerciseGenerator] PDF extraction error: ${wordsData.error}`);
                return [];
            }
            
            if (!wordsData[dayNum]) {
                console.warn(`[ExerciseGenerator] Day ${dayNum} not found in words data`);
                return [];
            }
            
            return wordsData[dayNum]?.words || [];
        }
        
        if (skillId === 'kana' || skillId.startsWith('kana-')) {
            // Return kana characters, transformed to match word format
            const hiraganaChars = getAllHiragana();
            const katakanaChars = getAllKatakana();
            
            // Transform kana characters to have japanese/translation properties
            const kanaWords = [...hiraganaChars, ...katakanaChars].map(kana => ({
                japanese: kana.char,
                translation: kana.romaji,
                furigana: kana.romaji,
                char: kana.char,
                romaji: kana.romaji,
                type: kana.type,
                group: kana.group
            }));
            
            return kanaWords;
        }
        
        // Default: return all words
        return this.wordBank || [];
    }
    
    /**
     * Select a word that hasn't been used recently
     */
    selectWord(words, usedExercises) {
        if (!words || words.length === 0) return null;
        
        // Filter out recently used words
        const availableWords = words.filter(w => 
            !this.exerciseHistory.has(w.japanese)
        );
        
        const wordPool = availableWords.length > 0 ? availableWords : words;
        return wordPool[Math.floor(Math.random() * wordPool.length)];
    }
    
    /**
     * Get exercise types for difficulty level
     */
    getExerciseTypesForDifficulty(difficulty, typeFilter = null) {
        const allTypes = [
            EXERCISE_TYPES.MULTIPLE_CHOICE,
            EXERCISE_TYPES.TRANSLATE,
            EXERCISE_TYPES.LISTEN,
            EXERCISE_TYPES.FILL_BLANK,
            EXERCISE_TYPES.MATCH,
            EXERCISE_TYPES.WORD_ORDER,
            EXERCISE_TYPES.WRITE,
        ];
        
        if (typeFilter) {
            return [typeFilter];
        }
        
        // Adjust types based on difficulty
        if (difficulty <= 1) {
            // Beginner: mostly multiple choice and translation
            return [
                EXERCISE_TYPES.MULTIPLE_CHOICE,
                EXERCISE_TYPES.TRANSLATE,
            ];
        } else if (difficulty <= 3) {
            // Intermediate: add listening, fill blank, and writing
            return [
                EXERCISE_TYPES.MULTIPLE_CHOICE,
                EXERCISE_TYPES.TRANSLATE,
                EXERCISE_TYPES.LISTEN,
                EXERCISE_TYPES.FILL_BLANK,
                EXERCISE_TYPES.WRITE,
            ];
        } else {
            // Advanced: all types
            return allTypes;
        }
    }
    
    /**
     * Select exercise type based on position in set
     */
    selectExerciseType(availableTypes, position) {
        if (availableTypes.length === 0) return EXERCISE_TYPES.MULTIPLE_CHOICE;
        
        // Vary exercise types throughout the set
        const index = position % availableTypes.length;
        return availableTypes[index];
    }
    
    /**
     * Generate a single exercise
     */
    async generateExercise(word, type, difficulty, skillId) {
        switch (type) {
            case EXERCISE_TYPES.MULTIPLE_CHOICE:
                return await this.generateMultipleChoice(word, difficulty);
            case EXERCISE_TYPES.TRANSLATE:
                return await this.generateTranslation(word, difficulty);
            case EXERCISE_TYPES.LISTEN:
                return await this.generateListening(word, difficulty);
            case EXERCISE_TYPES.FILL_BLANK:
                return await this.generateFillBlank(word, difficulty);
            case EXERCISE_TYPES.MATCH:
                return await this.generateMatching(word, difficulty);
            case EXERCISE_TYPES.WORD_ORDER:
                return await this.generateWordOrder(word, difficulty);
            case EXERCISE_TYPES.WRITE:
                return await this.generateWriting(word, difficulty);
            default:
                return await this.generateMultipleChoice(word, difficulty);
        }
    }
    
    /**
     * Generate multiple choice exercise
     */
    async generateMultipleChoice(word, difficulty) {
        try {
            const direction = Math.random() > 0.5 ? 'jp_to_en' : 'en_to_jp';
            const isJapanese = direction === 'en_to_jp';
            
            const correctAnswer = isJapanese ? word.japanese : word.translation;
            
            let distractors = [];
            try {
                distractors = await distractorGenerator.generateDistractors(
                    word,
                    3,
                    isJapanese ? 'japanese' : 'translation'
                );
            } catch (distError) {
                console.warn(`[ExerciseGenerator] Error generating distractors, using fallback:`, distError);
                // Fallback distractors
                distractors = isJapanese 
                    ? ['あ', 'い', 'う'] 
                    : ['hello', 'goodbye', 'thanks'];
            }
            
            const options = [correctAnswer, ...distractors];
            const shuffled = this.shuffleWithTracking(options, 0);
            
            return {
                id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'multiple_choice',
                direction: direction,
                question: direction === 'jp_to_en'
                    ? `What does ${word.japanese} mean?`
                    : `How do you say "${word.translation}" in Japanese?`,
                questionAudio: word.japanese,
                correctAnswer: correctAnswer,
                options: shuffled.array,
                correctIndex: shuffled.correctIndex,
                explanation: `${word.japanese}${word.furigana ? ` (${word.furigana})` : ''} means "${word.translation}"`,
                difficulty: difficulty,
                points: 10,
                word: word
            };
        } catch (error) {
            console.error(`[ExerciseGenerator] Error in generateMultipleChoice:`, error);
            throw error;
        }
    }
    
    /**
     * Generate translation exercise
     */
    async generateTranslation(word, difficulty) {
        const direction = Math.random() > 0.5 ? 'jp_to_en' : 'en_to_jp';
        const isJapanese = direction === 'en_to_jp';
        
        return {
            id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'translation',
            direction: direction,
            question: direction === 'jp_to_en'
                ? `Translate: ${word.japanese}`
                : `Translate: "${word.translation}"`,
            questionAudio: word.japanese,
            correctAnswer: isJapanese ? word.japanese : word.translation,
            acceptableAnswers: this.getAcceptableAnswers(word, isJapanese),
            hint: direction === 'jp_to_en' ? word.furigana : `A common ${word.translation.toLowerCase()}`,
            explanation: `${word.japanese}${word.furigana ? ` (${word.furigana})` : ''} means "${word.translation}"`,
            difficulty: difficulty,
            points: 15,
            word: word
        };
    }
    
    /**
     * Generate listening exercise
     */
    async generateListening(word, difficulty) {
        const exerciseType = Math.random() > 0.5 ? 'listen_select' : 'listen_type';
        
        if (exerciseType === 'listen_select') {
            const distractors = await distractorGenerator.generateDistractors(word, 3, 'japanese');
            const options = [word.japanese, ...distractors];
            const shuffled = this.shuffleWithTracking(options, 0);
            
            return {
                id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'listen',
                exerciseType: 'listen_select',
                audioUrl: word.japanese, // Will be converted to audio
                question: 'Listen and select what you hear',
                correctAnswer: word.japanese,
                correctAnswerEn: word.translation,
                options: shuffled.array,
                correctIndex: shuffled.correctIndex,
                hint: word.furigana,
                explanation: `You heard ${word.japanese} (${word.furigana}) which means "${word.translation}"`,
                difficulty: difficulty,
                points: 15,
                word: word
            };
        } else {
            return {
                id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'listen',
                exerciseType: 'listen_type',
                audioUrl: word.japanese,
                question: 'Listen and type what you hear',
                correctAnswer: word.japanese,
                correctAnswerEn: word.translation,
                hint: word.furigana,
                explanation: `You should have typed: ${word.japanese} (${word.furigana})`,
                difficulty: difficulty,
                points: 15,
                word: word
            };
        }
    }
    
    /**
     * Generate fill in the blank exercise
     */
    async generateFillBlank(word, difficulty) {
        // Create a sentence with the word
        const sentences = [
            `${word.japanese} means ${word.translation}`,
            `The word ${word.japanese} translates to ${word.translation}`,
            `${word.japanese} (${word.furigana}) is ${word.translation} in English`,
        ];
        const sentence = word.sentence || sentences[Math.floor(Math.random() * sentences.length)];
        const blankType = Math.random() > 0.5 ? 'type' : 'select';
        
        // Find where to place the blank
        const blankIndex = sentence.indexOf(word.japanese);
        const beforeBlank = sentence.substring(0, blankIndex);
        const afterBlank = sentence.substring(blankIndex + word.japanese.length);
        
        const blank = {
            index: 0,
            correctAnswer: word.japanese,
            acceptableAnswers: [word.furigana], // Accept furigana as alternative
        };
        
        if (blankType === 'select') {
            const distractors = await distractorGenerator.generateDistractors(word, 3, 'japanese');
            blank.options = this.shuffleArray([word.japanese, ...distractors]);
        }
        
        return {
            id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'fill_blank',
            blankType: blankType,
            sentence: beforeBlank + '____' + afterBlank,
            sentenceJP: sentence,
            blanks: [blank],
            context: `Complete the sentence with the correct word`,
            explanation: `The correct word is ${word.japanese}${word.furigana ? ` (${word.furigana})` : ''}`,
            difficulty: difficulty,
            points: 15,
            word: word
        };
    }
    
    /**
     * Generate matching exercise
     */
    async generateMatching(word, difficulty) {
        await this.initializeWordBank();
        
        // Get 3 additional words for matching
        const additionalWords = [];
        const used = new Set([word.japanese]);
        
        for (const w of this.wordBank || []) {
            if (additionalWords.length >= 3) break;
            if (!used.has(w.japanese)) {
                additionalWords.push(w);
                used.add(w.japanese);
            }
        }
        
        const pairs = [
            { id: 1, japanese: word.japanese, translation: word.translation },
            ...additionalWords.map((w, i) => ({
                id: i + 2,
                japanese: w.japanese,
                translation: w.translation
            }))
        ];
        
        return {
            id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'match',
            matchType: 'drag_drop',
            pairs: this.shuffleArray([...pairs]),
            shuffled: true,
            explanation: 'Match each Japanese word with its English translation',
            difficulty: difficulty,
            points: 20,
            word: word
        };
    }
    
    /**
     * Generate word order exercise
     */
    async generateWordOrder(word, difficulty) {
        // For now, create a simple word order exercise
        // In a real implementation, you'd have sentence structures
        const words = [word.japanese, 'は', '日本語', 'で', '単語', 'です'];
        const correctOrder = [0, 1, 2, 3, 4, 5];
        
        return {
            id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'word_order',
            orderType: 'tap_order',
            words: this.shuffleArray([...words]),
            correctOrder: correctOrder,
            sentence: words.join(''),
            translation: `${word.japanese} is a word in Japanese`,
            explanation: 'Arrange the words to form a correct Japanese sentence',
            difficulty: difficulty,
            points: 20,
            word: word
        };
    }
    
    /**
     * Generate writing/typing exercise
     */
    async generateWriting(word, difficulty) {
        // Writing exercises: type Japanese from English prompt
        const direction = Math.random() > 0.7 ? 'en_to_jp' : 'jp_to_en';
        
        let question, correctAnswer, hint, acceptableAnswers;
        
        if (direction === 'en_to_jp') {
            // Type Japanese from English
            question = `Type "${word.translation}" in Japanese:`;
            correctAnswer = word.japanese;
            hint = word.furigana || `Hint: ${word.japanese}`;
            acceptableAnswers = [word.japanese];
            // Also accept furigana if available
            if (word.furigana && word.furigana !== word.japanese) {
                acceptableAnswers.push(word.furigana);
            }
        } else {
            // Type English from Japanese
            question = `Type "${word.japanese}" in English:`;
            correctAnswer = word.translation;
            hint = `Hint: ${word.translation}`;
            acceptableAnswers = [word.translation.toLowerCase()];
            // Accept variations
            const lower = word.translation.toLowerCase();
            if (lower.includes('hello')) acceptableAnswers.push('hi', 'hey');
            if (lower.includes('thank')) acceptableAnswers.push('thanks', 'thank you');
            if (lower.includes('goodbye')) acceptableAnswers.push('bye', 'see you');
        }
        
        return {
            id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'write',
            direction: direction,
            question: question,
            correctAnswer: correctAnswer,
            acceptableAnswers: acceptableAnswers,
            hint: hint,
            word: word,
            difficulty: difficulty,
            points: 25, // Writing exercises worth more points
            explanation: direction === 'en_to_jp' 
                ? 'Type the Japanese word or phrase' 
                : 'Type the English translation'
        };
    }
    
    /**
     * Get acceptable answers for a word
     */
    getAcceptableAnswers(word, isJapanese) {
        if (isJapanese) {
            return [word.japanese, word.furigana]; // Accept both kanji and furigana
        } else {
            // Common variations for English
            const variations = [];
            const lower = word.translation.toLowerCase();
            
            if (lower.includes('hello')) variations.push('Hi', 'Hey');
            if (lower.includes('thank')) variations.push('Thanks', 'Thank you very much');
            if (lower.includes('goodbye')) variations.push('Bye', 'See you');
            
            return variations;
        }
    }
    
    /**
     * Shuffle array while tracking original index
     */
    shuffleWithTracking(array, correctIndex) {
        const indexed = array.map((item, index) => ({ item, originalIndex: index }));
        const shuffled = this.shuffleArray([...indexed]);
        
        const newCorrectIndex = shuffled.findIndex(entry => entry.originalIndex === correctIndex);
        
        return {
            array: shuffled.map(entry => entry.item),
            correctIndex: newCorrectIndex
        };
    }
    
    /**
     * Shuffle array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

module.exports = new ExerciseGenerator();

