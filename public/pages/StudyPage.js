// Study Page Component
import api from '../utils/api.js';
import { showLoading, showError, escapeHtml } from '../utils/helpers.js';
import { studyStats, saveStudyStats } from '../services/studyStats.js';

let allDaysData = {};
let currentDay = null;
let currentDayWords = [];
let initCalled = false;
let daysLoading = false;
let daysLoaded = false;

export function renderWords(words) {
    const wordGrid = document.getElementById('wordGrid');
    const showFurigana = document.getElementById('showFurigana')?.checked ?? true;
    const showTranslation = document.getElementById('showTranslation')?.checked ?? true;
    
    if (!words || words.length === 0) {
        wordGrid.innerHTML = '<div class="empty-state"><h2>No words found</h2><p>No words available for this day.</p></div>';
        return;
    }
    
    wordGrid.innerHTML = words.map((word, index) => {
        const wordId = `${currentDay}-${index}`;
        const isStudied = studyStats.wordsStudied.has(wordId);
        const isMastered = studyStats.wordsMastered.has(wordId);
        
        return `
            <div class="word-card ${isMastered ? 'mastered' : ''}" data-word-id="${wordId}">
                <div class="word-japanese">${escapeHtml(word.japanese)}</div>
                ${showFurigana && word.furigana ? `<div class="word-furigana">${escapeHtml(word.furigana)}</div>` : ''}
                ${showTranslation ? `<div class="word-translation">${escapeHtml(word.translation)}</div>` : ''}
                <div class="audio-controls">
                    <button class="btn btn-primary audio-btn" data-word-index="${index}" data-audio-type="word">
                        🔊 Speak
                    </button>
                    ${word.sentence ? `
                        <button class="btn btn-secondary audio-btn" data-word-index="${index}" data-audio-type="sentence">
                            🔊 Sentence
                        </button>
                    ` : ''}
                </div>
                ${isStudied ? '<div class="word-badge">✓ Studied</div>' : ''}
            </div>
        `;
    }).join('');
    
    // Add event listeners for audio buttons using event delegation
    // Use event delegation on the parent container to handle dynamically created buttons
    wordGrid.addEventListener('click', function(e) {
        const audioBtn = e.target.closest('.audio-btn');
        if (!audioBtn) return;
        
        const wordIndex = parseInt(audioBtn.getAttribute('data-word-index'));
        const audioType = audioBtn.getAttribute('data-audio-type');
        
        if (wordIndex >= 0 && wordIndex < currentDayWords.length) {
            const word = currentDayWords[wordIndex];
            const textToSpeak = audioType === 'sentence' && word.sentence ? word.sentence : word.japanese;
            
            console.log('Playing audio for:', textToSpeak, 'Type:', audioType);
            
            if (window.speakJapanese) {
                window.speakJapanese(textToSpeak);
            } else {
                console.error('speakJapanese function not available');
            }
        }
    });
    
    // Mark words as studied when viewed (only if not already studied)
    let newWordsStudied = 0;
    words.forEach((word, index) => {
        const wordId = `${currentDay}-${index}`;
        if (!studyStats.wordsStudied.has(wordId)) {
            studyStats.wordsStudied.add(wordId);
            newWordsStudied++;
            if (window.xpService) {
                window.xpService.addXP(1, 'Studied word', false); // Don't show animation for each word
            }
        }
    });
    
    // Show XP animation once for all new words
    if (newWordsStudied > 0 && window.xpService) {
        window.xpService.addXP(newWordsStudied, `Studied ${newWordsStudied} word${newWordsStudied > 1 ? 's' : ''}`);
    }
    
    // Calculate progress for THIS DAY only
    const dayWordIds = words.map((_, index) => `${currentDay}-${index}`);
    const studiedInDay = dayWordIds.filter(id => studyStats.wordsStudied.has(id)).length;
    const progress = words.length > 0 ? (studiedInDay / words.length) * 100 : 0;
    
    // Update day progress in studyStats
    studyStats.dayProgress[currentDay] = {
        studied: studiedInDay,
        total: words.length,
        progress: progress,
        lastStudied: new Date().toISOString()
    };
    
    // Update path page if available
    if (window.pathPage && typeof window.pathPage.updateDayProgress === 'function') {
        window.pathPage.updateDayProgress(currentDay, progress);
    }
    
    // Save stats
    saveStudyStats();
    
    // Update progress display on study page if it exists
    const progressDisplay = document.getElementById('dayProgressDisplay');
    const progressEl = document.getElementById('dayProgress');
    if (progressEl) {
        progressEl.textContent = `${studiedInDay}/${words.length} words studied (${Math.round(progress)}%)`;
    }
    
    // Show progress display
    if (progressDisplay) {
        progressDisplay.style.display = 'block';
    }
    
    // Update progress bar if it exists
    const progressBar = document.getElementById('dayProgressBar');
    if (progressBar) {
        const progressFill = progressBar.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
    }
    
    console.log(`Day ${currentDay} progress: ${studiedInDay}/${words.length} (${Math.round(progress)}%)`);
}

export function getAllDaysData() {
    return allDaysData;
}

// Export currentDayWords getter - will be attached to window.studyPage later
export function getCurrentDayWords() {
    return currentDayWords;
}

export async function init() {
    // Prevent multiple initializations
    if (initCalled) {
        console.log('StudyPage.init already called, skipping...');
        return;
    }
    initCalled = true;
    console.log('StudyPage.init called');
    await loadDays();
}

export async function load() {
    console.log('StudyPage.load called');
    
    // Always ensure days are loaded when page is accessed
    if (daysLoading) {
        console.log('Days already loading, waiting...');
        // Wait for current load to finish
        while (daysLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    if (!daysLoaded || Object.keys(allDaysData).length === 0) {
        await loadDays();
    }
    
    // If we have a day selected, load its words
    const daySelect = document.getElementById('daySelect');
    if (daySelect && daySelect.value) {
        await loadWords(parseInt(daySelect.value));
    } else if (daySelect && daySelect.options.length > 1) {
        // Auto-select first day if none selected
        daySelect.value = daySelect.options[1].value;
        await loadWords(parseInt(daySelect.value));
    }
}

async function loadDays() {
    // Prevent multiple simultaneous loads
    if (daysLoading) {
        console.log('loadDays already in progress, skipping...');
        return;
    }
    if (daysLoaded) {
        console.log('Days already loaded, skipping...');
        return;
    }
    
    daysLoading = true;
    try {
        console.log('Loading days...');
        const data = await api.get('/days');
        
        if (data.error) {
            showError(data.error);
            return;
        }
        
        if (!data.days || data.days.length === 0) {
            showError('No days found in the data.');
            return;
        }
        
        const daySelect = document.getElementById('daySelect');
        if (!daySelect) {
            console.error('daySelect element not found!');
            return;
        }
        
        // Make sure dropdown is enabled
        daySelect.disabled = false;
        
        // Store current value if any
        const currentValue = daySelect.value;
        
        daySelect.innerHTML = '<option value="">Select a day...</option>';
        data.days.forEach(day => {
            const option = document.createElement('option');
            option.value = day.day;
            option.textContent = `Day ${day.day} - ${day.title}`;
            daySelect.appendChild(option);
        });
        
        // Restore previous selection if it was valid
        if (currentValue && data.days.find(d => d.day === currentValue)) {
            daySelect.value = currentValue;
        }
        
        // Store days data
        allDaysData = {};
        for (const day of data.days) {
            allDaysData[day.day] = {
                title: day.title,
                wordCount: day.wordCount
            };
        }
        
        // Mark as loaded
        daysLoaded = true;
        
        // Auto-select first day (but don't block if it fails)
        if (data.days.length > 0 && daySelect) {
            daySelect.value = data.days[0].day;
            console.log('Auto-loading day:', data.days[0].day);
            // Load words asynchronously without blocking
            loadWords(parseInt(data.days[0].day)).catch(error => {
                console.error('Error auto-loading first day:', error);
                // Show error but don't block the UI
                const wordGrid = document.getElementById('wordGrid');
                if (wordGrid) {
                    wordGrid.innerHTML = `
                        <div class="empty-state">
                            <h2>⚠️ Error Loading Words</h2>
                            <p>${escapeHtml(error.message)}</p>
                            <p>You can still select a different day from the dropdown.</p>
                        </div>
                    `;
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading days:', error);
        showError(`Failed to load days: ${error.message}. Make sure the server is running.`);
    } finally {
        daysLoading = false;
    }
}

export async function loadWords(day) {
    try {
        console.log('Loading words for day:', day);
        const wordGrid = document.getElementById('wordGrid');
        if (!wordGrid) {
            console.error('wordGrid element not found!');
            return;
        }
        
        showLoading(wordGrid, 'Loading your Japanese words...');
        
        const data = await api.get(`/words/${day}`);
        
        if (data.error) {
            showError(data.error, wordGrid);
            return;
        }
        
        if (!data.words || data.words.length === 0) {
            wordGrid.innerHTML = '<div class="empty-state"><h2>No words found</h2><p>No words available for this day.</p></div>';
            return;
        }
        
        currentDay = day;
        currentDayWords = data.words;
        
        // Update day title
        const dayTitleEl = document.getElementById('dayTitle');
        if (dayTitleEl) {
            dayTitleEl.textContent = data.title || '';
        }
        
        console.log('Rendering', data.words.length, 'words');
        renderWords(data.words);
        
    } catch (error) {
        console.error('Error loading words:', error);
        showError(`Failed to load words: ${error.message}`);
    }
}

// Export for global access
const studyPageExports = { 
    init, 
    load, 
    loadWords, 
    renderWords,
    getAllDaysData,
    getCurrentDayWords: () => currentDayWords
};

// Make currentDayWords accessible
Object.defineProperty(studyPageExports, 'currentDayWords', {
    get: () => currentDayWords,
    enumerable: true
});

window.studyPage = studyPageExports;

