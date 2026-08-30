// 會員系統 + 瀏覽器檢測整合版本

// 自動注入瀏覽器警告的 CSS 樣式
function injectBrowserWarningStyles() {
    if (document.querySelector('#browser-warning-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'browser-warning-styles';
    styles.textContent = `
        /* 瀏覽器檢測相關樣式 */
        .browser-warning {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }

        .browser-warning-content {
            background: white;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            animation: browserSlideIn 0.3s ease-out;
            position: relative;
        }

        .browser-warning-icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 18px;
            border-radius: 50%;
            background: #eaf5ea;
            color: #4caf50;
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .browser-warning-content h2 {
            color: #2c3e2f;
            margin: 0 0 12px 0;
            font-size: 1.3rem;
        }

        .browser-warning-content p {
            color: #666;
            line-height: 1.6;
            margin: 10px 0;
            font-size: 0.95rem;
        }

        .browser-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 22px;
        }

        .browser-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            text-decoration: none;
            transition: background-color 0.2s ease, border-color 0.2s ease;
            cursor: pointer;
            font-family: inherit;
        }

        /* Chrome 按鈕 - 主要行動按鈕 */
        .chrome-btn {
            background: #4caf50;
            color: white;
            padding: 15px 25px;
            font-size: 1rem;
        }

        .chrome-btn:hover {
            background: #3d8b40;
        }

        .chrome-btn i {
            margin-right: 10px;
            font-size: 1.1rem;
        }

        /* 繼續使用按鈕 - 次要選項 */
        .continue-btn {
            background: transparent;
            color: #999;
            border: 1px solid #e0e0e0;
            padding: 12px 15px;
            font-size: 0.9rem;
        }

        .continue-btn:hover {
            background: #f7f7f7;
            border-color: #ccc;
            color: #666;
        }

        @keyframes browserSlideIn {
            from { opacity: 0; transform: scale(0.9) translateY(-20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 480px) {
            .browser-warning-content {
                padding: 20px;
                margin: 10px;
            }
            
            .browser-warning-content h2 {
                font-size: 1.3rem;
            }
            
            .chrome-btn {
                padding: 16px 20px;
                font-size: 1rem;
            }
            
            .continue-btn {
                padding: 8px 12px;
                font-size: 0.8rem;
            }
        }
    `;
    document.head.appendChild(styles);
}

// 自動注入瀏覽器警告的 HTML（修改版本 - 直接開啟 Google Chrome）
function injectBrowserWarningHTML() {
    if (document.querySelector('#browser-warning')) return;
    
    const warningHTML = `
        <div id="browser-warning" class="browser-warning" style="display: none;">
            <div class="browser-warning-content">
                <div class="browser-warning-icon">
                    <i class="fas fa-compass"></i>
                </div>

                <h2>建議用外部瀏覽器開啟</h2>
                <p>您目前是透過 ${window.BrowserDetection ? window.BrowserDetection.getBrowserName() : 'LINE'} 內建瀏覽器瀏覽，Google／Facebook 登入可能無法正常運作。建議切換到 Chrome，體驗會更完整順暢。</p>

                <div class="browser-buttons">
                    <button class="browser-btn chrome-btn" onclick="window.BrowserDetection.openInGoogleChrome()">
                        <i class="fab fa-chrome"></i>
                        用 Chrome 開啟
                    </button>
                    <button class="browser-btn continue-btn" onclick="window.BrowserDetection.continueWithCurrentBrowser()">
                        略過，繼續瀏覽
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', warningHTML);
}

// 瀏覽器檢測功能（使用會話級記憶）
const BrowserDetection = {
    // 檢測是否為 LINE 瀏覽器
    isLINEBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('line/') || 
               userAgent.includes('linewebview') ||
               userAgent.includes('linelite');
    },

    // 檢測是否為手機
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // 檢測其他常見的內建瀏覽器
    isInAppBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('fbav') ||     // Facebook
               userAgent.includes('fban') ||     // Facebook
               userAgent.includes('instagram') || // Instagram
               userAgent.includes('twitter') ||   // Twitter
               userAgent.includes('tiktok') ||    // TikTok
               userAgent.includes('micromessenger') || // WeChat
               userAgent.includes('line/') ||     // LINE
               userAgent.includes('kakaotalk');   // KakaoTalk
    },

    // 檢測具體的瀏覽器類型
    getBrowserName() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('line/') || userAgent.includes('linewebview') || userAgent.includes('linelite')) {
            return 'LINE';
        } else if (userAgent.includes('fbav') || userAgent.includes('fban')) {
            return 'Facebook';
        } else if (userAgent.includes('instagram')) {
            return 'Instagram';
        } else if (userAgent.includes('twitter')) {
            return 'Twitter';
        } else if (userAgent.includes('tiktok')) {
            return 'TikTok';
        } else if (userAgent.includes('micromessenger')) {
            return 'WeChat';
        } else if (userAgent.includes('kakaotalk')) {
            return 'KakaoTalk';
        } else {
            return '內建';
        }
    },

    // 新增：直接開啟 Google Chrome
    openInGoogleChrome() {
        const currentUrl = window.location.href;
        
        try {
            // 檢測平台並使用對應的方法
            if (this.isMobile()) {
                // 手機平台
                if (navigator.userAgent.match(/iPhone|iPad/)) {
                    // iOS 設備
                    // 嘗試使用 Chrome 的 URL scheme
                    const chromeUrl = `googlechrome://${currentUrl.replace(/^https?:\/\//, '')}`;
                    window.location.href = chromeUrl;
                    
                    // 如果 Chrome 沒有安裝，回退到 Safari
                    setTimeout(() => {
                        window.location.href = currentUrl;
                    }, 1500);
                } else if (navigator.userAgent.match(/Android/)) {
                    // Android 設備
                    // 使用 Intent 嘗試開啟 Chrome
                    const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
                    window.location.href = intentUrl;
                    
                    // 如果 Chrome 沒有安裝，回退到默認瀏覽器
                    setTimeout(() => {
                        window.location.href = currentUrl;
                    }, 1500);
                }
            } else {
                // 桌面平台 - 開啟新分頁
                window.open(currentUrl, '_blank');
            }
            
            // 關閉警告彈窗
            this.closeBrowserWarning();
            
        } catch (error) {
            console.error('開啟外部瀏覽器失敗:', error);
            // 如果所有方法都失敗，嘗試直接開啟連結
            try {
                window.open(currentUrl, '_blank');
            } catch (fallbackError) {
                console.error('備用方案也失敗:', fallbackError);
                alert('無法自動開啟外部瀏覽器，請手動複製網址到 Chrome 瀏覽器中開啟：\n\n' + currentUrl);
            }
        }
    },

    // 顯示瀏覽器警告（使用 sessionStorage 記憶）
    showBrowserWarning() {
        // 檢查會話期間是否已經顯示過警告
        const hasShownWarning = sessionStorage.getItem('browserWarningShown');
        
        // 如果這個會話中已經顯示過，就不再顯示
        if (hasShownWarning === 'true') {
            console.log('本次會話已顯示過瀏覽器警告，跳過顯示');
            return;
        }

        // 確保 HTML 已注入
        injectBrowserWarningHTML();

        const warningElement = document.getElementById('browser-warning');
        if (warningElement) {
            warningElement.style.display = 'flex';
            
            // 標記這個會話已經顯示過警告
            sessionStorage.setItem('browserWarningShown', 'true');
            console.log('已顯示瀏覽器警告，並標記會話狀態');
        }
    },

    // 關閉瀏覽器警告
    closeBrowserWarning() {
        const warningElement = document.getElementById('browser-warning');
        if (warningElement) {
            warningElement.style.display = 'none';
        }
    },

    // 繼續使用當前瀏覽器
    continueWithCurrentBrowser() {
        this.closeBrowserWarning();
    },

    // 修改登入按鈕行為，在 LINE 瀏覽器中優先引導使用電話登入
    handleLoginButtonClick(loginType) {
        if (this.isLINEBrowser() && (loginType === 'google' || loginType === 'facebook')) {
            // 在 LINE 瀏覽器中，如果用戶點擊 Google 或 Facebook 登入
            if (window.showMemberWarningModal) {
                window.showMemberWarningModal(
                    '建議使用其他登入方式',
                    '在 LINE 瀏覽器中，Google 和 Facebook 登入可能無法正常運作。建議您：\n\n1. 使用電話號碼登入\n2. 或在外部瀏覽器中開啟此網頁'
                );
            } else {
                alert('在 LINE 瀏覽器中，Google 和 Facebook 登入可能無法正常運作。建議您：\n\n1. 使用電話號碼登入\n2. 或在外部瀏覽器中開啟此網頁');
            }
            return false; // 阻止繼續執行登入
        }
        return true; // 允許繼續執行登入
    },

    // 初始化瀏覽器檢測
    init() {
        // 注入樣式
        injectBrowserWarningStyles();
        
        // 如果是 LINE 瀏覽器或其他內建瀏覽器，顯示警告
        if (this.isLINEBrowser() || this.isInAppBrowser()) {
            // 延遲 1 秒顯示，讓頁面有時間載入
            setTimeout(() => {
                this.showBrowserWarning();
            }, 1000);
        }
    },

    // 新增：重置會話記憶（供測試使用）
    resetSessionMemory() {
        sessionStorage.removeItem('browserWarningShown');
        console.log('已重置瀏覽器警告會話記憶');
    }
};

// 將 BrowserDetection 暴露給全域
window.BrowserDetection = BrowserDetection;

// 自定義彈窗樣式注入
function injectModalStyles() {
    if (document.querySelector('#member-modal-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'member-modal-styles';
    styles.textContent = `
        /* 會員系統自定義彈窗樣式 */
        .member-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .member-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            cursor: pointer;
        }
        
        .member-modal-content {
            background: white;
            padding: 2.5rem;
            border-radius: 15px;
            text-align: center;
            max-width: 450px;
            margin: 0 1rem;
            position: relative;
            z-index: 1;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 1px solid #e0e0e0;
        }
        
        .member-modal-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .member-modal-content h3 {
            margin: 0 0 1rem 0;
            font-size: 1.4rem;
        }
        
        .member-modal-content p {
            margin: 0.5rem 0 1.5rem 0;
            line-height: 1.6;
            color: #666;
        }
        
        .member-modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .member-modal-actions .btn {
            padding: 0.8rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s ease;
            min-width: 120px;
            border: none;
            cursor: pointer;
        }
        
        .member-modal-actions .btn:hover {
            transform: translateY(-2px);
        }

        /* 成功彈窗樣式 */
        .member-success-modal .member-modal-icon {
            color: #4caf50;
            animation: memberCheckAnimation 0.6s ease-in-out;
        }

        .member-success-modal .member-modal-content h3 {
            color: #2c5530;
        }

        .member-success-modal .btn {
            background: linear-gradient(135deg, #66bb6a, #4caf50);
            color: white;
        }

        @keyframes memberCheckAnimation {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }

        /* 錯誤彈窗樣式 */
        .member-error-modal .member-modal-icon {
            color: #f44336;
            animation: memberShakeAnimation 0.6s ease-in-out;
        }

        .member-error-modal .member-modal-content h3 {
            color: #c62828;
        }

        .member-error-modal .btn {
            background: linear-gradient(135deg, #f44336, #e53935);
            color: white;
        }

        @keyframes memberShakeAnimation {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        /* 警告彈窗樣式 */
        .member-warning-modal .member-modal-icon {
            color: #ff9800;
            animation: memberPulseAnimation 1s ease-in-out infinite;
        }

        .member-warning-modal .member-modal-content h3 {
            color: #f57c00;
        }

        .member-warning-modal .btn {
            background: linear-gradient(135deg, #ff9800, #f57c00);
            color: white;
        }

        @keyframes memberPulseAnimation {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        @media (max-width: 768px) {
            .member-modal-actions {
                flex-direction: column;
                align-items: center;
            }
            
            .member-modal-actions .btn {
                width: 100%;
                max-width: 200px;
            }
        }
    `;
    document.head.appendChild(styles);
}

// 顯示成功彈窗
function showMemberSuccessModal(title, message) {
    injectModalStyles();
    
    const modal = document.createElement('div');
    modal.className = 'member-modal member-success-modal';
    modal.innerHTML = `
        <div class="member-modal-overlay"></div>
        <div class="member-modal-content">
            <div class="member-modal-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="member-modal-actions">
                <button class="btn" onclick="closeMemberModal(this)">確定</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 點擊背景關閉
    modal.querySelector('.member-modal-overlay').addEventListener('click', function() {
        closeMemberModal(modal);
    });
    
    // 3秒後自動關閉
    setTimeout(() => {
        if (document.body.contains(modal)) {
            closeMemberModal(modal);
        }
    }, 3000);
}

// 顯示錯誤彈窗
function showMemberErrorModal(title, message) {
    injectModalStyles();
    
    const modal = document.createElement('div');
    modal.className = 'member-modal member-error-modal';
    modal.innerHTML = `
        <div class="member-modal-overlay"></div>
        <div class="member-modal-content">
            <div class="member-modal-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="member-modal-actions">
                <button class="btn" onclick="closeMemberModal(this)">確定</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 點擊背景關閉
    modal.querySelector('.member-modal-overlay').addEventListener('click', function() {
        closeMemberModal(modal);
    });
}

// 顯示警告彈窗
function showMemberWarningModal(title, message) {
    injectModalStyles();
    
    const modal = document.createElement('div');
    modal.className = 'member-modal member-warning-modal';
    modal.innerHTML = `
        <div class="member-modal-overlay"></div>
        <div class="member-modal-content">
            <div class="member-modal-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>${title}</h3>
            <p style="white-space: pre-line;">${message}</p>
            <div class="member-modal-actions">
                <button class="btn" onclick="closeMemberModal(this)">確定</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 點擊背景關閉
    modal.querySelector('.member-modal-overlay').addEventListener('click', function() {
        closeMemberModal(modal);
    });
}

// 提示使用者加官方 LINE 好友，才能收到訂單/出貨的即時通知。
// 用在兩個時機：① LINE 登入完成當下發現還沒加好友、② 進入結帳頁時（見
// initCheckoutLineFriendPrompt）再次確認 Firestore 存的好友狀態
function showAddLineFriendModal() {
    injectModalStyles();

    const modal = document.createElement('div');
    modal.className = 'member-modal member-warning-modal';
    modal.innerHTML = `
        <div class="member-modal-overlay"></div>
        <div class="member-modal-content">
            <div class="member-modal-icon">
                <i class="fab fa-line" style="color: #06c755;"></i>
            </div>
            <h3>加入官方 LINE 好友</h3>
            <p>加入「杰の御果園」官方 LINE 帳號，訂單成立、確認收款、出貨等狀態才能即時透過 LINE 通知您。</p>
            <div class="member-modal-actions">
                <a href="https://line.me/R/ti/p/@farmer-jay" target="_blank" rel="noopener" class="btn" onclick="closeMemberModal(this)">前往加入好友</a>
                <button class="btn" style="background: #e0e0e0; color: #555;" onclick="closeMemberModal(this)">稍後再說</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.member-modal-overlay').addEventListener('click', function() {
        closeMemberModal(modal);
    });
}
window.showAddLineFriendModal = showAddLineFriendModal;

// 關閉彈窗的通用函數
function closeMemberModal(element) {
    let modal;
    if (element.classList && element.classList.contains('member-modal')) {
        modal = element;
    } else {
        modal = element.closest('.member-modal');
    }
    
    if (modal && document.body.contains(modal)) {
        modal.remove();
    }
}

// 將關閉函數設為全域，供 onclick 使用
window.closeMemberModal = closeMemberModal;
window.showMemberSuccessModal = showMemberSuccessModal;
window.showMemberErrorModal = showMemberErrorModal;
window.showMemberWarningModal = showMemberWarningModal;

// 管理員檢查函數
// 改讀 Firebase Auth 的 admin custom claim，取代比對寫死的信箱清單，
// 需要 user 物件（不只是 email）才能呼叫 getIdTokenResult()
async function isAdmin(user) {
    if (!user) return false;
    try {
        const tokenResult = await user.getIdTokenResult();
        return tokenResult.claims.admin === true;
    } catch (error) {
        console.error('讀取權限狀態失敗:', error);
        return false;
    }
}

// 用戶登入狀態操作函數
async function saveUserState(user) {
    if (user) {
        localStorage.setItem('userIsLoggedIn', 'true');
        localStorage.setItem('userEmail', user.email || '');
        // 使用管理員檢查函數
        if (await isAdmin(user)) {
            localStorage.setItem('isAdmin', 'true');
        } else {
            localStorage.removeItem('isAdmin');
        }
    } else {
        localStorage.removeItem('userIsLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('isAdmin');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 初始化瀏覽器檢測
    BrowserDetection.init();

    // 結帳頁的「加官方 LINE 好友」提醒只彈一次，避免 onAuthStateChanged
    // 之後如果又觸發一次同一個已登入用戶，重複跳出來打擾使用者
    let lineFriendPromptShown = false;

    // 獲取各種元素
    const userActions = document.getElementById('user-actions');
    const userProfile = document.getElementById('user-profile');
    const usernameDisplay = document.getElementById('username-display');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userMenu = document.getElementById('user-menu');
    
    // 獲取管理員按鈕元素
    const adminBtn = document.getElementById('admin-btn');
    const adminBtnMobile = document.getElementById('admin-btn-mobile');
    
    // 手機版元素
    const userActionsMobile = document.getElementById('user-actions-mobile');
    const userProfileMobile = document.getElementById('user-profile-mobile');
    const usernameDisplayMobile = document.getElementById('username-display-mobile');

    // 從window對象獲取Firebase服務
    const {
        auth,
        getAuth,
        signOut, 
        onAuthStateChanged,
        doc,
        setDoc,
        getDoc,
        collection,
        serverTimestamp,
        // Google 登入相關函數
        GoogleAuthProvider,
        signInWithPopup,
        signInWithRedirect,
        getRedirectResult,
        // Facebook 登入相關函數
        FacebookAuthProvider,
        // 電話號碼登入相關函數
        RecaptchaVerifier,
        signInWithPhoneNumber,
        PhoneAuthProvider,
        signInWithCredential,
        // LINE 登入相關函數
        signInWithCustomToken
    } = window.firebaseServices || {};

    // 全局變量儲存確認結果
    let confirmationResult = null;

    // 檢查當前登入用戶是否為管理員
    const checkIfAdmin = async function(user) {
        if (user && await isAdmin(user)) {
            console.log('管理員登入:', user.email);
            if (adminBtn) adminBtn.style.display = 'block';
            if (adminBtnMobile) adminBtnMobile.style.display = 'block';
            localStorage.setItem('isAdmin', 'true');
        } else {
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminBtnMobile) adminBtnMobile.style.display = 'none';
            localStorage.removeItem('isAdmin');
        }
    };

    // 台灣手機號碼格式驗證
    function isValidPhoneNumber(phoneNumber) {
        // 檢查手機號碼的長度是否為 10 碼
        if (phoneNumber.length !== 10) {
            return false;
        }

        // 檢查手機號碼的第一個數字是否為 0
        if (phoneNumber[0] !== "0") {
            return false;
        }

        // 使用正規表達式，檢查手機號碼是否符合全數字不帶任何符號的格式
        const regex = /^09\d{8}$/;
        return regex.test(phoneNumber);
    }

    // 設定 reCAPTCHA
    function setUpRecaptcha(phoneNumber) {
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
            } catch (e) {
                console.log('清除 reCAPTCHA 錯誤:', e);
            }
            window.recaptchaVerifier = null;
        }

        // 顯示 reCAPTCHA 容器
        if (window.authModals) {
            window.authModals.showRecaptchaContainer();
        }

        // 清空容器
        const container = document.getElementById('recaptcha-container');
        if (container) {
            container.innerHTML = '';
        }

        try {
            window.recaptchaVerifier = new RecaptchaVerifier(
                auth,
                "recaptcha-container",
                {
                    'size': 'normal',
                    'callback': (response) => {
                        console.log('reCAPTCHA 驗證成功');
                        if (window.authModals) {
                            window.authModals.showPhoneMessage('reCAPTCHA 驗證完成，正在發送驗證碼...', false);
                        }
                        // reCAPTCHA 完成後自動發送驗證碼
                        sendVerificationCode(phoneNumber);
                    },
                    'expired-callback': () => {
                        if (window.authModals) {
                            window.authModals.showPhoneMessage('reCAPTCHA 已過期，請重新驗證', true);
                        }
                        // 重新設定 reCAPTCHA
                        setTimeout(() => {
                            setUpRecaptcha(phoneNumber);
                        }, 1000);
                    }
                }
            );
            
            return window.recaptchaVerifier.render().then((widgetId) => {
                console.log('reCAPTCHA 渲染成功');
                if (window.authModals) {
                    window.authModals.showPhoneMessage('請完成 reCAPTCHA 驗證', false);
                }
                return widgetId;
            }).catch((error) => {
                console.error('reCAPTCHA 渲染錯誤:', error);
                
                let errorMessage = 'reCAPTCHA 載入失敗: ';
                if (error.code === 'auth/app-not-authorized') {
                    errorMessage += '網域未授權，請檢查 Firebase 控制台的授權網域設定';
                } else if (error.message.includes('network')) {
                    errorMessage += '網路連線問題';
                } else {
                    errorMessage += error.message;
                }
                
                if (window.authModals) {
                    window.authModals.showPhoneMessage(errorMessage, true);
                }
                throw error;
            });
            
        } catch (error) {
            console.error('建立 reCAPTCHA 錯誤:', error);
            if (window.authModals) {
                window.authModals.showPhoneMessage('無法初始化 reCAPTCHA，請檢查網域設定', true);
            }
            throw error;
        }
    }

    // 發送驗證碼
    async function sendVerificationCode(phoneNumber) {
        try {
            // 轉換為國際格式
            const internationalPhone = phoneNumber.replace(/^0/, '+886');
            console.log('發送驗證碼到:', internationalPhone);

            confirmationResult = await signInWithPhoneNumber(auth, internationalPhone, window.recaptchaVerifier);
            
            console.log('驗證碼已發送');
            
            if (window.authModals) {
                window.authModals.showPhoneMessage('驗證碼已發送至您的手機，請輸入驗證碼', false);
                window.authModals.showVerificationSection();
                // 隱藏 reCAPTCHA 容器
                window.authModals.hideRecaptchaContainer();
            }
            
        } catch (error) {
            console.error('發送簡訊錯誤:', error);
            let errorMessage = '發送失敗: ';
            
            switch (error.code) {
                case 'auth/invalid-phone-number':
                    errorMessage += '無效的手機號碼格式';
                    break;
                case 'auth/too-many-requests':
                    errorMessage += '請求過於頻繁，請稍後再試';
                    break;
                case 'auth/internal-error-encountered':
                    errorMessage += '系統內部錯誤，請檢查網域設定或稍後再試';
                    break;
                case 'auth/app-not-authorized':
                    errorMessage += '應用程式未獲授權，請檢查 Firebase 設定';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            if (window.authModals) {
                window.authModals.showPhoneMessage(errorMessage, true);
            }
            
            // 重置 reCAPTCHA
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        }
    }

    // 電話號碼登入功能實現
    async function handlePhoneLogin(phoneNumber) {
        if (!RecaptchaVerifier || !signInWithPhoneNumber) {
            showMemberErrorModal('功能未啟用', '電話號碼登入功能未啟用，請聯繫網站管理員。');
            return;
        }

        // 驗證電話號碼格式
        if (!isValidPhoneNumber(phoneNumber)) {
            if (window.authModals) {
                window.authModals.showPhoneMessage('請輸入正確的台灣手機號碼格式（09開頭，共10位數字）', true);
            }
            return;
        }

        try {
            if (window.authModals) {
                window.authModals.showPhoneMessage('正在載入 reCAPTCHA...', false);
            }
            
            await setUpRecaptcha(phoneNumber);
            
        } catch (error) {
            console.error('設定 reCAPTCHA 錯誤:', error);
            if (window.authModals) {
                window.authModals.showPhoneMessage('目前無法驗證，請檢查網域設定或重新整理頁面', true);
            }
        }
    }

    // 驗證電話號碼驗證碼
    async function verifyPhoneCode(code) {
        if (!confirmationResult) {
            showMemberErrorModal('驗證錯誤', '請先發送驗證碼');
            return;
        }

        try {
            if (window.authModals) {
                window.authModals.showPhoneMessage('正在驗證...', false);
            }

            const result = await confirmationResult.confirm(code);
            const user = result.user;

            console.log('電話號碼登入成功:', user.uid);

            await saveUserState(user);

            // 電話登入的用戶顯示為 "手機用戶"
            const displayName = '手機用戶';

            localStorage.setItem('userName', displayName);
            await checkIfAdmin(user);

            // 保存或更新用戶資料到 Firestore
            await saveUserToFirestore(user, displayName, 'phone');

            if (window.authModals) {
                window.authModals.hideAllModals();
            }

            updateLoginUI(user);
            showMemberSuccessModal('登入成功', '電話號碼登入成功！');

        } catch (error) {
            console.error('驗證碼驗證失敗:', error);
            
            let errorMessage = '驗證失敗: ';
            if (error.code === 'auth/invalid-verification-code') {
                errorMessage += '驗證碼錯誤，請檢查並重新輸入';
            } else if (error.code === 'auth/code-expired') {
                errorMessage += '驗證碼已過期，請重新發送';
            } else {
                errorMessage += error.message;
            }
            
            if (window.authModals) {
                window.authModals.showPhoneMessage(errorMessage, true);
            }
        }
    }

    // 重新發送驗證碼
    async function resendVerificationCode() {
        const phoneNumber = document.getElementById('phone-number').value;
        if (!phoneNumber) {
            if (window.authModals) {
                window.authModals.showPhoneMessage('請輸入電話號碼', true);
            }
            return;
        }

        // 重置 reCAPTCHA 驗證器
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }

        await handlePhoneLogin(phoneNumber);
    }

    // 保存用戶資料到 Firestore
    // lineFriend 只有 provider === 'line' 時才有意義：true/false 是登入當下
    // 查到的官方帳號好友狀態，undefined/null 代表沒有查（非 LINE 登入、或查詢失敗）
    async function saveUserToFirestore(user, displayName, provider, lineFriend) {
        try {
            // 即時讀 window.firebaseServices.db，不用外層解構時快取的舊變數——
            // 連線重建時舊變數會停在已經失效的連線上
            const userRef = doc(window.firebaseServices.db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            // 處理電話號碼格式 - 從 +886 轉換為 09
            let phoneNumber = '';
            if (user.phoneNumber) {
                phoneNumber = user.phoneNumber.replace(/^\+886/, '0');
            }
            
            if (!userSnap.exists()) {
                // 新用戶，創建用戶文檔
                const userData = {
                    email: user.email || '',
                    photoURL: user.photoURL || '',
                    provider: provider,
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                    city: '',
                    district: '',
                    address: ''
                };
                
                // 根據登入方式決定 name 和 phone 欄位
                if (provider === 'phone') {
                    userData.name = ''; // 讓用戶自己填寫姓名
                    userData.phone = phoneNumber; // 電話號碼放在 phone 欄位
                } else if (provider === 'line') {
                    // LINE 登入目前沒有申請 email 權限，email 欄位會是空的是
                    // 預期中的行為（純粹拿 LINE 帳號登入/收通知用，要用信箱
                    // 相關功能的人本來就會改走信箱登入）。額外存一份不帶
                    // "line:" 前綴的 LINE userId，讓 email 是空的時候還有
                    // 明確的識別依據可以用
                    userData.name = displayName; // 網站上顯示用的名稱，之後使用者可以自己改
                    userData.phone = '';
                    userData.lineUserId = user.uid.replace(/^line:/, '');
                    // 額外獨立存一份 LINE 暱稱：name 之後會被使用者自己在個人資料頁改掉，
                    // 但後臺會員列表要看的是「LINE 真正的暱稱」，這個欄位不能被
                    // profile.html 的編輯動作動到，只由這裡（登入當下）更新
                    userData.lineDisplayName = displayName;
                    if (typeof lineFriend === 'boolean') {
                        userData.lineFriend = lineFriend;
                    }
                } else {
                    userData.name = displayName; // Google/Facebook 的顯示名稱
                    userData.phone = ''; // 其他登入方式 phone 欄位為空
                }

                await setDoc(userRef, userData);
                console.log('新用戶資料已保存:', userData);
            } else {
                // 現有用戶，更新最後登入時間
                const updateData = {
                    lastLoginAt: serverTimestamp(),
                    photoURL: user.photoURL || userSnap.data().photoURL || ''
                };
                
                // 如果是電話登入，更新電話號碼
                if (provider === 'phone') {
                    updateData.phone = phoneNumber;
                }

                // 如果是 LINE 登入，補上 lineUserId（避免舊帳號在加這個特例
                // 之前建立的、還沒有這個欄位），並且每次登入都用 LINE 當下回報
                // 的暱稱刷新 lineDisplayName——這個欄位是後臺會員列表要看的
                // 「LINE 真正的暱稱」，不能跟 name 混用，name 之後會被使用者
                // 自己在個人資料頁改掉，改了也不該影響這裡
                if (provider === 'line') {
                    updateData.lineUserId = user.uid.replace(/^line:/, '');
                    updateData.lineDisplayName = displayName;
                    if (typeof lineFriend === 'boolean') {
                        updateData.lineFriend = lineFriend;
                    }
                }

                await setDoc(userRef, updateData, { merge: true });
                
                // 如果 Firestore 中有更完整的用戶名，使用 Firestore 的
                const firestoreUserName = userSnap.data().name;
                if (firestoreUserName) {
                    localStorage.setItem('userName', firestoreUserName);
                }
                console.log('現有用戶登入時間已更新:', updateData);
            }
        } catch (error) {
            console.warn('無法保存用戶資料到數據庫:', error);
            // 即使無法保存到數據庫，也不影響登入流程
        }
    }

    // 處理認證錯誤
    function handleAuthError(error, defaultMessage) {
        let errorMessage = defaultMessage || '登入失敗，請重試。';
        
        switch(error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = '登入已取消。';
                break;
            case 'auth/popup-blocked':
                errorMessage = '瀏覽器阻擋了登入彈窗，請允許彈窗後重試。';
                break;
            case 'auth/cancelled-popup-request':
                errorMessage = '登入請求已取消。';
                break;
            case 'auth/account-exists-with-different-credential':
                errorMessage = '此電子郵件已使用其他登入方式註冊，請使用原來的方式登入。';
                break;
            case 'auth/network-request-failed':
                errorMessage = '網路連線問題。請檢查您的網路連線並重試。';
                break;
            case 'auth/too-many-requests':
                errorMessage = '登入嘗試次數過多。請稍後再試。';
                break;
            default:
                errorMessage = defaultMessage + ': ' + error.message;
        }
        
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            showMemberErrorModal('登入失敗', errorMessage);
        }
    }
    
    // Google 登入功能實現
    async function handleGoogleLogin() {
        if (!GoogleAuthProvider || !signInWithPopup) {
            showMemberErrorModal('功能未啟用', 'Google 登入功能未啟用，請聯繫網站管理員。');
            return;
        }

        // 檢查瀏覽器兼容性
        if (!BrowserDetection.handleLoginButtonClick('google')) {
            return; // 被瀏覽器檢測阻止
        }

        const clickedBtn = document.getElementById('google-login-btn');

        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                'locale': 'zh_TW'
            });
            
            if (clickedBtn) {
                const originalText = clickedBtn.innerHTML;
                clickedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登入中...';
                clickedBtn.disabled = true;
                
                try {
                    const result = await signInWithPopup(auth, provider);
                    const user = result.user;
                    
                    console.log('Google 登入成功:', user.uid);

                    await saveUserState(user);
                    const displayName = user.displayName || user.email?.split('@')[0] || 'Google用戶';
                    localStorage.setItem('userName', displayName);
                    await checkIfAdmin(user);

                    // 保存或更新用戶資料到 Firestore
                    await saveUserToFirestore(user, displayName, 'google');
                    
                    if (window.authModals) {
                        window.authModals.hideAllModals();
                    }
                    
                    updateLoginUI(user);
                    showMemberSuccessModal('登入成功', 'Google 登入成功！');
                    
                } catch (popupError) {
                    if (popupError.code === 'auth/popup-blocked') {
                        console.log('彈窗被阻擋，嘗試重定向方式');
                        await signInWithRedirect(auth, provider);
                    } else {
                        throw popupError;
                    }
                } finally {
                    if (clickedBtn) {
                        clickedBtn.innerHTML = originalText;
                        clickedBtn.disabled = false;
                    }
                }
            }
            
        } catch (error) {
            console.error('Google 登入失敗:', error);
            
            if (clickedBtn) {
                clickedBtn.innerHTML = '<i class="fab fa-google"></i> 使用 Google 登入';
                clickedBtn.disabled = false;
            }
            
            handleAuthError(error, 'Google 登入失敗');
        }
    }

    // Facebook 登入功能實現
    async function handleFacebookLogin() {
        if (!FacebookAuthProvider || !signInWithPopup) {
            showMemberErrorModal('功能未啟用', 'Facebook 登入功能未啟用，請聯繫網站管理員。');
            return;
        }

        // 檢查瀏覽器兼容性
        if (!BrowserDetection.handleLoginButtonClick('facebook')) {
            return; // 被瀏覽器檢測阻止
        }

        const clickedBtn = document.getElementById('facebook-login-btn');

        try {
            const provider = new FacebookAuthProvider();
            provider.addScope('email');
            provider.setCustomParameters({
                'locale': 'zh_TW'
            });
            
            if (clickedBtn) {
                const originalText = clickedBtn.innerHTML;
                clickedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登入中...';
                clickedBtn.disabled = true;
                
                try {
                    const result = await signInWithPopup(auth, provider);
                    const user = result.user;
                    
                    console.log('Facebook 登入成功:', user.uid);

                    await saveUserState(user);
                    const displayName = user.displayName || user.email?.split('@')[0] || 'Facebook用戶';
                    localStorage.setItem('userName', displayName);
                    await checkIfAdmin(user);
                    
                    // 保存或更新用戶資料到 Firestore
                    await saveUserToFirestore(user, displayName, 'facebook');
                    
                    if (window.authModals) {
                        window.authModals.hideAllModals();
                    }
                    
                    updateLoginUI(user);
                    showMemberSuccessModal('登入成功', 'Facebook 登入成功！');
                    
                } catch (popupError) {
                    if (popupError.code === 'auth/popup-blocked') {
                        console.log('彈窗被阻擋，嘗試重定向方式');
                        await signInWithRedirect(auth, provider);
                    } else {
                        throw popupError;
                    }
                } finally {
                    if (clickedBtn) {
                        clickedBtn.innerHTML = originalText;
                        clickedBtn.disabled = false;
                    }
                }
            }
            
        } catch (error) {
            console.error('Facebook 登入失敗:', error);
            
            if (clickedBtn) {
                clickedBtn.innerHTML = '<i class="fab fa-facebook-f"></i> 使用 Facebook 登入';
                clickedBtn.disabled = false;
            }
            
            handleAuthError(error, 'Facebook 登入失敗');
        }
    }

    // LINE 登入功能實現。
    // LINE 不是 Firebase Auth 內建支援的登入方式，所以不能像 Google/Facebook
    // 那樣直接 signInWithPopup(auth, provider)。改成：開一個彈窗導去 LINE 的
    // 授權頁面 → 使用者在 LINE 那邊完成授權 → LINE 導回我們的 Cloud Function
    // （functions/line-login.js）→ Cloud Function 跟 LINE 換使用者資料、
    // 發一組 Firebase Custom Token → 用 postMessage 把 token 傳回這個彈窗的
    // 開啟者（也就是這個分頁）→ 這裡收到後呼叫 signInWithCustomToken() 完成登入
    function handleLineLogin() {
        if (!signInWithCustomToken) {
            showMemberErrorModal('功能未啟用', 'LINE 登入功能未啟用，請聯繫網站管理員。');
            return;
        }

        const LINE_LOGIN_CHANNEL_ID = '2011319370';
        const REDIRECT_URI = 'https://us-central1-jayfruit-9dfab.cloudfunctions.net/lineLoginCallback';
        const CLOUD_FUNCTION_ORIGIN = 'https://us-central1-jayfruit-9dfab.cloudfunctions.net';

        const clickedBtn = document.getElementById('line-login-btn');
        const lineBtnOriginalText = clickedBtn ? clickedBtn.innerHTML : '';
        function resetLineLoginBtn() {
            if (clickedBtn) {
                clickedBtn.innerHTML = lineBtnOriginalText;
                clickedBtn.disabled = false;
            }
        }
        if (clickedBtn) {
            clickedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登入中...';
            clickedBtn.disabled = true;
        }

        // state 只做基本的隨機值紀錄，不是完整的 CSRF 防護——這個彈窗流程沒有
        // 伺服器端 session 可以拿來核對 state 是否一致，真正的安全性來自於
        // 授權碼交換那一步一定要有 Channel secret 才能完成，且只能在我們
        // 自己的 Cloud Function（server-to-server）裡進行
        const state = Math.random().toString(36).slice(2);
        const authorizeUrl = 'https://access.line.me/oauth2/v2.1/authorize?' + new URLSearchParams({
            response_type: 'code',
            client_id: LINE_LOGIN_CHANNEL_ID,
            redirect_uri: REDIRECT_URI,
            state: state,
            scope: 'openid profile email'
        }).toString();

        const popup = window.open(authorizeUrl, 'line-login', 'width=420,height=650');
        if (!popup) {
            resetLineLoginBtn();
            showMemberErrorModal('無法開啟登入視窗', '請允許本網站開啟彈出視窗後再試一次。');
            return;
        }

        // 使用者也可能直接把彈窗關掉、沒有走完 LINE 授權流程——這種情況不會
        // 有 postMessage 送回來，靠輪詢偵測彈窗關閉，才能把按鈕恢復可點擊、
        // 清掉這個監聽器，不然會卡在「按鈕永遠反灰」的狀態
        const popupClosedCheck = setInterval(() => {
            if (popup.closed) {
                clearInterval(popupClosedCheck);
                window.removeEventListener('message', handleLineLoginMessage);
                resetLineLoginBtn();
            }
        }, 500);

        function handleLineLoginMessage(event) {
            if (event.origin !== CLOUD_FUNCTION_ORIGIN) return;
            if (!event.data || event.data.source !== 'line-login') return;

            clearInterval(popupClosedCheck);
            window.removeEventListener('message', handleLineLoginMessage);

            if (event.data.error) {
                resetLineLoginBtn();
                showMemberErrorModal('LINE 登入失敗', event.data.error);
                return;
            }
            if (!event.data.token) {
                resetLineLoginBtn();
                return;
            }

            // 拿到 token 之後還要跑 signInWithCustomToken + 寫入 Firestore，
            // 按鈕繼續轉圈到這整段都跑完（不管成功或失敗）才恢復，
            // 讓使用者看得出來還在處理中，跟 Google/Facebook 登入的體驗一致

            signInWithCustomToken(auth, event.data.token)
                .then(async (result) => {
                    const user = result.user;
                    const displayName = user.displayName || event.data.displayName || 'LINE 用戶';
                    // Cloud Function 那邊已經用這次登入拿到的 LINE access_token
                    // 查過好友狀態了，這裡直接收現成的結果就好，不用自己再查一次
                    const lineFriend = event.data.lineFriend;

                    console.log('LINE 登入成功:', user.uid);

                    await saveUserState(user);
                    localStorage.setItem('userName', displayName);
                    await checkIfAdmin(user);

                    // 保存或更新用戶資料到 Firestore（含好友狀態）
                    await saveUserToFirestore(user, displayName, 'line', lineFriend);

                    if (window.authModals) {
                        window.authModals.hideAllModals();
                    }

                    updateLoginUI(user);

                    // lineFriend === false 才提示（null 代表查詢失敗，不確定狀態，
                    // 不主動打擾使用者，等進到結帳頁再用 Firestore 存的值判斷一次）
                    if (lineFriend === false) {
                        showAddLineFriendModal();
                    } else {
                        showMemberSuccessModal('登入成功', 'LINE 登入成功！');
                    }
                })
                .catch((error) => {
                    console.error('LINE 登入失敗:', error);
                    handleAuthError(error, 'LINE 登入失敗');
                })
                .finally(() => {
                    resetLineLoginBtn();
                });
        }

        window.addEventListener('message', handleLineLoginMessage);
    }

    // 更新登入後的 UI 狀態
    function updateLoginUI(user) {
        const displayName = localStorage.getItem('userName') || user.displayName || user.email?.split('@')[0] || user.phoneNumber || '用戶';
        
        // 更新桌面版 UI
        if (userActions) userActions.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (usernameDisplay) usernameDisplay.textContent = displayName;
        
        // 更新手機版 UI
        if (userActionsMobile) userActionsMobile.style.display = 'none';
        if (userProfileMobile) userProfileMobile.style.display = 'block';
        if (usernameDisplayMobile) usernameDisplayMobile.textContent = displayName;
    }
    
    // 初始化 UI 狀態
    function initializeUI() {
        // 首先隱藏所有用戶相關元素，防止閃現
        if (userActions) userActions.style.display = 'none';
        if (userProfile) userProfile.style.display = 'none';
        if (userActionsMobile) userActionsMobile.style.display = 'none';
        if (userProfileMobile) userProfileMobile.style.display = 'none';
        
        // 從 localStorage 讀取上次的登入狀態
        const isLoggedIn = localStorage.getItem('userIsLoggedIn') === 'true';
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        const isAdminUser = localStorage.getItem('isAdmin') === 'true';
        
        if (isLoggedIn) {
            // 已登入狀態
            if (userActions) userActions.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (userActionsMobile) userActionsMobile.style.display = 'none';
            if (userProfileMobile) userProfileMobile.style.display = 'block';
            
            const displayName = userName || (userEmail ? userEmail.split('@')[0] : '用戶');
            if (usernameDisplay) usernameDisplay.textContent = displayName;
            if (usernameDisplayMobile) usernameDisplayMobile.textContent = displayName;
            
            if (isAdminUser) {
                if (adminBtn) adminBtn.style.display = 'block';
                if (adminBtnMobile) adminBtnMobile.style.display = 'block';
            }
        } else {
            // 未登入狀態
            if (userActions) userActions.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
            if (userActionsMobile) userActionsMobile.style.display = 'block';
            if (userProfileMobile) userProfileMobile.style.display = 'none';
            
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminBtnMobile) adminBtnMobile.style.display = 'none';
        }
    }
    
    // 清除舊版本 bug 曾寫入的字面字串 "undefined"/"null"（localStorage 只能存字串，
    // 過去若把 undefined 存進去會變成這兩個字串本身，且為 truthy，會被誤判為有效用戶名）
    const storedUserName = localStorage.getItem('userName');
    if (storedUserName === 'undefined' || storedUserName === 'null') {
        localStorage.removeItem('userName');
    }

    // 立即初始化 UI 狀態
    initializeUI();

    try {
        console.log("Firebase 初始化成功");
        
        // 綁定登入按鈕事件
        document.addEventListener('click', function(e) {
            if (e.target.closest('#google-login-btn')) {
                e.preventDefault();
                e.stopPropagation();
                handleGoogleLogin();
            }
            
            if (e.target.closest('#facebook-login-btn')) {
                e.preventDefault();
                e.stopPropagation();
                handleFacebookLogin();
            }

            if (e.target.closest('#line-login-btn')) {
                e.preventDefault();
                e.stopPropagation();
                handleLineLogin();
            }
        });

        // 綁定電話登入事件
        window.addEventListener('phoneLoginSubmit', function(e) {
            const phoneNumber = e.detail.phoneNumber;
            handlePhoneLogin(phoneNumber);
        });

        window.addEventListener('verifyCodeSubmit', function(e) {
            const code = e.detail.code;
            verifyPhoneCode(code);
        });

        window.addEventListener('resendCodeSubmit', function() {
            resendVerificationCode();
        });
        
        // 檢查重定向結果
        if (getRedirectResult) {
            getRedirectResult(auth)
                .then(async (result) => {
                    if (result) {
                        const user = result.user;
                        console.log('重定向登入成功:', user.uid);

                        const displayName = user.displayName || user.email?.split('@')[0] || '用戶';
                        await saveUserState(user);
                        localStorage.setItem('userName', displayName);
                        await checkIfAdmin(user);

                        // 彈窗被瀏覽器擋掉、改用重定向登入時，這條路徑之前完全沒呼叫
                        // saveUserToFirestore，導致這樣登入的用戶從未被寫入 Firestore
                        const redirectProviderId = user.providerData[0]?.providerId || '';
                        const redirectProvider = redirectProviderId.includes('facebook') ? 'facebook' : 'google';
                        await saveUserToFirestore(user, displayName, redirectProvider);

                        updateLoginUI(user);

                        showMemberSuccessModal('登入成功', '登入成功！');
                    }
                })
                .catch((error) => {
                    console.error('重定向登入失敗:', error);
                    showMemberErrorModal('登入失敗', '重定向登入失敗，請重試。');
                });
        }

        // 用戶下拉選單的開關綁定由 common.js（前台）/ admin-common.js（後台）統一處理，
        // 這裡不再重複綁定，避免同一顆按鈕被綁兩個監聽器導致點擊互相抵銷。

        // 處理用戶登出 (通用函數)
        function handleLogout() {
            console.log("嘗試登出");
            signOut(auth)
                .then(async () => {
                    console.log("登出成功");

                    // 清除本地存儲中的用戶狀態
                    await saveUserState(null);
                    
                    // 關閉用戶選單
                    if (userMenu) userMenu.style.display = 'none';
                    
                    // 確保UI更新為未登入狀態
                    if (userActions) userActions.style.display = 'flex';
                    if (userProfile) userProfile.style.display = 'none';
                    if (userActionsMobile) userActionsMobile.style.display = 'block';
                    if (userProfileMobile) userProfileMobile.style.display = 'none';
                    
                    // 確保管理員按鈕隱藏
                    if (adminBtn) adminBtn.style.display = 'none';
                    if (adminBtnMobile) adminBtnMobile.style.display = 'none';
                    
                    // 清除 reCAPTCHA 驗證器
                    if (window.recaptchaVerifier) {
                        window.recaptchaVerifier.clear();
                        window.recaptchaVerifier = null;
                    }
                    
                    // 清除確認結果
                    confirmationResult = null;
                    
                    showMemberSuccessModal('登出成功', '已成功登出');
                })
                .catch((error) => {
                    console.error('登出失敗:', error);
                    showMemberErrorModal('登出失敗', '登出失敗: ' + error.message);
                });
        }

        // 暴露到全域，讓 common.js 的 bindUserMenuLinks()（下拉選單裡的登出
        // 連結會被 initUserDropdown() clone 節點重新綁定）能呼叫到這份登出
        // 邏輯，不用自己另外重複實作一份。只在還沒有人設定過 window.handleLogout
        // 時才設定——orders.html、profile.html 這類頁面自己在全域宣告了一份
        // 「登出後導回首頁」的版本（比這裡先執行，因為是同一支 script 裡
        // 同步宣告的），那些頁面應該保留自己的版本，不能被這裡蓋掉
        if (!window.handleLogout) {
            window.handleLogout = handleLogout;
        }

        // 桌面版登出按鈕
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                handleLogout();
            });
        }

        // 手機版登出按鈕
        const logoutBtnMobile = document.getElementById('logout-btn-mobile');
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', function(e) {
                e.preventDefault();
                handleLogout();
            });
        }

        // 監聽認證狀態變化
        onAuthStateChanged(auth, async function(user) {
            console.log("認證狀態變化，用戶狀態:", user ? "已登入" : "未登入");

            if (user) {
                console.log("用戶已登入:", user.uid);

                await saveUserState(user);

                // 更新 UI
                if (userActions) userActions.style.display = 'none';
                if (userProfile) userProfile.style.display = 'flex';
                if (userActionsMobile) userActionsMobile.style.display = 'none';
                if (userProfileMobile) userProfileMobile.style.display = 'block';

                await checkIfAdmin(user);
                
                // 更新最後登入時間
                const lastUpdate = localStorage.getItem('lastLoginUpdate');
                const now = Date.now();
                if (!lastUpdate || (now - parseInt(lastUpdate)) > 3600000) {
                    const lastLoginDocRef = doc(window.firebaseServices.db, 'users', user.uid);
                    // 先確認文件已經存在才更新，不要用 setDoc({merge:true}) 直接寫——
                    // 這段登入時一定會跑，跟下面 saveUserToFirestore() 建立新用戶
                    // 資料是同時觸發的兩段非同步流程，如果這裡搶先執行，會用「只有
                    // lastLoginAt 一個欄位」的內容把文件建立起來，導致
                    // saveUserToFirestore() 之後誤判成「已存在的舊會員」而不去
                    // 補上姓名等預設欄位（新用戶第一次登入時的競爭條件，LINE 登入
                    // 已經實際踩到過一次：姓名變成空的，只能顯示「用戶」）
                    getDoc(lastLoginDocRef)
                        .then((docSnap) => {
                            if (!docSnap.exists()) return;
                            return setDoc(lastLoginDocRef, { lastLoginAt: serverTimestamp() }, { merge: true });
                        })
                        .then(() => {
                            localStorage.setItem('lastLoginUpdate', now.toString());
                        })
                        .catch(error => {
                            console.warn('更新最後登入時間失敗:', error);
                        });
                }

                // 從 Firestore 獲取用戶資料
                getDoc(doc(window.firebaseServices.db, 'users', user.uid))
                    .then((docSnap) => {
                        if (docSnap.exists()) {
                            // Firestore 的 name 欄位可能為空字串或不存在（例如手機登入的新用戶尚未填寫姓名），
                            // 沒有 fallback 的話畫面會顯示字面上的 "undefined"
                            const name = docSnap.data().name || user.email?.split('@')[0] || user.phoneNumber || '用戶';
                            console.log("獲取用戶資料:", name);
                            localStorage.setItem('userName', name);

                            if (usernameDisplay) {
                                usernameDisplay.textContent = name;
                            }
                            if (usernameDisplayMobile) {
                                usernameDisplayMobile.textContent = name;
                            }

                            // 結帳頁提醒：LINE 登入、且登入時查到還沒加官方好友，
                            // 提醒使用者加好友才收得到訂單即時通知。用 Firestore
                            // 存的 lineFriend（登入當下查的結果）判斷，不在這裡
                            // 重新呼叫 LINE API
                            if (!lineFriendPromptShown
                                && window.location.pathname.endsWith('checkout.html')
                                && user.uid.startsWith('line:')
                                && docSnap.data().lineFriend === false) {
                                lineFriendPromptShown = true;
                                if (window.showAddLineFriendModal) {
                                    window.showAddLineFriendModal();
                                }
                            }
                        } else {
                            // 如果找不到用戶資料，使用預設顯示
                            const name = user.email?.split('@')[0] || user.phoneNumber || '用戶';
                            localStorage.setItem('userName', name);
                            
                            if (usernameDisplay) {
                                usernameDisplay.textContent = name;
                            }
                            if (usernameDisplayMobile) {
                                usernameDisplayMobile.textContent = name;
                            }
                        }

                        // 強制更新用戶名稱顯示
                        setTimeout(() => {
                            const userName = localStorage.getItem('userName');
                            if (userName) {
                                const usernameDisplayElem = document.getElementById('username-display');
                                const usernameDisplayMobileElem = document.getElementById('username-display-mobile');
                                
                                if (usernameDisplayElem) {
                                    usernameDisplayElem.textContent = userName;
                                }
                                
                                if (usernameDisplayMobileElem) {
                                    usernameDisplayMobileElem.textContent = userName;
                                }

                                console.log("用戶名稱顯示已更新為:", userName);
                            }
                        }, 500);
                    })
                    .catch((error) => {
                        console.warn('無法連接到數據庫:', error);

                        // 連線失敗不代表沒有名字可顯示——localStorage 裡可能已經有
                        // 上次登入存下來的正確名字（畫面此刻其實正確顯示著），這種
                        // 情況下維持原樣就好，不要用信箱前綴這種較差的名字蓋掉它。
                        // 只有完全沒有任何快取過的名字時，才退而求其次用信箱前綴。
                        const cachedName = localStorage.getItem('userName');
                        if (cachedName) {
                            return;
                        }

                        const name = user.email?.split('@')[0] || user.phoneNumber || '用戶';
                        localStorage.setItem('userName', name);

                        if (usernameDisplay) {
                            usernameDisplay.textContent = name;
                        }
                        if (usernameDisplayMobile) {
                            usernameDisplayMobile.textContent = name;
                        }
                    });
            } else {
                console.log("用戶未登入");

                await saveUserState(null);
                
                // 更新 UI
                if (userActions) userActions.style.display = 'flex';
                if (userProfile) userProfile.style.display = 'none';
                if (userActionsMobile) userActionsMobile.style.display = 'block';
                if (userProfileMobile) userProfileMobile.style.display = 'none';
                
                // 隱藏管理員按鈕
                if (adminBtn) adminBtn.style.display = 'none';
                if (adminBtnMobile) adminBtnMobile.style.display = 'none';
            }
        });
        
    } catch (error) {
        console.error("Firebase 初始化失敗:", error);
        initializeUI();
    }

    // 確保頁面完全載入後，會員名稱正確顯示
    setTimeout(() => {
        const userName = localStorage.getItem('userName');
        const userIsLoggedIn = localStorage.getItem('userIsLoggedIn') === 'true';
        
        if (userIsLoggedIn && userName) {
            const usernameDisplayElem = document.getElementById('username-display');
            const usernameDisplayMobileElem = document.getElementById('username-display-mobile');
            
            if (usernameDisplayElem) {
                usernameDisplayElem.textContent = userName;
            }
            
            if (usernameDisplayMobileElem) {
                usernameDisplayMobileElem.textContent = userName;
            }
            
            console.log("頁面載入完成後，確保會員名稱顯示為:", userName);
        }
    }, 1000);
});