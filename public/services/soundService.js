// Sound effects service for Duolingo-like experience
class SoundService {
    constructor() {
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.5');
        this.audioContext = null;
        this.sounds = {};
        
        this.init();
    }
    
    init() {
        // Try to initialize Web Audio API
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported, using fallback');
        }
    }
    
    // Play a sound effect
    playSound(type, options = {}) {
        if (!this.enabled) return;
        
        const volume = options.volume !== undefined ? options.volume : this.volume;
        
        switch (type) {
            case 'correct':
                this.playTone(523.25, 0.1, volume); // C5
                break;
            case 'incorrect':
                this.playTone(220, 0.2, volume); // A3
                break;
            case 'levelUp':
                this.playToneSequence([523.25, 659.25, 783.99], 0.15, volume);
                break;
            case 'streak':
                this.playToneSequence([523.25, 659.25, 783.99, 1046.50], 0.1, volume);
                break;
            case 'perfect':
                this.playToneSequence([523.25, 659.25, 783.99, 987.77, 1174.66], 0.1, volume);
                break;
            case 'heartLost':
                this.playTone(196, 0.3, volume); // G3
                break;
            case 'exerciseComplete':
                this.playToneSequence([659.25, 783.99, 987.77], 0.12, volume);
                break;
            case 'click':
                this.playTone(800, 0.05, volume);
                break;
            case 'pageTurn':
                this.playTone(400, 0.08, volume);
                break;
            default:
                this.playTone(440, 0.1, volume);
        }
    }
    
    playTone(frequency, duration, volume) {
        if (!this.audioContext) {
            // Fallback: use Web Audio API directly
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(volume, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
                
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + duration);
            } catch (e) {
                // Silently fail if audio not supported
            }
            return;
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    playToneSequence(frequencies, duration, volume) {
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, duration, volume);
            }, index * duration * 1000);
        });
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('soundEnabled', enabled.toString());
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('soundVolume', this.volume.toString());
    }
    
    toggle() {
        this.setEnabled(!this.enabled);
        return this.enabled;
    }
}

// Create global instance
window.soundService = new SoundService();

