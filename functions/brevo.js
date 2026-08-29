// 呼叫 Brevo 交易型 Email API 寄信的共用函式。
// API Key 由呼叫端（index.js）從 Secret Manager 取出後傳進來，
// 這個檔案本身不碰任何機密資料。
//
// 寄件地址用 orders@jayfarmer.tw，前提是 Brevo 那邊 jayfarmer.tw 網域驗證
// 已經完成（Senders, domains, IPs → Domains）；驗證還沒過的話 Brevo API
// 會直接拒絕寄送，不是信寄丟了，是打從一開始就沒送出去。

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER = { name: "杰の御果園", email: "orders@jayfarmer.tw" };

/**
 * @param {object} params
 * @param {string} params.apiKey Brevo API key
 * @param {string} params.toEmail 收件人信箱
 * @param {string} [params.toName] 收件人姓名
 * @param {string} params.subject 信件主旨
 * @param {string} params.html 信件內容（HTML）
 */
async function sendEmail({ apiKey, toEmail, toName, subject, html }) {
    const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/json",
            "api-key": apiKey
        },
        body: JSON.stringify({
            sender: SENDER,
            to: [{ email: toEmail, name: toName || toEmail }],
            subject,
            htmlContent: html
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Brevo API 回應 ${response.status}：${errorBody}`);
    }

    return response.json();
}

module.exports = { sendEmail };
