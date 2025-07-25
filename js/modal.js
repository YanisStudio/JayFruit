// modal.js - 彈窗系統管理
// 負責所有彈窗的開啟、關閉、切換等基本操作

class ModalSystem {
    constructor() {
        this.modals = new Map();
        this.init();
    }

    init() {
        // 註冊所有彈窗
        this.registerModal('login-modal', 'login-btn', 'close-login');
        this.registerModal('register-modal', 'register-btn', 'close-register');
        this.registerModal('sms-modal', 'send-sms-btn', 'close-sms');
        
        // 設置彈窗切換事件
        this.setupModalSwitching();
        
        // 設置點擊外部關閉彈窗
        this.setupClickOutsideClose();
        
        // 設置手機版按鈕事件
        this.setupMobileButtons();
    }

    registerModal(modalId, openBtnId, closeBtnId) {
        const modal = document.getElementById(modalId);
        const openBtn = document.getElementById(openBtnId);
        const closeBtn = document.getElementById(closeBtnId);

        if (modal) {
            this.modals.set(modalId, {
                modal: modal,
                openBtn: openBtn,
                closeBtn: closeBtn
            });

            // 設置開啟按鈕事件
            if (openBtn) {
                openBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openModal(modalId);
                });
            }

            // 設置關閉按鈕事件
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal(modalId);
                });
            }
        }
    }

    openModal(modalId) {
        // 先關閉所有彈窗
        this.closeAllModals();
        
        const modalData = this.modals.get(modalId);
        if (modalData && modalData.modal) {
            modalData.modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // 防止背景滾動
            
            // 觸發自定義事件
            document.dispatchEvent(new CustomEvent('modalOpened', { detail: { modalId } }));
        }
    }

    closeModal(modalId) {
        const modalData = this.modals.get(modalId);
        if (modalData && modalData.modal) {
            modalData.modal.style.display = 'none';
            document.body.style.overflow = ''; // 恢復滾動
            
            // 清理特定彈窗的狀態
            this.cleanupModal(modalId);
            
            // 觸發自定義事件
            document.dispatchEvent(new CustomEvent('modalClosed', { detail: { modalId } }));
        }
    }

    closeAllModals() {
        this.modals.forEach((modalData, modalId) => {
            if (modalData.modal.style.display === 'block') {
                this.closeModal(modalId);
            }
        });
    }

    cleanupModal(modalId) {
        // 清理表單
        const modalData = this.modals.get(modalId);
        if (modalData && modalData.modal) {
            const forms = modalData.modal.querySelectorAll('form');
            forms.forEach(form => form.reset());
            
            // 清理錯誤訊息
            const messages = modalData.modal.querySelectorAll('.error-message, .success-message');
            messages.forEach(msg => {
                msg.style.display = 'none';
                msg.textContent = '';
            });
            
            // 特定彈窗的清理
            if (modalId === 'sms-modal') {
                // 隱藏驗證碼輸入欄位
                const verificationGroup = document.getElementById('verification-code-group');
                if (verificationGroup) {
                    verificationGroup.style.display = 'none';
                }
                
                // 重置按鈕文字
                const submitBtn = modalData.modal.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = '發送驗證碼';
                    submitBtn.disabled = false;
                }
                
                // 清理 reCAPTCHA（如果存在）
                if (window.memberAuth && window.memberAuth.clearRecaptcha) {
                    window.memberAuth.clearRecaptcha();
                }
            }
        }
    }

    setupModalSwitching() {
        // 登入 -> 註冊
        const switchToRegister = document.getElementById('switch-to-register');
        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('login-modal');
                this.openModal('register-modal');
            });
        }

        // 註冊 -> 登入
        const switchToLogin = document.getElementById('switch-to-login');
        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('register-modal');
                this.openModal('login-modal');
            });
        }

        // 登入 -> 手機驗證
        const sendSmsBtn = document.getElementById('send-sms-btn');
        if (sendSmsBtn) {
            sendSmsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('login-modal');
                this.openModal('sms-modal');
            });
        }
    }

    setupClickOutsideClose() {
        window.addEventListener('click', (event) => {
            this.modals.forEach((modalData, modalId) => {
                if (event.target === modalData.modal) {
                    this.closeModal(modalId);
                }
            });
        });
    }

    setupMobileButtons() {
        // 手機版登入按鈕
        const loginBtnMobile = document.getElementById('login-btn-mobile');
        if (loginBtnMobile) {
            loginBtnMobile.addEventListener('click', (e) => {
                e.preventDefault();
                // 關閉手機選單（如果有的話）
                if (window.mobileMenu && window.mobileMenu.closeMenu) {
                    window.mobileMenu.closeMenu();
                }
                this.openModal('login-modal');
            });
        }

        // 手機版註冊按鈕
        const registerBtnMobile = document.getElementById('register-btn-mobile');
        if (registerBtnMobile) {
            registerBtnMobile.addEventListener('click', (e) => {
                e.preventDefault();
                // 關閉手機選單（如果有的話）
                if (window.mobileMenu && window.mobileMenu.closeMenu) {
                    window.mobileMenu.closeMenu();
                }
                this.openModal('register-modal');
            });
        }
    }

    // 公開方法，供其他模組使用
    isModalOpen(modalId) {
        const modalData = this.modals.get(modalId);
        return modalData && modalData.modal.style.display === 'block';
    }

    getCurrentOpenModal() {
        for (let [modalId, modalData] of this.modals) {
            if (modalData.modal.style.display === 'block') {
                return modalId;
            }
        }
        return null;
    }
}

// 初始化彈窗系統
document.addEventListener('DOMContentLoaded', function() {
    window.modalSystem = new ModalSystem();
    console.log('彈窗系統初始化完成');
});