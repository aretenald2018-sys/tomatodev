"use strict";

const {
  DASHBOARD_DOMAINS,
  clamp,
  normalizeDomainScore,
  round,
} = require("./contract");

const DAY_MS = 24 * 60 * 60 * 1000;

function targetProgressScore(actual, target) {
  const measured = Number(actual);
  const goal = Number(target);
  if (!Number.isFinite(measured) || !Number.isFinite(goal) || measured < 0 || goal <= 0) return null;
  if (measured <= goal) return normalizeDomainScore((measured / goal) * 100);
  return normalizeDomainScore(100 - ((measured - goal) / goal) * 100);
}

function ceilingTargetScore(actual, target) {
  const measured = Number(actual);
  const goal = Number(target);
  if (!Number.isFinite(measured) || !Number.isFinite(goal) || measured < 0 || goal <= 0) return null;
  if (measured <= goal) return 100;
  return normalizeDomainScore(100 - ((measured - goal) / goal) * 100);
}

function ratioScore(actual, target) {
  const measured = Number(actual);
  const goal = Number(target);
  if (!Number.isFinite(measured) || !Number.isFinite(goal) || measured < 0 || goal <= 0) return null;
  return normalizeDomainScore((measured / goal) * 100);
}

function trendScore(current, previous, options = {}) {
  const next = Number(current);
  const before = Number(previous);
  if (!Number.isFinite(next) || !Number.isFinite(before) || before <= 0) return null;
  const direction = options.lowerIsBetter ? -1 : 1;
  const percentChange = ((next - before) / before) * 100 * direction;
  return normalizeDomainScore(50 + percentChange * 2);
}

function mixedScore(goal, trend, goalWeight = 0.8) {
  const goalScore = normalizeDomainScore(goal);
  const trendValue = normalizeDomainScore(trend);
  if (goalScore == null) return null;
  if (trendValue == null) return goalScore;
  return normalizeDomainScore(goalScore * goalWeight + trendValue * (1 - goalWeight));
}

function freshnessStatus(updatedAtEpochMs, nowEpochMs = Date.now()) {
  const updatedAt = Number(updatedAtEpochMs);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return "missing";
  const age = Math.max(0, Number(nowEpochMs) - updatedAt);
  if (age <= DAY_MS) return "fresh";
  if (age <= DAY_MS * 7) return "delayed";
  return "stale";
}

function computeOverallScore(domains, weights) {
  const available = DASHBOARD_DOMAINS.filter((domain) => {
    const item = domains?.[domain];
    return item && item.score != null && item.freshness !== "stale" && Number.isFinite(Number(item.score));
  });
  const availableWeight = available.reduce((sum, domain) => sum + Number(weights?.[domain] || 0), 0);
  if (available.length < 3 || availableWeight < 60) {
    return {
      score: null,
      coverage: { availableDomains: available, availableWeight, requiredDomains: 3, requiredWeight: 60 },
    };
  }
  const weighted = available.reduce((sum, domain) => (
    sum + Number(domains[domain].score) * Number(weights[domain] || 0)
  ), 0);
  return {
    score: round(weighted / availableWeight),
    coverage: { availableDomains: available, availableWeight, requiredDomains: 3, requiredWeight: 60 },
  };
}

module.exports = {
  DAY_MS,
  ceilingTargetScore,
  computeOverallScore,
  freshnessStatus,
  mixedScore,
  ratioScore,
  targetProgressScore,
  trendScore,
};
