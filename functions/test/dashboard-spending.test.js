"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spendingDomain } = require("../dashboard/aggregate");

const at = (value) => new Date(`${value}T12:00:00+09:00`);

test("spending comparison is actual month-to-date versus last month through the same day", () => {
  const result = spendingDomain({
    categories: [
      { id: "rent", kind: "expense", budgetRhythm: "fixed", target: 100000 },
      { id: "food", kind: "expense", budgetRhythm: "spread", target: 600000, monthlyTargets: { "2026-07": 600000 } },
    ],
    transactions: [
      { type: "card_payment", categoryId: "rent", amount: 100000, occurredAt: at("2026-07-01") },
      { type: "card_payment", categoryId: "food", amount: 50000, occurredAt: at("2026-07-10") },
      { type: "card_payment", categoryId: "food", amount: 999000, occurredAt: at("2026-07-17") },
      { type: "card_payment", categoryId: "food", amount: 700000, occurredAt: at("2026-07-12"), excludedFromBudget: true },
      { type: "card_payment", categoryId: "rent", amount: 80000, occurredAt: at("2026-06-01") },
      { type: "card_payment", categoryId: "food", amount: 20000, occurredAt: at("2026-06-10") },
      { type: "transfer_out", categoryId: "food", amount: 10000, occurredAt: at("2026-06-16") },
      { type: "card_payment", categoryId: "food", amount: 555000, occurredAt: at("2026-06-17") },
    ],
  }, at("2026-07-16").getTime());

  assert.equal(result.monthSpent, 150000);
  assert.equal(result.controlMonthSpent, 50000);
  assert.equal(result.previousSamePeriodSpent, 110000);
  assert.equal(result.samePeriodDifference, -40000);
  assert.equal(result.samePeriodChangePct, 36.4);
  assert.equal(result.currentCumulativeTrend.at(-1), 150000);
  assert.equal(result.previousCumulativeTrend.at(-1), 110000);
});
