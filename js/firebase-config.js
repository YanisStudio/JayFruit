// 全站共用的管理員信箱清單，原本在 common.js / member.js / admin-common.js
// 各自維護一份一模一樣的清單，增減管理員容易漏改其中一處造成權限不一致
window.ADMIN_EMAILS = [
    'bababa.b810@gmail.com',
    'vincentsayhello@gmail.com',
    'yanishuang2000@gmail.com',
    'jay26904@gmail.com'
];

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
