/**
 * Sample Class - Represents an individual audio sample
 * 
 * This class encapsulates:
 * - Audio buffer data
 * - Trimbar positions (start/end times)
 * - Sample metadata (name, url)
 * - Loading state
 * 
 * Design Pattern: Entity/Model class with encapsulation
 */
export default class Sample {
    /**
     * @param {string} url - URL of the audio file
     * @param {string} name - Display name of the sample
     * @param {number} index - Index in the pad matrix
     */
    constructor(url, name, index) {
        this.url = url;
        this.name = name;
        this.index = index;
        
        // Audio data
        this.buffer = null;
        this.isLoaded = false;
        this.loadProgress = 0;
        
        // Trimbar state - persistent for each sample
        // These store the PIXEL positions of the trimbars
        // We'll convert to time when needed
        this.trimbarState = {
            leftX: 0,      // Left trimbar position in pixels
            rightX: 800,   // Right trimbar position in pixels (default canvas width)
            startTime: 0,  // Start time in seconds
            endTime: 0     // End time in seconds (will be set after loading)
        };
    }

    /**
     * Set the decoded audio buffer and initialize trimbar state
     * @param {AudioBuffer} buffer - Decoded audio data
     * @param {number} canvasWidth - Width of the waveform canvas
     */
    setBuffer(buffer, canvasWidth = 800) {
        this.buffer = buffer;
        this.isLoaded = true;
        
        // Initialize trimbar state to full sample duration
        this.trimbarState.endTime = buffer.duration;
        this.trimbarState.rightX = canvasWidth;
    }

    /**
     * Update trimbar positions
     * @param {number} leftX - Left trimbar position in pixels
     * @param {number} rightX - Right trimbar position in pixels
     * @param {number} canvasWidth - Width of the canvas
     */
    updateTrimbarPositions(leftX, rightX, canvasWidth) {
        if (!this.isLoaded) return;
        
        this.trimbarState.leftX = leftX;
        this.trimbarState.rightX = rightX;
        
        // Convert pixel positions to time
        const duration = this.buffer.duration;
        this.trimbarState.startTime = (leftX / canvasWidth) * duration;
        this.trimbarState.endTime = (rightX / canvasWidth) * duration;
    }

    /**
     * Get the start time for playback (in seconds)
     * @returns {number}
     */
    getStartTime() {
        return this.trimbarState.startTime;
    }

    /**
     * Get the end time for playback (in seconds)
     * @returns {number}
     */
    getEndTime() {
        return this.trimbarState.endTime;
    }

    /**
     * Get the duration of the selected region
     * @returns {number}
     */
    getSelectionDuration() {
        return this.trimbarState.endTime - this.trimbarState.startTime;
    }

    /**
     * Reset trimbars to full sample duration
     * @param {number} canvasWidth - Width of the canvas
     */
    resetTrimbars(canvasWidth = 800) {
        if (!this.isLoaded) return;
        
        this.trimbarState.leftX = 0;
        this.trimbarState.rightX = canvasWidth;
        this.trimbarState.startTime = 0;
        this.trimbarState.endTime = this.buffer.duration;
    }

    /**
     * Get sample information for display
     * @returns {object}
     */
    getInfo() {
        return {
            name: this.name,
            url: this.url,
            index: this.index,
            duration: this.isLoaded ? this.buffer.duration : 0,
            sampleRate: this.isLoaded ? this.buffer.sampleRate : 0,
            channels: this.isLoaded ? this.buffer.numberOfChannels : 0,
            isLoaded: this.isLoaded
        };
    }

    /**
     * Serialize sample state for storage (e.g., localStorage)
     * @returns {object}
     */
    serialize() {
        return {
            url: this.url,
            name: this.name,
            index: this.index,
            trimbarState: { ...this.trimbarState }
        };
    }

    /**
     * Restore sample state from serialized data
     * @param {object} data - Serialized sample data
     */
    restore(data) {
        if (data.trimbarState && this.isLoaded) {
            this.trimbarState = { ...data.trimbarState };
        }
    }
}

