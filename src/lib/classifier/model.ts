// The static letter classifier: a small MLP exported by
// training/asl_drill/model.py and run here in plain TypeScript. The forward
// pass must match predict_exported() in Python; both are tested against
// fixtures/classifier/parity.json.

import { FEATURE_COUNT, NORMALIZATION_VERSION } from "@/lib/landmarks/normalize";

export const MODEL_FORMAT = "asl-drill-letter-model";
export const MODEL_VERSION = 1;

interface ExportedLayer {
  inputs: number;
  outputs: number;
  activation: "relu" | "softmax";
  /** float32 little-endian, base64, row-major (inputs × outputs). */
  weights: string;
  bias: string;
}

export interface ExportedModel {
  format: string;
  version: number;
  normalizationVersion: number;
  labels: string[];
  threshold: number;
  layers: ExportedLayer[];
  metadata?: Record<string, unknown>;
}

interface Layer {
  inputs: number;
  outputs: number;
  activation: "relu" | "softmax";
  weights: Float32Array;
  bias: Float32Array;
}

export interface LetterModel {
  labels: readonly string[];
  threshold: number;
  layers: readonly Layer[];
}

export class ModelError extends Error {}

function decodeFloat32(base64: string, expectedLength: number): Float32Array {
  const binary = atob(base64);
  if (binary.length !== expectedLength * 4) throw new ModelError("weight array has the wrong size");
  const view = new DataView(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) view.setUint8(i, binary.charCodeAt(i));
  const values = new Float32Array(expectedLength);
  for (let i = 0; i < expectedLength; i++) values[i] = view.getFloat32(i * 4, true);
  return values;
}

/** Validates an exported model and decodes its weights. */
export function parseModel(data: unknown): LetterModel {
  const model = data as Partial<ExportedModel> | null;
  if (!model || model.format !== MODEL_FORMAT || model.version !== MODEL_VERSION) {
    throw new ModelError("not a supported letter model");
  }
  if (model.normalizationVersion !== NORMALIZATION_VERSION) {
    throw new ModelError("model was trained with a different normalization");
  }
  const labels = model.labels ?? [];
  const exportedLayers = model.layers ?? [];
  let width = FEATURE_COUNT;
  const layers = exportedLayers.map((layer, i) => {
    const last = i === exportedLayers.length - 1;
    if (layer.inputs !== width || layer.activation !== (last ? "softmax" : "relu")) {
      throw new ModelError(`layer ${i} doesn't fit the network`);
    }
    width = layer.outputs;
    return {
      inputs: layer.inputs,
      outputs: layer.outputs,
      activation: layer.activation,
      weights: decodeFloat32(layer.weights, layer.inputs * layer.outputs),
      bias: decodeFloat32(layer.bias, layer.outputs),
    };
  });
  if (layers.length === 0 || width !== labels.length) throw new ModelError("output size doesn't match the labels");
  const threshold = model.threshold ?? NaN;
  if (!(threshold > 0 && threshold < 1)) throw new ModelError("threshold must be between 0 and 1");
  return { labels, threshold, layers };
}

/** Class probabilities (in `model.labels` order) for one 63-value feature vector. */
export function predictProbabilities(model: LetterModel, features: readonly number[]): number[] {
  if (features.length !== FEATURE_COUNT) throw new ModelError(`expected ${FEATURE_COUNT} features`);
  let activations: number[] = [...features];
  for (const layer of model.layers) {
    const next = new Array<number>(layer.outputs);
    for (let j = 0; j < layer.outputs; j++) {
      let sum = layer.bias[j] ?? 0;
      for (let i = 0; i < layer.inputs; i++) sum += (activations[i] ?? 0) * (layer.weights[i * layer.outputs + j] ?? 0);
      next[j] = layer.activation === "relu" ? Math.max(sum, 0) : sum;
    }
    activations = layer.activation === "softmax" ? softmax(next) : next;
  }
  return activations;
}

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}

export interface Prediction {
  letter: string;
  confidence: number;
}

/** The most likely letter, or null when it's below the confidence threshold. */
export function topLetter(model: LetterModel, probabilities: readonly number[], threshold = model.threshold): Prediction | null {
  let best = -1;
  let confidence = -Infinity;
  probabilities.forEach((p, i) => {
    if (p > confidence) {
      confidence = p;
      best = i;
    }
  });
  const letter = model.labels[best];
  return letter !== undefined && confidence >= threshold ? { letter, confidence } : null;
}
