"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  TOMATO_ADMIN_OWNER_ID,
  TOMATO_ADMIN_GUEST_OWNER_ID,
  canonicalTomatoOwnerId,
  mergeTomatoDocuments,
  tomatoOwnerAliases,
} = require("../dashboard/owner");

function snapshot(documents) {
  return {
    docs: documents.map(({ id, data }) => ({ id, data: () => data })),
  };
}

test("Daybird dashboard canonicalizes the Tomato guest owner and keeps its aliases", () => {
  assert.equal(canonicalTomatoOwnerId(TOMATO_ADMIN_GUEST_OWNER_ID), TOMATO_ADMIN_OWNER_ID);
  assert.deepEqual(tomatoOwnerAliases(TOMATO_ADMIN_GUEST_OWNER_ID), [
    TOMATO_ADMIN_OWNER_ID,
    TOMATO_ADMIN_GUEST_OWNER_ID,
  ]);
});

test("dashboard source gives canonical workout documents precedence over guest history", () => {
  const rows = mergeTomatoDocuments([
    snapshot([{ id: "2026-07-17", data: { lKcal: 620 } }]),
    snapshot([
      { id: "2026-07-17", data: { running: true, runDistance: 5 } },
      { id: "2026-07-16", data: { bKcal: 400 } },
    ]),
  ], (document) => ({ id: document.id, ...document.data() }));

  assert.deepEqual(rows, [
    { id: "2026-07-17", lKcal: 620 },
    { id: "2026-07-16", bKcal: 400 },
  ]);
});
