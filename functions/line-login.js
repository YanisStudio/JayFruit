// LINE 登入的橋接函式：前端用彈窗把使用者導去 LINE 授權，LINE 授權完成後
// 導回這支 HTTPS function（不是前端頁面，是後端程式），這裡負責：
//   1. 用授權碼跟 LINE 換 access token / id_token（一定要在後端做，因為
//      這一步需要 Channel secret，不能放在前端讓瀏覽器看得到）
//   2. 從 id_token 讀出 LINE 使用者的 userId / 顯示名稱 / 大頭貼 / email
//   3. 建立或更新對應的 Firebase Auth 使用者（uid 固定用 `line:<LINE userId>`
//      這個格式，同一個 LINE 帳號永遠對應同一個 uid，不會每次登入都變成新帳號）
//   4. 發一組 Firebase Custom Token，透過彈窗回傳給前端
// 前端拿到 token 後呼叫 signInWithCustomToken()，就完成登入了，效果跟
// Google/Facebook 登入完成後一樣。

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getAuth } = require("firebase-admin/auth");
const logger = require("firebase-functions/logger");

const LINE_LOGIN_CHANNEL_ID = defineSecret("LINE_LOGIN_CHANNEL_ID");
const LINE_LOGIN_CHANNEL_SECRET = defineSecret("LINE_LOGIN_CHANNEL_SECRET");

// 這個網址要跟 LINE Developers Console → LINE Login channel → Callback URL
// 設定的完全一致，兩邊對不上 LINE 會直接拒絕整個授權流程
const REDIRECT_URI = "https://us-central1-jayfruit-9dfab.cloudfunctions.net/lineLoginCallback";

// 前端頁面的網域，postMessage 只會送給這個來源，避免其他網站的分頁偷聽到登入結果
const SITE_ORIGIN = "https://jayfarmer.tw";

exports.lineLoginCallback = onRequest(
    { secrets: [LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET] },
    async (req, res) => {
        const { code, error, error_description: errorDescription } = req.query;

        if (error) {
            logger.warn("LINE 登入被使用者取消或授權失敗", { error, errorDescription });
            return sendResultPage(res, { error: String(errorDescription || error) });
        }
        if (!code) {
            return sendResultPage(res, { error: "缺少授權碼，請重新登入" });
        }

        try {
            // 1. 用授權碼跟 LINE 換 token
            const tokenResp = await fetch("https://api.line.me/oauth2/v2.1/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code: String(code),
                    redirect_uri: REDIRECT_URI,
                    client_id: LINE_LOGIN_CHANNEL_ID.value(),
                    client_secret: LINE_LOGIN_CHANNEL_SECRET.value()
                })
            });

            if (!tokenResp.ok) {
                const errBody = await tokenResp.text();
                logger.error("向 LINE 交換 token 失敗", { status: tokenResp.status, errBody });
                return sendResultPage(res, { error: "LINE 登入失敗，請重試" });
            }

            const tokenData = await tokenResp.json();
            const idToken = tokenData.id_token;
            const lineAccessToken = tokenData.access_token;
            if (!idToken) {
                logger.error("LINE token 回應缺少 id_token", { tokenData });
                return sendResultPage(res, { error: "LINE 登入失敗，請重試" });
            }

            // 2. 解析 id_token（JWT）拿 LINE 使用者資料。
            // 這裡不驗證簽章：id_token 是我們剛才用 Channel secret 直接跟 LINE
            // 的伺服器換來的（server-to-server、走 HTTPS），不是使用者能偽造
            // 或竄改的輸入，可以直接信任內容來自 LINE。
            // JWT 是用 base64url 編碼（用 -/_ 取代 +/ 、不補 padding），
            // 用一般的 "base64" 解碼會把 -/_ 這兩個字元解壞，導致 JSON.parse
            // 炸掉——這裡務必指定 "base64url"
            const payloadBase64Url = idToken.split(".")[1];
            const payload = JSON.parse(Buffer.from(payloadBase64Url, "base64url").toString("utf8"));

            const lineUserId = payload.sub;
            const displayName = payload.name || "LINE 用戶";
            const email = payload.email || null;
            const pictureUrl = payload.picture || null;

            if (!lineUserId) {
                logger.error("id_token 缺少 sub（LINE userId）", { payload });
                return sendResultPage(res, { error: "無法取得 LINE 使用者資訊" });
            }

            // 2.5 查詢這個 LINE 使用者是否已經加官方帳號好友。
            // 用的是這次登入換到的 access_token（不是推播用的 Channel Access
            // Token），且前提是 LINE Login channel 有在 LINE Developers Console
            // 設定「Linked OA」連結到 @farmer-jay 這個官方帳號，否則查不到正確
            // 結果。查詢失敗就當作「還沒加好友」處理（頂多多提示一次，不會
            // 造成資料錯誤），不能因為這步失敗就讓整個登入流程失敗。
            let lineFriend = false;
            if (lineAccessToken) {
                try {
                    const friendResp = await fetch("https://api.line.me/friendship/v1/status", {
                        headers: { Authorization: `Bearer ${lineAccessToken}` }
                    });
                    if (friendResp.ok) {
                        const friendData = await friendResp.json();
                        lineFriend = !!friendData.friendFlag;
                    } else {
                        logger.warn("查詢 LINE 好友狀態失敗", { status: friendResp.status });
                    }
                } catch (friendError) {
                    logger.warn("查詢 LINE 好友狀態時發生例外", { error: friendError.message });
                }
            }

            // 3. 建立或更新對應的 Firebase Auth 使用者
            const uid = `line:${lineUserId}`;
            const auth = getAuth();
            const userFields = {
                displayName,
                photoURL: pictureUrl || undefined,
                ...(email ? { email } : {})
            };
            try {
                await auth.updateUser(uid, userFields);
            } catch (updateError) {
                if (updateError.code === "auth/user-not-found") {
                    await auth.createUser({ uid, ...userFields });
                } else {
                    throw updateError;
                }
            }

            // 4. 發 Firebase custom token 回傳給前端。
            // Firestore users/{uid} 這份文件不在這裡寫——跟 Google/Facebook/
            // 電話登入一樣，交給前端 signInWithCustomToken() 成功之後呼叫
            // 既有的 saveUserToFirestore()，才會正確處理「新用戶要給預設的
            // city/district/address 空欄位」「舊用戶不要覆蓋掉已經填寫的
            // name」這些既有邏輯，不用在這裡重複一份、維護兩個地方。
            const customToken = await auth.createCustomToken(uid, {
                provider: "line",
                lineUserId
            });
            logger.info("LINE 登入成功", { uid, lineFriend });
            return sendResultPage(res, { token: customToken, displayName, lineFriend });
        } catch (err) {
            logger.error("LINE 登入處理發生例外", { error: err.message });
            return sendResultPage(res, { error: "LINE 登入發生錯誤，請重試" });
        }
    }
);

// 回傳一個極簡的中繼頁面：用 postMessage 把結果傳回開啟這個彈窗的原始頁面，
// 然後自動關閉彈窗。前端流程因此可以做成跟 Google/Facebook 一樣的彈窗體驗，
// 不用整頁跳轉、不用自己頁面處理 LINE 的 callback 參數。
function sendResultPage(res, { token, error, displayName, lineFriend }) {
    const payload = JSON.stringify({
        source: "line-login",
        token: token || null,
        error: error || null,
        displayName: displayName || null,
        // 沒有 token（登入失敗）時 lineFriend 沒有意義，一律回 null，
        // 避免前端誤判成「已知不是好友」
        lineFriend: token ? !!lineFriend : null
    });
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body>
<script>
    if (window.opener) {
        window.opener.postMessage(${payload}, ${JSON.stringify(SITE_ORIGIN)});
    }
    window.close();
</script>
<p>登入處理中，請稍候，這個視窗會自動關閉…</p>
</body></html>`);
}
