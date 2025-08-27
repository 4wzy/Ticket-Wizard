import { GoogleGenAI } from '@google/genai';

// Available AI models with their configurations
export type AIModel = 'gemini-2.5-flash-lite' | 'gemini-2.5-flash';

export interface ModelConfig {
  name: AIModel;
  displayName: string;
  description: string;
  tokensPerRequest: {
    base: number;
    perCharacter: number;
  };
  capabilities: {
    maxTokens: number;
    supportsFiles: boolean;
    supportsStructuredOutput: boolean;
  };
  costMultiplier: number; // Relative cost compared to flash-lite (1.0 = baseline)
}

export const AI_MODELS: Record<AIModel, ModelConfig> = {
  'gemini-2.5-flash-lite': {
    name: 'gemini-2.5-flash-lite',
    displayName: 'Apprentice Magic ⚡',
    description: 'Quick & efficient spells for basic ticket creation',
    tokensPerRequest: {
      base: 50,
      perCharacter: 0.2,
    },
    capabilities: {
      maxTokens: 1048576,
      supportsFiles: true,
      supportsStructuredOutput: true,
    },
    costMultiplier: 1.0,
  },
  'gemini-2.5-flash': {
    name: 'gemini-2.5-flash',
    displayName: 'Archmage Magic 🧙‍♂️',
    description: 'Most powerful spells with deep insights and hybrid reasoning',
    tokensPerRequest: {
      base: 100,
      perCharacter: 0.4,
    },
    capabilities: {
      maxTokens: 1048576,
      supportsFiles: true,
      supportsStructuredOutput: true,
    },
    costMultiplier: 6.25, // Based on $2.50/$0.40 = 6.25x more expensive
  },
};

// Default model for new users
export const DEFAULT_MODEL: AIModel = 'gemini-2.5-flash-lite';

// Get user's selected model from localStorage or default
export function getUserSelectedModel(): AIModel {
  if (typeof window === 'undefined') {
    return DEFAULT_MODEL;
  }
  
  const saved = localStorage.getItem('selectedAIModel');
  if (saved && saved in AI_MODELS) {
    return saved as AIModel;
  }
  
  return DEFAULT_MODEL;
}

// Save user's model selection
export function saveUserSelectedModel(model: AIModel): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedAIModel', model);
  }
}

// Get model configuration
export function getModelConfig(model: AIModel): ModelConfig {
  return AI_MODELS[model];
}

// Create AI client instance
export function createAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
  });
}

// Estimate token usage for a request
export function estimateTokenUsage(
  operation: string,
  textLength: number = 0,
  model: AIModel = DEFAULT_MODEL
): number {
  const config = getModelConfig(model);
  const baseEstimate = config.tokensPerRequest.base + (textLength * config.tokensPerRequest.perCharacter);
  
  // Apply operation-specific multipliers
  const operationMultipliers = {
    'chat': 1.0,
    'refine': 1.5,
    'assess': 1.2,
  };
  
  const multiplier = operationMultipliers[operation as keyof typeof operationMultipliers] || 1.0;
  return Math.ceil(baseEstimate * multiplier);
}

// Calculate the "magic token" cost for display purposes
export function calculateMagicTokenCost(
  estimatedTokens: number,
  model: AIModel
): number {
  const config = getModelConfig(model);
  return Math.ceil(estimatedTokens * config.costMultiplier);
}