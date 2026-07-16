"use strict";

const DASHBOARD_SCHEMA_VERSION = 1;
const DASHBOARD_DOMAINS = Object.freeze(["food", "health", "running", "spending", "wine"]);
const DEFAULT_DASHBOARD_WEIGHTS = Object.freeze({
  food: 25,
  health: 25,
  running: 20,
  spending: 20,
  wine: 10,
});

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function normalizeDashboardWeights(value = DEFAULT_DASHBOARD_WEIGHTS) {
  const normalized = {};
  for (const domain of DASHBOARD_DOMAINS) {
    const weight = finiteNumber(value?.[domain]);
    if (weight == null || !Number.isInteger(weight) || weight < 0 || weight > 100) {
      throw new TypeError(`invalid dashboard weight: ${domain}`);
    }
    normalized[domain] = weight;
  }
  if (Object.values(normalized).reduce((sum, weight) => sum + weight, 0) !== 100) {
    throw new TypeError("dashboard weights must total 100");
  }
  return normalized;
}

function normalizeDomainScore(value) {
  const number = finiteNumber(value);
  return number == null ? null : round(clamp(number, 0, 100));
}

function validateDashboardSnapshot(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { ok: false, errors: ["snapshot must be an object"] };
  }
  if (snapshot.schemaVersion !== DASHBOARD_SCHEMA_VERSION) errors.push("unsupported schemaVersion");
  if (!Number.isInteger(snapshot.revision) || snapshot.revision < 1) errors.push("revision must be a positive integer");
  if (!Number.isFinite(Number(snapshot.generatedAtEpochMs))) errors.push("generatedAtEpochMs is required");
  try {
    normalizeDashboardWeights(snapshot.weights);
  } catch (error) {
    errors.push(error.message);
  }
  if (!snapshot.domains || typeof snapshot.domains !== "object") {
    errors.push("domains are required");
  } else {
    for (const domain of DASHBOARD_DOMAINS) {
      const value = snapshot.domains[domain];
      if (!value || typeof value !== "object") {
        errors.push(`missing domain: ${domain}`);
        continue;
      }
      if (value.score != null && normalizeDomainScore(value.score) == null) errors.push(`invalid score: ${domain}`);
      if (!["fresh", "delayed", "stale", "missing"].includes(value.freshness)) {
        errors.push(`invalid freshness: ${domain}`);
      }
    }
  }
  if (snapshot.score != null && normalizeDomainScore(snapshot.score) == null) errors.push("invalid overall score");
  return { ok: errors.length === 0, errors };
}

module.exports = {
  DASHBOARD_SCHEMA_VERSION,
  DASHBOARD_DOMAINS,
  DEFAULT_DASHBOARD_WEIGHTS,
  clamp,
  finiteNumber,
  normalizeDashboardWeights,
  normalizeDomainScore,
  round,
  validateDashboardSnapshot,
};
