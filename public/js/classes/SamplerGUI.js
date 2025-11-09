import WaveformVisualizer from './WaveformVisualizer.js';

/**
 * SamplerGUI Class - User interface controller
 * 
 * This class handles:
 * - Creating and managing the pad matrix (4x4 grid like Akai MPC)
 * - Integrating waveform visualizer
 * - Handling user interactions
 * - Updating UI state
 * 
 * Design Pattern: MVC Pattern (View + Controller)
 * The GUI communicates with the SamplerEngine (Model) but doesn't contain audio logic
 * 
 * Key principle: Separation of Concerns
 * - GUI handles presentation and user interaction
 * - Engine handles audio processing
 * - Sample handles data
 */
export default class SamplerGUI {
    /**
     * @param {SamplerEngine} engine - The sampler engine instance
     * @param {object} elements - DOM element references
     */
    constructor(engine, elements) {
        this.engine = engine;
        this.elements = elements;
        
        // Waveform visualizer
        this.visualizer = new WaveformVisualizer(
            elements.waveformCanvas,
            elements.trimbarCanvas
        );
        
        // Currently selected sample index
        this.selectedSampleIndex = null;
        
        // Pad elements (will be populated when creating pads)
        this.padElements = [];
        
        // Setup visualizer callback
        this.visualizer.onTrimbarChange = (sample) => {
            this.updateTrimbarInfo(sample);
        };
        
        console.log('[SamplerGUI] GUI initialized');
    }

    /**
     * Create the 4x4 pad matrix
     * Pads are filled bottom-to-top, left-to-right (like Akai MPC)
     * 
     * Visual layout (16 pads):
     * [12] [13] [14] [15]
     * [ 8] [ 9] [10] [11]
     * [ 4] [ 5] [ 6] [ 7]
     * [ 0] [ 1] [ 2] [ 3]
     */
    createPadMatrix() {
        const container = this.elements.padMatrix;
        container.innerHTML = ''; // Clear existing pads
        this.padElements = [];
        
        // Create 16 pads
        const totalPads = 16;
        
        // Reorder for bottom-to-top, left-to-right
        // Row 0 (bottom): indices 0-3
        // Row 1: indices 4-7
        // Row 2: indices 8-11
        // Row 3 (top): indices 12-15
        const reorderedIndices = [
            12, 13, 14, 15,  // Top row
            8, 9, 10, 11,    // Second row
            4, 5, 6, 7,      // Third row
            0, 1, 2, 3       // Bottom row
        ];
        
        for (let displayIndex = 0; displayIndex < totalPads; displayIndex++) {
            const actualIndex = reorderedIndices[displayIndex];
            const pad = this.createPad(actualIndex);
            container.appendChild(pad);
            this.padElements[actualIndex] = pad;
        }
        
        console.log('[SamplerGUI] Created 4x4 pad matrix (16 pads)');
    }

    /**
     * Create a single pad element
     * @param {number} index - Pad index
     * @returns {HTMLElement}
     */
    createPad(index) {
        const pad = document.createElement('div');
        pad.className = 'pad disabled';
        pad.dataset.index = index;
        
        // Pad index indicator
        const padIndex = document.createElement('span');
        padIndex.className = 'pad-index';
        padIndex.textContent = index + 1;
        
        // Pad label
        const padLabel = document.createElement('div');
        padLabel.className = 'pad-label';
        padLabel.textContent = `Pad ${index + 1}`;
        
        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'pad-progress';
        
        pad.appendChild(padIndex);
        pad.appendChild(padLabel);
        pad.appendChild(progressBar);
        
        // Click handler
        pad.addEventListener('click', () => this.handlePadClick(index));
        
        return pad;
    }

    /**
     * Handle pad click event
     * @param {number} index - Index of clicked pad
     */
    handlePadClick(index) {
        const sample = this.engine.getSample(index);
        
        if (!sample || !sample.isLoaded) {
            console.warn(`[SamplerGUI] Pad ${index} not loaded`);
            return;
        }
        
        // Play the sample
        const played = this.engine.playSample(index);
        
        if (played) {
            // Visual feedback
            this.showPadPlayAnimation(index);
            
            // Select this pad and show waveform
            this.selectPad(index);
        }
    }

    /**
     * Select a pad and display its waveform
     * @param {number} index - Index of pad to select
     */
    selectPad(index) {
        const sample = this.engine.getSample(index);
        
        if (!sample || !sample.isLoaded) return;
        
        // Update selection state
        this.selectedSampleIndex = index;
        
        // Update pad visual states
        this.padElements.forEach((pad, i) => {
            if (i === index) {
                pad.classList.add('selected');
            } else {
                pad.classList.remove('selected');
            }
        });
        
        // Load into visualizer
        this.visualizer.loadSample(sample);
        
        // Update info displays
        this.updateSampleInfo(sample);
        this.updateTrimbarInfo(sample);
    }

    /**
     * Show play animation on a pad
     * @param {number} index - Pad index
     */
    showPadPlayAnimation(index) {
        const pad = this.padElements[index];
        if (!pad) return;
        
        pad.classList.add('playing');
        setTimeout(() => {
            pad.classList.remove('playing');
        }, 300);
    }

    /**
     * Update pad after sample is loaded
     * @param {number} index - Pad index
     * @param {Sample} sample - The loaded sample
     * @param {Error} error - Error if loading failed
     */
    updatePadAfterLoad(index, sample, error) {
        const pad = this.padElements[index];
        if (!pad) return;
        
        if (error) {
            // Show error state
            pad.classList.add('disabled');
            pad.classList.remove('loading', 'ready');
            pad.querySelector('.pad-label').textContent = 'Error';
            console.error(`[SamplerGUI] Pad ${index} load error:`, error);
        } else {
            // Show ready state
            pad.classList.remove('disabled', 'loading');
            pad.classList.add('ready');
            pad.querySelector('.pad-label').textContent = sample.name;
            console.log(`[SamplerGUI] Pad ${index} ready: ${sample.name}`);
        }
    }

    /**
     * Show loading progress on a pad
     * @param {number} index - Pad index
     * @param {number} progress - Progress percentage (0-100)
     */
    updatePadProgress(index, progress) {
        const pad = this.padElements[index];
        if (!pad) return;
        
        pad.classList.add('loading');
        const progressBar = pad.querySelector('.pad-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    /**
     * Update sample info display
     * @param {Sample} sample
     */
    updateSampleInfo(sample) {
        if (!sample || !sample.isLoaded) {
            this.elements.selectedSampleName.textContent = 'No sample selected';
            this.elements.sampleDuration.textContent = 'Duration: --';
            return;
        }
        
        this.elements.selectedSampleName.textContent = sample.name;
        this.elements.sampleDuration.textContent = 
            `Duration: ${sample.buffer.duration.toFixed(2)}s`;
    }

    /**
     * Update trimbar info display
     * @param {Sample} sample
     */
    updateTrimbarInfo(sample) {
        if (!sample || !sample.isLoaded) {
            this.elements.trimStartTime.textContent = '0.00s';
            this.elements.trimEndTime.textContent = '0.00s';
            this.elements.selectionDuration.textContent = '0.00s';
            return;
        }
        
        const start = sample.getStartTime();
        const end = sample.getEndTime();
        const duration = sample.getSelectionDuration();
        
        this.elements.trimStartTime.textContent = start.toFixed(3) + 's';
        this.elements.trimEndTime.textContent = end.toFixed(3) + 's';
        this.elements.selectionDuration.textContent = duration.toFixed(3) + 's';
    }

    /**
     * Reset trimbars for current sample
     */
    resetTrimbars() {
        if (this.selectedSampleIndex === null) return;
        
        this.visualizer.resetTrimbars();
        
        const sample = this.engine.getSample(this.selectedSampleIndex);
        if (sample) {
            this.updateTrimbarInfo(sample);
        }
    }

    /**
     * Update status indicator
     * @param {string} status - Status text
     * @param {string} state - State class ('loading', 'ready', 'error')
     */
    updateStatus(status, state = 'loading') {
        this.elements.loadingStatus.textContent = status;
        
        const indicator = this.elements.statusIndicator;
        indicator.className = `status-indicator ${state}`;
    }

    /**
     * Set master volume (0-100)
     * @param {number} volume - Volume percentage
     */
    setMasterVolume(volume) {
        const normalized = volume / 100;
        this.engine.setMasterVolume(normalized);
        this.elements.volumeDisplay.textContent = `${Math.round(volume)}%`;
    }

    /**
     * Get currently selected sample
     * @returns {Sample|null}
     */
    getSelectedSample() {
        if (this.selectedSampleIndex === null) return null;
        return this.engine.getSample(this.selectedSampleIndex);
    }

    /**
     * Enable keyboard support for pads
     * Map keyboard keys to pad indices
     */
    enableKeyboardSupport() {
        // Map keys to pad indices (bottom row to top row)
        const keyMap = {
            // Bottom row (pads 0-3)
            'z': 0, 'x': 1, 'c': 2, 'v': 3,
            // Second row (pads 4-7)
            'a': 4, 's': 5, 'd': 6, 'f': 7,
            // Third row (pads 8-11)
            'q': 8, 'w': 9, 'e': 10, 'r': 11,
            // Top row (pads 12-15)
            '1': 12, '2': 13, '3': 14, '4': 15
        };
        
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            const padIndex = keyMap[key];
            
            if (padIndex !== undefined) {
                this.handlePadClick(padIndex);
                e.preventDefault();
            }
        });
        
        console.log('[SamplerGUI] Keyboard support enabled');
        console.log('[SamplerGUI] Key mapping:', keyMap);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.visualizer.destroy();
        this.padElements = [];
    }
}

