// Answer validation service for all exercise types
const fuzzyMatcher = require('./fuzzy-matcher');

class AnswerValidator {
    /**
     * Validate answer for any exercise type
     * @param {object} exercise - Exercise object
     * @param {any} userAnswer - User's answer
     * @returns {object} Validation result
     */
    validate(exercise, userAnswer) {
        if (!exercise || !exercise.type) {
            return {
                correct: false,
                score: 0,
                feedback: 'Invalid exercise',
                error: 'Exercise type not specified'
            };
        }
        
        switch (exercise.type) {
            case 'multiple_choice':
                return this.validateMultipleChoice(exercise, userAnswer);
            case 'translation':
                return this.validateTranslation(exercise, userAnswer);
            case 'listen':
                return this.validateListening(exercise, userAnswer);
            case 'match':
                return this.validateMatching(exercise, userAnswer);
            case 'fill_blank':
                return this.validateFillBlank(exercise, userAnswer);
            case 'word_order':
                return this.validateWordOrder(exercise, userAnswer);
            case 'speak':
                return this.validateSpeaking(exercise, userAnswer);
            default:
                return {
                    correct: false,
                    score: 0,
                    feedback: 'Unknown exercise type',
                    error: `Exercise type ${exercise.type} not supported`
                };
        }
    }
    
    /**
     * Validate multiple choice answer
     */
    validateMultipleChoice(exercise, selectedIndex) {
        if (typeof selectedIndex !== 'number') {
            return {
                correct: false,
                score: 0,
                feedback: 'Please select an answer'
            };
        }
        
        const isCorrect = selectedIndex === exercise.correctIndex;
        const correctAnswer = exercise.options[exercise.correctIndex];
        
        return {
            correct: isCorrect,
            score: isCorrect ? 1.0 : 0,
            feedback: isCorrect 
                ? 'Correct! ✅' 
                : `Incorrect. The correct answer is: ${correctAnswer}`,
            correctAnswer: correctAnswer
        };
    }
    
    /**
     * Validate translation answer
     */
    validateTranslation(exercise, userAnswer) {
        if (!userAnswer || typeof userAnswer !== 'string') {
            return {
                correct: false,
                score: 0,
                feedback: 'Please enter an answer'
            };
        }
        
        const direction = exercise.direction || 'jp_to_en';
        const isJapanese = direction === 'en_to_jp';
        
        if (isJapanese) {
            // Japanese answer validation
            const match = fuzzyMatcher.matchJapanese(userAnswer, exercise.correctAnswer);
            return {
                correct: match.match,
                score: match.score,
                feedback: match.match
                    ? (match.type === 'exact' ? 'Perfect! ✅' : 'Almost correct! ✅')
                    : `Incorrect. The correct answer is: ${exercise.correctAnswer}`,
                correctAnswer: exercise.correctAnswer,
                matchType: match.type
            };
        } else {
            // English answer validation
            const match = fuzzyMatcher.matchAnswer(
                userAnswer,
                exercise.correctAnswer,
                exercise.acceptableAnswers || [],
                0.8
            );
            
            return {
                correct: match.match,
                score: match.score,
                feedback: match.match
                    ? this.getFeedbackForMatch(match.type, match.score)
                    : `Incorrect. The correct answer is: ${exercise.correctAnswer}`,
                correctAnswer: exercise.correctAnswer,
                matchType: match.type
            };
        }
    }
    
    /**
     * Validate listening exercise answer
     */
    validateListening(exercise, userAnswer) {
        if (exercise.exerciseType === 'listen_select') {
            // Multiple choice for listening
            return this.validateMultipleChoice(exercise, userAnswer);
        } else {
            // Type what you hear (Japanese)
            const match = fuzzyMatcher.matchJapanese(userAnswer, exercise.correctAnswer);
            return {
                correct: match.match,
                score: match.score,
                feedback: match.match
                    ? 'Correct! You heard it right! ✅'
                    : `Incorrect. You should have typed: ${exercise.correctAnswer}`,
                correctAnswer: exercise.correctAnswer,
                matchType: match.type
            };
        }
    }
    
    /**
     * Validate matching exercise
     */
    validateMatching(exercise, matchedPairs) {
        if (!Array.isArray(matchedPairs)) {
            return {
                correct: false,
                score: 0,
                feedback: 'Invalid answer format'
            };
        }
        
        const totalPairs = exercise.pairs.length;
        let correctPairs = 0;
        const incorrectPairs = [];
        
        for (const pair of matchedPairs) {
            const correctPair = exercise.pairs.find(p => 
                p.japanese === pair.japanese && p.translation === pair.translation
            );
            
            if (correctPair) {
                correctPairs++;
            } else {
                incorrectPairs.push(pair);
            }
        }
        
        const allCorrect = correctPairs === totalPairs && matchedPairs.length === totalPairs;
        const score = correctPairs / totalPairs;
        
        return {
            correct: allCorrect,
            score: score,
            feedback: allCorrect
                ? 'Perfect! All pairs matched correctly! ✅'
                : `You matched ${correctPairs} out of ${totalPairs} pairs correctly.`,
            correctPairs: correctPairs,
            totalPairs: totalPairs,
            incorrectPairs: incorrectPairs
        };
    }
    
    /**
     * Validate fill in the blank
     */
    validateFillBlank(exercise, userAnswers) {
        if (!Array.isArray(userAnswers)) {
            // Single blank
            userAnswers = [userAnswers];
        }
        
        if (userAnswers.length !== exercise.blanks.length) {
            return {
                correct: false,
                score: 0,
                feedback: 'Please fill in all blanks'
            };
        }
        
        let correctBlanks = 0;
        const results = [];
        
        for (let i = 0; i < exercise.blanks.length; i++) {
            const blank = exercise.blanks[i];
            const userAnswer = userAnswers[i];
            
            let match;
            if (blank.correctAnswer.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
                // Japanese answer
                match = fuzzyMatcher.matchJapanese(userAnswer, blank.correctAnswer);
            } else {
                // English answer
                match = fuzzyMatcher.matchAnswer(
                    userAnswer,
                    blank.correctAnswer,
                    blank.acceptableAnswers || [],
                    0.8
                );
            }
            
            if (match.match) {
                correctBlanks++;
            }
            
            results.push({
                index: i,
                correct: match.match,
                score: match.score,
                userAnswer: userAnswer,
                correctAnswer: blank.correctAnswer
            });
        }
        
        const allCorrect = correctBlanks === exercise.blanks.length;
        const score = correctBlanks / exercise.blanks.length;
        
        return {
            correct: allCorrect,
            score: score,
            feedback: allCorrect
                ? 'Perfect! All blanks filled correctly! ✅'
                : `You got ${correctBlanks} out of ${exercise.blanks.length} blanks correct.`,
            results: results,
            correctBlanks: correctBlanks,
            totalBlanks: exercise.blanks.length
        };
    }
    
    /**
     * Validate word order exercise
     */
    validateWordOrder(exercise, userOrder) {
        if (!Array.isArray(userOrder)) {
            return {
                correct: false,
                score: 0,
                feedback: 'Invalid answer format'
            };
        }
        
        if (userOrder.length !== exercise.correctOrder.length) {
            return {
                correct: false,
                score: 0,
                feedback: 'Please use all words'
            };
        }
        
        let correctPositions = 0;
        for (let i = 0; i < exercise.correctOrder.length; i++) {
            if (userOrder[i] === exercise.correctOrder[i]) {
                correctPositions++;
            }
        }
        
        const allCorrect = correctPositions === exercise.correctOrder.length;
        const score = correctPositions / exercise.correctOrder.length;
        
        return {
            correct: allCorrect,
            score: score,
            feedback: allCorrect
                ? 'Perfect word order! ✅'
                : `You got ${correctPositions} out of ${exercise.correctOrder.length} words in the correct position.`,
            correctPositions: correctPositions,
            totalPositions: exercise.correctOrder.length
        };
    }
    
    /**
     * Validate speaking exercise
     */
    validateSpeaking(exercise, recognitionResult) {
        // This is a simplified version - actual implementation would use speech recognition
        if (!recognitionResult || !recognitionResult.text) {
            return {
                correct: false,
                score: 0,
                feedback: 'Could not recognize speech. Please try again.'
            };
        }
        
        const match = fuzzyMatcher.matchJapanese(recognitionResult.text, exercise.correctAnswer);
        const pronunciationScore = recognitionResult.confidence || match.score;
        
        return {
            correct: match.match,
            score: pronunciationScore,
            feedback: match.match
                ? `Great pronunciation! ✅ (${Math.round(pronunciationScore * 100)}% confidence)`
                : `Pronunciation needs work. You said: ${recognitionResult.text}, but should say: ${exercise.correctAnswer}`,
            correctAnswer: exercise.correctAnswer,
            recognizedText: recognitionResult.text,
            confidence: pronunciationScore
        };
    }
    
    /**
     * Get feedback message based on match type
     */
    getFeedbackForMatch(matchType, score) {
        switch (matchType) {
            case 'exact':
                return 'Perfect! ✅';
            case 'acceptable':
                return 'Correct! (Alternative answer) ✅';
            case 'fuzzy':
                if (score >= 0.9) {
                    return 'Almost perfect! ✅';
                } else if (score >= 0.8) {
                    return 'Close! Check for typos. ✅';
                }
                return 'Partially correct';
            default:
                return 'Incorrect';
        }
    }
}

module.exports = new AnswerValidator();

