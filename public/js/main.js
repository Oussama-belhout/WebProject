import { SamplerEngine } from './classes/SamplerEngine.js';
import SamplerGUI from './classes/SamplerGUI.js';
import { PresetManager } from './classes/PresetManager.js';

const appState = {
    elements: {},
    gui: null
};

function cacheDOMElements() {
    appState.elements = {
        presetSelector: document.getElementById('presetSelector'),
        loadPresetBtn: document.getElementById('loadPresetBtn'),
        masterVolume: document.getElementById('masterVolume'),
        volumeDisplay: document.getElementById('volumeDisplay'),
        loadingStatus: document.getElementById('loadingStatus'),
        statusIndicator: document.getElementById('statusIndicator'),
        padMatrix: document.getElementById('padMatrix'),
        waveformCanvas: document.getElementById('waveformCanvas'),
        trimbarCanvas: document.getElementById('trimbarCanvas'),
        selectedSampleName: document.getElementById('selectedSampleName'),
        sampleDuration: document.getElementById('sampleDuration'),
        trimStartTime: document.getElementById('trimStartTime'),
        trimEndTime: document.getElementById('trimEndTime'),
        selectionDuration: document.getElementById('selectionDuration'),
        resetTrimbarsBtn: document.getElementById('resetTrimbarsBtn')
    };
}

function populatePresetSelector(presets) {
    const selector = appState.elements.presetSelector;
    selector.innerHTML = '<option value="">Select a preset...</option>';

    presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.name;
        option.textContent = `${preset.name} (${preset.samples.length} samples)`;
        selector.appendChild(option);
    });

    selector.disabled = false;
    appState.elements.loadPresetBtn.disabled = false;
}

async function loadPreset(presetName) {
    if (!presetName) {
        console.warn('[App] No preset selected');
        return;
    }

    try {
        console.log(`[App] Loading preset: ${presetName}`);
        updateStatus(`Loading ${presetName}...`, 'loading');

        const sampleData = PresetManager.loadPreset(presetName);
        if (sampleData.length === 0) {
            throw new Error('No samples found in preset');
        }

        const progressCallback = (index, sample, error) => {
            appState.gui.updatePadAfterLoad(index, sample, error);
            const loaded = SamplerEngine.getLoadedCount();
            const total = sampleData.length;
            const percentage = Math.round((loaded / total) * 100);
            updateStatus(`Loading samples... ${loaded}/${total} (${percentage}%)`, 'loading');
        };

        await SamplerEngine.loadSamples(sampleData, progressCallback);

        const loadedCount = SamplerEngine.getLoadedCount();
        const totalCount = sampleData.length;

        if (loadedCount === totalCount) {
            updateStatus(`✅ Loaded ${loadedCount} samples successfully!`, 'ready');
        } else {
            updateStatus(`⚠️ Loaded ${loadedCount}/${totalCount} samples (${totalCount - loadedCount} failed)`, 'ready');
        }
    } catch (error) {
        console.error('[App] Error loading preset:', error);
        updateStatus(`Error: ${error.message}`, 'error');
    }
}

function setupEventHandlers() {
    appState.elements.loadPresetBtn.addEventListener('click', () => {
        loadPreset(appState.elements.presetSelector.value);
    });

    appState.elements.presetSelector.addEventListener('change', (event) => {
        if (event.target.value) {
            loadPreset(event.target.value);
        }
    });

    appState.elements.masterVolume.addEventListener('input', (event) => {
        const volume = parseInt(event.target.value, 10);
        appState.gui.setMasterVolume(volume);
    });

    appState.elements.resetTrimbarsBtn.addEventListener('click', () => {
        appState.gui.resetTrimbars();
    });

    appState.elements.trimbarCanvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
}

function updateStatus(message, state) {
    appState.elements.loadingStatus.textContent = message;
    appState.elements.statusIndicator.className = `status-indicator ${state}`;
}

async function initApplication() {
    console.log('[App] Initialising (teacher style)');
    cacheDOMElements();
    updateStatus('Fetching presets from server...', 'loading');

    const presets = await PresetManager.fetchPresets();
    populatePresetSelector(presets);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    SamplerEngine.init(audioContext);

    appState.gui = new SamplerGUI(SamplerEngine, appState.elements);
    appState.gui.createPadMatrix();
    appState.gui.enableKeyboardSupport();

    setupEventHandlers();

    if (presets.length > 0) {
        const firstPreset = presets[0].name;
        appState.elements.presetSelector.value = firstPreset;
        await loadPreset(firstPreset);
    } else {
        updateStatus('No presets available', 'error');
    }

    if (presets.length > 0) {
        updateStatus('Ready to play!', 'ready');
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await initApplication();
    window.samplerApp = {
        state: appState,
        engine: SamplerEngine,
        presets: PresetManager,
        loadPreset
    };

    console.log('[App] Started with teacher-inspired flow');
    console.log('Keyboard controls:');
    console.log('  Bottom row: Z X C V');
    console.log('  Row 2:      A S D F');
    console.log('  Row 3:      Q W E R');
    console.log('  Top row:    1 2 3 4');
});

window.addEventListener('error', (event) => {
    console.error('[App] Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[App] Unhandled promise rejection:', event.reason);
});


