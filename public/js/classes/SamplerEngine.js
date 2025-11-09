import Sample from './Sample.js';

/**
 * SamplerEngine rewritten in a procedural style (module-level state + functions)
 * to mimic the teacher's approach with explicit promise arrays.
 */

const engineState = {
    audioContext: null,
    masterGain: null,
    samples: [],
    activeSources: new Map()
};

function init(audioContext = null) {
    engineState.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();

    engineState.masterGain = engineState.audioContext.createGain();
    engineState.masterGain.gain.value = 0.8;
    engineState.masterGain.connect(engineState.audioContext.destination);

    engineState.samples = [];
    engineState.activeSources.clear();

    console.log('[SamplerEngine] Engine initialised (teacher style)');
}

async function loadSamples(sampleData, progressCallback = null) {
    console.log(`[SamplerEngine] Loading ${sampleData.length} samples with promiseArray...`);

    engineState.samples = sampleData.map(data => new Sample(data.url, data.name, data.index));

    const promiseArray = [];

    engineState.samples.forEach((sample, index) => {
        console.log(`[SamplerEngine] Queued sample ${sample.name} (${sample.url})`);

        const samplePromise = fetch(sample.url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => engineState.audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                sample.setBuffer(audioBuffer);
                if (progressCallback) {
                    progressCallback(index, sample, null);
                }
                return sample;
            })
            .catch(error => {
                console.error(`[SamplerEngine] Failed to load ${sample.name}:`, error);
                if (progressCallback) {
                    progressCallback(index, sample, error);
                }
                return sample;
            });

        promiseArray.push(samplePromise);
    });

    await Promise.all(promiseArray);

    console.log(`[SamplerEngine] Loaded ${getLoadedCount()}/${engineState.samples.length} samples`);
    return engineState.samples;
}

function playSample(index) {
    const sample = engineState.samples[index];

    if (!sample || !sample.isLoaded) {
        console.warn(`[SamplerEngine] Cannot play sample ${index}: not loaded`);
        return false;
    }

    if (engineState.audioContext.state === 'suspended') {
        engineState.audioContext.resume();
    }

    stopSample(index);

    const bufferSource = buildAudioGraph(sample.buffer);
    engineState.activeSources.set(index, bufferSource);

    const startTime = sample.getStartTime();
    const endTime = sample.getEndTime();
    const duration = endTime - startTime;

    bufferSource.start(0, startTime, duration);
    bufferSource.onended = () => {
        engineState.activeSources.delete(index);
    };

    return true;
}

function stopSample(index) {
    const source = engineState.activeSources.get(index);
    if (source) {
        try {
            source.stop();
            source.disconnect();
        } catch (e) {
            // already stopped
        }
        engineState.activeSources.delete(index);
    }
}

function stopAll() {
    for (const [index, source] of engineState.activeSources) {
        try {
            source.stop();
            source.disconnect();
        } catch (e) {
            // already stopped
        }
    }
    engineState.activeSources.clear();
}

function buildAudioGraph(buffer) {
    const bufferSource = engineState.audioContext.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.connect(engineState.masterGain);
    return bufferSource;
}

function setMasterVolume(volume) {
    const clamped = Math.max(0, Math.min(1, volume));
    engineState.masterGain.gain.value = clamped;
}

function getMasterVolume() {
    return engineState.masterGain.gain.value;
}

function getSample(index) {
    return engineState.samples[index] || null;
}

function getAllSamples() {
    return engineState.samples;
}

function getLoadedCount() {
    return engineState.samples.filter(sample => sample.isLoaded).length;
}

function isPlaying(index) {
    return engineState.activeSources.has(index);
}

function destroy() {
    stopAll();
    if (engineState.masterGain) {
        engineState.masterGain.disconnect();
    }
    if (engineState.audioContext && engineState.audioContext.state !== 'closed') {
        engineState.audioContext.close();
    }
}

function getStatus() {
    return {
        sampleRate: engineState.audioContext?.sampleRate ?? 0,
        contextState: engineState.audioContext?.state ?? 'unknown',
        totalSamples: engineState.samples.length,
        loadedSamples: getLoadedCount(),
        activeSources: engineState.activeSources.size,
        masterVolume: getMasterVolume()
    };
}

export const SamplerEngine = {
    init,
    loadSamples,
    playSample,
    stopSample,
    stopAll,
    setMasterVolume,
    getMasterVolume,
    getSample,
    getAllSamples,
    getLoadedCount,
    isPlaying,
    destroy,
    getStatus
};

export default SamplerEngine;

