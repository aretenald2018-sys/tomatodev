"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateGeminiRequest, validateOcrRequest } = require("../lib/validation");

test("Gemini validation bounds tokens and preserves JSON mode", () => {
  const result = validateGeminiRequest({
    parts: [{ text: "hello" }],
    maxTokens: 99_999,
    responseMimeType: " application/json ",
  });
  assert.equal(result.generationConfig.maxOutputTokens, 8192);
  assert.equal(result.generationConfig.responseMimeType, "application/json");
  assert.equal(result.wantJSON, true);
});

test("Gemini validation rejects an empty parts list", () => {
  assert.throws(() => validateGeminiRequest({ parts: [] }), /parts 배열/);
});

test("OCR validation owns image envelope limits", () => {
  const imageBase64 = "a".repeat(100);
  assert.deepEqual(validateOcrRequest({ imageBase64 }), { imageBase64 });
  assert.throws(() => validateOcrRequest({ imageBase64: "tiny" }), /imageBase64/);
});
