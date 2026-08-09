/**
 * 球根花卉團購網站 - 共用功能模組
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
                handleLogout();
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
    
    // 登出按鈕
    setupMobileLogoutButton();
    
    // 桌面版登出按鈕
    setupDesktopLogoutButton();
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
 * 設置手機版登出按鈕
 */
function setupMobileLogoutButton() {
    const logoutBtnMobile = document.getElementById('logout-btn-mobile');
    
    if (logoutBtnMobile) {
        const newLogoutBtnMobile = logoutBtnMobile.cloneNode(true);
        logoutBtnMobile.parentNode.replaceChild(newLogoutBtnMobile, logoutBtnMobile);
        
        newLogoutBtnMobile.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 關閉選單
            if (window.toggleMenu && document.getElementById('main-nav').classList.contains('active')) {
                window.toggleMenu();
            }
            
            // 執行登出
            handleLogout();
        });
    }
}

/**
 * 設置桌面版登出按鈕
 */
function setupDesktopLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
}

/**
 * 處理登出操作
 */
function handleLogout() {
    if (CommonModule.firebase) {
        CommonModule.firebase.signOut(CommonModule.firebase.auth)
            .then(() => {
                console.log('登出成功');
                location.reload();
            })
            .catch((error) => {
                console.error('登出錯誤', error);
            });
    } else {
        console.log('Firebase服務未初始化，執行模擬登出');
        localStorage.removeItem('isLoggedIn');
        location.reload();
    }
}

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
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
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
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
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

// Firestore 底層連線偶爾會卡在錯誤狀態，同一個連線物件繼續重試往往要等很多次
// 才會恢復，跟手動整頁重新整理立刻正常有明顯落差（重新整理會建立全新連線，
// 繞過卡住的舊連線）。這個函式做的事跟重新整理達到同樣效果，但只換掉
// window.firebaseServices.db 這一個屬性，不整個換掉 window.firebaseServices
// 物件、也不重新整理頁面，所以會保留使用者當下的捲動位置、篩選條件等狀態。
//
// 安全前提：全站沒有地方把 db 從 window.firebaseServices 解構出來，快取成
// 長生命週期的區域變數（例如在 DOMContentLoaded 最外層 const { db } = ...
// 之後給很多函式共用）——那樣的變數換連線後不會自動更新，還在用已經
// terminate 掉的舊連線。要在每次真正要用 db 的當下，才去
// window.firebaseServices.db 現抓（全站已經逐一確認過都是這樣寫的）。
let resettingFirestoreConnection = null;
let lastFirestoreResetAt = 0;
const FIRESTORE_RESET_COOLDOWN_MS = 60000;

async function resetFirestoreConnection() {
    if (!CommonModule.firebase || !CommonModule.firebase.app ||
        !CommonModule.firebase.initializeFirestore || !CommonModule.firebase.terminate) {
        console.warn('這個頁面沒有暴露重建 Firestore 連線所需的函式，略過');
        return;
    }

    const now = Date.now();
    if (now - lastFirestoreResetAt < FIRESTORE_RESET_COOLDOWN_MS) {
        console.log('剛重建過 Firestore 連線，冷卻中，略過這次');
        return;
    }

    if (resettingFirestoreConnection) {
        return resettingFirestoreConnection;
    }

    resettingFirestoreConnection = (async () => {
        try {
            console.log('嘗試重建 Firestore 連線...');
            const oldDb = CommonModule.firebase.db;
            await CommonModule.firebase.terminate(oldDb);
            const newDb = CommonModule.firebase.initializeFirestore(CommonModule.firebase.app, {
                experimentalAutoDetectLongPolling: true
            });
            // 只換 window.firebaseServices 的 db 屬性，不整個換掉物件——
            // 所有透過 window.firebaseServices.db 即時讀取的地方會自動抓到新連線
            window.firebaseServices.db = newDb;
            lastFirestoreResetAt = Date.now();
            console.log('Firestore 連線已重建');
        } catch (error) {
            console.error('重建 Firestore 連線失敗:', error);
        } finally {
            resettingFirestoreConnection = null;
        }
    })();

    return resettingFirestoreConnection;
}
window.resetFirestoreConnection = resetFirestoreConnection;

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

        // 用 getDocsFromServer 強制連到伺服器查詢：連得上，不管有沒有資料都給
        // 真實答案；連不上直接 throw，交給呼叫端的重試機制處理，不會像
        // getDocs 那樣悄悄退回本地空快取、把「連不上」誤判成「沒有商品」
        const productsSnapshot = await getDocsFromServer(productsQuery);

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
                isFeaturedOffer: data.isFeaturedOffer || false
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

// 暴露公用函數到全域
window.initCommonFeatures = initCommonFeatures;
window.updateCartCount = updateCartCount;
window.addToCart = addToCart;
window.initAddToCartButtons = initAddToCartButtons;
window.showToast = showToast;
window.FirebaseUtils = FirebaseUtils;