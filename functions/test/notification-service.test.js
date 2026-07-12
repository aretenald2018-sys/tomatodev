"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildMulticastMessage, buildNotificationTitle, collectExpiredTokens } = require("../lib/notification-provider");
const { deliverNotification } = require("../services/notification-service");

test("notification provider owns title and platform payload contracts", () => {
  assert.equal(buildNotificationTitle({ type: "comment" }), "💬 새 댓글");
  assert.equal(buildNotificationTitle({ type: "direct_message", title: "개별 공지" }), "개별 공지");
  const message = buildMulticastMessage({ id: "n1", type: "comment", section: "diet", message: "hi" }, ["token"]);
  assert.deepEqual(message.tokens, ["token"]);
  assert.equal(message.android.notification.channelId, "tomatofarm_default");
  assert.equal(message.webpush.notification.icon, "/tomatofarm/icon-192.png");
});

test("notification provider isolates expired-token classification", () => {
  const expired = collectExpiredTokens({ responses: [
    { success: true },
    { success: false, error: { code: "messaging/registration-token-not-registered" } },
    { success: false, error: { code: "messaging/internal-error" } },
  ] }, ["ok", "expired", "retry"]);
  assert.deepEqual(expired, ["expired"]);
});

test("notification service sends and removes only expired token documents", async () => {
  const deleted = [];
  let committed = false;
  const docs = [
    { ref: "ref-ok", data: () => ({ token: "ok" }) },
    { ref: "ref-expired", data: () => ({ token: "expired" }) },
  ];
  const db = {
    collection: () => ({ where: () => ({ get: async () => ({ empty: false, docs }) }) }),
    batch: () => ({
      delete: ref => deleted.push(ref),
      commit: async () => { committed = true; },
    }),
  };
  const messaging = {
    sendEachForMulticast: async () => ({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: "messaging/invalid-registration-token" } },
      ],
    }),
  };
  const logs = [];

  const result = await deliverNotification({
    db,
    messaging,
    data: { to: "user", type: "comment", message: "hi" },
    logger: { log: value => logs.push(value) },
  });

  assert.deepEqual(result, { sent: 1, failed: 1, removedTokens: 1 });
  assert.deepEqual(deleted, ["ref-expired"]);
  assert.equal(committed, true);
  assert.equal(logs.length, 1);
});
