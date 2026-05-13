export type BrushDynamicsControl =
    | 'off'
    | 'fade'
    | 'pen-pressure'
    | 'pen-tilt'
    | 'stylus-wheel'
    | 'direction'
    | 'initial-direction';

export interface ShapeDynamicsOptions {
    enabled: boolean;
    sizeJitter: number;
    minDiameter: number;
    sizeControl: BrushDynamicsControl;
    sizeFadeSteps: number;
    angleJitter: number;
    angleControl: BrushDynamicsControl;
    angleFadeSteps: number;
    roundnessJitter: number;
    minRoundness: number;
    roundnessControl: BrushDynamicsControl;
    roundnessFadeSteps: number;
}

export interface ScatteringDynamicsOptions {
    enabled: boolean;
    scatter: number;
    bothAxes: boolean;
    count: number;
    countJitter: number;
    control: BrushDynamicsControl;
    fadeSteps: number;
}

export interface TextureDynamicsOptions {
    enabled: boolean;
    pattern: 'checker' | 'dots' | 'paper';
    mode: 'multiply' | 'subtract';
    scale: number;
    depth: number;
    invert: boolean;
    textureEachTip: boolean;
    minDepth: number;
    depthJitter: number;
}

export interface DualBrushDynamicsOptions {
    enabled: boolean;
    diameter: number;
    spacing: number;
    scatter: number;
    count: number;
    mode: 'multiply' | 'overlay' | 'hard-mix';
    flip: boolean;
}

export interface ColorDynamicsOptions {
    enabled: boolean;
    foregroundBackgroundJitter: number;
    control: BrushDynamicsControl;
    fadeSteps: number;
    hueJitter: number;
    saturationJitter: number;
    brightnessJitter: number;
    purity: number;
}

export interface OtherDynamicsOptions {
    enabled: boolean;
    opacityJitter: number;
    flowJitter: number;
    opacityControl: BrushDynamicsControl;
    opacityFadeSteps: number;
    flowControl: BrushDynamicsControl;
    flowFadeSteps: number;
}

export interface BrushDynamicsOptions {
    shape: ShapeDynamicsOptions;
    scattering: ScatteringDynamicsOptions;
    texture: TextureDynamicsOptions;
    dualBrush: DualBrushDynamicsOptions;
    colorDynamics: ColorDynamicsOptions;
    otherDynamics: OtherDynamicsOptions;
}

export type BrushDynamicsOptionsPatch = {
    [K in keyof BrushDynamicsOptions]?: Partial<BrushDynamicsOptions[K]>;
};

export interface BrushDynamicsStampOptions {
    texture?: TextureDynamicsOptions;
    dualBrush?: DualBrushDynamicsOptions;
    seed: number;
}

export interface ResolvedDynamicDab {
    x: number;
    y: number;
    size: number;
    opacity: number;
    flow: number;
    color: { r: number; g: number; b: number };
    dynamics?: BrushDynamicsStampOptions;
}

export interface ResolveBrushDynamicDabsInput {
    x: number;
    y: number;
    baseSize: number;
    opacity: number;
    flow: number;
    primaryColor: string;
    secondaryColor: string;
    dabIndex: number;
    pressure?: number;
    angle?: number;
    dynamics?: BrushDynamicsOptions;
}

const DEFAULT_DYNAMICS: BrushDynamicsOptions = {
    shape: {
        enabled: false,
        sizeJitter: 0,
        minDiameter: 0,
        sizeControl: 'off',
        sizeFadeSteps: 25,
        angleJitter: 0,
        angleControl: 'off',
        angleFadeSteps: 25,
        roundnessJitter: 0,
        minRoundness: 1,
        roundnessControl: 'off',
        roundnessFadeSteps: 25,
    },
    scattering: {
        enabled: false,
        scatter: 0,
        bothAxes: false,
        count: 1,
        countJitter: 0,
        control: 'off',
        fadeSteps: 25,
    },
    texture: {
        enabled: false,
        pattern: 'checker',
        mode: 'multiply',
        scale: 20,
        depth: 0.5,
        invert: false,
        textureEachTip: false,
        minDepth: 0,
        depthJitter: 0,
    },
    dualBrush: {
        enabled: false,
        diameter: 18,
        spacing: 0.25,
        scatter: 0,
        count: 1,
        mode: 'multiply',
        flip: false,
    },
    colorDynamics: {
        enabled: false,
        foregroundBackgroundJitter: 0,
        control: 'off',
        fadeSteps: 25,
        hueJitter: 0,
        saturationJitter: 0,
        brightnessJitter: 0,
        purity: 0,
    },
    otherDynamics: {
        enabled: false,
        opacityJitter: 0,
        flowJitter: 0,
        opacityControl: 'off',
        opacityFadeSteps: 25,
        flowControl: 'off',
        flowFadeSteps: 25,
    },
};

let brushDynamicsOptions: BrushDynamicsOptions = cloneDynamics(DEFAULT_DYNAMICS);

function cloneDynamics(options: BrushDynamicsOptions): BrushDynamicsOptions {
    return {
        shape: { ...options.shape },
        scattering: { ...options.scattering },
        texture: { ...options.texture },
        dualBrush: { ...options.dualBrush },
        colorDynamics: { ...options.colorDynamics },
        otherDynamics: { ...options.otherDynamics },
    };
}

export function getDefaultBrushDynamicsOptions(): BrushDynamicsOptions {
    return cloneDynamics(DEFAULT_DYNAMICS);
}

export function getBrushDynamicsOptions(): BrushDynamicsOptions {
    return cloneDynamics(brushDynamicsOptions);
}

export function setBrushDynamicsOptions(next: BrushDynamicsOptionsPatch): BrushDynamicsOptions {
    brushDynamicsOptions = {
        shape: { ...brushDynamicsOptions.shape, ...next.shape },
        scattering: { ...brushDynamicsOptions.scattering, ...next.scattering },
        texture: { ...brushDynamicsOptions.texture, ...next.texture },
        dualBrush: { ...brushDynamicsOptions.dualBrush, ...next.dualBrush },
        colorDynamics: { ...brushDynamicsOptions.colorDynamics, ...next.colorDynamics },
        otherDynamics: { ...brushDynamicsOptions.otherDynamics, ...next.otherDynamics },
    };
    return getBrushDynamicsOptions();
}

export function resetBrushDynamicsOptions(): void {
    brushDynamicsOptions = cloneDynamics(DEFAULT_DYNAMICS);
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
}

function controlFactor(control: BrushDynamicsControl, dabIndex: number, steps: number, pressure = 1): number {
    if (control === 'fade') {
        const fadeSteps = Math.max(1, steps || 1);
        return clamp01(1 - dabIndex / fadeSteps);
    }
    if (control === 'pen-pressure' || control === 'pen-tilt' || control === 'stylus-wheel') {
        return clamp01(pressure);
    }
    return 1;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000';
    return {
        r: parseInt(normalized.slice(1, 3), 16),
        g: parseInt(normalized.slice(3, 5), 16),
        b: parseInt(normalized.slice(5, 7), 16),
    };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h /= 6;
    }
    return { h, s, l };
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): { r: number; g: number; b: number } {
    const hue2rgb = (p: number, q: number, t0: number) => {
        let t = t0;
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    if (s === 0) {
        const v = Math.round(l * 255);
        return { r: v, g: v, b: v };
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
        r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
        g: Math.round(hue2rgb(p, q, h) * 255),
        b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    };
}

function mixColors(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
    return {
        r: Math.round(a.r + (b.r - a.r) * t),
        g: Math.round(a.g + (b.g - a.g) * t),
        b: Math.round(a.b + (b.b - a.b) * t),
    };
}

function resolveColor(input: ResolveBrushDynamicDabsInput, dynamics: BrushDynamicsOptions, seed: number): { r: number; g: number; b: number } {
    const primary = hexToRgb(input.primaryColor);
    const colorOptions = dynamics.colorDynamics;
    if (!colorOptions?.enabled) return primary;

    const secondary = hexToRgb(input.secondaryColor);
    const control = colorOptions.control === 'fade'
        ? clamp01(input.dabIndex / Math.max(1, colorOptions.fadeSteps))
        : 1;
    const mixAmount = seededRandom(seed + 11) * clamp01(colorOptions.foregroundBackgroundJitter) * control;
    const hsl = rgbToHsl(mixColors(primary, secondary, mixAmount));
    hsl.h = (hsl.h + (seededRandom(seed + 13) * 2 - 1) * clamp01(colorOptions.hueJitter) + 1) % 1;
    hsl.s = clamp01(hsl.s + (seededRandom(seed + 17) * 2 - 1) * clamp01(colorOptions.saturationJitter));
    hsl.l = clamp01(hsl.l + (seededRandom(seed + 19) * 2 - 1) * clamp01(colorOptions.brightnessJitter));
    hsl.s = clamp01(hsl.s + clamp(colorOptions.purity, -1, 1));
    return hslToRgb(hsl);
}

export function resolveBrushDynamicDabs(input: ResolveBrushDynamicDabsInput): ResolvedDynamicDab[] {
    const dynamics = input.dynamics ?? brushDynamicsOptions;
    const pressure = clamp01(input.pressure ?? 1);
    const shape = dynamics.shape;
    const scattering = dynamics.scattering;
    const other = dynamics.otherDynamics;
    const seedBase = input.dabIndex + 1;

    let size = Math.max(0.5, input.baseSize);
    if (shape.enabled) {
        const min = clamp01(shape.minDiameter);
        const sizeControl = controlFactor(shape.sizeControl, input.dabIndex, shape.sizeFadeSteps, pressure);
        const jitter = seededRandom(seedBase + 1) * clamp01(shape.sizeJitter);
        size *= Math.max(min, sizeControl * (1 - jitter));
    }

    let opacity = clamp01(input.opacity);
    let flow = clamp01(input.flow);
    if (other.enabled) {
        opacity *= controlFactor(other.opacityControl, input.dabIndex, other.opacityFadeSteps, pressure);
        flow *= controlFactor(other.flowControl, input.dabIndex, other.flowFadeSteps, pressure);
        opacity *= 1 - seededRandom(seedBase + 23) * clamp01(other.opacityJitter);
        flow *= 1 - seededRandom(seedBase + 29) * clamp01(other.flowJitter);
    }

    const countJitter = scattering.enabled
        ? Math.floor(seededRandom(seedBase + 31) * clamp01(scattering.countJitter) * Math.max(0, scattering.count - 1))
        : 0;
    const count = scattering.enabled ? clamp(Math.round(scattering.count - countJitter), 1, 16) : 1;
    const scatterPx = scattering.enabled ? size * clamp(scattering.scatter, 0, 5) : 0;
    const angle = input.angle ?? 0;
    const normalX = -Math.sin(angle);
    const normalY = Math.cos(angle);
    const dabs: ResolvedDynamicDab[] = [];

    for (let i = 0; i < count; i++) {
        const seed = seedBase * 101 + i * 17;
        const along = (seededRandom(seed + 37) * 2 - 1) * scatterPx;
        const across = (seededRandom(seed + 41) * 2 - 1) * scatterPx;
        const dx = scattering.enabled && scattering.bothAxes
            ? along * Math.cos(angle) + across * normalX
            : across * normalX;
        const dy = scattering.enabled && scattering.bothAxes
            ? along * Math.sin(angle) + across * normalY
            : across * normalY;

        dabs.push({
            x: input.x + dx,
            y: input.y + dy,
            size,
            opacity,
            flow,
            color: resolveColor(input, dynamics, seed),
            dynamics: dynamics.texture.enabled || dynamics.dualBrush.enabled
                ? {
                    texture: dynamics.texture.enabled ? { ...dynamics.texture } : undefined,
                    dualBrush: dynamics.dualBrush.enabled ? { ...dynamics.dualBrush } : undefined,
                    seed,
                }
                : undefined,
        });
    }

    return dabs;
}

function textureValue(x: number, y: number, options: TextureDynamicsOptions, seed: number): number {
    const scale = Math.max(2, options.scale);
    let value = 0;
    if (options.pattern === 'checker') {
        value = (Math.floor(x / scale) + Math.floor(y / scale)) % 2 === 0 ? 1 : 0.25;
    } else if (options.pattern === 'dots') {
        const cx = (x % scale) - scale / 2;
        const cy = (y % scale) - scale / 2;
        value = Math.hypot(cx, cy) < scale * 0.25 ? 1 : 0.35;
    } else {
        value = seededRandom(Math.floor(x / scale) * 31 + Math.floor(y / scale) * 53 + seed);
    }
    return options.invert ? 1 - value : value;
}

function dualBrushValue(x: number, y: number, options: DualBrushDynamicsOptions, seed: number): number {
    const diameter = Math.max(1, options.diameter);
    const spacing = Math.max(0.05, options.spacing);
    const period = Math.max(1, diameter * spacing);
    const offset = options.flip ? diameter * 0.5 : 0;
    const gridX = Math.round((x + offset) / period);
    const gridY = Math.round((y + offset) / period);
    const cx = gridX * period - offset;
    const cy = gridY * period - offset;
    const distance = Math.hypot(x - cx, y - cy);
    const base = distance <= diameter / 2 ? 1 : 0;
    const noise = seededRandom(gridX * 97 + gridY * 131 + seed);
    if (options.mode === 'hard-mix') return base && noise > 0.25 ? 1 : 0;
    if (options.mode === 'overlay') return base ? 0.75 + noise * 0.25 : 0.35;
    return base ? 1 : 0.2;
}

export function brushDynamicsAlphaMultiplier(x: number, y: number, options?: BrushDynamicsStampOptions): number {
    if (!options) return 1;
    let multiplier = 1;
    if (options.texture) {
        const jitter = seededRandom(options.seed + Math.floor(x) * 7 + Math.floor(y) * 11) * clamp01(options.texture.depthJitter);
        const depth = clamp01(options.texture.minDepth + (options.texture.depth - options.texture.minDepth) * (1 - jitter));
        const value = textureValue(x, y, options.texture, options.texture.textureEachTip ? options.seed : 0);
        multiplier *= options.texture.mode === 'subtract'
            ? Math.max(0, 1 - value * depth)
            : Math.max(0, 1 - (1 - value) * depth);
    }
    if (options.dualBrush) {
        multiplier *= dualBrushValue(x, y, options.dualBrush, options.seed);
    }
    return clamp01(multiplier);
}
