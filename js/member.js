// 會員系統相關功能

// 管理員檢查函數 - 需要在最前面定義
function isAdmin(email) {
    const adminEmails = [
        'bababa.b810@gmail.com',
        'vincentsayhello@gmail.com'
    ];
    return adminEmails.includes(email);
}

// 用戶登入狀態操作函數 - 新增
function saveUserState(user) {
    if (user) {
        localStorage.setItem('userIsLoggedIn', 'true');
        localStorage.setItem('userEmail', user.email || '');
        // 使用管理員檢查函數
        if (isAdmin(user.email)) {
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
    // 獲取各種元素
    const userActions = document.getElementById('user-actions');
    const userProfile = document.getElementById('user-profile');
    const usernameDisplay = document.getElementById('username-display');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const closeLogin = document.getElementById('close-login');
    const closeRegister = document.getElementById('close-register');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const userDropdownBtn = document.getElementById('user-dropdown-btn');
    const userMenu = document.getElementById('user-menu');
    
    // 獲取管理員按鈕元素
    const adminBtn = document.getElementById('admin-btn');
    const adminBtnMobile = document.getElementById('admin-btn-mobile');
    
    // 獲取電子郵件連結登入相關元素
    const sendLoginLinkBtn = document.getElementById('send-login-link');
    const emailLinkModal = document.getElementById('email-link-modal');
    const closeEmailLink = document.getElementById('close-email-link');
    const emailLinkForm = document.getElementById('email-link-form');
    const emailLinkMessage = document.getElementById('email-link-message');
    
    // 手機版元素
    const userActionsMobile = document.getElementById('user-actions-mobile');
    const userProfileMobile = document.getElementById('user-profile-mobile');
    const usernameDisplayMobile = document.getElementById('username-display-mobile');

    // 從window對象獲取Firebase服務
    const { 
        auth, 
        db, 
        getAuth,
        createUserWithEmailAndPassword, 
        signInWithEmailAndPassword, 
        signOut, 
        onAuthStateChanged,
        doc,
        setDoc,
        getDoc,
        collection,
        serverTimestamp,
        // 電子郵件連結登入相關函數
        sendSignInLinkToEmail,
        isSignInWithEmailLink,
        signInWithEmailLink
    } = window.firebaseServices || {};

    // 檢查當前登入用戶是否為管理員
    const checkIfAdmin = function(user) {
        if (user && isAdmin(user.email)) {
            // 是管理員，顯示管理按鈕
            console.log('管理員登入:', user.email);
            if (adminBtn) adminBtn.style.display = 'block';
            if (adminBtnMobile) adminBtnMobile.style.display = 'block';
            // 保存管理員狀態到本地存儲
            localStorage.setItem('isAdmin', 'true');
        } else {
            // 不是管理員，隱藏管理按鈕
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminBtnMobile) adminBtnMobile.style.display = 'none';
            // 清除管理員狀態
            localStorage.removeItem('isAdmin');
        }
    };
    
    // 在 member.js 中的 initializeUI 函数中添加这段强制设置用户名的代码
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
        
        // 根據本地存儲的登入狀態初始化 UI
        if (isLoggedIn) {
            // 已登入狀態
            if (userActions) userActions.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (userActionsMobile) userActionsMobile.style.display = 'none';
            if (userProfileMobile) userProfileMobile.style.display = 'block';
            
            // 設置用戶名顯示
            const displayName = userName || (userEmail ? userEmail.split('@')[0] : '用戶');
            if (usernameDisplay) usernameDisplay.textContent = displayName;
            if (usernameDisplayMobile) usernameDisplayMobile.textContent = displayName;
            
            // 設置管理員按鈕
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
            
            // 確保管理員按鈕隱藏
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminBtnMobile) adminBtnMobile.style.display = 'none';
        }
    }
    
    // 立即初始化 UI 狀態，防止閃現
    initializeUI();

    try {
        console.log("Firebase 初始化成功");
        
        // 檢查當前URL是否是登入連結
        if (isSignInWithEmailLink && isSignInWithEmailLink(auth, window.location.href)) {
            // 從localStorage獲取電子郵件
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) {
                // 如果沒有找到電子郵件，請用戶提供
                email = window.prompt('請提供您用於登入的電子郵件地址');
            }
            
            if (email) {
                // 使用電子郵件和當前URL進行登入
                signInWithEmailLink(auth, email, window.location.href)
                    .then((result) => {
                        // 登入成功
                        window.localStorage.removeItem('emailForSignIn');
                        alert('已成功登入！');
                        
                        // 保存用戶狀態到本地存儲
                        saveUserState(result.user);
                        
                        // 更新用戶最後登入時間
                        setDoc(doc(db, 'users', result.user.uid), {
                            lastLoginAt: serverTimestamp()
                        }, { merge: true });
                        
                        // 檢查用戶是否為新用戶，如果是，則保存其基本資料
                        const user = result.user;
                        return getDoc(doc(db, 'users', user.uid))
                            .then((docSnap) => {
                                if (!docSnap.exists()) {
                                    // 如果是新用戶，創建用戶文檔
                                    const name = email.split('@')[0]; // 使用電子郵件的用戶名部分作為臨時名稱
                                    localStorage.setItem('userName', name); // 保存到本地存儲
                                    return setDoc(doc(db, 'users', user.uid), {
                                        name: name,
                                        email: email,
                                        createdAt: serverTimestamp()
                                    });
                                } else {
                                    // 保存用戶名到本地存儲
                                    localStorage.setItem('userName', docSnap.data().name || email.split('@')[0]);
                                }
                                return Promise.resolve();
                            });
                    })
                    .catch((error) => {
                        console.error('通過電子郵件連結登入失敗:', error);
                        alert('登入失敗: ' + error.message);
                    });
            }
        }

        // 顯示登入彈窗
        if (loginBtn) {
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                loginModal.style.display = 'block';
            });
        }

        // 顯示註冊彈窗
        if (registerBtn) {
            registerBtn.addEventListener('click', function(e) {
                e.preventDefault();
                registerModal.style.display = 'block';
            });
        }

        // 關閉登入彈窗
        if (closeLogin) {
            closeLogin.addEventListener('click', function() {
                loginModal.style.display = 'none';
            });
        }

        // 關閉註冊彈窗
        if (closeRegister) {
            closeRegister.addEventListener('click', function() {
                registerModal.style.display = 'none';
            });
        }

        // 顯示電子郵件連結登入彈窗
        if (sendLoginLinkBtn) {
            sendLoginLinkBtn.addEventListener('click', function(e) {
                e.preventDefault();
                loginModal.style.display = 'none';
                emailLinkModal.style.display = 'block';
            });
        }

        // 關閉電子郵件連結登入彈窗
        if (closeEmailLink) {
            closeEmailLink.addEventListener('click', function() {
                emailLinkModal.style.display = 'none';
            });
        }

        // 切換到註冊
        if (switchToRegister) {
            switchToRegister.addEventListener('click', function(e) {
                e.preventDefault();
                loginModal.style.display = 'none';
                registerModal.style.display = 'block';
            });
        }

        // 切換到登入
        if (switchToLogin) {
            switchToLogin.addEventListener('click', function(e) {
                e.preventDefault();
                registerModal.style.display = 'none';
                loginModal.style.display = 'block';
            });
        }

        // 點擊用戶名稱顯示下拉選單
        if (userDropdownBtn) {
            userDropdownBtn.addEventListener('click', function(e) {
                e.preventDefault();
                userMenu.style.display = userMenu.style.display === 'block' ? 'none' : 'block';
            });

            // 點擊頁面其他區域關閉下拉選單
            document.addEventListener('click', function(event) {
                if (!userDropdownBtn.contains(event.target) && !userMenu.contains(event.target)) {
                    userMenu.style.display = 'none';
                }
            });
        }

        // 點擊彈窗外部關閉彈窗
        window.addEventListener('click', function(event) {
            if (event.target === loginModal) {
                loginModal.style.display = 'none';
            }
            if (event.target === registerModal) {
                registerModal.style.display = 'none';
            }
            if (event.target === emailLinkModal) {
                emailLinkModal.style.display = 'none';
            }
        });

        // 處理發送登入連結
        if (emailLinkForm) {
            emailLinkForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email-link-email').value;
                
                // 處理發送前的界面更新
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = '發送中...';
                submitBtn.disabled = true;
                
                // 登入連結設定
                const actionCodeSettings = {
                    // 更新為您的 GitHub Pages URL
                    url: 'https://yanisstudio.github.io/GardenGroup/',
                    // 必須為true
                    handleCodeInApp: true
                };
                
                // 發送登入連結
                sendSignInLinkToEmail(auth, email, actionCodeSettings)
                    .then(() => {
                        // 保存電子郵件到localStorage
                        window.localStorage.setItem('emailForSignIn', email);
                        
                        // 顯示成功訊息
                        emailLinkMessage.textContent = '登入連結已發送至您的電子郵件，請查收並點擊連結登入。';
                        emailLinkMessage.style.color = 'green';
                        emailLinkMessage.style.display = 'block';
                        
                        // 清空表單
                        emailLinkForm.reset();
                    })
                    .catch((error) => {
                        console.error('發送登入連結失敗:', error);
                        
                        // 顯示錯誤訊息
                        emailLinkMessage.textContent = '發送失敗: ' + error.message;
                        emailLinkMessage.style.color = 'red';
                        emailLinkMessage.style.display = 'block';
                    })
                    .finally(() => {
                        // 恢復按鈕狀態
                        submitBtn.textContent = originalBtnText;
                        submitBtn.disabled = false;
                    });
            });
        }

        // 處理用戶註冊
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const name = document.getElementById('register-name').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;
                
                // 基本驗證
                if (password !== confirmPassword) {
                    alert('密碼與確認密碼不符');
                    return;
                }
                
                if (password.length < 6) {
                    alert('密碼長度至少需要6個字符');
                    return;
                }
                
                // 處理註冊前的界面更新
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = '註冊中...';
                submitBtn.disabled = true;
                
                // 使用 Firebase 創建用戶
                console.log("嘗試註冊用戶:", email);
                createUserWithEmailAndPassword(auth, email, password)
                    .then((userCredential) => {
                        console.log("用戶創建成功:", userCredential.user.uid);
                        // 註冊成功，添加用戶資料到 Firestore
                        const user = userCredential.user;
                        
                        // 保存用戶狀態到本地存儲
                        saveUserState(user);
                        localStorage.setItem('userName', name);
                        
                        // 使用新的Firestore語法
                        return setDoc(doc(db, 'users', user.uid), {
                            name: name,
                            email: email,
                            createdAt: serverTimestamp()
                        });
                    })
                    .then(() => {
                        console.log("用戶資料保存成功");
                        
                        // 關閉註冊窗口
                        registerModal.style.display = 'none';
                        
                        // 更新UI顯示為已登入狀態
                        if (userActions) userActions.style.display = 'none';
                        if (userProfile) userProfile.style.display = 'flex';
                        
                        // 更新用戶名稱顯示
                        if (usernameDisplay) {
                            usernameDisplay.textContent = name || email.split('@')[0];
                        }
                        
                        // 更新手機版UI (如果存在這些元素)
                        if (userActionsMobile) userActionsMobile.style.display = 'none';
                        if (userProfileMobile) userProfileMobile.style.display = 'block';
                        if (usernameDisplayMobile) usernameDisplayMobile.textContent = name || email.split('@')[0];
                        
                        // 重置表單
                        registerForm.reset();
                        
                        // 顯示成功訊息
                        alert('註冊成功並自動登入！');
                    })
                    .catch((error) => {
                        console.error('註冊失敗:', error);
                        
                        // 處理常見錯誤
                        if (error.code === 'auth/email-already-in-use') {
                            alert('此電子郵件已被使用');
                        } else if (error.code === 'auth/invalid-email') {
                            alert('無效的電子郵件格式');
                        } else if (error.code === 'auth/weak-password') {
                            alert('密碼強度太弱，請使用更強的密碼');
                        } else {
                            alert('註冊失敗: ' + error.message);
                        }
                    })
                    .finally(() => {
                        // 恢復按鈕狀態
                        submitBtn.textContent = originalBtnText;
                        submitBtn.disabled = false;
                    });
            });
        }

        // 处理用户登录
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // 获取输入值
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                
                // 显示登入中提示
                const submitBtn = this.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = '登入中...';
                submitBtn.disabled = true;
                
                console.log("尝试登入:", email);
                
                // 使用 Firebase 身份验证
                signInWithEmailAndPassword(auth, email, password)
                    .then((userCredential) => {
                        // 登入成功 - 到这里表示 Firebase 已认证成功
                        console.log("登入成功:", userCredential.user.uid);
                        const user = userCredential.user;
                        
                        // 先使用電子郵件作為預設用戶名，再嘗試從 Firestore 獲取用戶數據
                        const defaultDisplayName = email.split('@')[0];
                        
                        // 保存用户状态到本地存储
                        saveUserState(user);
                        localStorage.setItem('userName', defaultDisplayName);
                        
                        // 检查是否为管理员
                        checkIfAdmin(user);
                        
                        // 立即更新 UI 显示用户名称
                        if (usernameDisplay) {
                            usernameDisplay.textContent = defaultDisplayName;
                        }
                        
                        if (usernameDisplayMobile) {
                            usernameDisplayMobile.textContent = defaultDisplayName;
                        }
                        
                        // 更新 UI 显示状态
                        if (userActions) userActions.style.display = 'none';
                        if (userProfile) userProfile.style.display = 'flex';
                        if (userActionsMobile) userActionsMobile.style.display = 'none';
                        if (userProfileMobile) userProfileMobile.style.display = 'block';
                        
                        // 关闭登入窗口和重置表单
                        loginModal.style.display = 'none';
                        loginForm.reset();
                        
                        // 显示登入成功提示
                        alert('登入成功！');
                        
                        // 嘗試從 Firestore 獲取用戶數據（非阻塞方式）
                        getDoc(doc(db, 'users', user.uid))
                            .then((docSnap) => {
                                if (docSnap.exists()) {
                                    const userData = docSnap.data();
                                    const actualDisplayName = userData.name || defaultDisplayName;
                                    
                                    // 更新本地存儲和UI顯示
                                    localStorage.setItem('userName', actualDisplayName);
                                    if (usernameDisplay) {
                                        usernameDisplay.textContent = actualDisplayName;
                                    }
                                    if (usernameDisplayMobile) {
                                        usernameDisplayMobile.textContent = actualDisplayName;
                                    }
                                }
                                
                                // 更新用户最后登入时间
                                return setDoc(doc(db, 'users', user.uid), {
                                    lastLoginAt: serverTimestamp()
                                }, { merge: true });
                            })
                            .catch((error) => {
                                console.warn('無法連接到數據庫，將使用離線模式:', error);
                                // 即使無法連接數據庫，登入過程也會繼續
                            });
                        
                        return Promise.resolve(); // 確保登入流程完成
                    })
                    .catch((error) => {
                        // 此处处理所有登入失败的情况
                        console.error('登入失败:', error);
                        
                        // 處理常見錯誤，顯示更友好的錯誤訊息
                        let errorMessage = '帳號或密碼不正確，請重試。';
                        switch(error.code) {
                           case 'auth/user-not-found':
                               errorMessage = '找不到此電子郵件的用戶。請確認電子郵件地址或註冊新帳號。';
                               break;
                           case 'auth/wrong-password':
                               errorMessage = '密碼錯誤。請重新輸入或使用電子郵件連結登入。';
                               break;
                           case 'auth/invalid-email':
                               errorMessage = '無效的電子郵件格式。請輸入有效的電子郵件地址。';
                               break;
                           case 'auth/user-disabled':
                               errorMessage = '此帳號已被停用。請聯繫客服尋求協助。';
                               break;
                           case 'auth/too-many-requests':
                               errorMessage = '登入嘗試次數過多。請稍後再試或使用電子郵件連結登入。';
                               break;
                           case 'auth/invalid-login-credentials':
                               errorMessage = '帳號或密碼不正確，請重試。';
                               break;
                           case 'auth/invalid-credential':
                               errorMessage = '帳號或密碼不正確，請重試。';
                               break;
                           case 'auth/network-request-failed':
                               errorMessage = '網路連線問題。請檢查您的網路連線並重試。';
                               break;
                           case 'auth/operation-not-allowed':
                               errorMessage = '此登入方式暫時無法使用。請聯繫客服尋求協助。';
                               break;
                           case 'auth/unauthorized-domain':
                               errorMessage = '此網站未獲授權使用此登入方式。請聯繫網站管理員。';
                               break;
                           default:
                               errorMessage = '登入失敗: ' + error.message;
                        }
                        
                        // 明确确保 UI 显示为未登入状态
                        if (userActions) userActions.style.display = 'flex';
                        if (userProfile) userProfile.style.display = 'none';
                        if (userActionsMobile) userActionsMobile.style.display = 'block';
                        if (userProfileMobile) userProfileMobile.style.display = 'none';
                        
                        // 清除本地存储中的用户状态
                        saveUserState(null);
                        
                        // 显示错误提示
                        alert(errorMessage);
                    })
                    .finally(() => {
                        // 恢复按钮状态
                        submitBtn.textContent = originalBtnText;
                        submitBtn.disabled = false;
                    });
            });
        }

        // 處理用戶登出
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                console.log("嘗試登出");
                signOut(auth)
                    .then(() => {
                        console.log("登出成功");
                        
                        // 清除本地存儲中的用戶狀態
                        saveUserState(null);
                        
                        // 關閉用戶選單
                        userMenu.style.display = 'none';
                        
                        // 確保UI更新為未登入狀態
                        if (userActions) userActions.style.display = 'flex';
                        if (userProfile) userProfile.style.display = 'none';
                        if (userActionsMobile) userActionsMobile.style.display = 'block';
                        if (userProfileMobile) userProfileMobile.style.display = 'none';
                        
                        // 確保管理員按鈕隱藏
                        if (adminBtn) adminBtn.style.display = 'none';
                        if (adminBtnMobile) adminBtnMobile.style.display = 'none';
                        
                        alert('已成功登出');
                    })
                    .catch((error) => {
                        console.error('登出失敗:', error);
                        alert('登出失敗: ' + error.message);
                    });
            });
        }

        // 監聽認證狀態變化 - 這是最重要的部分，確保頁面間的認證狀態一致
        onAuthStateChanged(auth, function(user) {
            console.log("認證狀態變化，用戶狀態:", user ? "已登入" : "未登入");
            
            if (user) {
                console.log("用戶已登入:", user.uid);
                // 用戶已登入
                
                // 保存用戶狀態到本地存儲
                saveUserState(user);
                
                // 更新 UI
                if (userActions) userActions.style.display = 'none';
                if (userProfile) userProfile.style.display = 'flex';
                if (userActionsMobile) userActionsMobile.style.display = 'none';
                if (userProfileMobile) userProfileMobile.style.display = 'block';
                
                // 檢查是否為管理員
                checkIfAdmin(user);
                
                // 更新最後登入時間 (添加這部分)
                // 使用本地存儲避免頻繁更新，並處理離線情況
                const lastUpdate = localStorage.getItem('lastLoginUpdate');
                const now = Date.now();
                // 如果是新會話或上次更新時間超過1小時，才更新登入時間
                if (!lastUpdate || (now - parseInt(lastUpdate)) > 3600000) {
                    setDoc(doc(db, 'users', user.uid), {
                        lastLoginAt: serverTimestamp()
                    }, { merge: true })
                    .then(() => {
                        localStorage.setItem('lastLoginUpdate', now.toString());
                    })
                    .catch(error => {
                        console.warn('更新最後登入時間失敗（可能處於離線狀態）:', error);
                        // 即使無法更新時間，也不影響登入流程
                    });
                }
                
                // 從 Firestore 獲取用戶資料（非阻塞方式）
                getDoc(doc(db, 'users', user.uid))
                            .then((docSnap) => {
                                if (docSnap.exists()) {
                                    console.log("獲取用戶資料:", docSnap.data().name);
                                    // 保存用戶名到本地存儲
                                    localStorage.setItem('userName', docSnap.data().name);
                                    
                                    // 更新用戶名稱顯示
                                    if (usernameDisplay) {
                                        usernameDisplay.textContent = docSnap.data().name;
                                    }
                                    
                                    if (usernameDisplayMobile) {
                                        usernameDisplayMobile.textContent = docSnap.data().name;
                                    }
                                } else {
                                    // 如果找不到用戶資料，使用電子郵件顯示
                                    const name = user.email.split('@')[0];
                                    localStorage.setItem('userName', name);
                                    
                                    if (usernameDisplay) {
                                        usernameDisplay.textContent = name;
                                    }
                                    
                                    if (usernameDisplayMobile) {
                                        usernameDisplayMobile.textContent = name;
                                    }
                                }

                                // 添加此段代码，确保用户名称正确显示
                                setTimeout(() => {
                                    const userName = localStorage.getItem('userName');
                                    if (userName) {
                                        // 再次获取元素，以防它们在页面上变化
                                        const usernameDisplayElem = document.getElementById('username-display');
                                        const usernameDisplayMobileElem = document.getElementById('username-display-mobile');
                                        
                                        if (usernameDisplayElem) {
                                            usernameDisplayElem.textContent = userName;
                                        }
                                        
                                        if (usernameDisplayMobileElem) {
                                            usernameDisplayMobileElem.textContent = userName;
                                        }

                                        console.log("强制更新用户名称显示为:", userName);
                                    }
                                }, 500);
                            })
                            .catch((error) => {
                                console.warn('無法連接到數據庫，使用離線模式:', error);
                                // 錯誤時也顯示一些內容
                                const name = user.email ? user.email.split('@')[0] : '用戶';
                                localStorage.setItem('userName', name);
                                
                                if (usernameDisplay) {
                                    usernameDisplay.textContent = name;
                                }
                                
                                if (usernameDisplayMobile) {
                                    usernameDisplayMobile.textContent = name;
                                }

                                // 添加此段代码，确保即使出错也正确显示用户名
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

                                        console.log("错误恢复后强制更新用户名称显示为:", userName);
                                    }
                                }, 500);
                            });
                    } else {
                        console.log("用戶未登入");
                        // 用戶未登入
                        
                        // 清除本地存儲中的用戶狀態
                        saveUserState(null);
                        
                        // 更新 UI
                        if (userActions) userActions.style.display = 'flex';
                        if (userProfile) userProfile.style.display = 'none';
                        if (userActionsMobile) userActionsMobile.style.display = 'block';
                        if (userProfileMobile) userProfileMobile.style.display = 'none';
                        
                        // 確保管理員按鈕隱藏
                        if (adminBtn) adminBtn.style.display = 'none';
                        if (adminBtnMobile) adminBtnMobile.style.display = 'none';
                    }
                });
        } catch (error) {
            console.error("Firebase 初始化失敗:", error);
            
            // 即使 Firebase 初始化失敗，仍然應該根據本地存儲顯示正確的 UI
            // 防止在 Firebase 出現問題時用戶體驗突然變差
            initializeUI();
            
            // 將錯誤消息記錄到控制台，但不顯示給用戶
            console.error("Firebase 初始化詳細錯誤:", error);
        }
        
        // 添加此段代码，確保在頁面完全載入後，會員名稱正確顯示
        setTimeout(() => {
            // 這一步確保在所有其他初始化步驟之後執行
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