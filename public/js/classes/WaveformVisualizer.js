/**
 * WaveformVisualizer Class - Renders waveforms and manages trimbars
 * 
 * This class handles:
 * - Drawing waveform visualization on canvas
 * - Interactive trimbar manipulation
 * - Mouse interaction for dragging trimbars
 * - State synchronization with Sample objects
 * 
 * Design Pattern: Strategy Pattern (rendering strategy) + Observer Pattern (state updates)
 * 
 * Based on the waveform drawer from Example2, but enhanced with:
 * - Better object-oriented design
 * - Integration with Sample class
 * - Improved interaction handling
 */
export default class WaveformVisualizer {
    /**
     * @param {HTMLCanvasElement} waveformCanvas - Canvas for waveform
     * @param {HTMLCanvasElement} trimbarCanvas - Canvas for trimbars (overlay)
     */
    constructor(waveformCanvas, trimbarCanvas) {
        this.waveformCanvas = waveformCanvas;
        this.trimbarCanvas = trimbarCanvas;
        this.waveformCtx = waveformCanvas.getContext('2d');
        this.trimbarCtx = trimbarCanvas.getContext('2d');
        
        // Current sample being visualized
        this.currentSample = null;
        this.peaks = null;
        
        // Trimbar state
        this.trimbars = {
            left: {
                x: 0,
                color: 'white',
                hoverColor: 'red',
                selected: false,
                dragged: false
            },
            right: {
                x: waveformCanvas.width,
                color: 'white',
                hoverColor: 'red',
                selected: false,
                dragged: false
            }
        };
        
        // Mouse state
        this.mousePos = { x: 0, y: 0 };
        
        // Callback for when trimbars change
        this.onTrimbarChange = null;
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.animationId = null;
        this.startAnimation();
        
        console.log('[WaveformVisualizer] Visualizer initialized');
    }

    /**
     * Load a sample for visualization
     * @param {Sample} sample - The sample to visualize
     */
    loadSample(sample) {
        if (!sample || !sample.isLoaded) {
            console.warn('[WaveformVisualizer] Cannot load sample: not loaded');
            return;
        }

        this.currentSample = sample;
        
        // Calculate peaks for efficient rendering
        this.calculatePeaks(sample.buffer);
        
        // Restore trimbar positions from sample
        this.trimbars.left.x = sample.trimbarState.leftX;
        this.trimbars.right.x = sample.trimbarState.rightX;
        
        // Draw the waveform
        this.drawWaveform();
        
        console.log(`[WaveformVisualizer] Loaded sample: ${sample.name}`);
    }

    /**
     * Calculate peaks for waveform rendering
     * This is more efficient than drawing every sample point
     * @param {AudioBuffer} buffer - The audio buffer
     */
    calculatePeaks(buffer) {
        const width = this.waveformCanvas.width;
        const sampleSize = Math.ceil(buffer.length / width);
        const sampleStep = Math.max(1, Math.floor(sampleSize / 10));
        
        this.peaks = new Float32Array(width);
        
        // Average all channels
        const channels = buffer.numberOfChannels;
        
        for (let c = 0; c < channels; c++) {
            const channelData = buffer.getChannelData(c);
            
            for (let i = 0; i < width; i++) {
                const start = Math.floor(i * sampleSize);
                const end = start + sampleSize;
                let peak = 0;
                
                // Find peak in this segment
                for (let j = start; j < end && j < channelData.length; j += sampleStep) {
                    const value = Math.abs(channelData[j]);
                    if (value > peak) peak = value;
                }
                
                // Average across channels
                if (c === 0) {
                    this.peaks[i] = peak / channels;
                } else {
                    this.peaks[i] += peak / channels;
                }
            }
        }
    }

    /**
     * Draw the waveform visualization
     */
    drawWaveform() {
        if (!this.currentSample || !this.peaks) return;
        
        const ctx = this.waveformCtx;
        const canvas = this.waveformCanvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        // Find max peak for scaling
        let maxPeak = 0;
        for (let i = 0; i < this.peaks.length; i++) {
            if (this.peaks[i] > maxPeak) maxPeak = this.peaks[i];
        }
        
        // Scale factor to use full height
        const scale = (height / 2) / maxPeak;
        const centerY = height / 2;
        
        // Draw center line
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        
        // Draw waveform with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(0.5, '#00ff00');
        gradient.addColorStop(1, '#00ff00');
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        
        // Draw upper half
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (let i = 0; i < width; i++) {
            const h = this.peaks[i] * scale;
            ctx.lineTo(i, centerY - h);
        }
        ctx.lineTo(width, centerY);
        ctx.closePath();
        ctx.fill();
        
        // Draw lower half (mirror)
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (let i = 0; i < width; i++) {
            const h = this.peaks[i] * scale;
            ctx.lineTo(i, centerY + h);
        }
        ctx.lineTo(width, centerY);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Draw the trimbars overlay
     * Called continuously in animation loop
     */
    drawTrimbars() {
        const ctx = this.trimbarCtx;
        const canvas = this.trimbarCanvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        const leftX = this.trimbars.left.x;
        const rightX = this.trimbars.right.x;
        
        // Draw gray overlay for non-selected regions
        ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
        ctx.fillRect(0, 0, leftX, height);
        ctx.fillRect(rightX, 0, width - rightX, height);
        
        // Draw left trimbar
        ctx.strokeStyle = this.trimbars.left.selected ? 
            this.trimbars.left.hoverColor : this.trimbars.left.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftX, 0);
        ctx.lineTo(leftX, height);
        ctx.stroke();
        
        // Draw left triangle
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(leftX, 0);
        ctx.lineTo(leftX + 10, 8);
        ctx.lineTo(leftX, 16);
        ctx.closePath();
        ctx.fill();
        
        // Draw right trimbar
        ctx.strokeStyle = this.trimbars.right.selected ? 
            this.trimbars.right.hoverColor : this.trimbars.right.color;
        ctx.beginPath();
        ctx.moveTo(rightX, 0);
        ctx.lineTo(rightX, height);
        ctx.stroke();
        
        // Draw right triangle
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(rightX, 0);
        ctx.lineTo(rightX - 10, 8);
        ctx.lineTo(rightX, 16);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Setup mouse event listeners for trimbar interaction
     */
    setupEventListeners() {
        // Mouse move - highlight trimbars and drag
        this.trimbarCanvas.addEventListener('mousemove', (e) => {
            const rect = this.trimbarCanvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
            
            this.handleMouseMove();
        });
        
        // Mouse down - start dragging
        this.trimbarCanvas.addEventListener('mousedown', () => {
            this.handleMouseDown();
        });
        
        // Mouse up - stop dragging
        this.trimbarCanvas.addEventListener('mouseup', () => {
            this.handleMouseUp();
        });
        
        // Mouse leave - stop dragging
        this.trimbarCanvas.addEventListener('mouseleave', () => {
            this.handleMouseUp();
        });
    }

    /**
     * Handle mouse move events
     */
    handleMouseMove() {
        const mouseX = this.mousePos.x;
        
        // Check if near left trimbar
        const distLeft = Math.abs(mouseX - this.trimbars.left.x);
        if (distLeft < 10 && !this.trimbars.right.selected) {
            this.trimbars.left.selected = true;
            this.trimbarCanvas.style.cursor = 'ew-resize';
        } else if (!this.trimbars.left.dragged) {
            this.trimbars.left.selected = false;
        }
        
        // Check if near right trimbar
        const distRight = Math.abs(mouseX - this.trimbars.right.x);
        if (distRight < 10 && !this.trimbars.left.selected) {
            this.trimbars.right.selected = true;
            this.trimbarCanvas.style.cursor = 'ew-resize';
        } else if (!this.trimbars.right.dragged) {
            this.trimbars.right.selected = false;
        }
        
        // Reset cursor if not near any trimbar
        if (!this.trimbars.left.selected && !this.trimbars.right.selected) {
            this.trimbarCanvas.style.cursor = 'default';
        }
        
        // Drag trimbars
        if (this.trimbars.left.dragged) {
            const newX = Math.max(0, Math.min(mouseX, this.trimbars.right.x));
            this.trimbars.left.x = newX;
            this.notifyTrimbarChange();
        }
        
        if (this.trimbars.right.dragged) {
            const maxX = this.trimbarCanvas.width;
            const newX = Math.min(maxX, Math.max(mouseX, this.trimbars.left.x));
            this.trimbars.right.x = newX;
            this.notifyTrimbarChange();
        }
    }

    /**
     * Handle mouse down events
     */
    handleMouseDown() {
        if (this.trimbars.left.selected) {
            this.trimbars.left.dragged = true;
        }
        if (this.trimbars.right.selected) {
            this.trimbars.right.dragged = true;
        }
    }

    /**
     * Handle mouse up events
     */
    handleMouseUp() {
        this.trimbars.left.dragged = false;
        this.trimbars.right.dragged = false;
    }

    /**
     * Notify callback when trimbars change
     */
    notifyTrimbarChange() {
        if (this.currentSample) {
            // Update sample's trimbar state
            this.currentSample.updateTrimbarPositions(
                this.trimbars.left.x,
                this.trimbars.right.x,
                this.waveformCanvas.width
            );
            
            // Call callback if set
            if (this.onTrimbarChange) {
                this.onTrimbarChange(this.currentSample);
            }
        }
    }

    /**
     * Reset trimbars to full sample
     */
    resetTrimbars() {
        if (!this.currentSample) return;
        
        this.trimbars.left.x = 0;
        this.trimbars.right.x = this.waveformCanvas.width;
        
        this.currentSample.resetTrimbars(this.waveformCanvas.width);
        this.notifyTrimbarChange();
    }

    /**
     * Start animation loop for drawing trimbars
     */
    startAnimation() {
        const animate = () => {
            this.drawTrimbars();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Stop animation loop
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Clear visualization
     */
    clear() {
        this.currentSample = null;
        this.peaks = null;
        
        this.waveformCtx.fillStyle = '#000000';
        this.waveformCtx.fillRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
        
        this.trimbarCtx.clearRect(0, 0, this.trimbarCanvas.width, this.trimbarCanvas.height);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAnimation();
        this.clear();
    }
}

