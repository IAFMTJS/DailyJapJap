// Matching exercise component (drag & drop and tap pairs)

class MatchingExercise {
    constructor(container, pairs, onComplete) {
        this.container = container;
        this.pairs = pairs;
        this.onComplete = onComplete;
        this.selectedLeft = null;
        this.selectedRight = null;
        this.matchedPairs = [];
        this.render();
    }
    
    render() {
        // Shuffle pairs
        const shuffledPairs = this.shuffleArray([...this.pairs]);
        
        // Split into left (Japanese) and right (English)
        const leftItems = shuffledPairs.map(p => ({ ...p, side: 'left' }));
        const rightItems = shuffledPairs.map(p => ({ ...p, side: 'right' }));
        
        // Shuffle each side
        const shuffledLeft = this.shuffleArray([...leftItems]);
        const shuffledRight = this.shuffleArray([...rightItems]);
        
        this.container.innerHTML = `
            <div class="matching-exercise-container">
                <div class="matching-instructions">
                    <p>Match each Japanese word with its English translation</p>
                    <div class="matching-progress">
                        Matched: <span id="matchedCount">0</span> / ${this.pairs.length}
                    </div>
                </div>
                <div class="matching-area">
                    <div class="matching-column left-column" id="leftColumn">
                        ${shuffledLeft.map((item, idx) => `
                            <div class="matching-item ${item.matched ? 'matched' : ''}" 
                                 data-id="${item.id}" 
                                 data-side="left"
                                 onclick="window.currentMatchingExercise?.selectItem(${idx}, 'left')">
                                ${item.japanese}
                            </div>
                        `).join('')}
                    </div>
                    <div class="matching-column right-column" id="rightColumn">
                        ${shuffledRight.map((item, idx) => `
                            <div class="matching-item ${item.matched ? 'matched' : ''}" 
                                 data-id="${item.id}" 
                                 data-side="right"
                                 onclick="window.currentMatchingExercise?.selectItem(${idx}, 'right')">
                                ${item.translation}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="matching-actions">
                    <button class="premium-btn" onclick="window.currentMatchingExercise?.checkMatches()">
                        Check Answers
                    </button>
                </div>
            </div>
        `;
        
        this.leftItems = shuffledLeft;
        this.rightItems = shuffledRight;
        this.updateProgress();
    }
    
    selectItem(index, side) {
        const items = side === 'left' ? this.leftItems : this.rightItems;
        const item = items[index];
        
        if (item.matched) return; // Already matched
        
        // Deselect previous selection on same side
        if (side === 'left') {
            if (this.selectedLeft !== null) {
                this.leftItems[this.selectedLeft].selected = false;
            }
            this.selectedLeft = index;
            item.selected = true;
            this.selectedRight = null;
        } else {
            if (this.selectedRight !== null) {
                this.rightItems[this.selectedRight].selected = false;
            }
            this.selectedRight = index;
            item.selected = true;
            this.selectedLeft = null;
        }
        
        this.updateUI();
        
        // Check if both sides selected
        if (this.selectedLeft !== null && this.selectedRight !== null) {
            this.checkPair(this.selectedLeft, this.selectedRight);
        }
    }
    
    checkPair(leftIndex, rightIndex) {
        const leftItem = this.leftItems[leftIndex];
        const rightItem = this.rightItems[rightIndex];
        
        // Find the correct pair
        const correctPair = this.pairs.find(p => 
            p.japanese === leftItem.japanese && p.translation === rightItem.translation
        );
        
        if (correctPair) {
            // Correct match
            leftItem.matched = true;
            rightItem.matched = true;
            this.matchedPairs.push(correctPair);
            
            // Visual feedback
            this.showMatchFeedback(leftIndex, rightIndex, true);
            
            // Reset selections
            this.selectedLeft = null;
            this.selectedRight = null;
            
            this.updateUI();
            this.updateProgress();
            
            // Check if all matched
            if (this.matchedPairs.length === this.pairs.length) {
                setTimeout(() => {
                    if (this.onComplete) {
                        this.onComplete(this.matchedPairs);
                    }
                }, 1000);
            }
        } else {
            // Incorrect match
            this.showMatchFeedback(leftIndex, rightIndex, false);
            
            // Reset selections after delay
            setTimeout(() => {
                leftItem.selected = false;
                rightItem.selected = false;
                this.selectedLeft = null;
                this.selectedRight = null;
                this.updateUI();
            }, 1500);
        }
    }
    
    showMatchFeedback(leftIndex, rightIndex, isCorrect) {
        const leftEl = document.querySelector(`#leftColumn .matching-item:nth-child(${leftIndex + 1})`);
        const rightEl = document.querySelector(`#rightColumn .matching-item:nth-child(${rightIndex + 1})`);
        
        if (leftEl && rightEl) {
            if (isCorrect) {
                leftEl.classList.add('matched', 'correct-match');
                rightEl.classList.add('matched', 'correct-match');
                
                // Draw connection line (simplified - would use SVG in production)
                this.drawConnection(leftEl, rightEl);
            } else {
                leftEl.classList.add('wrong-match');
                rightEl.classList.add('wrong-match');
                
                setTimeout(() => {
                    leftEl.classList.remove('wrong-match');
                    rightEl.classList.remove('wrong-match');
                }, 1500);
            }
        }
    }
    
    drawConnection(leftEl, rightEl) {
        // Simplified connection - in production would use SVG or canvas
        // For now, just visual feedback via classes
    }
    
    updateUI() {
        // Update left column
        this.leftItems.forEach((item, idx) => {
            const el = document.querySelector(`#leftColumn .matching-item:nth-child(${idx + 1})`);
            if (el) {
                el.classList.toggle('selected', item.selected);
                el.classList.toggle('matched', item.matched);
            }
        });
        
        // Update right column
        this.rightItems.forEach((item, idx) => {
            const el = document.querySelector(`#rightColumn .matching-item:nth-child(${idx + 1})`);
            if (el) {
                el.classList.toggle('selected', item.selected);
                el.classList.toggle('matched', item.matched);
            }
        });
    }
    
    updateProgress() {
        const progressEl = document.getElementById('matchedCount');
        if (progressEl) {
            progressEl.textContent = this.matchedPairs.length;
        }
    }
    
    checkMatches() {
        // Validate all matches
        if (this.onComplete) {
            this.onComplete(this.matchedPairs);
        }
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.MatchingExercise = MatchingExercise;
}

