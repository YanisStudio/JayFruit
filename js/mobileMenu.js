// mobileMenu.js - 手機選單系統
// 負責手機版漢堡選單的開關和相關功能

class MobileMenu {
    constructor() {
        this.isMenuOpen = false;
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEvents();
        this.setupResize();
        console.log('手機選單系統初始化完成');
    }

    setupElements() {
        this.menuToggle = document.getElementById('menu-toggle');
        this.mainNav = document.getElementById('main-nav');
        this.menuOverlay = document.getElementById('menu-overlay');
        this.body = document.body;
        
        // 檢查必要元素是否存在
        if (!this.menuToggle || !this.mainNav || !this.menuOverlay) {
            console.warn('手機選單必要元素缺失');
            return false;
        }
        
        return true;
    }

    setupEvents() {
        if (!this.setupElements()) return;

        // 漢堡選單按鈕點擊事件
        this.menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMenu();
        });

        // 點擊背景遮罩關閉選單
        this.menuOverlay.addEventListener('click', () => {
            if (this.isMenuOpen) {
                this.closeMenu();
            }
        });

        // 選單項目點擊後關閉選單
        this.setupMenuItemEvents();
        
        // ESC 鍵關閉選單
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMenu();
            }
        });
    }

    setupMenuItemEvents() {
        // 為所有選單連結添加點擊事件
        const menuItems = this.mainNav.querySelectorAll('a');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // 檢查是否為會員系統按鈕，如果是則不關閉選單
                const isAuthButton = item.id && (
                    item.id.includes('login') || 
                    item.id.includes('register') || 
                    item.id.includes('logout')
                );
                
                // 只有在手機模式下且不是會員按鈕才自動關閉選單
                if (window.innerWidth <= 768 && this.isMenuOpen && !isAuthButton) {
                    // 延遲關閉，讓按鈕事件先執行
                    setTimeout(() => {
                        this.closeMenu();
                    }, 100);
                }
            });
        });
    }

    setupResize() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // 如果切換到桌面模式，強制關閉選單
                if (window.innerWidth > 768 && this.isMenuOpen) {
                    this.closeMenu();
                }
            }, 250);
        });
    }

    toggleMenu() {
        if (this.isMenuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        if (!this.setupElements()) return;

        this.isMenuOpen = true;
        this.mainNav.classList.add('active');
        this.menuOverlay.classList.add('active');
        this.body.classList.add('menu-open');
        
        // 同步狀態
        this.syncStates();
        
        // 觸發自定義事件
        document.dispatchEvent(new CustomEvent('mobileMenuOpened'));
        
        console.log('手機選單已開啟');
    }

    closeMenu() {
        if (!this.setupElements()) return;

        this.isMenuOpen = false;
        this.mainNav.classList.remove('active');
        this.menuOverlay.classList.remove('active');
        this.body.classList.remove('menu-open');
        
        // 觸發自定義事件
        document.dispatchEvent(new CustomEvent('mobileMenuClosed'));
        
        console.log('手機選單已關閉');
    }

    syncStates() {
        // 同步購物車數量
        this.syncCartCount();
        
        // 同步登入狀態
        this.syncLoginStatus();
    }

    syncCartCount() {
        const cartCount = document.getElementById('cart-count');
        const cartCountMobile = document.getElementById('cart-count-mobile');
        const cartCountFixed = document.getElementById('cart-count-fixed');
        
        if (cartCount) {
            const count = cartCount.textContent;
            const display = cartCount.style.display;
            
            if (cartCountMobile) {
                cartCountMobile.textContent = count;
                cartCountMobile.style.display = display;
            }
            
            if (cartCountFixed) {
                cartCountFixed.textContent = count;
                cartCountFixed.style.display = display;
            }
        }
    }

    syncLoginStatus() {
        const userActions = document.getElementById('user-actions');
        const userProfile = document.getElementById('user-profile');
        const userActionsMobile = document.getElementById('user-actions-mobile');
        const userProfileMobile = document.getElementById('user-profile-mobile');
        
        if (!userActions || !userProfile || !userActionsMobile || !userProfileMobile) {
            return;
        }

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
            
            // 同步管理員按鈕狀態
            const adminBtn = document.getElementById('admin-btn');
            const adminBtnMobile = document.getElementById('admin-btn-mobile');
            if (adminBtn && adminBtnMobile) {
                adminBtnMobile.style.display = adminBtn.style.display;
            }
        } else {
            // 未登入狀態
            userActionsMobile.style.display = 'block';
            userProfileMobile.style.display = 'none';
        }
    }

    // 公開方法
    isOpen() {
        return this.isMenuOpen;
    }

    // 公開方法：強制刷新狀態同步
    refreshSync() {
        if (this.isMenuOpen) {
            this.syncStates();
        }
    }
}

// 為其他模組提供的用戶下拉選單管理
class UserDropdown {
    constructor() {
        this.userDropdownBtn = null;
        this.userMenu = null;
        this.isInitialized = false;
        this.init();
    }

    init() {
        // 延遲初始化，確保DOM元素已存在
        setTimeout(() => {
            this.setupDropdown();
        }, 100);
    }

    setupDropdown() {
        this.userDropdownBtn = document.getElementById('user-dropdown-btn');
        this.userMenu = document.getElementById('user-menu');
        
        if (!this.userDropdownBtn || !this.userMenu) {
            console.warn('用戶下拉選單元素未找到，將重試...');
            // 如果元素還沒準備好，再次嘗試
            setTimeout(() => {
                this.setupDropdown();
            }, 500);
            return;
        }

        if (this.isInitialized) {
            return; // 避免重複初始化
        }

        // 點擊用戶名稱顯示/隱藏下拉選單
        this.userDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isVisible = this.userMenu.style.display === 'block';
            this.userMenu.style.display = isVisible ? 'none' : 'block';
            
            console.log('用戶下拉選單切換:', !isVisible ? '開啟' : '關閉');
        });

        // 點擊頁面其他區域關閉下拉選單
        document.addEventListener('click', (event) => {
            if (this.userMenu && 
                this.userDropdownBtn && 
                !this.userDropdownBtn.contains(event.target) && 
                !this.userMenu.contains(event.target)) {
                this.userMenu.style.display = 'none';
            }
        });

        // ESC 鍵關閉下拉選單
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.userMenu && this.userMenu.style.display === 'block') {
                this.userMenu.style.display = 'none';
            }
        });

        this.isInitialized = true;
        console.log('用戶下拉選單初始化完成');
    }

    // 公開方法：手動重新初始化
    reinitialize() {
        this.isInitialized = false;
        this.setupDropdown();
    }

    // 公開方法：關閉下拉選單
    closeDropdown() {
        if (this.userMenu) {
            this.userMenu.style.display = 'none';
        }
    }

    // 公開方法：切換下拉選單
    toggleDropdown() {
        if (this.userMenu) {
            const isVisible = this.userMenu.style.display === 'block';
            this.userMenu.style.display = isVisible ? 'none' : 'block';
        }
    }
}

// 購物車數量同步管理
class CartSync {
    constructor() {
        this.cartCountElements = [
            'cart-count',
            'cart-count-mobile', 
            'cart-count-fixed'
        ];
    }

    // 更新所有購物車數量顯示
    updateCartCount(animate = false) {
        // 從本地存儲獲取購物車數據
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        
        // 更新所有購物車圖標數量
        this.cartCountElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
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
            }
        });
        
        console.log('購物車數量已同步:', totalItems);
        return totalItems;
    }

    // 監聽購物車變化
    setupCartListener() {
        // 監聽本地存儲變化
        window.addEventListener('storage', (e) => {
            if (e.key === 'cart') {
                this.updateCartCount();
            }
        });
        
        // 監聽自定義購物車更新事件
        document.addEventListener('cartUpdated', () => {
            this.updateCartCount(true);
        });
    }
}

// 初始化所有系統
document.addEventListener('DOMContentLoaded', function() {
    // 初始化手機選單
    window.mobileMenu = new MobileMenu();
    
    // 初始化用戶下拉選單
    window.userDropdown = new UserDropdown();
    
    // 初始化購物車同步
    window.cartSync = new CartSync();
    window.cartSync.setupCartListener();
    
    // 初始購物車數量顯示
    window.cartSync.updateCartCount();
    
    // 覆蓋全局的 updateCartCount 函數（向後兼容）
    window.updateCartCount = function(animate = false) {
        return window.cartSync.updateCartCount(animate);
    };
    
    console.log('選單和 UI 系統初始化完成');
});