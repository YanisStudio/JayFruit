const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const logger = require("firebase-functions/logger");
const { sendEmail } = require("./brevo");

initializeApp();

// LINE 登入用的 HTTPS function，獨立寫在 line-login.js，這裡只是匯出
exports.lineLoginCallback = require("./line-login").lineLoginCallback;

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");

function formatCurrency(amount) {
    return `NT$ ${Number(amount || 0).toLocaleString("zh-TW")}`;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// 共用的信件外框樣式，避免每個範本重複寫一樣的 CSS
function emailShell(bodyHtml) {
    return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#333;">${bodyHtml}</div>`;
}

function buildItemsTable(items) {
    const rows = (Array.isArray(items) ? items : [])
        .map(
            (item) =>
                `<tr>
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;">${escapeHtml(item.name)}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">x${escapeHtml(item.quantity)}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
                </tr>`
        )
        .join("");

    return `
        <table style="width:100%;border-collapse:collapse;margin:12px 0;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="padding:6px 8px;text-align:left;">商品</th>
                    <th style="padding:6px 8px;text-align:center;">數量</th>
                    <th style="padding:6px 8px;text-align:right;">小計</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

async function sendOrderEmail({ order, subject, bodyHtml, logLabel, orderId }) {
    if (!order?.customer?.email) {
        logger.warn(`${logLabel}：訂單缺少顧客信箱，略過寄信`, { orderId });
        return;
    }
    try {
        await sendEmail({
            apiKey: BREVO_API_KEY.value(),
            toEmail: order.customer.email,
            toName: order.customer.name,
            subject,
            html: emailShell(bodyHtml)
        });
        logger.info(`${logLabel}已寄出`, { orderId });
    } catch (error) {
        logger.error(`${logLabel}寄送失敗`, { orderId, error: error.message });
    }
}

/**
 * 訂單建立時，寄送訂單明細＋付款提醒信給顧客。
 * 目前結帳頁只有 ATM 轉帳一種付款方式（24 小時內完成），所以提醒文字是固定的，
 * 不像多付款方式的網站需要依 payment 欄位分支。
 */
exports.sendOrderConfirmationEmail = onDocumentCreated(
    { document: "orders/{orderId}", secrets: [BREVO_API_KEY] },
    async (event) => {
        const order = event.data?.data();
        const orderId = event.params.orderId;

        const bodyHtml = `
            <h2 style="color:#2e7d4f;">感謝您的訂購，${escapeHtml(order?.customer?.name)}！</h2>
            <p>我們已經收到您的訂單，以下是訂單明細：</p>
            <p><b>訂單編號：</b>${escapeHtml(order?.orderNumber)}</p>
            ${buildItemsTable(order?.items)}
            <p>商品小計：${formatCurrency(order?.subtotal)}</p>
            <p>運費：${formatCurrency(order?.shippingFee)}</p>
            <p style="font-size:1.1em;"><b>訂單總額：${formatCurrency(order?.total)}</b></p>
            <div style="background:#fff8e1;padding:12px;border-radius:6px;margin:16px 0;">
                <p style="margin:0;"><b>尚未付款：</b>請於訂單成立後 24 小時內完成 ATM 轉帳，轉帳後請至「訂單記錄」回報匯款末五碼，我們確認後會盡快為您安排出貨。</p>
            </div>
            <p style="margin-top:24px;color:#777;font-size:0.9em;">如有任何問題，歡迎透過網站的聯絡我們或 LINE 官方帳號與我們聯繫。</p>
        `;

        await sendOrderEmail({
            order,
            subject: `【杰の御果園】訂單成立，請留意付款 - ${order?.orderNumber}`,
            bodyHtml,
            logLabel: "訂單成立通知信",
            orderId
        });
    }
);

/**
 * 訂單更新時：
 * - paymentConfirmed 第一次從 false/undefined 變 true → 寄「已收到匯款回報」信
 *   （這是顧客自己在 order-success.html 回報匯款末五碼時觸發的，不是後台人員
 *   已經核對過帳戶入帳的意思，所以信件文字寫「回報」「確認中」，不能寫成
 *   「已確認收到款項」，避免給顧客錯誤的保證）
 * - status 第一次變成 shipped → 寄出貨通知信
 * 兩個條件各自獨立判斷，同一次更新如果剛好兩個條件都成立，兩封都會寄。
 *
 * 各自用一個 xxxEmailSentAt 欄位記錄「這封信寄過了」，避免管理員後台把狀態
 * 改來改去時同一封信被重複寄送。這裡會反寫回同一張訂單，寫回本身也會再
 * 觸發這個函式一次，但那次的 before 已經是「改過的狀態」，判斷條件會正確
 * 評估成 false，不會無限觸發。
 */
exports.sendOrderStatusEmail = onDocumentUpdated(
    { document: "orders/{orderId}", secrets: [BREVO_API_KEY] },
    async (event) => {
        const before = event.data?.before?.data();
        const after = event.data?.after?.data();
        const orderId = event.params.orderId;
        if (!after) return;

        const sentMarkers = {};

        const justReportedPayment =
            before?.paymentConfirmed !== true &&
            after.paymentConfirmed === true &&
            !after.paymentConfirmedEmailSentAt;
        if (justReportedPayment) {
            const bodyHtml = `
                <h2 style="color:#2e7d4f;">我們已收到您的匯款回報</h2>
                <p>${escapeHtml(after.customer?.name)} 您好，訂單 <b>${escapeHtml(after.orderNumber)}</b> 的匯款回報已收到，我們會盡快核對入帳，確認後會安排出貨，出貨後會再寄信通知您。</p>
                <p style="font-size:1.1em;"><b>訂單總額：${formatCurrency(after.total)}</b></p>
                <p style="margin-top:24px;color:#777;font-size:0.9em;">如果核對上有任何問題，我們會另外與您聯繫。</p>
            `;
            await sendOrderEmail({
                order: after,
                subject: `【杰の御果園】已收到匯款回報 - ${after.orderNumber}`,
                bodyHtml,
                logLabel: "匯款回報通知信",
                orderId
            });
            sentMarkers.paymentConfirmedEmailSentAt = new Date();
        }

        const justShipped =
            before?.status !== "shipped" &&
            after.status === "shipped" &&
            !after.shippedEmailSentAt;
        if (justShipped) {
            const bodyHtml = `
                <h2 style="color:#2e7d4f;">您的訂單已出貨</h2>
                <p>${escapeHtml(after.customer?.name)} 您好，訂單 <b>${escapeHtml(after.orderNumber)}</b> 已經出貨囉！</p>
                ${buildItemsTable(after.items)}
                <p style="margin-top:24px;color:#777;font-size:0.9em;">如有任何問題，歡迎透過網站的聯絡我們或 LINE 官方帳號與我們聯繫。</p>
            `;
            await sendOrderEmail({
                order: after,
                subject: `【杰の御果園】訂單已出貨 - ${after.orderNumber}`,
                bodyHtml,
                logLabel: "出貨通知信",
                orderId
            });
            sentMarkers.shippedEmailSentAt = new Date();
        }

        if (Object.keys(sentMarkers).length > 0) {
            try {
                await event.data.after.ref.set(sentMarkers, { merge: true });
            } catch (error) {
                logger.error("標記寄信時間失敗", { orderId, error: error.message });
            }
        }
    }
);
