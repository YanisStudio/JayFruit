/**
 * 杰の御果園網站 - 共用功能模組
 * 包含所有頁面的共同功能
 */

// 將字串跳脫為安全的 HTML 文字，避免客戶輸入的資料（姓名、備註等）
// 被當成 HTML/JS 執行（Stored XSS）
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;

// 全域變數
window.CommonModule = {
    // Firebase 服務引用
    firebase: null,

    // 當前用戶
    currentUser: null
};

/**
 * 初始化共用功能
 * 在每個頁面的 DOMContentLoaded 事件中調用
 */
function initCommonFeatures() {
    console.log('初始化共用功能...');
    
    // 初始化 Firebase 服務引用
    CommonModule.firebase = window.firebaseServices;
    
    // 初始化各種功能
    initMenuToggle();
    initUserDropdown();
    initMobileMenuButtons();
    initAdminAccess();
    updateCartCount();
    
    // 綁定窗口調整事件
    window.addEventListener('resize', handleWindowResize);
    
    console.log('共用功能初始化完成');
}

/**
 * 漢堡選單功能
 */
function initMenuToggle() {
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('main-nav');
    const menuOverlay = document.getElementById('menu-overlay');
    const body = document.body;
    
    if (!menuToggle || !mainNav || !menuOverlay) {
        console.warn('找不到選單相關元素');
        return;
    }
    
    // 移除現有事件監聽器（避免重複綁定）
    const newMenuToggle = menuToggle.cloneNode(true);
    menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
    
    // 切換選單狀態
    const toggleMenu = function() {
        if (mainNav.classList.contains('active')) {
            // 關閉選單
            mainNav.classList.remove('active');
            menuOverlay.classList.remove('active');
            body.classList.remove('menu-open');
        } else {
            // 開啟選單
            mainNav.classList.add('active');
            menuOverlay.classList.add('active');
            body.classList.add('menu-open');
            
            // 同步狀態
            syncMobileStates();
        }
    };
    
    // 綁定事件
    newMenuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });
    
    menuOverlay.addEventListener('click', function() {
        if (mainNav.classList.contains('active')) {
            toggleMenu();
        }
    });
    
    // 選單項目點擊後關閉選單
    const menuItems = document.querySelectorAll('nav ul li a');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768 && mainNav.classList.contains('active')) {
                setTimeout(() => toggleMenu(), 50);
            }
        });
    });
    
    // 儲存切換函數供其他地方使用
    window.toggleMenu = toggleMenu;
}

/**
 * 用戶下拉選單功能
 */
function initUserDropdown() {
    const userDropdownBtn = document.getElementById('user-dropdown-btn');
    const userMenu = document.getElementById('user-menu');
    
    if (!userDropdownBtn || !userMenu) {
        console.warn('找不到用戶下拉選單元素');
        return;
    }
    
    // 確保菜單初始隱藏
    userMenu.style.display = 'none';
    
    // 移除現有事件監聽器
    const newBtn = userDropdownBtn.cloneNode(true);
    userDropdownBtn.parentNode.replaceChild(newBtn, userDropdownBtn);
    
    const newMenu = userMenu.cloneNode(true);
    userMenu.parentNode.replaceChild(newMenu, userMenu);
    
    // 綁定點擊事件
    newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (newMenu.style.display === 'block') {
            newMenu.style.display = 'none';
        } else {
            newMenu.style.display = 'block';
        }
    });
    
    // 阻止選單內部點擊穿透
    newMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 重新綁定選單功能
    bindUserMenuLinks(newMenu);
    
    // 點擊其他地方關閉選單
    document.addEventListener('click', function() {
        if (newMenu.style.display === 'block') {
            newMenu.style.display = 'none';
        }
    });
}

/**
 * 綁定用戶選單中的連結功能
 */
function bindUserMenuLinks(menu) {
    const links = menu.querySelectorAll('a');
    
    links.forEach(link => {
        if (link.id === 'logout-btn') {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                // 呼叫 member.js 暴露出來的登出邏輯（唯一正確版本，不整頁
                // 重新整理）；理論上 member.js 一定會比這裡先執行完，
                // 保留這個判斷純粹是防禦性寫法
                if (window.handleLogout) {
                    window.handleLogout();
                } else {
                    console.error('登出功能尚未就緒，請重新整理頁面再試');
                }
            });
        }
    });
}

/**
 * 初始化手機版選單按鈕
 */
function initMobileMenuButtons() {
    // 登入按鈕
    setupMobileButton('login-btn-mobile', 'login-btn');
    
    // 註冊按鈕
    setupMobileButton('register-btn-mobile', 'register-btn');
    
    // 登出按鈕：桌面版/手機版登出按鈕的事件綁定已經統一交給 member.js
    // 處理（member.js 會直接對原始元素綁定，不會 clone 節點），這裡不用
    // 再重複綁定一次——見下面 setupMobileLogoutButton/setupDesktopLogoutButton
    // 的移除說明
}

/**
 * 設置手機版按鈕（登入/註冊）
 */
function setupMobileButton(mobileId, desktopId) {
    const mobileBtn = document.getElementById(mobileId);
    const desktopBtn = document.getElementById(desktopId);
    
    if (mobileBtn && desktopBtn) {
        const newMobileBtn = mobileBtn.cloneNode(true);
        mobileBtn.parentNode.replaceChild(newMobileBtn, mobileBtn);
        
        newMobileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 關閉選單
            if (window.toggleMenu && document.getElementById('main-nav').classList.contains('active')) {
                window.toggleMenu();
            }
            
            // 觸發桌面版按鈕
            setTimeout(() => desktopBtn.click(), 100);
        });
    }
}

/**
 * 登出按鈕的事件綁定跟實際登出邏輯，原本這裡有一份自己的實作
 * （setupMobileLogoutButton／setupDesktopLogoutButton／handleLogout），
 * 用 cloneNode 把按鈕整個換掉再重新綁定——問題是 member.js 也會對同一顆
 * 按鈕綁定它自己一份更完整的登出邏輯（清 reCAPTCHA、不整頁重新整理、
 * 正確更新 UI），這裡的 cloneNode 執行時機如果晚於 member.js 綁定，會把
 * member.js 的監聽器整個清掉，變成只剩這裡「登出後 location.reload()」
 * 這個比較陽春的版本在跑。實際症狀：在 order-success.html 這種頁面上，
 * 匯款確認表單送出後如果按登出，畫面會整頁重新整理，剛剛「已確認」的
 * 畫面狀態（純粹存在記憶體裡的 JS 變數，沒有持久化）就會不見，表單看起來
 * 像是「又跑出來」。已經全部移除，讓 member.js 的版本當唯一登出邏輯來源。
 */

/**
 * 同步手機版狀態（購物車數量和登入狀態）
 */
function syncMobileStates() {
    syncCartCount();
    syncLoginStatus();
}

/**
 * 同步購物車數量
 */
function syncCartCount() {
    const cartCount = document.getElementById('cart-count');
    const cartCountFixed = document.getElementById('cart-count-fixed');
    
    if (cartCount && cartCountFixed) {
        const count = cartCount.textContent;
        cartCountFixed.textContent = count;
    }
}

/**
 * 同步登入狀態
 */
function syncLoginStatus() {
    const userActions = document.getElementById('user-actions');
    const userProfile = document.getElementById('user-profile');
    const userActionsMobile = document.getElementById('user-actions-mobile');
    const userProfileMobile = document.getElementById('user-profile-mobile');
    
    if (userActions && userProfile && userActionsMobile && userProfileMobile) {
        if (userActions.style.display === 'none') {
            // 已登入狀態
            userActionsMobile.style.display = 'none';
            userProfileMobile.style.display = 'block';
            
            // 同步用戶名稱
            const usernameDisplay = document.getElementById('username-display');
            const usernameDisplayMobile = document.getElementById('username-display-mobile');
            if (usernameDisplay && usernameDisplayMobile) {
                usernameDisplayMobile.textContent = usernameDisplay.textContent;
            }
        } else {
            // 未登入狀態
            userActionsMobile.style.display = 'block';
            userProfileMobile.style.display = 'none';
        }
    }
}

/**
 * 更新購物車數量顯示
 */
function updateCartCount(animate = false) {
    // 從 localStorage 獲取購物車數據
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // 計算總商品數量
    // 數量欄位壞掉（null/NaN）時當成 0，不要讓購物車圖示顯示 NaN
    const totalItems = cart.reduce((total, item) => total + (Number(item && item.quantity) || 0), 0);
    
    // 更新購物車圖標數量
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
        
        if (totalItems === 0) {
            element.style.display = 'none';
        } else {
            element.style.display = 'flex';
            
            // 動畫效果
            if (animate) {
                element.classList.add('update');
                setTimeout(() => {
                    element.classList.remove('update');
                }, 300);
            }
        }
    });
    
    console.log('購物車數量更新:', totalItems);
    
    // 暴露給全域使用
    window.updateCartCount = updateCartCount;
}

/**
 * 檢查管理員權限
 */
function initAdminAccess() {
    if (CommonModule.firebase) {
        CommonModule.firebase.onAuthStateChanged(CommonModule.firebase.auth, async function(user) {
            const adminBtnDesktop = document.getElementById('admin-btn');
            const adminBtnMobile = document.getElementById('admin-btn-mobile');

            if (user && await isAdmin(user)) {
                // 顯示管理按鈕
                if (adminBtnDesktop) adminBtnDesktop.style.display = 'block';
                if (adminBtnMobile) adminBtnMobile.style.display = 'block';
                console.log('管理員已登入，顯示管理按鈕');
            } else {
                // 隱藏管理按鈕
                if (adminBtnDesktop) adminBtnDesktop.style.display = 'none';
                if (adminBtnMobile) adminBtnMobile.style.display = 'none';
            }
        });
    }
}

/**
 * 檢查是否為管理員
 * 改讀 Firebase Auth 的 admin custom claim，取代比對寫死的信箱清單
 */
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

/**
 * 顯示提示消息
 */
function showToast(message) {
    let toast = document.getElementById('toast-message');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * 添加到購物車（支持庫存檢查）
 */
function addToCart(productId, name, price, quantity = 1, stock = 0) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    const existingItemIndex = cart.findIndex(item => item.id === productId);
    
    if (existingItemIndex > -1) {
        const newQuantity = cart[existingItemIndex].quantity + quantity;
        if (stock > 0 && newQuantity > stock) {
            showToast(`庫存不足，最多可購買 ${stock} 份`);
            return;
        }
        
        cart[existingItemIndex].quantity = newQuantity;
        cart[existingItemIndex].stock = stock;
        // 同時更新成目前的價格與名稱：購物車裡可能是後台改價之前加入的舊價格，
        // 不更新的話顧客到結帳頁會被「價格已更新」擋下來
        cart[existingItemIndex].price = price;
        cart[existingItemIndex].name = name;
    } else {
        cart.push({
            id: productId,
            name: name,
            price: price,
            quantity: quantity,
            stock: stock
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount(true);
    showToast('商品已成功加入購物車');
}

/**
 * 初始化加入購物車按鈕
 */
function initAddToCartButtons() {
    // 排除商品詳細介紹彈窗裡的那顆按鈕：它不在 .product-card 裡，由
    // openProductDetailModal() 直接設 onclick。這裡 cloneNode 會把 onclick 一起換掉，
    // 彈窗開著時剛好重新渲染商品格（換頁、篩選、改視窗大小）就會讓彈窗裡的按鈕失效
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn:not(#pd-add-to-cart)');
    addToCartButtons.forEach(button => {
        // 移除現有事件監聽器
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            if (productCard) {
                const productId = productCard.dataset.productId;
                const productName = productCard.dataset.productName;
                const productPrice = parseFloat(productCard.dataset.productPrice);
                const productStock = parseInt(productCard.dataset.productStock);
                
                if (productStock <= 0) {
                    showToast('此商品目前無庫存');
                    return;
                }
                
                // 檢查購物車中已有數量
                const cart = JSON.parse(localStorage.getItem('cart')) || [];
                const existingItem = cart.find(item => item.id === productId);
                const currentQty = existingItem ? existingItem.quantity : 0;
                
                if (currentQty >= productStock) {
                    showToast(`庫存不足，最多可購買 ${productStock} 份`);
                    return;
                }
                
                addToCart(productId, productName, productPrice, 1, productStock);
                
                // 添加動畫效果
                this.classList.add('added');
                setTimeout(() => {
                    this.classList.remove('added');
                }, 1000);
            }
        });
    });
}

/**
 * 窗口大小變化處理
 */
function handleWindowResize() {
    if (window.innerWidth > 768) {
        const mainNav = document.getElementById('main-nav');
        const menuOverlay = document.getElementById('menu-overlay');
        const body = document.body;
        
        if (mainNav && mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
            menuOverlay.classList.remove('active');
            body.classList.remove('menu-open');
        }
    }
}

// onAuthStateChanged 第一次回呼前才代表 Auth 狀態（有無登入）已經確定；
// 快取成單一 promise，第一次呼叫才真的去等，之後（含重試）直接沿用同一個
// 已解決的 promise，不會每次查詢都重新等一次
let authReadyPromise = null;
function waitForAuthReady() {
    if (!CommonModule.firebase) {
        throw new Error('Firebase 服務未初始化');
    }
    if (!authReadyPromise) {
        authReadyPromise = new Promise((resolve) => {
            const unsubscribe = CommonModule.firebase.onAuthStateChanged(
                CommonModule.firebase.auth,
                () => {
                    unsubscribe();
                    resolve();
                }
            );
        });
    }
    return authReadyPromise;
}

/**
 * 重建 Firestore 連線：把舊的連線物件關掉，換一個全新的。
 *
 * 只換 window.firebaseServices 的 db 屬性，不整個換掉物件、也不重新整理頁面，
 * 所有「每次要用才即時讀取 window.firebaseServices.db」的地方下一次呼叫就會
 * 自動用到新連線。安全前提：沒有地方把 db 在模組載入時就解構成長生命週期的
 * 區域變數。
 *
 * 一定要帶回 js/firebase-config.js 的 FIRESTORE_SETTINGS，跟頁面初始化時同一份。
 */
async function resetFirestoreConnection() {
    const services = window.firebaseServices;
    if (!services || !services.app || !services.initializeFirestore || !services.terminate) {
        console.warn('無法重建 Firestore 連線：這個頁面沒有暴露 app/initializeFirestore/terminate');
        return false;
    }
    try {
        await services.terminate(services.db);
        services.db = services.initializeFirestore(services.app, window.FIRESTORE_SETTINGS);
        console.log('Firestore 連線已重建');
        return true;
    } catch (error) {
        console.error('重建 Firestore 連線失敗:', error);
        return false;
    }
}
window.resetFirestoreConnection = resetFirestoreConnection;

// ---- 什麼時候才該重建連線 ----
//
// 全站已改用 Firestore Lite（見 js/firebase-config.js），沒有長連線會卡住，
// 這套政策保留當安全網：讀取失敗時換一個新的實例沒有壞處。分兩種情況：
//
// 1. 這一頁「從來沒有成功讀到過資料」：一失敗就重建，之後每次失敗間隔夠久就再重建。
// 2. 這一頁已經成功讀過資料，之後才失敗（網路中途斷掉等）：terminate() 會中止所有
//    進行中的作業，連線如果只是慢、正要成功，一失敗就重建等於砍掉重練。
//    先讓它自己恢復，持續失敗夠久才重建。
const NEVER_CONNECTED_RESET_GAP_MS = 9000;
const RESET_AFTER_MS = 30000;
const RESET_COOLDOWN_MS = 60000;
let everSucceeded = false;
let firstFailureAt = 0;
let lastResetAt = 0;

// 讀取成功時呼叫（包含「成功但結果是空的」）：標記「這一頁連上過」，並把連續失敗的計時歸零
function noteFirestoreSuccess() {
    everSucceeded = true;
    firstFailureAt = 0;
}

/**
 * 讀取失敗時呼叫，依上面兩種情況決定要不要真的重建連線
 * @returns {Promise<boolean>} 這次有沒有真的重建
 */
async function maybeResetFirestoreConnection() {
    const now = Date.now();
    if (!everSucceeded) {
        if (now - lastResetAt < NEVER_CONNECTED_RESET_GAP_MS) return false;
        lastResetAt = now;
        return resetFirestoreConnection();
    }
    if (!firstFailureAt) {
        firstFailureAt = now;
        return false;
    }
    if (now - firstFailureAt < RESET_AFTER_MS) return false;
    if (now - lastResetAt < RESET_COOLDOWN_MS) return false;
    lastResetAt = now;
    return resetFirestoreConnection();
}
window.maybeResetFirestoreConnection = maybeResetFirestoreConnection;
window.noteFirestoreSuccess = noteFirestoreSuccess;

/**
 * 幫讀取加上逾時。Firestore Lite 的讀取是一般的 fetch，沒有完整版 SDK 那個
 * 「10 秒連不上就回報離線」的機制，萬一請求一直沒有回應，頁面會永遠停在載入中。
 * 逾時就丟出 code 為 deadline-exceeded 的錯誤，交給呼叫端原本的重試／錯誤處理。
 * @param {Promise} promise
 * @param {number} ms
 */
function withReadTimeout(promise, ms = 20000) {
    let timeoutId;
    return Promise.race([
        promise,
        new Promise((resolve, reject) => {
            timeoutId = setTimeout(() => {
                const error = new Error('讀取逾時（' + ms / 1000 + ' 秒沒有回應）');
                error.code = 'deadline-exceeded';
                reject(error);
            }, ms);
        })
    ]).finally(() => clearTimeout(timeoutId));
}
window.withReadTimeout = withReadTimeout;

/**
 * Firebase 相關工具函數
 */
const FirebaseUtils = {
    /**
     * 載入商品數據
     * options.includeInactive：true 時連下架商品也一併載入（給商品列表頁用，
     * 讓使用者看得到已下架商品但不能購買）；預設 false，維持結帳驗證、
     * 首頁等其他呼叫端原本「只看得到上架商品」的行為，避免動到那些地方
     */
    async loadProducts(filterCallback = null, options = {}) {
        if (!CommonModule.firebase) {
            throw new Error('Firebase 服務未初始化');
        }

        // 確保 Auth 狀態已經確定，再送出查詢，避免 Firestore 規則若有限制
        // 登入才能讀取時，查詢在 Auth 狀態還沒確定前就送出而查不準
        await waitForAuthReady();

        const db = CommonModule.firebase.db;
        const collection = CommonModule.firebase.collection;
        const getDocsFromServer = CommonModule.firebase.getDocsFromServer;
        const query = CommonModule.firebase.query;
        const where = CommonModule.firebase.where;

        const includeInactive = options.includeInactive === true;
        const productsQuery = includeInactive
            ? collection(db, "products")
            : query(collection(db, "products"), where("status", "==", "active"));

        // 用 getDocsFromServer 強制連到伺服器查詢（Lite 的 getDocs 本來就是）：
        // 連得上，不管有沒有資料都給真實答案；連不上直接 throw，交給呼叫端的
        // 重試機制處理，不會把「連不上」誤判成「沒有商品」。另外加上逾時，
        // 請求卡住時才不會永遠停在載入中
        const productsSnapshot = await withReadTimeout(getDocsFromServer(productsQuery));

        if (productsSnapshot.empty) {
            return [];
        }

        const products = [];
        productsSnapshot.forEach(doc => {
            const data = doc.data();
            const product = {
                id: doc.id,
                name: data.name || '未知商品',
                description: data.description || '',
                price: data.price || 0,
                unit: data.unit || '份',
                category: data.category || 'other',
                imageUrl: data.imageUrl || 'images/placeholder.jpg',
                tags: Array.isArray(data.tags) ? data.tags : [],
                stock: data.stock || 0,
                status: data.status || 'inactive',
                isFeaturedOffer: data.isFeaturedOffer === true,
                // 首頁沒有設定精選商品時，改用最新上架的商品，用建立時間排序
                createdAtMs: (data.createdAt && typeof data.createdAt.toMillis === 'function')
                    ? data.createdAt.toMillis() : 0
            };

            // 如果有過濾回調函數，則使用它
            if (!filterCallback || filterCallback(product)) {
                products.push(product);
            }
        });

        return products;
    },
    
    /**
     * 載入精選商品
     */
    async loadFeaturedProducts() {
        return this.loadProducts(product => product.isFeaturedOffer === true);
    }
};

/**
 * 商品詳細介紹彈跳視窗
 * 卡片上的描述只顯示 2 行，完整描述要點卡片或「查看詳細介紹」按鈕才看得到。
 * 卡片資料在各頁面自己的 render 函式裡寫進 window.__productDataCache，
 * 這裡只負責讀取、開關彈窗。頁面要有 #product-detail-modal 才會作用。
 */
let lastProductDetailTrigger = null;

function openProductDetailModal(productId) {
    const product = window.__productDataCache && window.__productDataCache[productId];
    const modal = document.getElementById('product-detail-modal');
    if (!product || !modal) return;

    const isAvailable = product.status === 'active';

    const image = document.getElementById('pd-image');
    image.src = product.imageUrl || 'images/placeholder.jpg';
    image.alt = product.name;
    document.getElementById('pd-name').textContent = product.name;
    document.getElementById('pd-price').textContent = `$${product.price}/${product.unit}`;

    const stockEl = document.getElementById('pd-stock');
    stockEl.textContent = !isAvailable ? '已下架' : (product.stock > 0 ? `庫存: ${product.stock} ${product.unit}` : '無庫存');
    stockEl.classList.toggle('low-stock', isAvailable && product.stock > 0 && product.stock < 5);

    document.getElementById('pd-desc').textContent = product.description || '';

    const peachEl = document.getElementById('pd-peach-warning');
    if (peachEl) peachEl.style.display = product.category === 'peach' ? 'flex' : 'none';

    const tagEl = document.getElementById('pd-tag');
    if (product.tags && product.tags.length > 0) {
        tagEl.textContent = product.tags[0];
        tagEl.style.display = 'inline-block';
    } else {
        tagEl.style.display = 'none';
    }

    document.getElementById('pd-unavailable').style.display = isAvailable ? 'none' : 'inline-block';

    // 彈窗不是 .product-card，沒辦法套用「找最近的 .product-card 讀 data-*」那套邏輯，
    // 這裡直接用 onclick 綁定，每次開窗都會用新商品的資料覆蓋掉上一次的綁定
    const addBtn = document.getElementById('pd-add-to-cart');
    addBtn.disabled = !isAvailable || product.stock <= 0;
    addBtn.onclick = function() {
        if (addBtn.disabled) return;
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cart.find(item => item.id === product.id);
        const currentQty = existingItem ? existingItem.quantity : 0;
        if (currentQty >= product.stock) {
            showToast(`庫存不足，最多可購買 ${product.stock} 份`);
            return;
        }
        addToCart(product.id, product.name, product.price, 1, product.stock);
        addBtn.classList.add('added');
        setTimeout(() => addBtn.classList.remove('added'), 1000);
    };

    const wishBtn = document.getElementById('pd-wish-btn');
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    wishBtn.disabled = !isAvailable;
    wishBtn.classList.toggle('active', wishlist.some(item => item.id === product.id));
    wishBtn.onclick = function() {
        const currentWishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        const index = currentWishlist.findIndex(item => item.id === product.id);
        if (index > -1) {
            currentWishlist.splice(index, 1);
            wishBtn.classList.remove('active');
            showToast(`已取消註記 ${product.name}`);
        } else {
            currentWishlist.push({ id: product.id, name: product.name, addedAt: new Date().toISOString() });
            wishBtn.classList.add('active');
            showToast(`已註記 ${product.name}`);
        }
        localStorage.setItem('wishlist', JSON.stringify(currentWishlist));
        if (typeof window.updateWishlistButtons === 'function') window.updateWishlistButtons();
    };

    modal.style.display = 'flex';
    document.body.classList.add('modal-open-noscroll');

    // 記住是從哪個元素開啟的，關閉時把焦點還回去
    lastProductDetailTrigger = document.activeElement;
    const closeBtn = modal.querySelector('.product-detail-close');
    if (closeBtn) closeBtn.focus();
}

function closeProductDetailModal() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('modal-open-noscroll');

    // 卡片可能已經被重新渲染掉（換頁、篩選），確認元素還在畫面上才聚焦
    if (lastProductDetailTrigger && document.body.contains(lastProductDetailTrigger)) {
        lastProductDetailTrigger.focus();
    }
    lastProductDetailTrigger = null;
}

function initProductDetailModal() {
    const modal = document.getElementById('product-detail-modal');
    if (!modal || modal.dataset.bound === 'true') return;
    modal.dataset.bound = 'true';

    // 事件代理綁在 document 上，商品格子重新渲染也不用重新綁定。
    // 卡片裡的「查看詳細介紹」是真的 <button>，鍵盤 Enter/Space 產生的 click 也會冒泡到這裡
    document.addEventListener('click', function(e) {
        const card = e.target.closest('.product-card');
        if (!card || card.closest('#product-detail-modal')) return;
        if (e.target.closest('.add-to-cart-btn, .wish-btn')) return;
        const productId = card.dataset.productId;
        if (productId) openProductDetailModal(productId);
    });

    const closeBtn = modal.querySelector('.product-detail-close');
    if (closeBtn) closeBtn.addEventListener('click', closeProductDetailModal);

    const backdrop = modal.querySelector('.product-detail-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeProductDetailModal);

    document.addEventListener('keydown', function(e) {
        if (modal.style.display !== 'flex') return;

        if (e.key === 'Escape') {
            closeProductDetailModal();
            return;
        }

        // 把 Tab 鎖在彈窗裡：aria-modal 只讓讀螢幕忽略後面的內容，
        // 用鍵盤的人還是會 Tab 到被遮住的卡片上
        if (e.key !== 'Tab') return;
        const focusables = modal.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });
}

// 暴露公用函數到全域
window.openProductDetailModal = openProductDetailModal;
window.closeProductDetailModal = closeProductDetailModal;
window.initProductDetailModal = initProductDetailModal;
window.initCommonFeatures = initCommonFeatures;
window.updateCartCount = updateCartCount;
window.addToCart = addToCart;
window.initAddToCartButtons = initAddToCartButtons;
window.showToast = showToast;
window.FirebaseUtils = FirebaseUtils;
// 頁首隨捲動縮放：在頁面最上方時 Logo 和選單比較大，往下捲就縮小，
// 留更多畫面給內容（樣式在 css/storefront.css 的 body.header-compact，只作用在桌面版）。
// 往下超過 80px 才縮小、回到 20px 以內才放大，中間留緩衝，避免頁首高度變化
// 讓捲動位置剛好卡在門檻上來回跳動
(function initHeaderShrink() {
    const COMPACT_AT = 80;
    const EXPAND_AT = 20;
    let ticking = false;

    function update() {
        ticking = false;
        const y = window.scrollY || window.pageYOffset;
        const compact = document.body.classList.contains('header-compact');
        if (!compact && y > COMPACT_AT) {
            document.body.classList.add('header-compact');
        } else if (compact && y < EXPAND_AT) {
            document.body.classList.remove('header-compact');
        }
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }, { passive: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', update);
    } else {
        update();
    }
})();
