// memberAuth.js - 會員認證系統
// 負責所有會員相關的認證邏輯

class MemberAuth {
    constructor() {
        this.currentUser = null;
        this.recaptchaVerifier = null;
        this.confirmationResult = null;
        this.adminPhones = ['+886978603608', '+886937163179'];
        
        // 註冊相關變數
        this.registerRecaptchaVerifier = null;
        this.registerConfirmationResult = null;
        this.registerStep = 'phone'; // phone -> verification -> complete
        
        this.init();
    }

    async init() {
        // 等待 Firebase 服務初始化
        await this.waitForFirebase();
        
        // 設置認證狀態監聽
        this.setupAuthStateListener();
        
        // 設置表單事件
        this.setupFormEvents();
        
        // 初始化UI狀態
        this.initializeUI();
        
        console.log('會員認證系統初始化完成');
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseServices) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // 保存用戶狀態到本地存儲
    saveUserState(user) {
        if (user) {
            localStorage.setItem('userIsLoggedIn', 'true');
            localStorage.setItem('userPhone', user.phoneNumber || '');
            
            // 檢查是否為管理員
            if (this.isAdmin(user.phoneNumber)) {
                localStorage.setItem('isAdmin', 'true');
            } else {
                localStorage.removeItem('isAdmin');
            }
        } else {
            localStorage.removeItem('userIsLoggedIn');
            localStorage.removeItem('userPhone');
            localStorage.removeItem('userName');
            localStorage.removeItem('isAdmin');
        }
    }

    // 檢查是否為管理員
    isAdmin(phoneNumber) {
        return this.adminPhones.includes(phoneNumber);
    }

    // 初始化UI狀態
    initializeUI() {
        const isLoggedIn = localStorage.getItem('userIsLoggedIn') === 'true';
        const userName = localStorage.getItem('userName');
        const userPhone = localStorage.getItem('userPhone');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        
        this.updateUI(isLoggedIn, userName, userPhone, isAdmin);
    }

    // 更新UI顯示
    updateUI(isLoggedIn, userName = '', userPhone = '', isAdmin = false) {
        const userActions = document.getElementById('user-actions');
        const userProfile = document.getElementById('user-profile');
        const userActionsMobile = document.getElementById('user-actions-mobile');
        const userProfileMobile = document.getElementById('user-profile-mobile');
        const usernameDisplay = document.getElementById('username-display');
        const usernameDisplayMobile = document.getElementById('username-display-mobile');
        const adminBtn = document.getElementById('admin-btn');
        const adminBtnMobile = document.getElementById('admin-btn-mobile');

        if (isLoggedIn) {
            // 已登入狀態
            if (userActions) userActions.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (userActionsMobile) userActionsMobile.style.display = 'none';
            if (userProfileMobile) userProfileMobile.style.display = 'block';
            
            // 設置用戶名顯示
            const displayName = userName || (userPhone ? window.phoneValidation.toLocalFormat(userPhone) : '用戶');
            if (usernameDisplay) usernameDisplay.textContent = displayName;
            if (usernameDisplayMobile) usernameDisplayMobile.textContent = displayName;
            
            // 設置管理員按鈕
            if (isAdmin) {
                if (adminBtn) adminBtn.style.display = 'block';
                if (adminBtnMobile) adminBtnMobile.style.display = 'block';
            } else {
                if (adminBtn) adminBtn.style.display = 'none';
                if (adminBtnMobile) adminBtnMobile.style.display = 'none';
            }

            // 重新初始化用戶下拉選單（重要！）
            setTimeout(() => {
                if (window.userDropdown && window.userDropdown.reinitialize) {
                    window.userDropdown.reinitialize();
                }
            }, 100);
        } else {
            // 未登入狀態
            if (userActions) userActions.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
            if (userActionsMobile) userActionsMobile.style.display = 'block';
            if (userProfileMobile) userProfileMobile.style.display = 'none';
            
            // 隱藏管理員按鈕
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminBtnMobile) adminBtnMobile.style.display = 'none';
        }
    }

    // 設置認證狀態監聽
    setupAuthStateListener() {
        const { auth, onAuthStateChanged, doc, getDoc, setDoc, serverTimestamp } = window.firebaseServices;

        onAuthStateChanged(auth, async (user) => {
            console.log("認證狀態變化，用戶狀態:", user ? "已登入" : "未登入");
            
            if (user) {
                this.currentUser = user;
                this.saveUserState(user);
                
                try {
                    // 從 Firestore 獲取用戶資料
                    const userDoc = await getDoc(doc(window.firebaseServices.db, 'users', user.uid));
                    let displayName;
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        displayName = userData.name || window.phoneValidation.toLocalFormat(user.phoneNumber || '');
                    } else {
                        displayName = window.phoneValidation.toLocalFormat(user.phoneNumber || '');
                    }
                    
                    localStorage.setItem('userName', displayName);
                    
                    // 更新UI
                    this.updateUI(true, displayName, user.phoneNumber, this.isAdmin(user.phoneNumber));
                    
                    // 觸發登入狀態變化事件
                    document.dispatchEvent(new CustomEvent('loginStateChanged', { 
                        detail: { loggedIn: true, user: user } 
                    }));
                    
                    // 更新最後登入時間（節流）
                    this.updateLastLoginTime(user.uid);
                    
                } catch (error) {
                    console.error('獲取用戶資料失敗:', error);
                    const fallbackName = window.phoneValidation.toLocalFormat(user.phoneNumber || '');
                    localStorage.setItem('userName', fallbackName);
                    this.updateUI(true, fallbackName, user.phoneNumber, this.isAdmin(user.phoneNumber));
                }
            } else {
                this.currentUser = null;
                this.saveUserState(null);
                this.updateUI(false);
                
                // 觸發登出狀態變化事件
                document.dispatchEvent(new CustomEvent('loginStateChanged', { 
                    detail: { loggedIn: false } 
                }));
            }
        });
    }

    // 更新最後登入時間（節流）
    async updateLastLoginTime(uid) {
        const lastUpdate = localStorage.getItem('lastLoginUpdate');
        const now = Date.now();
        
        // 如果是新會話或上次更新時間超過1小時，才更新登入時間
        if (!lastUpdate || (now - parseInt(lastUpdate)) > 3600000) {
            try {
                const { doc, setDoc, serverTimestamp } = window.firebaseServices;
                await setDoc(doc(window.firebaseServices.db, 'users', uid), {
                    lastLoginAt: serverTimestamp()
                }, { merge: true });
                
                localStorage.setItem('lastLoginUpdate', now.toString());
            } catch (error) {
                console.error('更新最後登入時間失敗:', error);
            }
        }
    }

    // 設置表單事件
    setupFormEvents() {
        this.setupLoginForm();
        this.setupRegisterForm();
        this.setupSmsForm();
        this.setupLogoutButtons();
    }

    // 設置登入表單
    setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const phone = document.getElementById('login-phone').value;
            const password = document.getElementById('login-password').value;
            
            // 驗證手機號碼
            const phoneError = window.phoneValidation.getValidationError(phone);
            if (phoneError) {
                this.showError(phoneError);
                return;
            }
            
            const formattedPhone = window.phoneValidation.formatPhoneNumber(phone);
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            this.setButtonLoading(submitBtn, '登入中...');
            
            try {
                await this.loginWithPassword(formattedPhone, password);
                window.modalSystem.closeModal('login-modal');
                this.showSuccess('登入成功！');
            } catch (error) {
                this.showError(this.getAuthErrorMessage(error));
            } finally {
                this.setButtonLoading(submitBtn, '登入', false);
            }
        });
    }

    // 設置註冊表單（支援手機驗證碼）- 修復版
    setupRegisterForm() {
        const registerForm = document.getElementById('register-form');
        if (!registerForm) return;

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('register-name').value;
            const phone = document.getElementById('register-phone').value;
            const verificationCode = document.getElementById('register-verification-code')?.value;
            const submitBtn = document.getElementById('register-submit-btn');
            
            if (this.registerStep === 'phone') {
                // 第一步：發送驗證碼
                if (!name.trim()) {
                    this.showRegisterMessage('請輸入姓名', 'error');
                    return;
                }
                
                const phoneError = window.phoneValidation.getValidationError(phone);
                if (phoneError) {
                    this.showRegisterMessage(phoneError, 'error');
                    return;
                }
                
                const formattedPhone = window.phoneValidation.formatPhoneNumber(phone);
                this.setButtonLoading(submitBtn, '發送中...');
                
                try {
                    // 檢查 reCAPTCHA API 是否已載入
                    if (typeof window.grecaptcha === 'undefined') {
                        this.showRegisterMessage('reCAPTCHA 尚未載入，請稍後再試', 'error');
                        this.setButtonLoading(submitBtn, '發送驗證碼', false);
                        return;
                    }

                    // 清理舊的 reCAPTCHA
                    if (this.registerRecaptchaVerifier) {
                        try {
                            this.registerRecaptchaVerifier.clear();
                        } catch (e) {
                            console.log('清理舊的 registerRecaptchaVerifier:', e.message);
                        }
                    }

                    const { auth, RecaptchaVerifier } = window.firebaseServices;
                    
                    // 使用按鈕 ID (invisible reCAPTCHA 推薦方式)
                    this.registerRecaptchaVerifier = new RecaptchaVerifier(auth, 'register-submit-btn', {
                        'size': 'invisible',
                        'callback': (response) => {
                            console.log('註冊 reCAPTCHA 驗證成功');
                        },
                        'expired-callback': () => {
                            console.log('註冊 reCAPTCHA 驗證過期');
                            this.registerRecaptchaVerifier = null;
                        },
                        'error-callback': (error) => {
                            console.error('註冊 reCAPTCHA 錯誤:', error);
                            this.showRegisterMessage('reCAPTCHA 驗證失敗，請重試', 'error');
                        }
                    });
                    
                    console.log('註冊 reCAPTCHA 已設置，準備發送驗證碼');
                    
                    // 發送驗證碼
                    const { signInWithPhoneNumber } = window.firebaseServices;
                    this.registerConfirmationResult = await signInWithPhoneNumber(auth, formattedPhone, this.registerRecaptchaVerifier);
                    
                    console.log('註冊驗證碼發送成功');
                    
                    // 顯示驗證碼輸入欄位
                    const verificationGroup = document.getElementById('register-verification-code-group');
                    if (verificationGroup) {
                        verificationGroup.style.display = 'block';
                    }
                    
                    // 更新按鈕和步驟
                    submitBtn.textContent = '驗證並註冊';
                    this.registerStep = 'verification';
                    
                    this.showRegisterMessage('驗證碼已發送至您的手機，請輸入6位數驗證碼', 'success');
                    
                } catch (error) {
                    console.error('註冊發送驗證碼失敗:', error);
                    let errorMessage = '發送失敗: ';
                    
                    if (error.code === 'auth/captcha-check-failed') {
                        errorMessage += 'reCAPTCHA 驗證失敗，請重新操作';
                    } else if (error.code === 'auth/too-many-requests') {
                        errorMessage += '請求過於頻繁，請稍後再試';
                    } else if (error.code === 'auth/invalid-phone-number') {
                        errorMessage += '手機號碼格式錯誤';
                    } else {
                        errorMessage += error.message;
                    }
                    
                    this.showRegisterMessage(errorMessage, 'error');
                } finally {
                    this.setButtonLoading(submitBtn, '驗證並註冊', false);
                }
                
            } else if (this.registerStep === 'verification') {
                // 第二步：驗證驗證碼並完成註冊
                if (!verificationCode || verificationCode.length !== 6) {
                    this.showRegisterMessage('請輸入6位數驗證碼', 'error');
                    return;
                }
                
                if (!this.registerConfirmationResult) {
                    this.showRegisterMessage('請先發送驗證碼', 'error');
                    return;
                }
                
                this.setButtonLoading(submitBtn, '註冊中...');
                
                try {
                    // 驗證驗證碼
                    const result = await this.registerConfirmationResult.confirm(verificationCode);
                    const user = result.user;
                    const formattedPhone = window.phoneValidation.formatPhoneNumber(phone);
                    
                    console.log('註冊驗證碼確認成功，用戶:', user.uid);
                    
                    // 保存用戶資料到 Firestore
                    const { doc, setDoc, serverTimestamp } = window.firebaseServices;
                    await setDoc(doc(window.firebaseServices.db, 'users', user.uid), {
                        name: name,
                        phone: formattedPhone,
                        registrationType: 'phone_verification',
                        createdAt: serverTimestamp()
                    });
                    
                    console.log('用戶資料已保存到 Firestore');
                    
                    // 手動設置手機號碼
                    user.phoneNumber = formattedPhone;
                    
                    // 保存到本地存儲
                    localStorage.setItem('userName', name);
                    this.saveUserState(user);
                    
                    // 更新當前用戶
                    this.currentUser = user;
                    
                    // 更新UI
                    this.updateUI(true, name, formattedPhone, this.isAdmin(formattedPhone));
                    
                    // 關閉彈窗
                    window.modalSystem.closeModal('register-modal');
                    
                    // 重置表單
                    this.resetRegisterForm();
                    
                    this.showSuccess('註冊成功並自動登入！');
                    
                } catch (error) {
                    console.error('註冊驗證碼確認失敗:', error);
                    
                    let errorMessage = '驗證失敗: ';
                    if (error.code === 'auth/invalid-verification-code') {
                        errorMessage = '驗證碼錯誤，請重新輸入';
                    } else if (error.code === 'auth/code-expired') {
                        errorMessage = '驗證碼已過期，請重新發送';
                    } else {
                        errorMessage += error.message;
                    }
                    
                    this.showRegisterMessage(errorMessage, 'error');
                } finally {
                    this.setButtonLoading(submitBtn, '驗證並註冊', false);
                }
            }
        });

        // 監聽彈窗關閉事件，重置表單
        document.addEventListener('modalClosed', (e) => {
            if (e.detail.modalId === 'register-modal') {
                this.resetRegisterForm();
            }
        });
    }

    // 設置手機驗證表單 - 修復版
    setupSmsForm() {
        const smsForm = document.getElementById('sms-form');
        if (!smsForm) return;

        smsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const phone = document.getElementById('sms-phone').value;
            const verificationCode = document.getElementById('verification-code').value;
            const submitBtn = smsForm.querySelector('button[type="submit"]');
            
            if (!verificationCode) {
                // 發送驗證碼
                const phoneError = window.phoneValidation.getValidationError(phone);
                if (phoneError) {
                    this.showSmsMessage(phoneError, 'error');
                    return;
                }
                
                const formattedPhone = window.phoneValidation.formatPhoneNumber(phone);
                this.setButtonLoading(submitBtn, '發送中...');
                
                try {
                    await this.sendVerificationCode(formattedPhone);
                    this.showSmsMessage('驗證碼已發送至您的手機，請輸入6位數驗證碼', 'success');
                    
                    // 顯示驗證碼輸入欄位
                    const verificationGroup = document.getElementById('verification-code-group');
                    if (verificationGroup) {
                        verificationGroup.style.display = 'block';
                    }
                    
                    submitBtn.textContent = '驗證登入';
                } catch (error) {
                    console.error('SMS 發送驗證碼失敗:', error);
                    this.showSmsMessage('發送失敗: ' + this.getAuthErrorMessage(error), 'error');
                } finally {
                    this.setButtonLoading(submitBtn, '驗證登入', false);
                }
            } else {
                // 驗證驗證碼
                if (!this.confirmationResult) {
                    this.showSmsMessage('請先發送驗證碼', 'error');
                    return;
                }
                
                this.setButtonLoading(submitBtn, '驗證中...');
                
                try {
                    await this.verifyCode(verificationCode);
                    window.modalSystem.closeModal('sms-modal');
                    this.showSuccess('登入成功！');
                } catch (error) {
                    console.error('SMS 驗證碼確認失敗:', error);
                    this.showSmsMessage('驗證碼錯誤，請重新輸入', 'error');
                } finally {
                    this.setButtonLoading(submitBtn, '驗證登入', false);
                }
            }
        });
    }

    // 設置登出按鈕
    setupLogoutButtons() {
        const logoutBtn = document.getElementById('logout-btn');
        const logoutBtnMobile = document.getElementById('logout-btn-mobile');

        [logoutBtn, logoutBtnMobile].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    
                    // 關閉手機選單（如果有）
                    if (window.mobileMenu && window.mobileMenu.closeMenu) {
                        window.mobileMenu.closeMenu();
                    }
                    
                    // 關閉用戶選單
                    const userMenu = document.getElementById('user-menu');
                    if (userMenu) {
                        userMenu.style.display = 'none';
                    }
                    
                    try {
                        await this.logout();
                        this.showSuccess('已成功登出');
                    } catch (error) {
                        this.showError('登出失敗: ' + error.message);
                    }
                });
            }
        });
    }

    // 密碼登入
    async loginWithPassword(phoneNumber, password) {
        const { auth, signInWithEmailAndPassword, doc, getDoc } = window.firebaseServices;
        
        // 使用假電子郵件進行登入（Firebase 要求）
        const fakeEmail = phoneNumber.replace('+', '') + '@phone.local';
        
        const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
        const user = userCredential.user;
        
        // 手動設置手機號碼
        user.phoneNumber = phoneNumber;
        
        // 獲取用戶資料
        const userDoc = await getDoc(doc(window.firebaseServices.db, 'users', user.uid));
        let displayName;
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            displayName = userData.name || window.phoneValidation.toLocalFormat(phoneNumber);
        } else {
            displayName = window.phoneValidation.toLocalFormat(phoneNumber);
        }
        
        localStorage.setItem('userName', displayName);
        
        return user;
    }

    // 初始化 reCAPTCHA - 修復版
    initializeRecaptcha() {
        if (this.recaptchaVerifier) {
            try {
                this.recaptchaVerifier.clear();
            } catch (e) {
                console.log('清理舊的 recaptchaVerifier:', e.message);
            }
        }

        // 檢查 reCAPTCHA API 是否已載入
        if (typeof window.grecaptcha === 'undefined') {
            throw new Error('reCAPTCHA API 尚未載入');
        }

        const { auth, RecaptchaVerifier } = window.firebaseServices;
        
        // 獲取或創建容器元素
        let container = document.getElementById('recaptcha-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'recaptcha-container';
            document.body.appendChild(container);
        }
        container.innerHTML = '';

        // 使用正確的參數順序：(auth, container, options)
        this.recaptchaVerifier = new RecaptchaVerifier(auth, container, {
            'size': 'invisible',
            'callback': (response) => {
                console.log('SMS reCAPTCHA 驗證成功');
            },
            'expired-callback': () => {
                console.log('SMS reCAPTCHA 驗證過期');
                this.recaptchaVerifier = null;
            },
            'error-callback': (error) => {
                console.error('SMS reCAPTCHA 錯誤:', error);
            }
        });
    }

    // 發送驗證碼 - 修復版
    async sendVerificationCode(phoneNumber) {
        const { auth, signInWithPhoneNumber } = window.firebaseServices;
        
        console.log('準備發送 SMS 驗證碼到:', phoneNumber);
        
        this.initializeRecaptcha();
        
        this.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, this.recaptchaVerifier);
        
        console.log('SMS 驗證碼發送成功');
        return this.confirmationResult;
    }

    // 驗證驗證碼
    async verifyCode(code) {
        if (!this.confirmationResult) {
            throw new Error('請先發送驗證碼');
        }
        
        const result = await this.confirmationResult.confirm(code);
        const user = result.user;
        
        // 檢查用戶是否存在於資料庫中
        const { doc, getDoc, setDoc, serverTimestamp } = window.firebaseServices;
        const userDoc = await getDoc(doc(window.firebaseServices.db, 'users', user.uid));
        
        let displayName;
        if (userDoc.exists()) {
            const userData = userDoc.data();
            displayName = userData.name || window.phoneValidation.toLocalFormat(user.phoneNumber);
        } else {
            // 新用戶，創建用戶資料
            displayName = window.phoneValidation.toLocalFormat(user.phoneNumber);
            await setDoc(doc(window.firebaseServices.db, 'users', user.uid), {
                name: displayName,
                phone: user.phoneNumber,
                createdAt: serverTimestamp()
            });
        }
        
        localStorage.setItem('userName', displayName);
        
        return user;
    }

    // 登出
    async logout() {
        const { auth, signOut } = window.firebaseServices;
        
        // 清理 reCAPTCHA
        this.clearRecaptcha();
        
        await signOut(auth);
    }

    // 清理 reCAPTCHA
    clearRecaptcha() {
        if (this.recaptchaVerifier) {
            try {
                this.recaptchaVerifier.clear();
            } catch (e) {
                console.log('清理 recaptchaVerifier 時出錯:', e.message);
            }
            this.recaptchaVerifier = null;
        }
        if (this.registerRecaptchaVerifier) {
            try {
                this.registerRecaptchaVerifier.clear();
            } catch (e) {
                console.log('清理 registerRecaptchaVerifier 時出錯:', e.message);
            }
            this.registerRecaptchaVerifier = null;
        }
        this.confirmationResult = null;
        this.registerConfirmationResult = null;
    }

    // 重置註冊表單
    resetRegisterForm() {
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.reset();
        }
        
        // 隱藏驗證碼輸入欄位
        const verificationGroup = document.getElementById('register-verification-code-group');
        if (verificationGroup) {
            verificationGroup.style.display = 'none';
        }
        
        // 重置按鈕和步驟
        const submitBtn = document.getElementById('register-submit-btn');
        if (submitBtn) {
            submitBtn.textContent = '發送驗證碼';
            submitBtn.disabled = false;
        }
        
        // 重置註冊步驟
        this.registerStep = 'phone';
        
        // 清理訊息
        this.showRegisterMessage('', 'info');
        
        // 清理註冊相關的 reCAPTCHA
        if (this.registerRecaptchaVerifier) {
            try {
                this.registerRecaptchaVerifier.clear();
            } catch (e) {
                console.log('重置時清理 registerRecaptchaVerifier:', e.message);
            }
            this.registerRecaptchaVerifier = null;
        }
        this.registerConfirmationResult = null;
        
        console.log('註冊表單已重置');
    }

    // 重置手機驗證表單
    resetSmsForm() {
        const smsForm = document.getElementById('sms-form');
        if (smsForm) {
            smsForm.reset();
        }
        
        // 隱藏驗證碼輸入欄位
        const verificationGroup = document.getElementById('verification-code-group');
        if (verificationGroup) {
            verificationGroup.style.display = 'none';
        }
        
        // 重置按鈕
        const submitBtn = smsForm?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '發送驗證碼';
            submitBtn.disabled = false;
        }
        
        // 清理訊息
        this.showSmsMessage('', 'info');
        
        // 清理相關的 reCAPTCHA
        if (this.recaptchaVerifier) {
            try {
                this.recaptchaVerifier.clear();
            } catch (e) {
                console.log('重置時清理 recaptchaVerifier:', e.message);
            }
            this.recaptchaVerifier = null;
        }
        this.confirmationResult = null;
        
        console.log('手機驗證表單已重置');
    }

    // 設置按鈕載入狀態
    setButtonLoading(button, text, loading = true) {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.textContent = text;
        } else {
            button.disabled = false;
            button.textContent = text;
        }
    }

    // 顯示錯誤訊息
    showError(message) {
        alert(message); // 可以替換為更好的提示組件
    }

    // 顯示成功訊息
    showSuccess(message) {
        alert(message); // 可以替換為更好的提示組件
    }

    // 顯示手機驗證訊息
    showSmsMessage(message, type = 'info') {
        const messageElement = document.getElementById('sms-message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.color = type === 'error' ? 'red' : 'green';
            messageElement.style.display = message ? 'block' : 'none';
        }
    }

    // 顯示註冊訊息
    showRegisterMessage(message, type = 'info') {
        const messageElement = document.getElementById('register-message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.color = type === 'error' ? 'red' : 'green';
            messageElement.style.display = message ? 'block' : 'none';
        }
    }

    // 獲取認證錯誤訊息
    getAuthErrorMessage(error) {
        switch(error.code) {
            case 'auth/user-not-found':
                return '找不到此手機號碼的用戶。請確認手機號碼或註冊新帳號。';
            case 'auth/wrong-password':
                return '密碼錯誤。請重新輸入或使用手機驗證碼登入。';
            case 'auth/email-already-in-use':
                return '此手機號碼已被使用';
            case 'auth/weak-password':
                return '密碼強度太弱，請使用更強的密碼';
            case 'auth/too-many-requests':
                return '登入嘗試次數過多。請稍後再試或使用手機驗證碼登入。';
            case 'auth/network-request-failed':
                return '網路連線問題。請檢查您的網路連線並重試。';
            case 'auth/invalid-login-credentials':
            case 'auth/invalid-credential':
                return '手機號碼或密碼不正確，請重試。';
            case 'auth/captcha-check-failed':
                return 'reCAPTCHA 驗證失敗，請重新驗證。';
            case 'auth/invalid-phone-number':
                return '手機號碼格式錯誤，請確認格式正確（如：+886912345678）。';
            case 'auth/missing-phone-number':
                return '請輸入手機號碼。';
            case 'auth/quota-exceeded':
                return '簡訊發送額度已用完，請稍後再試。';
            case 'auth/invalid-verification-code':
                return '驗證碼錯誤，請重新輸入。';
            case 'auth/code-expired':
                return '驗證碼已過期，請重新發送驗證碼。';
            case 'auth/missing-verification-code':
                return '請輸入驗證碼。';
            case 'auth/session-expired':
                return '驗證會話已過期，請重新開始驗證流程。';
            case 'auth/app-not-authorized':
                return '應用程式未授權使用 Firebase Authentication。請聯繫開發人員。';
            case 'auth/invalid-app-credential':
                return '應用程式憑證無效。請聯繫開發人員。';
            default:
                return '操作失敗: ' + (error.message || '未知錯誤');
        }
    }

    // 公開方法：獲取當前用戶
    getCurrentUser() {
        return this.currentUser;
    }

    // 公開方法：檢查是否已登入
    isLoggedIn() {
        return !!this.currentUser;
    }

    // 公開方法：檢查當前用戶是否為管理員
    isCurrentUserAdmin() {
        return this.currentUser && this.isAdmin(this.currentUser.phoneNumber);
    }

    // 公開方法：強制刷新用戶狀態
    async refreshUserState() {
        if (this.currentUser) {
            try {
                const { doc, getDoc } = window.firebaseServices;
                const userDoc = await getDoc(doc(window.firebaseServices.db, 'users', this.currentUser.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const displayName = userData.name || window.phoneValidation.toLocalFormat(this.currentUser.phoneNumber || '');
                    localStorage.setItem('userName', displayName);
                    
                    this.updateUI(true, displayName, this.currentUser.phoneNumber, this.isAdmin(this.currentUser.phoneNumber));
                }
            } catch (error) {
                console.error('刷新用戶狀態失敗:', error);
            }
        }
    }

    // 公開方法：手動觸發登出
    async performLogout() {
        try {
            await this.logout();
            this.clearRecaptcha();
            this.resetSmsForm();
            this.resetRegisterForm();
            console.log('手動登出完成');
        } catch (error) {
            console.error('登出失敗:', error);
            throw error;
        }
    }

    // 公開方法：檢查 reCAPTCHA 狀態
    checkRecaptchaStatus() {
        const status = {
            apiLoaded: typeof window.grecaptcha !== 'undefined',
            smsVerifierActive: !!this.recaptchaVerifier,
            registerVerifierActive: !!this.registerRecaptchaVerifier,
            confirmationPending: !!this.confirmationResult || !!this.registerConfirmationResult
        };
        
        console.log('reCAPTCHA 狀態檢查:', status);
        return status;
    }

    // 公開方法：強制重新初始化 reCAPTCHA
    async forceReinitializeRecaptcha() {
        console.log('強制重新初始化 reCAPTCHA...');
        
        // 清理所有現有的 reCAPTCHA
        this.clearRecaptcha();
        
        // 等待一下讓清理完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 檢查 API 是否可用
        if (typeof window.grecaptcha === 'undefined') {
            console.error('reCAPTCHA API 尚未載入');
            return false;
        }
        
        console.log('reCAPTCHA 重新初始化完成');
        return true;
    }
}

// 初始化會員認證系統
document.addEventListener('DOMContentLoaded', function() {
    // 確保在其他模組載入後再初始化
    setTimeout(() => {
        if (!window.memberAuth) {
            console.log('初始化會員認證系統...');
            window.memberAuth = new MemberAuth();
        }
    }, 100);
});

// 當頁面即將卸載時清理資源
window.addEventListener('beforeunload', function() {
    if (window.memberAuth) {
        window.memberAuth.clearRecaptcha();
    }
});

// 調試用：全域函數
window.debugMemberAuth = function() {
    if (window.memberAuth) {
        console.log('=== 會員認證系統調試信息 ===');
        console.log('當前用戶:', window.memberAuth.getCurrentUser());
        console.log('是否已登入:', window.memberAuth.isLoggedIn());
        console.log('是否為管理員:', window.memberAuth.isCurrentUserAdmin());
        console.log('reCAPTCHA 狀態:', window.memberAuth.checkRecaptchaStatus());
        console.log('註冊步驟:', window.memberAuth.registerStep);
        console.log('Firebase 服務:', !!window.firebaseServices);
        console.log('手機驗證模組:', !!window.phoneValidation);
        console.log('彈窗系統:', !!window.modalSystem);
    } else {
        console.log('會員認證系統尚未初始化');
    }
};