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
            utterance.pitch = options.pitch || 1.1; // Slightly higher pitch for female voice
            utterance.volume = options.volume || 1;
            
            // Get all Japanese voices
            const voices = window.speechSynthesis.getVoices();
            const japaneseVoices = voices.filter(voice => 
                voice.lang === 'ja-JP' || 
                voice.lang === 'ja' ||
                voice.lang.startsWith('ja-') ||
                voice.name.toLowerCase().includes('japanese') ||
                voice.name.toLowerCase().includes('japan')
            );
            
            // Prefer female Japanese voices (iOS typically has "Kyoko" or voices with "female" in name)
            let japaneseVoice = japaneseVoices.find(voice => {
                const name = voice.name.toLowerCase();
                return name.includes('kyoko') || 
                       name.includes('female') || 
                       name.includes('woman') ||
                       name.includes('女') ||
                       (voice.gender && voice.gender === 'female');
            });
            
            // If no female voice found, prefer voices that sound more natural
            if (!japaneseVoice) {
                // iOS voices: Kyoko, O-Ren, Yuna, etc.
                japaneseVoice = japaneseVoices.find(voice => 
                    voice.name.toLowerCase().includes('kyoko') ||
                    voice.name.toLowerCase().includes('o-ren') ||
                    voice.name.toLowerCase().includes('yuna') ||
                    voice.name.toLowerCase().includes('samantha')
                );
            }
            
            // Fallback to any Japanese voice
            if (!japaneseVoice && japaneseVoices.length > 0) {
                japaneseVoice = japaneseVoices[0];
            }
            
            if (japaneseVoice) {
                utterance.voice = japaneseVoice;
                console.log('Using Japanese voice:', japaneseVoice.name, japaneseVoice.lang);
            } else {
                console.warn('No Japanese voice found, using default');
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
                    const jpVoices = newVoices.filter(v => 
                        v.lang.startsWith('ja') || v.name.toLowerCase().includes('japanese')
                    );
                    // Prefer female voice
                    const femaleVoice = jpVoices.find(v => 
                        v.name.toLowerCase().includes('kyoko') || 
                        v.name.toLowerCase().includes('female')
                    );
                    if (femaleVoice) utterance.voice = femaleVoice;
                    else if (jpVoices.length > 0) utterance.voice = jpVoices[0];
                    window.speechSynthesis.speak(utterance);
                };
                // Fallback timeout for iOS
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

