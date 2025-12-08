# 🔧 Exercise System - Technical Specification

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Exercise Manager                 │
│  - Session Management                    │
│  - Exercise Queue                        │
│  - Progress Tracking                     │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                 │
┌──────▼──────┐  ┌──────▼──────┐
│  Generator  │  │  Validator  │
│  Service    │  │  Service    │
└─────────────┘  └─────────────┘
       │                 │
       └────────┬─────────┘
                │
       ┌────────▼─────────┐
       │  Exercise Types  │
       │  - Multiple      │
       │  - Translation   │
       │  - Listening     │
       │  - Matching      │
       │  - Fill Blank    │
       │  - Word Order    │
       └──────────────────┘
```

---

## Exercise Type Specifications

### 1. Multiple Choice Exercise

**Data Structure:**
```javascript
{
    id: "ex_001",
    type: "multiple_choice",
    direction: "jp_to_en" | "en_to_jp",
    question: "What does こんにちは mean?",
    questionAudio: "konnichiwa.mp3",
    correctAnswer: "Hello",
    options: ["Hello", "Goodbye", "Thank you", "Please"],
    correctIndex: 0,
    explanation: "こんにちは (konnichiwa) is a common greeting meaning 'Hello'",
    difficulty: 1,
    points: 10
}
```

**Validation:**
- Exact match with correctIndex
- Case-insensitive comparison
- Handle special characters

**UI Flow:**
1. Display question (with optional audio button)
2. Show 4 option buttons
3. User selects option
4. Immediate feedback (green/red)
5. Show explanation if wrong
6. Auto-advance after 2 seconds

**Implementation Requirements:**
- [ ] Shuffle options (except correct answer position tracking)
- [ ] Visual feedback animation
- [ ] Disable buttons after selection
- [ ] Audio playback support
- [ ] Explanation modal

---

### 2. Translation Exercise (Type Answer)

**Data Structure:**
```javascript
{
    id: "ex_002",
    type: "translation",
    direction: "jp_to_en" | "en_to_jp",
    question: "Translate: ありがとう",
    questionAudio: "arigatou.mp3",
    correctAnswer: "Thank you",
    acceptableAnswers: ["Thank you", "Thanks", "Thank you very much"],
    hint: "A common expression of gratitude",
    explanation: "ありがとう (arigatou) means 'Thank you'",
    difficulty: 2,
    points: 15,
    requiresExactMatch: false
}
```

**Validation Algorithm:**
```javascript
function validateTranslation(userAnswer, correctAnswer, acceptableAnswers) {
    // Normalize inputs
    const normalized = (str) => str.toLowerCase().trim().replace(/[.,!?]/g, '');
    
    const userNorm = normalized(userAnswer);
    const correctNorm = normalized(correctAnswer);
    
    // Exact match
    if (userNorm === correctNorm) return { correct: true, score: 1.0 };
    
    // Check acceptable answers
    for (const acceptable of acceptableAnswers) {
        if (userNorm === normalized(acceptable)) {
            return { correct: true, score: 0.9 };
        }
    }
    
    // Fuzzy matching (Levenshtein distance)
    const similarity = calculateSimilarity(userNorm, correctNorm);
    if (similarity > 0.8) {
        return { correct: true, score: similarity };
    }
    
    return { correct: false, score: 0 };
}
```

**UI Flow:**
1. Display question (Japanese text + audio)
2. Show text input field
3. User types answer
4. Submit button or Enter key
5. Real-time validation feedback
6. Show correct answer if wrong
7. Character-by-character highlighting

**Implementation Requirements:**
- [ ] Japanese IME support
- [ ] Fuzzy matching algorithm
- [ ] Acceptable answers database
- [ ] Typo tolerance
- [ ] Real-time validation (optional)
- [ ] Input suggestions (optional)

---

### 3. Listening Exercise

**Data Structure:**
```javascript
{
    id: "ex_003",
    type: "listen",
    exerciseType: "listen_select" | "listen_type",
    audioUrl: "audio/konnichiwa.mp3",
    correctAnswer: "こんにちは",
    correctAnswerEn: "Hello",
    options: ["こんにちは", "さようなら", "ありがとう", "おはよう"], // if listen_select
    hint: "A common greeting",
    explanation: "You heard こんにちは (konnichiwa) which means 'Hello'",
    difficulty: 2,
    points: 15
}
```

**Sub-types:**

#### 3a. Listen and Select
- Play audio
- Show 4 multiple choice options
- User selects answer

#### 3b. Listen and Type
- Play audio
- User types what they heard (Japanese)
- Validate against correct answer

**UI Flow:**
1. Large play button
2. Audio waveform visualization
3. Playback controls (play, pause, repeat)
4. Speed control (0.5x, 1x, 1.5x)
5. Answer input/selection
6. Validation and feedback

**Implementation Requirements:**
- [ ] Audio player component
- [ ] Waveform visualization (optional)
- [ ] Playback speed control
- [ ] Repeat button
- [ ] Audio caching
- [ ] Offline support

---

### 4. Matching Exercise

**Data Structure:**
```javascript
{
    id: "ex_004",
    type: "match",
    matchType: "drag_drop" | "tap_pairs",
    pairs: [
        { id: 1, japanese: "こんにちは", translation: "Hello" },
        { id: 2, japanese: "ありがとう", translation: "Thank you" },
        { id: 3, japanese: "さようなら", translation: "Goodbye" },
        { id: 4, japanese: "おはよう", translation: "Good morning" }
    ],
    shuffled: true,
    explanation: "Match each Japanese word with its English translation",
    difficulty: 2,
    points: 20
}
```

**Validation:**
- Track all pairs matched
- Check if all pairs are correct
- Partial credit for some correct pairs

**UI Flow:**
1. Two columns (Japanese | English)
2. Drag items or tap to match
3. Visual connection line on match
4. Auto-remove matched pairs
5. Progress indicator
6. Completion celebration

**Implementation Requirements:**
- [ ] Drag and drop library or custom implementation
- [ ] Touch support for mobile
- [ ] Visual feedback on match
- [ ] Connection line animation
- [ ] Shuffle algorithm

---

### 5. Fill in the Blank

**Data Structure:**
```javascript
{
    id: "ex_005",
    type: "fill_blank",
    blankType: "type" | "select",
    sentence: "____ means hello in Japanese",
    sentenceJP: "____ は日本語でこんにちはという意味です",
    blanks: [
        {
            index: 0,
            correctAnswer: "こんにちは",
            acceptableAnswers: ["こんにちは", "Konnichiwa"],
            options: ["こんにちは", "さようなら", "ありがとう", "おはよう"] // if select
        }
    ],
    context: "This is a common greeting",
    explanation: "こんにちは (konnichiwa) is the correct answer",
    difficulty: 2,
    points: 15
}
```

**UI Flow:**
1. Display sentence with blank(s)
2. Input field or dropdown for each blank
3. Submit button
4. Validate all blanks
5. Show correct answers
6. Highlight correct/incorrect

**Implementation Requirements:**
- [ ] Multiple blank support
- [ ] Context highlighting
- [ ] Word bank (if select type)
- [ ] Input validation

---

### 6. Word Order Exercise

**Data Structure:**
```javascript
{
    id: "ex_006",
    type: "word_order",
    orderType: "tap_order" | "drag_order",
    words: ["こんにちは", "は", "日本語", "で", "挨拶", "です"],
    correctOrder: [0, 1, 2, 3, 4, 5],
    sentence: "こんにちはは日本語で挨拶です",
    translation: "Hello is a greeting in Japanese",
    explanation: "The correct word order forms a proper Japanese sentence",
    difficulty: 3,
    points: 20
}
```

**Sub-types:**

#### 6a. Tap Words in Order
- Words displayed as buttons
- User taps in correct order
- Visual feedback on each tap

#### 6b. Drag Words to Form Sentence
- Words in random order
- User drags to sentence area
- Visual sentence structure

**UI Flow:**
1. Display shuffled words
2. User arranges words
3. Real-time sentence preview
4. Submit/validate
5. Show correct order

**Implementation Requirements:**
- [ ] Word tokenization
- [ ] Drag and drop
- [ ] Order validation
- [ ] Sentence preview

---

### 7. Speaking Exercise

**Data Structure:**
```javascript
{
    id: "ex_007",
    type: "speak",
    prompt: "Say: こんにちは",
    promptAudio: "konnichiwa.mp3",
    correctAnswer: "こんにちは",
    pronunciationGuide: "kon-ni-chi-wa",
    explanation: "Practice the pronunciation of this common greeting",
    difficulty: 3,
    points: 20
}
```

**Validation:**
- Speech recognition
- Pronunciation scoring
- Comparison with native audio

**UI Flow:**
1. Display prompt with audio
2. Record button
3. User records their pronunciation
4. Playback user's recording
5. Compare with native
6. Score and feedback

**Implementation Requirements:**
- [ ] Web Speech Recognition API
- [ ] Audio recording
- [ ] Pronunciation algorithm
- [ ] Audio comparison
- [ ] Fallback for unsupported browsers

---

## Answer Validation Service

### Core Validator

```javascript
class AnswerValidator {
    validate(exercise, userAnswer) {
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
                return { correct: false, score: 0 };
        }
    }
    
    validateMultipleChoice(exercise, selectedIndex) {
        return {
            correct: selectedIndex === exercise.correctIndex,
            score: selectedIndex === exercise.correctIndex ? 1.0 : 0,
            feedback: selectedIndex === exercise.correctIndex 
                ? "Correct!" 
                : `Wrong! The correct answer is: ${exercise.options[exercise.correctIndex]}`
        };
    }
    
    validateTranslation(exercise, userAnswer) {
        // Normalize
        const normalized = (str) => str.toLowerCase().trim().replace(/[.,!?]/g, '');
        const userNorm = normalized(userAnswer);
        const correctNorm = normalized(exercise.correctAnswer);
        
        // Exact match
        if (userNorm === correctNorm) {
            return { correct: true, score: 1.0, feedback: "Perfect!" };
        }
        
        // Acceptable answers
        if (exercise.acceptableAnswers) {
            for (const acceptable of exercise.acceptableAnswers) {
                if (userNorm === normalized(acceptable)) {
                    return { correct: true, score: 0.9, feedback: "Good! (Alternative answer)" };
                }
            }
        }
        
        // Fuzzy matching
        const similarity = this.calculateSimilarity(userNorm, correctNorm);
        if (similarity > 0.8) {
            return { 
                correct: true, 
                score: similarity, 
                feedback: `Almost! Did you mean: ${exercise.correctAnswer}?` 
            };
        }
        
        return { 
            correct: false, 
            score: 0, 
            feedback: `Incorrect. The correct answer is: ${exercise.correctAnswer}` 
        };
    }
    
    calculateSimilarity(str1, str2) {
        // Levenshtein distance
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
}
```

---

## Exercise Generator Service

### Smart Generation

```javascript
class ExerciseGenerator {
    constructor(wordBank, userProgress) {
        this.wordBank = wordBank;
        this.userProgress = userProgress;
    }
    
    generateExerciseSet(skillId, count = 10, difficulty = 1) {
        const exercises = [];
        const words = this.getWordsForSkill(skillId);
        const exerciseTypes = this.getExerciseTypesForDifficulty(difficulty);
        
        for (let i = 0; i < count; i++) {
            const word = this.selectWord(words, exercises);
            const exerciseType = this.selectExerciseType(exerciseTypes, i);
            const exercise = this.generateExercise(word, exerciseType, difficulty);
            exercises.push(exercise);
        }
        
        return exercises;
    }
    
    generateExercise(word, type, difficulty) {
        switch (type) {
            case 'multiple_choice':
                return this.generateMultipleChoice(word, difficulty);
            case 'translation':
                return this.generateTranslation(word, difficulty);
            case 'listen':
                return this.generateListening(word, difficulty);
            // ... other types
        }
    }
    
    generateMultipleChoice(word, difficulty) {
        const direction = Math.random() > 0.5 ? 'jp_to_en' : 'en_to_jp';
        const distractors = this.generateDistractors(word, 3);
        const options = [word.translation, ...distractors];
        const correctIndex = 0;
        
        // Shuffle but track correct index
        const shuffled = this.shuffleWithTracking(options, correctIndex);
        
        return {
            type: 'multiple_choice',
            direction,
            question: direction === 'jp_to_en' 
                ? `What does ${word.japanese} mean?`
                : `How do you say "${word.translation}" in Japanese?`,
            questionAudio: word.japanese,
            correctAnswer: direction === 'jp_to_en' ? word.translation : word.japanese,
            options: shuffled.array,
            correctIndex: shuffled.correctIndex,
            explanation: `${word.japanese} (${word.furigana}) means "${word.translation}"`,
            difficulty,
            points: 10
        };
    }
    
    generateDistractors(correctWord, count) {
        // Get similar words (same category, similar difficulty)
        const similarWords = this.wordBank.filter(w => 
            w.category === correctWord.category &&
            w.id !== correctWord.id &&
            Math.abs(w.difficulty - correctWord.difficulty) <= 1
        );
        
        const distractors = [];
        const used = new Set();
        
        while (distractors.length < count && used.size < similarWords.length) {
            const randomWord = similarWords[Math.floor(Math.random() * similarWords.length)];
            if (!used.has(randomWord.id)) {
                distractors.push(randomWord.translation);
                used.add(randomWord.id);
            }
        }
        
        // Fill remaining with random words if needed
        while (distractors.length < count) {
            const randomWord = this.wordBank[Math.floor(Math.random() * this.wordBank.length)];
            if (!distractors.includes(randomWord.translation)) {
                distractors.push(randomWord.translation);
            }
        }
        
        return distractors.slice(0, count);
    }
}
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create AnswerValidator class
- [ ] Implement basic validation for all types
- [ ] Create ExerciseGenerator class
- [ ] Implement distractor generation
- [ ] Create exercise data structures
- [ ] Set up exercise session manager

### Phase 2: Core Exercises (Week 2)
- [ ] Multiple Choice (enhanced)
- [ ] Translation (with fuzzy matching)
- [ ] Listening (basic)
- [ ] Fill in the Blank
- [ ] Matching (drag & drop)

### Phase 3: Advanced Exercises (Week 3)
- [ ] Word Order
- [ ] Speaking
- [ ] Enhanced Listening
- [ ] Audio system integration

### Phase 4: Polish (Week 4)
- [ ] Animations
- [ ] Feedback system
- [ ] Error handling
- [ ] Mobile optimization
- [ ] Testing

---

## Testing Strategy

### Unit Tests
- Answer validation for each type
- Exercise generation
- Distractor generation
- Fuzzy matching algorithm

### Integration Tests
- Exercise session flow
- Progress tracking
- Score calculation
- Error handling

### User Testing
- Usability testing
- Performance testing
- Cross-browser testing
- Mobile device testing

---

**Next Steps:**
1. Review and approve this specification
2. Set up development environment
3. Begin Phase 1 implementation
4. Create test cases
5. Start coding!

