"use strict";

function buildNotificationTitle(data = {}) {
  switch (data.type) {
    case "friend_request": return "🤝 새 이웃 요청";
    case "friend_accepted": return "🤝 이웃이 되었어요";
    case "guestbook": return "📝 새 방명록";
    case "guestbook_reply": return "💬 방명록 답글";
    case "like":
    case "reaction": return "❤️ 새 리액션";
    case "comment": return "💬 새 댓글";
    case "comment_reply": return "💬 새 답글";
    case "tomato_gift": return "🍅 토마토 선물";
    case "patchnote": return "📋 새 패치노트";
    case "announcement": return "📢 운영자 공지";
    case "direct_message": return data.title || "📬 개별 메시지";
    case "introduce": return "👋 이웃 소개";
    case "letter": return "✉️ 새 편지";
    case "guild_join_request": return "🏠 길드원 확인 요청";
    case "guild_join_approved": return "🏠 길드 가입 승인";
    case "guild_member_joined": return "🏠 새 길드원";
    case "guild_invite": return "🏠 길드 초대";
    default: return "🍅 토마토팜 알림";
  }
}

function buildMulticastMessage(data, tokens) {
  return {
    tokens,
    notification: { title: buildNotificationTitle(data), body: data.message || "" },
    data: {
      notifId: data.id || "",
      type: data.type || "",
      section: data.section || "",
    },
    android: {
      priority: "high",
      notification: { channelId: "tomatofarm_default", icon: "ic_launcher" },
    },
    webpush: {
      headers: { Urgency: "high" },
      notification: {
        icon: "/tomatofarm/icon-192.png",
        badge: "/tomatofarm/icon-192.png",
      },
    },
  };
}

function collectExpiredTokens(result, tokens) {
  return (result?.responses || []).flatMap((response, index) => {
    const code = response?.error?.code;
    const expired = !response?.success && (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    );
    return expired && tokens[index] ? [tokens[index]] : [];
  });
}

module.exports = { buildMulticastMessage, buildNotificationTitle, collectExpiredTokens };
