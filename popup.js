class Metronome {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.tempo = 120;
        this.timeSignature = '4/4';
        this.customBeats = 4;
        this.customNote = 4;
        this.volume = 0.7;
        this.soundType = 'click';
        this.subdivision = 'off';
        this.currentBeat = 0;
        this.currentSubdivision = 0;
        this.nextNoteTime = 0;
        this.lookahead = 25.0;
        this.scheduleAheadTime = 0.1;
        this.timerID = null;
        this.tapTimes = [];
        
        // Advanced Mode Features
        this.accentPattern = [];
        this.progressiveSpeed = false;
        this.progressBars = 8;
        this.progressBPM = 5;
        this.progressMax = 160;
        this.progressBarCount = 0;
        
        // TRIPLE POLYRHYTHM FEATURES
        this.polyrhythm = false;
        this.polyLeft = 3;
        this.polyRight = 4;
        this.polyThird = 0;
        this.polySound1 = 'click';
        this.polySound2 = 'triangle';
        this.polySound3 = 'sine';
        this.polyBeat1 = 0;
        this.polyBeat2 = 0;
        this.polyBeat3 = 0;
        this.polyLeftNext = 0;
        this.polyRightNext = 0;
        this.polyThirdNext = 0;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.initializeElements();
        if (this.elementsValid()) {
            this.attachEventListeners();
            this.updateBeatCounter();
            this.loadSettings();
        }
    }

    elementsValid() {
        return this.playButton && this.tempoSlider && this.bpmValue;
    }

    initializeElements() {
        this.playButton = document.getElementById('playButton');
        this.tempoSlider = document.getElementById('tempoSlider');
        this.tempoValue = document.getElementById('tempoValue');
        this.bpmValue = document.getElementById('bpmValue');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.timeSignatureSelect = document.getElementById('timeSignature');
        this.customBeatsInput = document.getElementById('customBeats');
        this.customNoteSelect = document.getElementById('customNote');
        this.customSlash = document.getElementById('customSlash');
        this.soundSelect = document.getElementById('soundSelect');
        this.beatIndicator = document.getElementById('beatIndicator');
        this.tempoDisplay = document.getElementById('tempoDisplay');
        this.beatCounter = document.getElementById('beatCounter');
        this.tapButton = document.getElementById('tapButton');
        this.subdivButtons = {
            off: document.getElementById('subdivOff'),
            eighth: document.getElementById('subdivEighth'),
            triplet: document.getElementById('subdivTriplet'),
            sixteenth: document.getElementById('subdivSixteenth'),
            quintuplet: document.getElementById('subdivQuintuplet')
        };
        this.advancedControls = document.getElementById('advancedControls');
        this.accentGrid = document.getElementById('accentGrid');
        this.progressToggle = document.getElementById('progressToggle');
        this.polyToggle = document.getElementById('polyToggle');
        this.polySoundSelectors = document.getElementById('polySoundSelectors');
    }

    attachEventListeners() {
        if (this.playButton) {
            this.playButton.addEventListener('click', () => this.toggle());
        }
        
        if (this.tempoSlider) {
            this.tempoSlider.addEventListener('input', (e) => {
                this.tempo = parseInt(e.target.value);
                this.updateTempoDisplay();
                this.saveSettings();
            });

            // Mausrad auch über dem Slider selbst
            this.tempoSlider.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -1 : 1;
                this.tempo = Math.max(20, Math.min(300, this.tempo + delta));
                this.updateTempoDisplay();
                this.tempoSlider.value = this.tempo;
                this.saveSettings();
            });
        }

        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => {
                this.volume = parseInt(e.target.value) / 100;
                if (this.volumeValue) {
                    this.volumeValue.textContent = `${e.target.value}%`;
                }
                this.saveSettings();
            });
        }

        if (this.timeSignatureSelect) {
            this.timeSignatureSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    if (this.customBeatsInput) this.customBeatsInput.style.display = 'inline-block';
                    if (this.customNoteSelect) this.customNoteSelect.style.display = 'inline-block';
                    if (this.customSlash) this.customSlash.style.display = 'inline-block';
                    this.timeSignature = `${this.customBeats}/${this.customNote}`;
                } else {
                    if (this.customBeatsInput) this.customBeatsInput.style.display = 'none';
                    if (this.customNoteSelect) this.customNoteSelect.style.display = 'none';
                    if (this.customSlash) this.customSlash.style.display = 'none';
                    this.timeSignature = e.target.value;
                }
                this.currentBeat = 0;
                this.updateBeatCounter();
                this.saveSettings();
            });
        }

        if (this.customBeatsInput) {
            this.customBeatsInput.addEventListener('change', (e) => {
                this.customBeats = Math.min(16, Math.max(1, parseInt(e.target.value) || 4));
                e.target.value = this.customBeats;
                this.timeSignature = `${this.customBeats}/${this.customNote}`;
                this.currentBeat = 0;
                this.updateBeatCounter();
                this.saveSettings();
            });
        }

        if (this.customNoteSelect) {
            this.customNoteSelect.addEventListener('change', (e) => {
                this.customNote = parseInt(e.target.value);
                this.timeSignature = `${this.customBeats}/${this.customNote}`;
                this.saveSettings();
            });
        }

        if (this.soundSelect) {
            this.soundSelect.addEventListener('change', (e) => {
                this.soundType = e.target.value;
                this.polySound1 = e.target.value;
                this.updatePolySoundSelector();
                this.saveSettings();
            });
        }

        Object.entries(this.subdivButtons).forEach(([key, button]) => {
            if (button) {
                button.addEventListener('click', () => {
                    this.setSubdivision(key);
                });
            }
        });

        if (this.subdivButtons.off) {
            this.subdivButtons.off.classList.add('active');
        }

        if (this.tapButton) {
            this.tapButton.addEventListener('click', () => this.handleTap());
        }

        // BPM-Display interaktiv machen
        if (this.bpmValue) {
            // Mausrad für +/-1 BPM
            this.bpmValue.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -1 : 1;
                this.tempo = Math.max(20, Math.min(300, this.tempo + delta));
                this.updateTempoDisplay();
                if (this.tempoSlider) this.tempoSlider.value = this.tempo;
                this.saveSettings();
            });

            // Klick für manuelle Eingabe
            this.bpmValue.addEventListener('click', () => {
                const input = document.createElement('input');
                input.className = 'bpm-input';
                input.type = 'number';
                input.min = '20';
                input.max = '300';
                input.value = this.tempo;
                
                this.bpmValue.style.display = 'none';
                this.bpmValue.parentNode.insertBefore(input, this.bpmValue);
                
                input.focus();
                input.select();
                
                const finishEdit = () => {
                    const newTempo = Math.max(20, Math.min(300, parseInt(input.value) || this.tempo));
                    this.tempo = newTempo;
                    this.updateTempoDisplay();
                    if (this.tempoSlider) this.tempoSlider.value = this.tempo;
                    this.saveSettings();
                    
                    input.remove();
                    this.bpmValue.style.display = 'block';
                };
                
                input.addEventListener('blur', finishEdit);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                        finishEdit();
                    }
                });
            });
        }

        // Tempo-Slider-Anzeige auch interaktiv machen
        if (this.tempoValue) {
            // Mausrad für +/-1 BPM
            this.tempoValue.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -1 : 1;
                this.tempo = Math.max(20, Math.min(300, this.tempo + delta));
                this.updateTempoDisplay();
                if (this.tempoSlider) this.tempoSlider.value = this.tempo;
                this.saveSettings();
            });

            // Klick für manuelle Eingabe
            this.tempoValue.addEventListener('click', () => {
                const input = document.createElement('input');
                input.className = 'slider-input';
                input.type = 'number';
                input.min = '20';
                input.max = '300';
                input.value = this.tempo;
                
                this.tempoValue.style.display = 'none';
                this.tempoValue.parentNode.insertBefore(input, this.tempoValue.nextSibling);
                
                input.focus();
                input.select();
                
                const finishEdit = () => {
                    const newTempo = Math.max(20, Math.min(300, parseInt(input.value) || this.tempo));
                    this.tempo = newTempo;
                    this.updateTempoDisplay();
                    if (this.tempoSlider) this.tempoSlider.value = this.tempo;
                    this.saveSettings();
                    
                    input.remove();
                    this.tempoValue.style.display = 'inline';
                };
                
                input.addEventListener('blur', finishEdit);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                        finishEdit();
                    }
                });
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggle();
            } else if (e.code === 'ArrowUp') {
                e.preventDefault();
                this.tempo = Math.min(300, this.tempo + 1);
                this.updateTempoDisplay();
                if (this.tempoSlider) this.tempoSlider.value = this.tempo;
                this.saveSettings();
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.tempo = Math.max(20, this.tempo - 1);
                this.updateTempoDisplay();
                if (this.tempoSlider) this.tempoSlider.value = this.tempo;
                this.saveSettings();
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                this.resetTap();
            }
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        if (this.progressToggle) {
            this.progressToggle.addEventListener('click', () => this.toggleProgressiveSpeed());
        }
        
        document.getElementById('progressBars')?.addEventListener('change', (e) => {
            this.progressBars = parseInt(e.target.value);
            this.saveSettings();
        });
        
        document.getElementById('progressBPM')?.addEventListener('change', (e) => {
            this.progressBPM = parseInt(e.target.value);
            this.saveSettings();
        });
        
        document.getElementById('progressMax')?.addEventListener('change', (e) => {
            this.progressMax = parseInt(e.target.value);
            this.saveSettings();
        });
        
        if (this.polyToggle) {
            this.polyToggle.addEventListener('click', () => this.togglePolyrhythm());
        }
        
        document.getElementById('polyLeft')?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.polyLeft = isNaN(value) ? 2 : Math.max(2, Math.min(9, value));
            
            // RESTART wenn Metronom läuft
            if (this.isPlaying) {
                this.stop();
                setTimeout(() => this.start(), 100); // Kurze Pause
            }
            
            if (this.polyrhythm) {
                this.updatePolyCounters();
                this.updateBeatCounter();
            }
            this.saveSettings();
        });
        
        document.getElementById('polyRight')?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.polyRight = isNaN(value) ? 3 : Math.max(2, Math.min(9, value));
            
            // RESTART wenn Metronom läuft
            if (this.isPlaying) {
                this.stop();
                setTimeout(() => this.start(), 100);
            }
            
            if (this.polyrhythm) {
                this.updatePolyCounters();
            }
            this.saveSettings();
        });
        
        document.getElementById('polyThird')?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.polyThird = isNaN(value) ? 0 : Math.max(0, Math.min(9, value));
            
            // RESTART wenn Metronom läuft
            if (this.isPlaying) {
                this.stop();
                setTimeout(() => this.start(), 100);
            }
            
            if (this.polyrhythm) {
                this.updatePolyCounters();
            }
            this.saveSettings();
        });
        
        document.getElementById('polySound1')?.addEventListener('change', (e) => {
            this.polySound1 = e.target.value;
            
            // RESTART wenn Metronom läuft
            if (this.isPlaying) {
                this.stop();
                setTimeout(() => this.start(), 100);
            }
            
            if (this.polyrhythm) {
                this.updatePolyCounters();
            }
            this.saveSettings();
        });
        
        document.getElementById('polySound2')?.addEventListener('change', (e) => {
            this.polySound2 = e.target.value;
            
            // RESTART wenn Metronom läuft
            if (this.isPlaying) {
                this.stop();
                setTimeout(() => this.start(), 100);
            }
            
            if (this.polyrhythm) {
                this.updatePolyCounters();
            }
            this.saveSettings();
        });
        
        document.getElementById('polySound3')?.addEventListener('change', (e) => {
            this.polySound3 = e.target.value;
            
            // RESTART wenn Metronom läuft
            if (this.isPlaying) {
                this.stop();
                setTimeout(() => this.start(), 100);
            }
            
            if (this.polyrhythm) {
                this.updatePolyCounters();
            }
            this.saveSettings();
        });
    }
    
    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });
    }
    
    updateAccentGrid() {
        if (!this.accentGrid) return;
        
        const [beats] = this.timeSignature.split('/').map(n => parseInt(n));
        this.accentGrid.innerHTML = '';
        
        if (this.accentPattern.length !== beats) {
            this.accentPattern = new Array(beats).fill('normal');
            this.accentPattern[0] = 'accent';
        }
        
        for (let i = 0; i < beats; i++) {
            const beat = document.createElement('div');
            beat.className = `accent-beat ${this.accentPattern[i]}`;
            beat.textContent = i + 1;
            beat.dataset.beat = i;
            
            beat.addEventListener('click', () => {
                const states = ['accent', 'normal', 'muted'];
                const currentState = this.accentPattern[i];
                const currentIndex = states.indexOf(currentState);
                const nextState = states[(currentIndex + 1) % states.length];
                
                this.accentPattern[i] = nextState;
                beat.className = `accent-beat ${nextState}`;
                this.saveSettings();
            });
            
            this.accentGrid.appendChild(beat);
        }
    }
    
    toggleProgressiveSpeed() {
        this.progressiveSpeed = !this.progressiveSpeed;
        if (this.progressToggle) {
            this.progressToggle.classList.toggle('active', this.progressiveSpeed);
            this.progressToggle.textContent = this.progressiveSpeed ? 'Stop' : 'Start';
        }
        this.progressBarCount = 0;
        this.saveSettings();
    }
    
    togglePolyrhythm() {
        // RESTART wenn Metronom läuft
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.stop();
        }
        
        this.polyrhythm = !this.polyrhythm;
        
        if (this.polyToggle) {
            this.polyToggle.classList.toggle('active', this.polyrhythm);
            this.polyToggle.textContent = this.polyrhythm ? 'Disable' : 'Enable';
        }
        
        if (this.polySoundSelectors) {
            this.polySoundSelectors.classList.toggle('active', this.polyrhythm);
        }
        
        if (this.polyrhythm) {
            // AUTO-SWITCH TO 4/4 for proper polyrhythm function
            if (this.timeSignature !== '4/4') {
                this.timeSignature = '4/4';
                if (this.timeSignatureSelect) {
                    this.timeSignatureSelect.value = '4/4';
                }
                // Hide custom time signature controls if they were visible
                if (this.customBeatsInput) this.customBeatsInput.style.display = 'none';
                if (this.customNoteSelect) this.customNoteSelect.style.display = 'none';
                if (this.customSlash) this.customSlash.style.display = 'none';
                
                this.updateBeatCounter();
            }
            
            // Disable time signature selector while polyrhythm is active
            if (this.timeSignatureSelect) {
                this.timeSignatureSelect.disabled = true;
                this.timeSignatureSelect.style.opacity = '0.5';
            }
            
            // HIDE Time Signature and Subdivisions row - not relevant for polyrhythms
            const doubleControls = document.querySelectorAll('.controls .double-control');
            if (doubleControls.length > 1) {
                doubleControls[1].style.display = 'none'; // Hide second double-control row
            }
            
            this.createPolyCounters();
            this.resetPolyrhythmTiming();
        } else {
            // Re-enable time signature selector
            if (this.timeSignatureSelect) {
                this.timeSignatureSelect.disabled = false;
                this.timeSignatureSelect.style.opacity = '1';
            }
            
            // SHOW Time Signature and Subdivisions row again
            const doubleControls = document.querySelectorAll('.controls .double-control');
            if (doubleControls.length > 1) {
                doubleControls[1].style.display = 'grid'; // Show second double-control row
            }
            
            this.hidePolyCounters();
        }
        
        this.saveSettings();
        
        // RESTART wenn es vorher lief
        if (wasPlaying) {
            setTimeout(() => this.start(), 100);
        }
    }
    
    resetPolyrhythmTiming() {
        if (this.audioContext) {
            // WICHTIG: Alle Timer exakt zur gleichen Zeit starten
            const now = this.audioContext.currentTime;
            this.polyLeftNext = now;
            this.polyRightNext = now;
            this.polyThirdNext = now;
            
            // Beat-Counter auch synchron zurücksetzen
            this.polyBeat1 = 0;
            this.polyBeat2 = 0;
            this.polyBeat3 = 0;
            
            // Visuellen Feedback zurücksetzen
            document.querySelectorAll('.beat-dot').forEach(dot => {
                dot.classList.remove('active', 'accent');
            });
        }
    }
    
    createPolyCounters() {
        this.hidePolyCounters();
        
        const tempoDisplay = document.getElementById('tempoDisplay');
        if (!tempoDisplay) return;
        
        // R1 Counter (uses main beat counter, centered)
        const r1Counter = document.getElementById('beatCounter');
        if (r1Counter) {
            r1Counter.className = 'beat-counter poly-counter';
            r1Counter.style.justifyContent = 'center';
        }
        
        this.updateBeatCounter(); // Ensure R1 has correct dots
        
        // R2 Counter (without label)
        if (this.polyRight > 0) {
            const r2Counter = document.createElement('div');
            r2Counter.id = 'polyCounter2';
            r2Counter.className = 'poly-counter r2';
            r2Counter.style.marginTop = '6px';
            r2Counter.style.justifyContent = 'center';
            
            for (let i = 0; i < this.polyRight; i++) {
                const dot = document.createElement('div');
                dot.className = 'beat-dot';
                r2Counter.appendChild(dot);
            }
            
            tempoDisplay.appendChild(r2Counter);
        }
        
        // R3 Counter Platzhalter (immer erstellen, auch wenn polyThird = 0)
        const r3Counter = document.createElement('div');
        r3Counter.id = 'polyCounter3';
        r3Counter.className = 'poly-counter r3';
        r3Counter.style.marginTop = '6px';
        r3Counter.style.justifyContent = 'center';
        r3Counter.style.minHeight = '14px'; // Reserve space even when empty
        
        if (this.polyThird > 0) {
            for (let i = 0; i < this.polyThird; i++) {
                const dot = document.createElement('div');
                dot.className = 'beat-dot';
                r3Counter.appendChild(dot);
            }
        }
        
        tempoDisplay.appendChild(r3Counter);
    }
    
    hidePolyCounters() {
        // Remove poly counter rows
        const rowIds = ['polyCounterRow1', 'polyCounterRow2', 'polyCounterRow3'];
        rowIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.remove();
        });
        
        // Reset main beat counter to original position if needed
        const beatCounter = document.getElementById('beatCounter');
        if (beatCounter && beatCounter.className.includes('poly-counter')) {
            beatCounter.className = 'beat-counter'; // Remove poly-counter class
            beatCounter.style.justifyContent = ''; // Reset justification
        }
        
        // Remove old poly labels (fallback)
        document.querySelectorAll('.poly-label').forEach(el => el.remove());
        
        const existingCounters = ['polyCounter2', 'polyCounter3'];
        existingCounters.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.remove();
        });
        
        // WICHTIG: Beat-Counter für normale Taktart neu aufbauen
        this.updateBeatCounter();
    }
    
    updatePolyCounters() {
        if (this.polyrhythm) {
            this.createPolyCounters();
        }
    }
    
    updatePolySoundSelector() {
        const polySound1Select = document.getElementById('polySound1');
        if (polySound1Select) {
            polySound1Select.value = this.polySound1;
        }
    }

    setSubdivision(type) {
        this.subdivision = type;
        Object.values(this.subdivButtons).forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (this.subdivButtons[type]) {
            this.subdivButtons[type].classList.add('active');
        }
        this.currentSubdivision = 0;
        this.saveSettings();
    }

    updateTempoDisplay() {
        if (this.tempoValue) this.tempoValue.textContent = this.tempo;
        if (this.bpmValue) this.bpmValue.textContent = this.tempo;
    }

    updateBeatCounter() {
        if (!this.beatCounter) return;
        
        // KORRIGIERT: Im Polyrhythm-Modus R1-Anzahl verwenden, sonst Taktart
        const beats = this.polyrhythm ? this.polyLeft : this.timeSignature.split('/').map(n => parseInt(n))[0];
        this.beatCounter.innerHTML = '';
        
        this.updateAccentGrid();
        
        for (let i = 0; i < Math.min(beats, 16); i++) {
            const dot = document.createElement('div');
            dot.className = 'beat-dot';
            dot.dataset.beat = i;
            this.beatCounter.appendChild(dot);
        }
    }

    handleTap() {
        const now = Date.now();
        this.tapTimes.push(now);
        
        if (this.tapTimes.length > 8) {
            this.tapTimes.shift();
        }
        
        if (this.tapTimes.length > 1) {
            let totalInterval = 0;
            for (let i = 1; i < this.tapTimes.length; i++) {
                totalInterval += this.tapTimes[i] - this.tapTimes[i - 1];
            }
            const avgInterval = totalInterval / (this.tapTimes.length - 1);
            const bpm = Math.round(60000 / avgInterval);
            
            if (bpm >= 20 && bpm <= 300) {
                this.tempo = bpm;
                if (this.tempoSlider) this.tempoSlider.value = bpm;
                this.updateTempoDisplay();
                this.saveSettings();
                
                if (chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({
                        action: 'saveTapHistory',
                        tempo: bpm
                    }).catch(() => {});
                }
            }
        }
        
        if (this.tapButton) {
            this.tapButton.style.background = 'var(--secondary)';
            setTimeout(() => {
                if (this.tapButton) this.tapButton.style.background = '';
            }, 100);
        }
    }

    resetTap() {
        this.tapTimes = [];
    }

    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        this.isPlaying = true;
        this.currentBeat = 0;
        this.currentSubdivision = 0;
        
        // WICHTIG: Für perfekte Synchronisation erst Zeit setzen, dann Polyrhythm-Timer
        const startTime = this.audioContext.currentTime + 0.1; // 100ms Vorlauf
        this.nextNoteTime = startTime;
        
        if (this.polyrhythm) {
            // Alle Polyrhythm-Timer zur exakt gleichen Zeit
            this.polyLeftNext = startTime;
            this.polyRightNext = startTime; 
            this.polyThirdNext = startTime;
            this.polyBeat1 = 0;
            this.polyBeat2 = 0;
            this.polyBeat3 = 0;
        }
        
        this.scheduler();
        
        if (this.playButton) {
            this.playButton.textContent = 'STOP';
            this.playButton.classList.add('active');
        }
        if (this.tempoDisplay) {
            this.tempoDisplay.classList.add('active');
        }
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
        
        if (this.playButton) {
            this.playButton.textContent = 'START';
            this.playButton.classList.remove('active');
        }
        if (this.tempoDisplay) {
            this.tempoDisplay.classList.remove('active');
        }
        if (this.beatIndicator) {
            this.beatIndicator.classList.remove('active');
        }
        
        document.querySelectorAll('.beat-dot').forEach(dot => {
            dot.classList.remove('active', 'accent');
        });
    }

    scheduler() {
        if (!this.polyrhythm) {
            while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
                this.scheduleNote(this.currentBeat, this.currentSubdivision, this.nextNoteTime);
                this.nextNote();
            }
        } else {
            const secondsPerBeat = 60.0 / this.tempo;
            const [beats] = this.timeSignature.split('/').map(n => parseInt(n));
            const measureDuration = secondsPerBeat * beats;
            
            if (this.polyLeft > 0) {
                const leftInterval = measureDuration / this.polyLeft;
                while (this.polyLeftNext < this.audioContext.currentTime + this.scheduleAheadTime) {
                    this.schedulePolySound(this.polyLeftNext, 1, this.polySound1);
                    this.polyLeftNext += leftInterval;
                }
            }
            
            if (this.polyRight > 0) {
                const rightInterval = measureDuration / this.polyRight;
                while (this.polyRightNext < this.audioContext.currentTime + this.scheduleAheadTime) {
                    this.schedulePolySound(this.polyRightNext, 2, this.polySound2);
                    this.polyRightNext += rightInterval;
                }
            }
            
            if (this.polyThird > 0) {
                const thirdInterval = measureDuration / this.polyThird;
                while (this.polyThirdNext < this.audioContext.currentTime + this.scheduleAheadTime) {
                    this.schedulePolySound(this.polyThirdNext, 3, this.polySound3);
                    this.polyThirdNext += thirdInterval;
                }
            }
            
            while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
                this.nextNote();
            }
        }
        
        if (this.isPlaying) {
            this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
        }
    }
    
    schedulePolySound(time, rhythmNumber, soundType) {
        if (!this.audioContext) return;
        
        let osc, gainNode, noiseSource;
        
        if (soundType === 'drum' || soundType === 'rimshot') {
            const bufferSize = this.audioContext.sampleRate * 0.1;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = buffer;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = soundType === 'rimshot' ? 200 : 100;
            filter.Q.value = 1;
            
            gainNode = this.audioContext.createGain();
            
            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
        } else {
            osc = this.audioContext.createOscillator();
            gainNode = this.audioContext.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // KORRIGIERT: Prüfe AKTUELLEN Beat-Status für Akzent
            let frequency;
            if (rhythmNumber === 1) {
                const isAccent = this.polyBeat1 === 0; // AKTUELLER Beat ist die "1"
                frequency = isAccent ? 
                    this.getPolyFrequency(soundType, rhythmNumber) * 1.2 : 
                    this.getPolyFrequency(soundType, rhythmNumber);
            } else {
                frequency = this.getPolyFrequency(soundType, rhythmNumber);
            }
            
            osc.frequency.value = frequency;
            osc.type = this.getPolyOscillatorType(soundType);
        }
        
        // Volume mit Akzent für R1
        const volumeMultipliers = {
            1: 0.7,
            2: 0.5,
            3: 0.4
        };
        
        let finalVolume = this.volume * volumeMultipliers[rhythmNumber];
        if (rhythmNumber === 1 && this.polyBeat1 === 0) {
            finalVolume *= 1.3; // 30% lauter für R1-Akzent
        }
        
        const attackTime = 0.001;
        const releaseTime = soundType === 'drum' ? 0.08 : 0.04;
        
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(finalVolume, time + attackTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + releaseTime);
        
        if (osc) {
            osc.start(time);
            osc.stop(time + releaseTime);
        }
        if (noiseSource) {
            noiseSource.start(time);
            noiseSource.stop(time + releaseTime);
        }
        
        const visualDelay = (time - this.audioContext.currentTime) * 1000;
        if (visualDelay < 100 && visualDelay >= 0) {
            setTimeout(() => this.polyVisualFeedback(rhythmNumber), Math.max(0, visualDelay));
        }
    }

    polyVisualFeedback(rhythmNumber) {
        if (rhythmNumber === 1 && this.polyLeft > 0) {
            // KORRIGIERT: Direkte Beat-Anzeige für R1 (nicht mehr 4/4-Mapping)
            const currentBeat = this.polyBeat1; // Aktueller Beat vor dem Increment
            
            const beatCounter = document.getElementById('beatCounter');
            if (beatCounter) {
                const dots = beatCounter.querySelectorAll('.beat-dot');
                dots.forEach((dot, index) => {
                    dot.classList.remove('active', 'accent');
                    if (index === currentBeat) {
                        // Erstes Beat von R1 = Akzent, andere = normal
                        dot.classList.add(currentBeat === 0 ? 'accent' : 'active');
                    }
                });
            }
            
            // JETZT erst den Counter erhöhen
            this.polyBeat1 = (this.polyBeat1 + 1) % this.polyLeft;
            
        } else if (rhythmNumber === 2 && this.polyRight > 0) {
            const currentBeat = this.polyBeat2;
            const polyCounter2 = document.getElementById('polyCounter2');
            if (polyCounter2) {
                const dots = polyCounter2.querySelectorAll('.beat-dot');
                dots.forEach((dot, index) => {
                    dot.classList.remove('active');
                    if (index === currentBeat) {
                        dot.classList.add('active');
                    }
                });
            }
            this.polyBeat2 = (this.polyBeat2 + 1) % this.polyRight;
            
        } else if (rhythmNumber === 3 && this.polyThird > 0) {
            const currentBeat = this.polyBeat3;
            const polyCounter3 = document.getElementById('polyCounter3');
            if (polyCounter3) {
                const dots = polyCounter3.querySelectorAll('.beat-dot');
                dots.forEach((dot, index) => {
                    dot.classList.remove('active');
                    if (index === currentBeat) {
                        dot.classList.add('active');
                    }
                });
            }
            this.polyBeat3 = (this.polyBeat3 + 1) % this.polyThird;
        }
    }
    
    getPolyFrequency(soundType, rhythmNumber) {
        const frequencies = {
            'click': [1000, 1400, 800],
            'drum': [100, 140, 80],
            'cowbell': [800, 1100, 600],
            'beep': [880, 1320, 660],
            'sine': [523, 659, 440],
            'triangle': [2000, 2800, 1600],
            'tick': [4000, 5600, 3200]
        };
        
        const freqArray = frequencies[soundType] || frequencies['click'];
        return freqArray[rhythmNumber - 1] || freqArray[0];
    }
    
    getPolyOscillatorType(soundType) {
        const types = {
            'click': 'square',
            'drum': 'sine',
            'cowbell': 'triangle',
            'beep': 'sine',
            'sine': 'sine',
            'triangle': 'triangle',
            'tick': 'square'
        };
        return types[soundType] || 'sine';
    }

    getSubdivisionCount() {
        switch(this.subdivision) {
            case 'eighth': return 2;
            case 'triplet': return 3;
            case 'sixteenth': return 4;
            case 'quintuplet': return 5;
            default: return 1;
        }
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        const subdivisionCount = this.getSubdivisionCount();
        
        // KORRIGIERT: Taktart-basierte Tempo-Anpassung
        const [, denominator] = this.timeSignature.split('/').map(n => parseInt(n));
        const noteValueMultiplier = 4 / denominator; // 4/4=1, 7/8=0.5, 6/8=0.5, etc.
        
        const actualSecondsPerBeat = secondsPerBeat * noteValueMultiplier;
        const secondsPerSubdivision = actualSecondsPerBeat / subdivisionCount;
        
        this.nextNoteTime += secondsPerSubdivision;
        
        this.currentSubdivision++;
        if (this.currentSubdivision >= subdivisionCount) {
            this.currentSubdivision = 0;
            const [beats] = this.timeSignature.split('/').map(n => parseInt(n));
            this.currentBeat++;
            if (this.currentBeat >= beats) {
                this.currentBeat = 0;
                
                if (this.progressiveSpeed && this.isPlaying) {
                    this.progressBarCount++;
                    if (this.progressBarCount >= this.progressBars) {
                        this.progressBarCount = 0;
                        const newTempo = Math.min(this.tempo + this.progressBPM, this.progressMax);
                        if (newTempo !== this.tempo) {
                            this.tempo = newTempo;
                            this.updateTempoDisplay();
                            if (this.tempoSlider) this.tempoSlider.value = this.tempo;
                        } else {
                            this.toggleProgressiveSpeed();
                        }
                    }
                }
            }
        }
    }

    scheduleNote(beatNumber, subdivisionNumber, time) {
        if (this.accentPattern[beatNumber] === 'muted' && subdivisionNumber === 0) {
            if (time - this.audioContext.currentTime < 0.1) {
                this.visualFeedback(beatNumber, false);
            }
            return;
        }
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        let isAccent = beatNumber === 0 && subdivisionNumber === 0;
        if (this.accentPattern.length > beatNumber) {
            isAccent = this.accentPattern[beatNumber] === 'accent' && subdivisionNumber === 0;
        }
        
        const isSubdivision = subdivisionNumber !== 0;
        const frequency = this.getFrequency(isAccent, isSubdivision);
        
        osc.frequency.value = frequency;
        osc.type = this.getOscillatorType();
        
        const attackTime = 0.001;
        const releaseTime = isSubdivision ? 0.02 : 0.05;
        
        let volumeMultiplier = isAccent ? 1 : (isSubdivision ? 0.4 : 0.7);
        
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(this.volume * volumeMultiplier, time + attackTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + releaseTime);
        
        osc.start(time);
        osc.stop(time + releaseTime);
        
        if (time - this.audioContext.currentTime < 0.1 && subdivisionNumber === 0) {
            this.visualFeedback(beatNumber, isAccent);
        }
    }

    getFrequency(isAccent, isSubdivision) {
        const frequencies = {
            'click': isAccent ? 1000 : (isSubdivision ? 1500 : 800),
            'drum': isAccent ? 100 : (isSubdivision ? 150 : 80),
            'cowbell': isAccent ? 800 : (isSubdivision ? 1000 : 600),
            'beep': isAccent ? 880 : (isSubdivision ? 1100 : 660),
            'sine': isAccent ? 523 : (isSubdivision ? 784 : 440),
            'triangle': isAccent ? 2000 : (isSubdivision ? 2500 : 1600),
            'tick': isAccent ? 4000 : (isSubdivision ? 5000 : 3000),
            'rimshot': isAccent ? 200 : (isSubdivision ? 250 : 150),
            'clave': isAccent ? 1700 : (isSubdivision ? 2000 : 1400),
            'agogo': isAccent ? 1100 : (isSubdivision ? 1400 : 900)
        };
        return frequencies[this.soundType] || frequencies['click'];
    }

    getOscillatorType() {
        const types = {
            'click': 'square',
            'drum': 'sine',
            'cowbell': 'triangle',
            'beep': 'sine',
            'sine': 'sine',
            'triangle': 'triangle',
            'tick': 'square',
            'rimshot': 'triangle',
            'clave': 'square',
            'agogo': 'triangle'
        };
        return types[this.soundType] || 'sine';
    }

    visualFeedback(beatNumber, isAccent) {
        if (this.beatIndicator) {
            this.beatIndicator.classList.add('active');
            setTimeout(() => {
                if (this.beatIndicator) this.beatIndicator.classList.remove('active');
            }, 100);
        }
        
        document.querySelectorAll('#beatCounter .beat-dot').forEach((dot, index) => {
            dot.classList.remove('active', 'accent');
            if (index === beatNumber) {
                dot.classList.add(isAccent ? 'accent' : 'active');
            }
        });
    }

    saveSettings() {
        const settings = {
            tempo: this.tempo,
            timeSignature: this.timeSignature,
            customBeats: this.customBeats,
            customNote: this.customNote,
            soundType: this.soundType,
            volume: Math.round(this.volume * 100),
            subdivision: this.subdivision,
            accentPattern: this.accentPattern,
            progressBars: this.progressBars,
            progressBPM: this.progressBPM,
            progressMax: this.progressMax,
            polyrhythm: this.polyrhythm,
            polyLeft: this.polyLeft,
            polyRight: this.polyRight,
            polyThird: this.polyThird,
            polySound1: this.polySound1,
            polySound2: this.polySound2,
            polySound3: this.polySound3
        };
        
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                action: 'saveSettings',
                settings: settings
            }).catch(() => {});
        }
    }

    loadSettings() {
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'loadSettings' }, (response) => {
                if (chrome.runtime.lastError) {
                    return;
                }
                
                if (response && response.settings) {
                    const settings = response.settings;
                    this.tempo = settings.tempo || 120;
                    this.timeSignature = settings.timeSignature || '4/4';
                    this.customBeats = settings.customBeats || 4;
                    this.customNote = settings.customNote || 4;
                    this.soundType = settings.soundType || 'click';
                    this.volume = (settings.volume || 70) / 100;
                    this.subdivision = settings.subdivision || 'off';
                    
                    this.accentPattern = settings.accentPattern || [];
                    this.progressBars = settings.progressBars || 8;
                    this.progressBPM = settings.progressBPM || 5;
                    this.progressMax = settings.progressMax || 160;
                    
                    this.polyrhythm = settings.polyrhythm || false;
                    this.polyLeft = settings.polyLeft || 3;
                    this.polyRight = settings.polyRight || 4;
                    this.polyThird = settings.polyThird || 0;
                    this.polySound1 = settings.polySound1 || 'click';
                    this.polySound2 = settings.polySound2 || 'triangle';
                    this.polySound3 = settings.polySound3 || 'sine';
                    
                    if (this.tempoSlider) this.tempoSlider.value = this.tempo;
                    if (this.soundSelect) this.soundSelect.value = this.soundType;
                    if (this.volumeSlider) this.volumeSlider.value = settings.volume || 70;
                    if (this.volumeValue) this.volumeValue.textContent = `${settings.volume || 70}%`;
                    
                    if (document.getElementById('progressBars')) {
                        document.getElementById('progressBars').value = this.progressBars;
                    }
                    if (document.getElementById('progressBPM')) {
                        document.getElementById('progressBPM').value = this.progressBPM;
                    }
                    if (document.getElementById('progressMax')) {
                        document.getElementById('progressMax').value = this.progressMax;
                    }
                    if (document.getElementById('polyLeft')) {
                        document.getElementById('polyLeft').value = this.polyLeft;
                    }
                    if (document.getElementById('polyRight')) {
                        document.getElementById('polyRight').value = this.polyRight;
                    }
                    if (document.getElementById('polyThird')) {
                        document.getElementById('polyThird').value = this.polyThird;
                    }
                    if (document.getElementById('polySound1')) {
                        document.getElementById('polySound1').value = this.polySound1;
                    }
                    if (document.getElementById('polySound2')) {
                        document.getElementById('polySound2').value = this.polySound2;
                    }
                    if (document.getElementById('polySound3')) {
                        document.getElementById('polySound3').value = this.polySound3;
                    }
                    
                    if (this.timeSignature === `${this.customBeats}/${this.customNote}` && 
                        !['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'].includes(this.timeSignature)) {
                        if (this.timeSignatureSelect) this.timeSignatureSelect.value = 'custom';
                        if (this.customBeatsInput) {
                            this.customBeatsInput.style.display = 'inline-block';
                            this.customBeatsInput.value = this.customBeats;
                        }
                        if (this.customNoteSelect) {
                            this.customNoteSelect.style.display = 'inline-block';
                            this.customNoteSelect.value = this.customNote;
                        }
                        if (this.customSlash) this.customSlash.style.display = 'inline-block';
                    } else {
                        if (this.timeSignatureSelect) this.timeSignatureSelect.value = this.timeSignature;
                    }
                    
                    this.setSubdivision(this.subdivision);
                    
                    if (this.polyrhythm) {
                        if (this.polyToggle) {
                            this.polyToggle.classList.add('active');
                            this.polyToggle.textContent = 'Disable';
                        }
                        if (this.polySoundSelectors) {
                            this.polySoundSelectors.classList.add('active');
                        }
                        this.createPolyCounters();
                    }
                    
                    this.updateTempoDisplay();
                    this.updateBeatCounter();
                }
            });
        }
    }
}

// Initialize metronome when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Metronome();
    });
} else {
    new Metronome();
}