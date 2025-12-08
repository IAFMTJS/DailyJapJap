// Test Service - Generates and manages chapter tests
import api from '../utils/api.js';

const TEST_CONFIG = {
    minQuestions: 10,
    maxQuestions: 20,
    passingScore: 80, // 80% required to pass
    timeLimit: 1800, // 30 minutes in seconds
    questionTypes: ['multiple_choice', 'translation', 'fill_blank', 'listening']
};

export async function generateChapterTest(chapterId) {
    try {
        const chapter = window.chapterService?.getChapter(chapterId);
        if (!chapter) {
            throw new Error('Chapter not found');
        }
        
        // Get words for this chapter
        // For now, we'll use the day-based system
        // In the future, this should map to chapter-specific words
        const dayNumber = chapter.number;
        
        // Generate test questions
        const testQuestions = await generateTestQuestions(dayNumber, chapter);
        
        return {
            chapterId,
            chapterNumber: chapter.number,
            chapterTitle: chapter.title,
            questions: testQuestions,
            totalQuestions: testQuestions.length,
            passingScore: TEST_CONFIG.passingScore,
            timeLimit: TEST_CONFIG.timeLimit
        };
    } catch (error) {
        console.error('Error generating chapter test:', error);
        throw error;
    }
}

async function generateTestQuestions(dayNumber, chapter) {
    const questions = [];
    const questionCount = Math.min(TEST_CONFIG.maxQuestions, Math.max(TEST_CONFIG.minQuestions, chapter.words || 20));
    
    try {
        // Get words for this day/chapter
        const wordsData = await api.get(`/words/${dayNumber}`);
        const words = wordsData.words || [];
        
        if (words.length === 0) {
            throw new Error('No words available for this chapter');
        }
        
        // Generate different types of questions
        const questionTypes = [...TEST_CONFIG.questionTypes];
        
        for (let i = 0; i < questionCount; i++) {
            const word = words[i % words.length];
            const questionType = questionTypes[i % questionTypes.length];
            
            let question;
            
            switch (questionType) {
                case 'multiple_choice':
                    question = generateMultipleChoice(word, words);
                    break;
                case 'translation':
                    question = generateTranslation(word);
                    break;
                case 'fill_blank':
                    question = generateFillBlank(word, words);
                    break;
                case 'listening':
                    question = generateListening(word, words);
                    break;
                default:
                    question = generateMultipleChoice(word, words);
            }
            
            if (question) {
                questions.push({
                    id: `test-q-${i}`,
                    type: questionType,
                    ...question,
                    points: 1
                });
            }
        }
        
        // Shuffle questions
        return shuffleArray(questions);
    } catch (error) {
        console.error('Error generating test questions:', error);
        return [];
    }
}

function generateMultipleChoice(word, allWords) {
    // Get 3 random wrong answers
    const wrongAnswers = getRandomWords(allWords, 3, word);
    
    const options = [
        word.translation,
        ...wrongAnswers.map(w => w.translation)
    ];
    
    // Shuffle options
    shuffleArray(options);
    
    return {
        question: `What does "${word.japanese}" mean?`,
        word: word,
        options: options,
        correctAnswer: word.translation,
        explanation: `${word.japanese} (${word.furigana || 'N/A'}) means "${word.translation}"`
    };
}

function generateTranslation(word) {
    return {
        question: `Translate: "${word.japanese}"`,
        word: word,
        correctAnswer: word.translation.toLowerCase().trim(),
        acceptableAnswers: [
            word.translation.toLowerCase().trim(),
            word.translation.trim()
        ],
        explanation: `"${word.japanese}" (${word.furigana || 'N/A'}) translates to "${word.translation}"`
    };
}

function generateFillBlank(word, allWords) {
    // Create a simple sentence with blank
    const sentence = `I like ${word.translation.toLowerCase()}.`;
    const blankedSentence = sentence.replace(word.translation.toLowerCase(), '______');
    
    const options = [
        word.translation,
        ...getRandomWords(allWords, 3, word).map(w => w.translation)
    ];
    shuffleArray(options);
    
    return {
        question: `Fill in the blank: "${blankedSentence}"`,
        context: blankedSentence,
        word: word,
        options: options,
        correctAnswer: word.translation,
        explanation: `The correct answer is "${word.translation}"`
    };
}

function generateListening(word, allWords) {
    const wrongAnswers = getRandomWords(allWords, 3, word);
    const options = [
        word.japanese,
        ...wrongAnswers.map(w => w.japanese)
    ];
    shuffleArray(options);
    
    return {
        question: `Listen and select the correct word`,
        audioText: word.japanese,
        word: word,
        options: options,
        correctAnswer: word.japanese,
        explanation: `The correct word is "${word.japanese}" (${word.furigana || 'N/A'})`
    };
}

function getRandomWords(words, count, exclude) {
    const available = words.filter(w => w.japanese !== exclude.japanese);
    const selected = [];
    const used = new Set();
    
    while (selected.length < count && selected.length < available.length) {
        const randomIndex = Math.floor(Math.random() * available.length);
        if (!used.has(randomIndex)) {
            used.add(randomIndex);
            selected.push(available[randomIndex]);
        }
    }
    
    return selected;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function calculateTestScore(answers, questions) {
    let correct = 0;
    const results = [];
    
    questions.forEach((question, index) => {
        const userAnswer = answers[index];
        const isCorrect = validateAnswer(userAnswer, question);
        
        if (isCorrect) {
            correct++;
        }
        
        results.push({
            questionId: question.id,
            correct: isCorrect,
            userAnswer,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation
        });
    });
    
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= TEST_CONFIG.passingScore;
    
    return {
        score,
        passed,
        correct,
        total: questions.length,
        results
    };
}

function validateAnswer(userAnswer, question) {
    if (!userAnswer) return false;
    
    const normalizedUser = userAnswer.toString().toLowerCase().trim();
    const normalizedCorrect = question.correctAnswer.toString().toLowerCase().trim();
    
    // Exact match
    if (normalizedUser === normalizedCorrect) {
        return true;
    }
    
    // Check acceptable answers
    if (question.acceptableAnswers) {
        return question.acceptableAnswers.some(acceptable => 
            acceptable.toString().toLowerCase().trim() === normalizedUser
        );
    }
    
    // Fuzzy match for translation questions
    if (question.type === 'translation' && window.fuzzyMatcher) {
        const similarity = window.fuzzyMatcher.calculateSimilarity(normalizedUser, normalizedCorrect);
        return similarity >= 0.85; // 85% similarity threshold
    }
    
    return false;
}

// Export for global access
window.testService = {
    generateChapterTest,
    calculateTestScore
};

