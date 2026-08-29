// 呼叫 LINE Messaging API 推播訊息的共用函式。
// Channel access token 由呼叫端（index.js）從 Secret Manager 取出後傳進來，
// 這個檔案本身不碰任何機密資料。
//
// 注意 LINE 平台的硬性規定：只能推播給「已經加這個官方帳號為好友」的人，
// 就算 userId 是對的，對方沒加好友一樣會被拒絕（拒絕時 LINE 回傳的錯誤
// 不會明確說「沒加好友」，呼叫端只能當作推播失敗處理，不能當例外讓其他
// 通知管道也跟著失敗）。

const LINE_PUSH_API_URL = "https://api.line.me/v2/bot/message/push";

/**
 * @param {object} params
 * @param {string} params.channelAccessToken LINE Messaging API channel access token
 * @param {string} params.to 收件者的 LINE userId
 * @param {string} params.text 純文字訊息內容（LINE 文字訊息不支援 HTML）
 */
async function sendLineMessage({ channelAccessToken, to, text }) {
    const response = await fetch(LINE_PUSH_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${channelAccessToken}`
        },
        body: JSON.stringify({
            to,
            messages: [{ type: "text", text }]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`LINE Messaging API 回應 ${response.status}：${errorBody}`);
    }

    return response.status === 200 ? {} : response.json();
}

module.exports = { sendLineMessage };
