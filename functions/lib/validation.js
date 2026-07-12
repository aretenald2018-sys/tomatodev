"use strict";

const MAX_GEMINI_REQUEST_BYTES = 8 * 1024 * 1024;
const MAX_GEMINI_OUTPUT_TOKENS = 8192;
const MAX_OCR_BASE64_LENGTH = 10 * 1024 * 1024;

function invalid(message) {
  const error = new Error(message);
  error.code = "invalid-argument";
  throw error;
}

function validateGeminiRequest(data = {}) {
  const { parts, maxTokens = 2000, responseMimeType } = data || {};
  if (!Array.isArray(parts) || parts.length === 0) invalid("parts 배열이 필요합니다.");
  if (Buffer.byteLength(JSON.stringify(parts), "utf8") > MAX_GEMINI_REQUEST_BYTES) invalid("요청 크기가 너무 큽니다.");

  const parsedMaxTokens = Number(maxTokens);
  const generationConfig = {
    maxOutputTokens: Number.isFinite(parsedMaxTokens)
      ? Math.max(1, Math.min(Math.trunc(parsedMaxTokens), MAX_GEMINI_OUTPUT_TOKENS))
      : 2000,
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (typeof responseMimeType === "string" && responseMimeType.trim()) {
    generationConfig.responseMimeType = responseMimeType.trim();
  }
  return { parts, generationConfig, wantJSON: generationConfig.responseMimeType === "application/json" };
}

function validateOcrRequest(data = {}) {
  const { imageBase64 } = data || {};
  if (typeof imageBase64 !== "string" || imageBase64.length < 100) invalid("imageBase64가 필요합니다.");
  if (imageBase64.length > MAX_OCR_BASE64_LENGTH) invalid("이미지가 너무 큽니다.");
  return { imageBase64 };
}

module.exports = {
  MAX_GEMINI_OUTPUT_TOKENS,
  MAX_GEMINI_REQUEST_BYTES,
  MAX_OCR_BASE64_LENGTH,
  validateGeminiRequest,
  validateOcrRequest,
};
