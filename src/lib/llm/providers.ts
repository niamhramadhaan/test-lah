/**
 * Provider registry — defines all supported LLM providers and their metadata.
 *
 * Providers fall into two categories:
 * 1. Native SDK providers (openai, google, anthropic) — use their dedicated AI SDK package
 * 2. OpenAI-compatible providers (deepseek, xiaomi, custom) — use createOpenAI with custom baseURL
 */

export type ProviderType = "native" | "openai-compatible";

export interface ProviderDef {
  id: string;
  name: string;
  type: ProviderType;
  description: string;
  logoUrl: string;
  keyUrl: string;
  keyPlaceholder: string;
  color: string;
  /** For native providers: the AI SDK provider package name. For compatible: always 'openai' */
  sdkProvider: "openai" | "google" | "anthropic";
  /** Default baseURL for openai-compatible providers */
  baseURL?: string;
  /** Default model ID */
  defaultModel: string;
  /** Popular models to suggest */
  popularModels: string[];
  /** Whether this provider requires a custom baseURL from the user */
  requiresBaseURL?: boolean;
}

export const PROVIDER_REGISTRY: Record<string, ProviderDef> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    type: "native",
    description:
      "GPT models powering ChatGPT. Industry-leading language understanding.",
    logoUrl:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-...",
    color: "#10A37F",
    sdkProvider: "openai",
    defaultModel: "gpt-4o-mini",
    popularModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  google: {
    id: "google",
    name: "Google Gemini",
    type: "native",
    description: "Google's multimodal AI with strong reasoning capabilities.",
    logoUrl:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlegemini.svg",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIza...",
    color: "#4285F4",
    sdkProvider: "google",
    defaultModel: "gemini-2.5-flash",
    popularModels: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    type: "native",
    description: "Claude models — safe, steerable, and highly capable.",
    logoUrl:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/anthropic.svg",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyPlaceholder: "sk-ant-...",
    color: "#D97706",
    sdkProvider: "anthropic",
    defaultModel: "claude-sonnet-4-20250514",
    popularModels: [
      "claude-sonnet-4-20250514",
      "claude-haiku-4-20250514",
      "claude-3-5-sonnet-20241022",
    ],
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    type: "openai-compatible",
    description:
      "High-performance open-source models with competitive reasoning.",
    logoUrl:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/deepseek.svg",
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyPlaceholder: "sk-...",
    color: "#4D6BFE",
    sdkProvider: "openai",
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    popularModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  xiaomi: {
    id: "xiaomi",
    name: "Xiaomi (MiMo)",
    type: "openai-compatible",
    description: "Xiaomi's MiMo models — OpenAI-compatible API.",
    logoUrl:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/xiaomi.svg",
    keyUrl: "https://platform.xiaomimimo.com/",
    keyPlaceholder: "tp-...",
    color: "#FF6900",
    sdkProvider: "openai",
    baseURL: "https://token-plan-sgp.xiaomimimo.com/v1",
    defaultModel: "mimo-v2.5",
    popularModels: ["mimo-v2.5", "mimo-v2.5-pro"],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    type: "openai-compatible",
    description:
      "Unified gateway to 200+ models — Claude, Llama, Mistral, Gemini, and more.",
    logoUrl:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openrouter.svg",
    keyUrl: "https://openrouter.ai/keys",
    keyPlaceholder: "sk-or-...",
    color: "#6366F1",
    sdkProvider: "openai",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/free",
    popularModels: [
      "openrouter/free",
      "meta-llama/llama-4-maverick:free",
      "google/gemini-2.5-flash:free",
      "deepseek/deepseek-chat-v3-0324:free",
      "mistralai/mistral-small-3.2-24b:free",
      "qwen/qwen3-235b-a22b:free",
      "microsoft/phi-4-reasoning-plus:free",
    ],
  },
  custom: {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    type: "openai-compatible",
    description:
      "Any OpenAI-compatible API — Ollama, LM Studio, vLLM, LiteLLM, etc.",
    logoUrl: "",
    keyUrl: "",
    keyPlaceholder: "sk-... or any key",
    color: "#6B7280",
    sdkProvider: "openai",
    defaultModel: "",
    popularModels: [],
    requiresBaseURL: true,
  },
};

/** Ordered list for display in the UI */
export const PROVIDER_LIST = Object.values(PROVIDER_REGISTRY);

/** Get provider definition by ID, falls back to custom if unknown */
export function getProviderDef(id: string): ProviderDef {
  return PROVIDER_REGISTRY[id] ?? PROVIDER_REGISTRY.custom;
}
