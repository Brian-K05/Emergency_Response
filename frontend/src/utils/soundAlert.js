// Sound Alert Utility for Emergency Notifications
// Plays alert sound when teams are assigned or incidents are reported
// Supports both uploaded audio files (from super admin) and default generated sounds

class SoundAlert {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.volume = 0.7;
    this.soundConfigs = {}; // Cache for sound alert configurations
    this.audioElements = {}; // Cache for audio elements
    this.initAudioContext();
    this.loadSoundConfigs();
  }

  initAudioContext() {
    try {
      // Create audio context for generating sounds
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported:', e);
    }
  }

  // Set sound alerts service (injected to avoid circular dependency)
  setSoundAlertsService(service) {
    this.soundAlertsService = service;
  }

  // Load sound configurations from database
  async loadSoundConfigs() {
    if (!this.soundAlertsService) {
      // Lazy load service to avoid circular dependency
      const { soundAlertsService } = await import('../services/soundAlertsService');
      this.soundAlertsService = soundAlertsService;
    }

    try {
      const configs = await this.soundAlertsService.getSoundAlerts();
      configs.forEach(config => {
        this.soundConfigs[config.alert_type] = config;
        // Preload audio if custom file exists
        if (config.sound_file_path && config.sound_file_path !== 'default') {
          this.preloadAudio(config.alert_type, config.sound_file_path, config.volume);
        }
      });
    } catch (e) {
      console.warn('Could not load sound configurations, using defaults:', e);
    }
  }

  // Preload audio file for faster playback
  preloadAudio(alertType, filePath, volume) {
    try {
      if (!this.soundAlertsService) return;
      const url = this.soundAlertsService.getSoundUrl(filePath);
      if (!url) return;

      const audio = new Audio(url);
      audio.volume = volume || 0.7;
      audio.preload = 'auto';
      this.audioElements[alertType] = audio;
    } catch (e) {
      console.error('Error preloading audio:', e);
    }
  }

  // Play sound from uploaded file or fallback to generated sound
  async playSound(alertType, fallbackFunction) {
    if (!this.isEnabled) return;

    try {
      // Lazy load service if needed
      if (!this.soundAlertsService) {
        const { soundAlertsService } = await import('../services/soundAlertsService');
        this.soundAlertsService = soundAlertsService;
      }

      // Check if custom sound exists
      const config = this.soundConfigs[alertType];
      
      if (config && config.sound_file_path && config.sound_file_path !== 'default') {
        // Play uploaded audio file
        const url = this.soundAlertsService.getSoundUrl(config.sound_file_path);
        if (url) {
          const audio = this.audioElements[alertType] || new Audio(url);
          audio.volume = config.volume || 0.7;
          audio.currentTime = 0; // Reset to start
          
          // Play audio
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn('Could not play audio:', error);
              // Fallback to generated sound
              fallbackFunction();
            });
          }
          return;
        }
      }
      
      // Fallback to generated sound
      if (this.audioContext) {
        fallbackFunction();
      }
    } catch (e) {
      console.error('Error playing sound:', e);
      // Fallback to generated sound
      if (this.audioContext) {
        fallbackFunction();
      }
    }
  }

  // Play emergency alert sound (maps to 'emergency' alert type in database)
  async playEmergencyAlert() {
    if (!this.isEnabled) {
      console.warn('🔇 Sound alerts are disabled');
      return;
    }
    
    console.log('🚨 playEmergencyAlert called');
    console.log('📊 Current sound configs:', this.soundConfigs);
    
    // Map notification type 'new_incident' to sound alert type 'emergency'
    const config = this.soundConfigs['emergency'];
    
    if (config && config.sound_file_path && config.sound_file_path !== 'default') {
      // Play custom uploaded sound
      try {
        if (!this.soundAlertsService) {
          const { soundAlertsService } = await import('../services/soundAlertsService');
          this.soundAlertsService = soundAlertsService;
        }
        
        const url = this.soundAlertsService.getSoundUrl(config.sound_file_path);
        console.log('🔊 Playing custom emergency sound from URL:', url);
        
        if (url) {
          const audio = this.audioElements['emergency'] || new Audio(url);
          audio.volume = config.volume || 0.7;
          audio.currentTime = 0;
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('✅ Custom emergency sound playing');
              })
              .catch(error => {
                console.error('❌ Could not play custom emergency sound:', error);
                // No fallback - just don't play anything
              });
          }
          return;
        }
      } catch (e) {
        console.error('❌ Error playing custom emergency sound:', e);
        // No fallback - just don't play anything
        return;
      }
    }
    
    // If no custom sound configured, don't play anything
    console.log('⚠️ No custom emergency sound configured, skipping sound');
  }
  
  // Generate and play emergency horn sound
  playGeneratedEmergencySound() {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    try {
      const duration = 0.5; // 500ms horn blast
      const sampleRate = this.audioContext.sampleRate;
      const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Create urgent horn blast pattern
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        // Multiple frequencies for rich horn sound
        const freq1 = 400 + Math.sin(t * 10) * 50; // Base frequency with slight variation
        const freq2 = 600 + Math.sin(t * 15) * 30; // Higher harmonic
        const freq3 = 800 + Math.sin(t * 20) * 20; // Even higher
        
        // Sawtooth wave for horn-like sound
        const wave1 = 2 * ((t * freq1) % 1) - 1;
        const wave2 = 2 * ((t * freq2) % 1) - 1;
        const wave3 = 2 * ((t * freq3) % 1) - 1;
        
        // Envelope (fade in and out)
        const envelope = Math.min(t / 0.1, (duration - t) / 0.1, 1);
        
        // Combine waves with envelope
        data[i] = (wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2) * envelope * this.volume;
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      console.log('✅ Generated emergency sound playing');
    } catch (e) {
      console.error('❌ Error generating emergency sound:', e);
    }
  }

  // Play assignment alert (maps to 'assignment' alert type in database)
  async playAssignmentAlert() {
    if (!this.isEnabled) {
      console.warn('🔇 Sound alerts are disabled');
      return;
    }
    
    console.log('🔔 playAssignmentAlert called');
    
    // Map notification types 'incident_assigned'/'team_assigned' to sound alert type 'assignment'
    const config = this.soundConfigs['assignment'];
    
    if (config && config.sound_file_path && config.sound_file_path !== 'default') {
      // Play custom uploaded sound
      try {
        if (!this.soundAlertsService) {
          const { soundAlertsService } = await import('../services/soundAlertsService');
          this.soundAlertsService = soundAlertsService;
        }
        
        const url = this.soundAlertsService.getSoundUrl(config.sound_file_path);
        console.log('🔊 Playing custom assignment sound from URL:', url);
        
        if (url) {
          const audio = this.audioElements['assignment'] || new Audio(url);
          audio.volume = config.volume || 0.7;
          audio.currentTime = 0;
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('✅ Custom assignment sound playing');
              })
              .catch(error => {
                console.error('❌ Could not play custom assignment sound:', error);
                // No fallback - just don't play anything
              });
          }
          return;
        }
      } catch (e) {
        console.error('❌ Error playing custom assignment sound:', e);
        // No fallback - just don't play anything
        return;
      }
    }
    
    // If no custom sound configured, don't play anything
    console.log('⚠️ No custom assignment sound configured, skipping sound');
  }
  
  // Generate and play assignment horn sound
  playGeneratedAssignmentSound() {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    try {
      const duration = 0.4;
      const sampleRate = this.audioContext.sampleRate;
      const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const freq = 350 + Math.sin(t * 8) * 40;
        const wave = 2 * ((t * freq) % 1) - 1;
        const envelope = Math.min(t / 0.1, (duration - t) / 0.1, 1);
        data[i] = wave * envelope * this.volume;
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      console.log('✅ Generated assignment sound playing');
    } catch (e) {
      console.error('❌ Error generating assignment sound:', e);
    }
  }

  // Play escalation alert (maps to 'escalation' alert type in database)
  async playEscalationAlert() {
    if (!this.isEnabled) {
      console.warn('🔇 Sound alerts are disabled');
      return;
    }
    
    console.log('📢 playEscalationAlert called');
    
    // Map notification type 'escalation_request' to sound alert type 'escalation'
    const config = this.soundConfigs['escalation'];
    
    if (config && config.sound_file_path && config.sound_file_path !== 'default') {
      // Play custom uploaded sound
      try {
        if (!this.soundAlertsService) {
          const { soundAlertsService } = await import('../services/soundAlertsService');
          this.soundAlertsService = soundAlertsService;
        }
        
        const url = this.soundAlertsService.getSoundUrl(config.sound_file_path);
        console.log('🔊 Playing custom escalation sound from URL:', url);
        
        if (url) {
          const audio = this.audioElements['escalation'] || new Audio(url);
          audio.volume = config.volume || 0.7;
          audio.currentTime = 0;
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('✅ Custom escalation sound playing');
              })
              .catch(error => {
                console.error('❌ Could not play custom escalation sound:', error);
                // No fallback - just don't play anything
              });
          }
          return;
        }
      } catch (e) {
        console.error('❌ Error playing custom escalation sound:', e);
        // No fallback - just don't play anything
        return;
      }
    }
    
    // If no custom sound configured, don't play anything
    console.log('⚠️ No custom escalation sound configured, skipping sound');
  }
  
  // Generate and play escalation horn sound
  playGeneratedEscalationSound() {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    try {
      const duration = 0.6;
      const sampleRate = this.audioContext.sampleRate;
      const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const freq = 450 + Math.sin(t * 12) * 60;
        const wave = 2 * ((t * freq) % 1) - 1;
        const envelope = Math.min(t / 0.1, (duration - t) / 0.1, 1);
        data[i] = wave * envelope * this.volume;
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      console.log('✅ Generated escalation sound playing');
    } catch (e) {
      console.error('❌ Error generating escalation sound:', e);
    }
  }
  
  // Stop all currently playing sounds
  stopAllSounds() {
    try {
      // Stop all audio elements
      Object.values(this.audioElements).forEach(audio => {
        if (audio && typeof audio.pause === 'function') {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      
      // Note: Web Audio API sources can't be stopped once started,
      // but they will finish naturally. Audio elements can be paused.
      console.log('🔇 All sounds stopped');
    } catch (e) {
      console.warn('Error stopping sounds:', e);
    }
  }

  // Refresh sound configurations (call when super admin updates sounds)
  async refreshConfigs() {
    await this.loadSoundConfigs();
  }

  // Generate a beep sound
  playBeep(frequency, duration) {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (!this.audioContext) {
      console.warn('AudioContext not available');
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine'; // Pure tone

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (e) {
      console.error('Error playing beep:', e);
    }
  }

  // Generate a horn blast sound (like emergency horn/alarm)
  playHornBlast(frequency, duration) {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (!this.audioContext) {
      console.warn('AudioContext not available');
      return;
    }

    try {
      // Create horn sound using multiple oscillators for richer, more realistic sound
      const startTime = this.audioContext.currentTime;
      const endTime = startTime + (duration / 1000);

      // Main horn tone (lower frequency - like real horn)
      const oscillator1 = this.audioContext.createOscillator();
      const gainNode1 = this.audioContext.createGain();
      oscillator1.connect(gainNode1);
      gainNode1.connect(this.audioContext.destination);
      
      oscillator1.type = 'sawtooth'; // Harsh, attention-grabbing
      oscillator1.frequency.value = frequency;

      // Add harmonic for richer horn sound
      const oscillator2 = this.audioContext.createOscillator();
      const gainNode2 = this.audioContext.createGain();
      oscillator2.connect(gainNode2);
      gainNode2.connect(this.audioContext.destination);
      
      oscillator2.type = 'sawtooth';
      oscillator2.frequency.value = frequency * 1.5; // Higher harmonic

      // Volume envelope for horn-like attack and release
      gainNode1.gain.setValueAtTime(0, startTime);
      gainNode1.gain.linearRampToValueAtTime(this.volume * 0.8, startTime + 0.05); // Quick attack
      gainNode1.gain.linearRampToValueAtTime(this.volume * 0.8, endTime - 0.05);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, endTime);

      gainNode2.gain.setValueAtTime(0, startTime);
      gainNode2.gain.linearRampToValueAtTime(this.volume * 0.4, startTime + 0.05); // Lower volume for harmonic
      gainNode2.gain.linearRampToValueAtTime(this.volume * 0.4, endTime - 0.05);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, endTime);

      oscillator1.start(startTime);
      oscillator1.stop(endTime);
      oscillator2.start(startTime);
      oscillator2.stop(endTime);
    } catch (e) {
      console.error('Error playing horn blast:', e);
    }
  }

  // Generate a siren-like sound (alternating high-low tones - like real emergency sirens)
  playSirenTone(highFreq, lowFreq, duration) {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (!this.audioContext) {
      console.warn('AudioContext not available');
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Use 'sawtooth' wave for more harsh/attention-grabbing sound (like real sirens)
      oscillator.type = 'sawtooth';
      
      // Create siren effect: sweep from high to low frequency (like ambulance/police siren)
      const startTime = this.audioContext.currentTime;
      const endTime = startTime + (duration / 1000);
      
      oscillator.frequency.setValueAtTime(highFreq, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(lowFreq, endTime);

      // More aggressive volume curve for attention
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 1.2, startTime + 0.005); // Slightly louder
      gainNode.gain.linearRampToValueAtTime(this.volume * 1.2, endTime - 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    } catch (e) {
      console.error('Error playing siren tone:', e);
    }
  }

  // Enable/disable sound alerts
  setEnabled(enabled) {
    this.isEnabled = enabled;
    // Save preference to localStorage
    localStorage.setItem('soundAlertsEnabled', enabled ? 'true' : 'false');
  }

  // Load preference from localStorage
  loadPreference() {
    const saved = localStorage.getItem('soundAlertsEnabled');
    if (saved !== null) {
      this.isEnabled = saved === 'true';
    }
  }

  // Resume audio context (required after user interaction)
  resume() {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(err => {
        console.warn('Could not resume audio context:', err);
      });
    }
  }
}

// Create singleton instance
const soundAlert = new SoundAlert();
soundAlert.loadPreference();

// Resume audio context on first user interaction
document.addEventListener('click', () => {
  soundAlert.resume();
}, { once: true });

export default soundAlert;

