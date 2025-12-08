// Fuzzy matching service for answer validation
// Handles typos, variations, and acceptable answers

class FuzzyMatcher {
    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 
     * @param {string} str2 
     * @returns {number} Distance (0 = identical, higher = more different)
     */
    levenshteinDistance(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 0;
        if (shorter.length === 0) return longer.length;
        
        const matrix = [];
        
        // Initialize matrix
        for (let i = 0; i <= shorter.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= longer.length; j++) {
            matrix[0][j] = j;
        }
        
        // Fill matrix
        for (let i = 1; i <= shorter.length; i++) {
            for (let j = 1; j <= longer.length; j++) {
                if (shorter.charAt(i - 1) === longer.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[shorter.length][longer.length];
    }
    
    /**
     * Calculate similarity score between two strings (0-1)
     * @param {string} str1 
     * @param {string} str2 
     * @returns {number} Similarity score (1 = identical, 0 = completely different)
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(str1, str2);
        return (longer.length - distance) / longer.length;
    }
    
    /**
     * Normalize string for comparison
     * @param {string} str 
     * @returns {string} Normalized string
     */
    normalize(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .trim()
            .replace(/[.,!?;:]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .replace(/['"]/g, '');    // Remove quotes
    }
    
    /**
     * Check if answer matches (exact, acceptable, or fuzzy)
     * @param {string} userAnswer 
     * @param {string} correctAnswer 
     * @param {string[]} acceptableAnswers 
     * @param {number} similarityThreshold 
     * @returns {object} Match result
     */
    matchAnswer(userAnswer, correctAnswer, acceptableAnswers = [], similarityThreshold = 0.8) {
        const normalizedUser = this.normalize(userAnswer);
        const normalizedCorrect = this.normalize(correctAnswer);
        
        // Exact match
        if (normalizedUser === normalizedCorrect) {
            return {
                match: true,
                type: 'exact',
                score: 1.0,
                confidence: 1.0
            };
        }
        
        // Check acceptable answers
        for (const acceptable of acceptableAnswers) {
            if (normalizedUser === this.normalize(acceptable)) {
                return {
                    match: true,
                    type: 'acceptable',
                    score: 0.9,
                    confidence: 0.9
                };
            }
        }
        
        // Fuzzy matching
        const similarity = this.calculateSimilarity(normalizedUser, normalizedCorrect);
        if (similarity >= similarityThreshold) {
            return {
                match: true,
                type: 'fuzzy',
                score: similarity,
                confidence: similarity
            };
        }
        
        // No match
        return {
            match: false,
            type: 'none',
            score: 0,
            confidence: 0
        };
    }
    
    /**
     * Check if Japanese text matches (handles hiragana/katakana variations)
     * @param {string} userAnswer 
     * @param {string} correctAnswer 
     * @returns {object} Match result
     */
    matchJapanese(userAnswer, correctAnswer) {
        // Normalize Japanese text
        const normalizeJapanese = (str) => {
            return str
                .trim()
                .replace(/\s+/g, '')
                .replace(/[。、]/g, ''); // Remove Japanese punctuation
        };
        
        const normalizedUser = normalizeJapanese(userAnswer);
        const normalizedCorrect = normalizeJapanese(correctAnswer);
        
        // Exact match
        if (normalizedUser === normalizedCorrect) {
            return {
                match: true,
                type: 'exact',
                score: 1.0
            };
        }
        
        // Fuzzy match for Japanese (stricter threshold)
        const similarity = this.calculateSimilarity(normalizedUser, normalizedCorrect);
        if (similarity >= 0.85) { // Higher threshold for Japanese
            return {
                match: true,
                type: 'fuzzy',
                score: similarity
            };
        }
        
        return {
            match: false,
            type: 'none',
            score: 0
        };
    }
}

module.exports = new FuzzyMatcher();

