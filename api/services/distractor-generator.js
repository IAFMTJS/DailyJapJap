// Smart distractor generation for multiple choice exercises
const extractPdfContent = require('../_pdf-extractor');

class DistractorGenerator {
    constructor() {
        this.wordBank = null;
        this.wordBankPromise = null;
    }
    
    /**
     * Initialize word bank
     */
    async initializeWordBank() {
        if (this.wordBank) return this.wordBank;
        
        if (!this.wordBankPromise) {
            this.wordBankPromise = this.loadWordBank();
        }
        
        this.wordBank = await this.wordBankPromise;
        return this.wordBank;
    }
    
    /**
     * Load word bank from PDF
     */
    async loadWordBank() {
        try {
            const wordsData = await extractPdfContent();
            
            // Check for errors
            if (wordsData.error) {
                console.error(`[DistractorGenerator] PDF extraction error: ${wordsData.error}`);
                return [];
            }
            
            const allWords = Object.values(wordsData).flatMap(day => day.words || []);
            return allWords;
        } catch (error) {
            console.error('Error loading word bank:', error);
            return [];
        }
    }
    
    /**
     * Generate distractors for a word
     * @param {object} correctWord - The correct word
     * @param {number} count - Number of distractors needed
     * @param {string} type - 'translation' or 'japanese'
     * @returns {string[]} Array of distractor answers
     */
    async generateDistractors(correctWord, count, type = 'translation') {
        await this.initializeWordBank();
        
        if (!this.wordBank || this.wordBank.length === 0) {
            return this.generateFallbackDistractors(correctWord, count, type);
        }
        
        const distractors = [];
        const used = new Set();
        const usedIds = new Set();
        
        // Strategy 1: Same category/theme words
        const similarWords = this.findSimilarWords(correctWord, this.wordBank);
        
        // Strategy 2: Similar difficulty level
        const difficultyWords = this.findSimilarDifficulty(correctWord, this.wordBank);
        
        // Strategy 3: Common mistakes (if we had a mistake database)
        // For now, use phonetically similar or visually similar
        
        // Combine strategies
        const candidateWords = [...similarWords, ...difficultyWords];
        
        // Remove duplicates and the correct word
        const uniqueCandidates = candidateWords.filter(w => 
            w.japanese !== correctWord.japanese && 
            !usedIds.has(w.japanese)
        );
        
        // Shuffle and select
        const shuffled = this.shuffleArray([...uniqueCandidates]);
        
        for (const word of shuffled) {
            if (distractors.length >= count) break;
            
            const answer = type === 'translation' ? word.translation : word.japanese;
            
            if (!used.has(answer)) {
                distractors.push(answer);
                used.add(answer);
                usedIds.add(word.japanese);
            }
        }
        
        // Fill remaining with random words if needed
        while (distractors.length < count) {
            const randomWord = this.wordBank[Math.floor(Math.random() * this.wordBank.length)];
            const answer = type === 'translation' ? randomWord.translation : randomWord.japanese;
            
            if (!used.has(answer) && answer !== (type === 'translation' ? correctWord.translation : correctWord.japanese)) {
                distractors.push(answer);
                used.add(answer);
            }
            
            // Safety check to avoid infinite loop
            if (used.size >= this.wordBank.length) break;
        }
        
        return distractors.slice(0, count);
    }
    
    /**
     * Find similar words (same category, similar meaning)
     */
    findSimilarWords(targetWord, wordBank) {
        // For now, return random words (can be enhanced with categorization)
        // In a real implementation, you'd have word categories/tags
        const similar = [];
        const targetLower = targetWord.translation.toLowerCase();
        
        // Look for words with similar first letters or common words
        for (const word of wordBank) {
            const wordLower = word.translation.toLowerCase();
            
            // Same first letter
            if (wordLower.charAt(0) === targetLower.charAt(0) && word.japanese !== targetWord.japanese) {
                similar.push(word);
            }
            
            // Similar length
            if (Math.abs(wordLower.length - targetLower.length) <= 2 && word.japanese !== targetWord.japanese) {
                similar.push(word);
            }
            
            if (similar.length >= 20) break; // Limit candidates
        }
        
        return similar;
    }
    
    /**
     * Find words with similar difficulty
     */
    findSimilarDifficulty(targetWord, wordBank) {
        // For now, return random words
        // In a real implementation, you'd track difficulty levels
        const shuffled = this.shuffleArray([...wordBank]);
        return shuffled.slice(0, 10).filter(w => w.japanese !== targetWord.japanese);
    }
    
    /**
     * Generate fallback distractors when word bank is unavailable
     */
    generateFallbackDistractors(correctWord, count, type) {
        const distractors = [];
        const correctAnswer = type === 'translation' ? correctWord.translation : correctWord.japanese;
        
        // Generate variations
        const variations = [
            correctAnswer.split(' ').reverse().join(' '),
            correctAnswer + 's',
            'not ' + correctAnswer,
            correctAnswer.substring(0, Math.max(1, correctAnswer.length - 1)),
            correctAnswer.substring(1),
        ];
        
        for (let i = 0; i < count; i++) {
            if (variations[i]) {
                distractors.push(variations[i]);
            } else {
                distractors.push(`Option ${i + 1}`);
            }
        }
        
        return distractors;
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

module.exports = new DistractorGenerator();

