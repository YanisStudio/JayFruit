// 全站共用的 Firebase 專案設定，統一放在這裡管理，
// 換金鑰/換專案只需要改這一個檔案，不用逐頁修改
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyADQzSglrzQm1G-fO4kc9dcmJsA9f6S2AQ",
    authDomain: "jayfruit-9dfab.firebaseapp.com",
    projectId: "jayfruit-9dfab",
    storageBucket: "jayfruit-9dfab.firebasestorage.app",
    messagingSenderId: "766936951714",
    appId: "1:766936951714:web:4dc4a8787e810a0171a0fb",
    measurementId: "G-2NWQ7E9Y8H"
};

/**
 * Firestore 設定，所有頁面的 initializeFirestore() 以及重建連線
 *（common.js / admin-common.js 的 resetFirestoreConnection）都用這一份。
 *
 * 全站使用 Firestore Lite（firebase-firestore-lite.js），不是完整版 SDK。
 * 完整版靠一條長時間掛著的連線（WebChannel）收資料，在較慢的網路下這條連線
 * 第一次建立時常常卡住，一卡就是 SDK 的 10 秒逾時起跳，重建之後也常常再卡一次，
 * 首頁、商品頁就會一直停在「載入中」或「連線不穩定」。
 * Lite 每次讀寫都是一般的 HTTPS 請求，沒有長連線可以卡住。本站全部都是一次性讀寫，
 * 沒有用即時監聽（onSnapshot）或離線快取，所以 Lite 的限制不影響功能。
 *
 * 注意：頁面跟 js/admin-common.js 一定要用同一種、同一個版本（都是 10.7.1 的 Lite），
 * 混用時 getFirestore() 拿不到對方建立的實例，函式也不能跨版本混用。
 */
window.FIRESTORE_SETTINGS = {};
