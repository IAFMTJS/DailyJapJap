// Audio player component for listening exercises
// Handles audio playback, speed control, and repeat functionality

class AudioPlayer {
    constructor() {
        this.audio = null;
        this.currentText = '';
        this.playbackSpeed = 1.0;
        this.isPlaying = false;
    }
    
    /**
     * Play Japanese text using Web Speech API
     * @param {string} text - Japanese text to speak
     * @param {object} options - Playback options
     */
    async play(text, options = {}) {
        if (!text) return;
        
        this.currentText = text;
        
        // Cancel any ongoing speech
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            utterance.rate = options.speed || this.playbackSpeed;
            utterance.pitch = options.pitch || 1;
            utterance.volume = options.volume || 1;
            
            // Get Japanese voice
            const voices = window.speechSynthesis.getVoices();
            let japaneseVoice = voices.find(voice => 
                voice.lang === 'ja-JP' || 
                voice.lang === 'ja' ||
                voice.lang.startsWith('ja-')
            );
            
            if (!japaneseVoice) {
                japaneseVoice = voices.find(voice => 
                    voice.name.toLowerCase().includes('japanese') ||
                    voice.name.toLowerCase().includes('japan')
                );
            }
            
            if (japaneseVoice) {
                utterance.voice = japaneseVoice;
            }
            
            utterance.onstart = () => {
                this.isPlaying = true;
                if (options.onStart) options.onStart();
            };
            
            utterance.onend = () => {
                this.isPlaying = false;
                if (options.onEnd) options.onEnd();
                resolve();
            };
            
            utterance.onerror = (event) => {
                this.isPlaying = false;
                if (options.onError) options.onError(event);
                reject(event);
            };
            
            // Load voices if needed (iOS Chrome workaround)
            if (voices.length === 0) {
                window.speechSynthesis.onvoiceschanged = () => {
                    const newVoices = window.speechSynthesis.getVoices();
                    const jpVoice = newVoices.find(v => v.lang.startsWith('ja'));
                    if (jpVoice) utterance.voice = jpVoice;
                    window.speechSynthesis.speak(utterance);
                };
                // Fallback timeout
                setTimeout(() => {
                    window.speechSynthesis.speak(utterance);
                }, 500);
            } else {
                window.speechSynthesis.speak(utterance);
            }
        });
    }
    
    /**
     * Stop current playback
     */
    stop() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.isPlaying = false;
    }
    
    /**
     * Set playback speed
     */
    setSpeed(speed) {
        this.playbackSpeed = Math.max(0.5, Math.min(2.0, speed));
    }
    
    /**
     * Repeat current text
     */
    async repeat() {
        if (this.currentText) {
            return await this.play(this.currentText, { speed: this.playbackSpeed });
        }
    }
    
    /**
     * Check if currently playing
     */
    getIsPlaying() {
        return this.isPlaying;
    }
}

// Global audio player instance
const audioPlayer = new AudioPlayer();

// Export for use in app.js
if (typeof window !== 'undefined') {
    window.audioPlayer = audioPlayer;
}

