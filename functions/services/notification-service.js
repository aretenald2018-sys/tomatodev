"use strict";

const { buildMulticastMessage, collectExpiredTokens } = require("../lib/notification-provider");

async function deliverNotification({ db, messaging, data, logger = console }) {
  if (!data?.to) return { skipped: "missing-recipient" };

  const tokensSnap = await db.collection("_fcm_tokens")
    .where("userId", "==", data.to)
    .get();
  if (tokensSnap.empty) return { skipped: "no-token-documents" };

  const tokens = tokensSnap.docs.map(doc => doc.data().token).filter(Boolean);
  if (tokens.length === 0) return { skipped: "no-valid-tokens" };

  const result = await messaging.sendEachForMulticast(buildMulticastMessage(data, tokens));
  const failedTokens = collectExpiredTokens(result, tokens);
  if (failedTokens.length > 0) {
    const failed = new Set(failedTokens);
    const batch = db.batch();
    tokensSnap.docs.forEach(doc => {
      if (failed.has(doc.data().token)) batch.delete(doc.ref);
    });
    await batch.commit();
  }

  logger.log(`[FCM] to=${data.to} type=${data.type} sent=${result.successCount} fail=${result.failureCount}`);
  return { sent: result.successCount, failed: result.failureCount, removedTokens: failedTokens.length };
}

module.exports = { deliverNotification };
