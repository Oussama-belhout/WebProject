/**
 * Preset loading helpers inspired by the teacher's procedural style.
 * We use module-level state, promise arrays, and plain functions instead of classes.
 */

const presetState = {
    serverURL: '',
    presets: [],
    currentPreset: null
};

/**
 * Initialise server URL (removing trailing slash and defaulting to window origin).
 * @param {string|null} serverURL
 */
function init(serverURL = null) {
    const hasWindow = typeof window !== 'undefined' && window.location;
    const fallbackURL = hasWindow ? window.location.origin : 'http://localhost:3000';
    const resolvedURL = serverURL ?? fallbackURL;

    presetState.serverURL = resolvedURL === ''
        ? ''
        : String(resolvedURL).replace(/\/$/, '');
}

/**
 * Fetch all presets from the API using a promise array and Promise.all (teacher style).
 * @param {string|null} serverURLOverride
 * @returns {Promise<Array>}
 */
async function fetchPresets(serverURLOverride = null) {
    if (serverURLOverride !== null) {
        init(serverURLOverride);
    } else if (!presetState.serverURL) {
        init();
    }

    try {
        const endpoint = resolveURL('api/presets');
        const promiseArray = [];

        promiseArray.push(
            fetch(endpoint).then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
        );

        const [presetList] = await Promise.all(promiseArray);
        presetState.presets = presetList;

        console.log(`[PresetManager] Loaded ${presetState.presets.length} presets`, presetState.presets.map(p => p.name));
        return presetState.presets;
    } catch (error) {
        console.error('[PresetManager] Failed to fetch presets:', error);
        console.warn('[PresetManager] Falling back to Wikipedia samples');
        presetState.presets = getFallbackPresets();
        return presetState.presets;
    }
}

/**
 * Return preset object by name.
 * @param {string} presetName
 */
function getPreset(presetName) {
    const preset = presetState.presets.find(p => p.name === presetName);
    if (preset) {
        presetState.currentPreset = preset;
        return preset;
    }
    console.warn(`[PresetManager] Preset "${presetName}" not found`);
    return null;
}

/**
 * Build absolute URLs for each sample (keeps teacher-style procedural spirit).
 * @param {object} preset
 */
function buildSampleURLs(preset) {
    if (!preset || !preset.samples) {
        console.error('[PresetManager] Invalid preset object');
        return [];
    }

    return preset.samples.map((sample, index) => {
        const relativePath = sample.url.replace(/^\.\//, '');
        const absoluteURL = resolveURL(`presets/${relativePath}`);
        const encodedURL = encodeURI(absoluteURL);

        return {
            url: encodedURL,
            name: sample.name || `Sample ${index + 1}`,
            index
        };
    });
}

/**
 * Load preset by name and return enriched sample information.
 * @param {string} presetName
 */
function loadPreset(presetName) {
    const preset = getPreset(presetName);
    if (!preset) {
        console.error(`[PresetManager] Cannot load preset: ${presetName}`);
        return [];
    }

    console.log(`[PresetManager] Loading preset: ${presetName}`);
    return buildSampleURLs(preset);
}

function getPresetNames() {
    return presetState.presets.map(p => p.name);
}

function getPresetMetadata(presetName) {
    const preset = getPreset(presetName);
    if (!preset) return null;

    return {
        name: preset.name,
        type: preset.type || 'Unknown',
        sampleCount: Array.isArray(preset.samples) ? preset.samples.length : 0,
        isFactory: preset.isFactoryPresets || false
    };
}

/**
 * Fallback preset content used when the server cannot be reached.
 */
function getFallbackPresets() {
    return [{
        name: 'Wikipedia Drum Kit',
        type: 'Drumkit',
        isFactoryPresets: false,
        samples: [
            { 
                url: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Hardstyle_kick.wav', 
                name: 'Hardstyle Kick' 
            },
            { 
                url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c7/Redoblante_de_marcha.ogg/Redoblante_de_marcha.ogg.mp3', 
                name: 'Marching Snare' 
            },
            { 
                url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c9/Hi-Hat_Cerrado.ogg/Hi-Hat_Cerrado.ogg.mp3', 
                name: 'Closed Hi-Hat' 
            },
            { 
                url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/0/07/Hi-Hat_Abierto.ogg/Hi-Hat_Abierto.ogg.mp3', 
                name: 'Open Hi-Hat' 
            },
            { 
                url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3c/Tom_Agudo.ogg/Tom_Agudo.ogg.mp3', 
                name: 'High Tom' 
            },
            { 
                url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/a4/Tom_Medio.ogg/Tom_Medio.ogg.mp3', 
                name: 'Mid Tom' 
            },
            { 
                url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8d/Tom_Grave.ogg/Tom_Grave.ogg.mp3', 
                name: 'Low Tom' 
            },
            { 
                url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/68/Crash.ogg/Crash.ogg.mp3', 
                name: 'Crash Cymbal' 
            },
            { 
                url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/24/Ride.ogg/Ride.ogg.mp3', 
                name: 'Ride Cymbal' 
            }
        ]
    }];
}

/**
 * Check server availability with a HEAD request (keeps procedural flow).
 */
async function checkServerStatus() {
    try {
        const endpoint = resolveURL('api/presets');
        const promiseArray = [
            fetch(endpoint, {
                method: 'HEAD',
                timeout: 3000
            })
        ];
        const [response] = await Promise.all(promiseArray);
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Resolve a path against the configured server URL (teacher-style helper).
 * @param {string} pathname
 */
function resolveURL(pathname) {
    if (!pathname) {
        return presetState.serverURL || '';
    }

    const normalizedPath = pathname.startsWith('/')
        ? pathname
        : `/${pathname}`;

    if (presetState.serverURL) {
        return `${presetState.serverURL}${normalizedPath}`;
    }

    if (typeof window !== 'undefined' && window.location) {
        const origin = window.location.origin.replace(/\/$/, '');
        return `${origin}${normalizedPath}`;
    }

    return normalizedPath;
}

export const PresetManager = {
    init,
    fetchPresets,
    loadPreset,
    getPreset,
    getPresetNames,
    getPresetMetadata,
    getFallbackPresets,
    checkServerStatus,
    resolveURL,
    get currentPreset() {
        return presetState.currentPreset;
    },
    get presets() {
        return presetState.presets;
    }
};

export default PresetManager;

