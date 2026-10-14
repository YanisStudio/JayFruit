// 支付結帳頁面功能 - payment.js

document.addEventListener('DOMContentLoaded', function() {
    // 初始化共用功能
    initCommonFeatures();

    // 運費設定（js/shipping-calc.js 的 ShippingCalc.load() 結果），跟購物車頁同一套計算
    let shippingConfig = null;
    let allProducts = []; // 儲存所有產品資料
    let twDistrictSelect = null; // 縣市／鄉鎮市區連動下拉選單控制器

    // 載入上架中的商品（common.js 的 FirebaseUtils）。連線失敗時自動重試幾次，
    // 還是失敗就丟出例外，由 initializePage() 顯示錯誤並停用提交按鈕。
    // 以前失敗時會改用「抓整個 products 集合」的備用方法，那會連下架商品都抓回來，
    // 讓已下架的商品也能結帳，已移除
    async function loadAllProducts() {
        const MAX_ATTEMPTS = 3;
        for (let attempt = 1; ; attempt++) {
            try {
                const products = await window.FirebaseUtils.loadProducts();
                if (window.noteFirestoreSuccess) window.noteFirestoreSuccess();
                allProducts = products;
                console.log(`成功載入 ${products.length} 個產品`);
                return products;
            } catch (error) {
                console.warn(`載入商品失敗（第 ${attempt} 次）:`, error);
                if (attempt >= MAX_ATTEMPTS) throw error;
                if (window.maybeResetFirestoreConnection) await window.maybeResetFirestoreConnection();
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            }
        }
    }

    // 顯示庫存警告
    function showStockWarning(stockIssues) {
        const warningContainer = document.getElementById('stock-warning-container');

        if (stockIssues.length === 0) {
            warningContainer.style.display = 'none';
            return;
        }

        let warningHTML = '';
        let hasErrors = false;

        stockIssues.forEach(issue => {
            if (issue.currentStock === 0) {
                hasErrors = true;
                warningHTML += `
                    <div class="payment-stock-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>${escapeHtml(issue.name)}</strong> 已售完或已下架，請返回購物車調整。
                            <br><small>購物車數量：${issue.requestedQuantity} 件，目前庫存：${issue.currentStock} 件</small>
                        </div>
                    </div>
                `;
            } else {
                warningHTML += `
                    <div class="payment-stock-warning">
                        <i class="fas fa-exclamation-circle"></i>
                        <div>
                            <strong>${escapeHtml(issue.name)}</strong> 庫存不足，最多只能購買 ${issue.currentStock} 件。
                            <br><small>購物車數量：${issue.requestedQuantity} 件，目前庫存：${issue.currentStock} 件</small>
                        </div>
                    </div>
                `;
            }
        });

        warningContainer.innerHTML = warningHTML;
        warningContainer.style.display = 'block';

        // 如果有嚴重錯誤，禁用提交按鈕
        const submitBtn = document.getElementById('submit-order');
        const mobileSubmitBtn = document.getElementById('mobile-submit-order');

        if (hasErrors) {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '請先處理庫存問題';
            }
            if (mobileSubmitBtn) {
                mobileSubmitBtn.disabled = true;
                mobileSubmitBtn.textContent = '請先處理庫存問題';
            }
        } else {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '提交訂單';
            }
            if (mobileSubmitBtn) {
                mobileSubmitBtn.disabled = false;
                mobileSubmitBtn.textContent = '提交訂單';
            }
        }

        return hasErrors;
    }

    // 驗證購物車庫存 - 使用載入的產品資料
    function validateCartStockWithLoadedProducts() {
        try {
            console.log('開始驗證庫存，使用已載入的產品資料...');

            if (!allProducts || allProducts.length === 0) {
                console.error('產品資料未載入');
                return { isValid: false, issues: [] };
            }

            const cart = JSON.parse(localStorage.getItem('cart')) || [];

            // 合併相同商品的數量
            const mergedCart = [];
            cart.forEach(item => {
                const existingItem = mergedCart.find(i => i.id === item.id);
                if (existingItem) {
                    existingItem.quantity += item.quantity;
                } else {
                    mergedCart.push({...item});
                }
            });

            const stockIssues = [];

            // 檢查每個商品的庫存
            mergedCart.forEach(cartItem => {
                const product = allProducts.find(p => p.id === cartItem.id);

                if (!product) {
                    stockIssues.push({
                        id: cartItem.id,
                        name: cartItem.name,
                        requestedQuantity: cartItem.quantity,
                        currentStock: 0,
                        isValid: false
                    });
                } else if (product.stock < cartItem.quantity) {
                    stockIssues.push({
                        id: cartItem.id,
                        name: cartItem.name,
                        requestedQuantity: cartItem.quantity,
                        currentStock: product.stock,
                        isValid: product.stock > 0
                    });
                }
            });

            // 顯示庫存警告
            const hasErrors = showStockWarning(stockIssues);

            console.log('庫存驗證完成:', {
                總商品數: mergedCart.length,
                有問題商品數: stockIssues.length,
                有嚴重錯誤: hasErrors
            });

            return {
                isValid: stockIssues.length === 0,
                hasErrors: hasErrors,
                issues: stockIssues
            };

        } catch (error) {
            console.error('驗證庫存時發生錯誤:', error);
            return { isValid: false, hasErrors: true, issues: [] };
        }
    }

    // 即時庫存驗證 - 在提交訂單前最後檢查
    async function validateCartStockRealtime() {
        try {
            console.log('進行即時庫存驗證...');

            const cart = JSON.parse(localStorage.getItem('cart')) || [];

            // 合併相同商品的數量
            const mergedCart = [];
            cart.forEach(item => {
                const existingItem = mergedCart.find(i => i.id === item.id);
                if (existingItem) {
                    existingItem.quantity += item.quantity;
                } else {
                    mergedCart.push({...item});
                }
            });

            // 從 Firestore 獲取最新庫存
            const stockValidationResults = [];

            for (const item of mergedCart) {
                try {
                    const productDoc = await window.firebaseServices.getDoc(
                        window.firebaseServices.doc(window.firebaseServices.db, 'products', item.id)
                    );

                    if (productDoc.exists() && productDoc.data().status === 'active') {
                        const productData = productDoc.data();
                        const currentStock = productData.stock || 0;

                        // 記錄 Firestore 裡真實的商品資料，稍後建立訂單時會用這份取代購物車裡的內容
                        verifiedProducts[item.id] = { price: productData.price, name: productData.name };

                        stockValidationResults.push({
                            id: item.id,
                            name: item.name,
                            requestedQuantity: item.quantity,
                            currentStock: currentStock,
                            isValid: currentStock >= item.quantity
                        });
                    } else {
                        stockValidationResults.push({
                            id: item.id,
                            name: item.name,
                            requestedQuantity: item.quantity,
                            currentStock: 0,
                            isValid: false
                        });
                    }
                } catch (error) {
                    console.error(`驗證商品 ${item.id} 庫存時出錯:`, error);
                    stockValidationResults.push({
                        id: item.id,
                        name: item.name,
                        requestedQuantity: item.quantity,
                        currentStock: 0,
                        isValid: false
                    });
                }
            }

            // 檢查是否有庫存不足的商品
            const invalidItems = stockValidationResults.filter(item => !item.isValid);

            if (invalidItems.length > 0) {
                let errorMessage = '以下商品庫存不足，無法完成訂單：\n\n';
                invalidItems.forEach(item => {
                    errorMessage += `• ${item.name}: 需要 ${item.requestedQuantity} 件，庫存 ${item.currentStock} 件\n`;
                });
                errorMessage += '\n請返回購物車調整數量後重新結帳。';

                alert(errorMessage);
                return false;
            }

            console.log('即時庫存驗證通過');
            return true;

        } catch (error) {
            console.error('即時庫存驗證時發生錯誤:', error);
            alert('驗證庫存時發生錯誤，請稍後再試');
            return false;
        }
    }

    // 送禮選項功能
    function initGiftOption() {
        const giftCheckbox = document.getElementById('is-gift');
        const senderInfoSection = document.getElementById('sender-info-section');

        if (giftCheckbox && senderInfoSection) {
            giftCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    senderInfoSection.classList.add('show');
                } else {
                    senderInfoSection.classList.remove('show');
                    // 清空寄件人資訊
                    document.getElementById('sender-name').value = '';
                    document.getElementById('sender-phone').value = '';
                    document.getElementById('sender-address').value = '';
                }
            });
        }
    }

    // 顯示/隱藏主加載覆蓋層
    function showMainLoadingOverlay() {
        const overlay = document.getElementById('checkout-loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    function hideMainLoadingOverlay() {
        const overlay = document.getElementById('checkout-loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // 更新加載文字
    function updateLoadingText(text, subtext) {
        const loadingText = document.querySelector('.payment-page-loading-text');
        const loadingSubtext = document.querySelector('.payment-page-loading-subtext');
        if (loadingText) loadingText.textContent = text;
        if (loadingSubtext) loadingSubtext.textContent = subtext;
    }

    // 顯示配送選項加載中
    function showShippingOptionsLoading() {
        const loading = document.getElementById('shipping-options-loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    function hideShippingOptionsLoading() {
        const loading = document.getElementById('shipping-options-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    // 顯示訂單摘要計算中
    function showSummaryCalculating() {
        const summary = document.querySelector('.checkout-summary');
        if (summary) {
            summary.classList.add('payment-summary-calculating');
        }
    }

    function hideSummaryCalculating() {
        const summary = document.querySelector('.checkout-summary');
        if (summary) {
            summary.classList.remove('payment-summary-calculating');
        }
    }

    // 完成所有加載
    function finishLoading() {
        hideMainLoadingOverlay();
        hideShippingOptionsLoading();
        hideSummaryCalculating();

        // 移除 loading 類別並添加淡入動畫
        const checkoutSection = document.getElementById('checkout-section');
        if (checkoutSection) {
            checkoutSection.classList.remove('loading');
            checkoutSection.classList.add('payment-fade-in');
        }
    }

    // 顯示登入提醒彈窗
    function showLoginReminderModal() {
        const modal = document.createElement('div');
        modal.className = 'payment-login-reminder-modal';
        modal.innerHTML = `
            <div class="payment-login-reminder-content">
                <div class="payment-login-reminder-icon">
                    <i class="fas fa-user-circle"></i>
                </div>
                <h3>建議先登入會員</h3>
                <p>登入會員帳戶可以自動填充收件人資料，享受更便利的購物體驗，並可追蹤訂單狀態。</p>
                <div class="payment-login-reminder-actions">
                    <button class="btn payment-btn-reminder-primary" id="modal-login-btn">立即登入</button>
                    <button class="btn payment-btn-reminder-skip" id="modal-skip-btn">稍後再說</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加事件監聽器
        document.getElementById('modal-login-btn').addEventListener('click', function(e) {
            e.preventDefault();
            modal.remove();
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) loginBtn.click();
        });

        document.getElementById('modal-skip-btn').addEventListener('click', function(e) {
            e.preventDefault();
            modal.remove();
        });

        // 點擊背景關閉
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 檢查登入狀態並顯示相應提示
    function checkLoginStatus() {
        const memberReminder = document.getElementById('member-reminder');
        const memberLoginBtn = document.getElementById('member-login-btn');

        if (window.firebaseServices && window.firebaseServices.auth) {
            window.firebaseServices.onAuthStateChanged(window.firebaseServices.auth, function(user) {
                if (user) {
                    // 用戶已登入，隱藏提醒
                    memberReminder.style.display = 'none';
                    // 載入用戶資料
                    loadUserProfile(user);
                } else {
                    // 用戶未登入，顯示提醒
                    memberReminder.style.display = 'block';

                    // 延遲3秒顯示彈窗
                    setTimeout(() => {
                        showLoginReminderModal();
                    }, 3000);
                }
            });
        } else {
            // Firebase 未初始化，顯示提醒
            memberReminder.style.display = 'block';
            setTimeout(() => {
                showLoginReminderModal();
            }, 3000);
        }

        // 提醒區域的登入按鈕事件
        if (memberLoginBtn) {
            memberLoginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const loginBtn = document.getElementById('login-btn');
                if (loginBtn) loginBtn.click();
            });
        }
    }

    // 初始化變數
    const firebaseServices = window.firebaseServices;
    const orderItemsContainer = document.getElementById('order-items');
    const subtotalElem = document.getElementById('subtotal');
    const shippingFeeElem = document.getElementById('shipping-fee');
    const totalElem = document.getElementById('total');
    const submitOrderBtn = document.getElementById('submit-order');
    const mobileSubmitOrderBtn = document.getElementById('mobile-submit-order');
    const checkoutForm = document.getElementById('checkout-form');
    const shippingOptionsContainer = document.getElementById('shipping-options');

    // 獲取購物車數據
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // 商品的真實資料（在 validateCartStockRealtime() 驗證庫存時一併從 Firestore 取得），
    // 送出訂單前會用這份資料覆蓋購物車裡的價格與名稱，避免有人竄改 localStorage 裡的金額或商品名稱
    let verifiedProducts = {};

    // 如果購物車為空，返回購物車頁面
    if (cart.length === 0) {
        showToast('您的購物車是空的，請先添加商品。');
        setTimeout(() => {
            window.location.href = 'cart.html';
        }, 2000);
        return;
    }

    // 運費計算：跟購物車頁共用 js/shipping-calc.js
    function calculateShipping(cartItems, subtotal, method = 'home') {
        return ShippingCalc.calculate(shippingConfig, cartItems, subtotal, method);
    }

    // 訂單編號：JF + 時間戳記後 8 碼。
    // 以前會先查「今天已有幾筆訂單」來產生流水號，但安全規則不允許顧客列出別人的訂單，
    // 那個查詢每次都被拒絕、最後一定走到這個時間戳記的做法，等於每筆訂單多送一個註定失敗的請求，已移除
    function generateOrderNumber() {
        return 'JF' + Date.now().toString().slice(-8);
    }

    // 更新商品庫存
    async function updateProductStock() {
        try {
            console.log('開始更新庫存...');

            // 合併相同商品的數量
            const mergedCart = [];
            cart.forEach(item => {
                const existingItem = mergedCart.find(i => i.id === item.id);
                if (existingItem) {
                    existingItem.quantity += item.quantity;
                } else {
                    mergedCart.push({...item});
                }
            });

            // 批量更新庫存
            const stockUpdatePromises = mergedCart.map(async (item) => {
                try {
                    const productRef = firebaseServices.doc(firebaseServices.db, 'products', item.id);

                    // 使用 increment 函數減少庫存
                    await firebaseServices.updateDoc(productRef, {
                        stock: firebaseServices.increment(-item.quantity),
                        lastUpdated: firebaseServices.serverTimestamp()
                    });

                    console.log(`成功更新商品 ${item.name} 庫存，減少 ${item.quantity} 件`);
                    return { success: true, productId: item.id, name: item.name, quantity: item.quantity };

                } catch (error) {
                    console.error(`更新商品 ${item.id} 庫存失敗:`, error);
                    return { success: false, productId: item.id, name: item.name, error: error.message };
                }
            });

            // 等待所有庫存更新完成
            const updateResults = await Promise.all(stockUpdatePromises);

            // 檢查是否有更新失敗的商品
            const failedUpdates = updateResults.filter(result => !result.success);

            if (failedUpdates.length > 0) {
                console.error('部分商品庫存更新失敗:', failedUpdates);
                // 這裡可以選擇是否回滾操作，或者記錄錯誤
            }

            console.log('庫存更新完成');
            return { success: true, results: updateResults };

        } catch (error) {
            console.error('批量更新庫存時發生錯誤:', error);
            throw error;
        }
    }

    // 載入用戶個人資料並填充表單
    function loadUserProfile(user) {
        const uid = user.uid;

        // 設定電子郵件欄位。電話登入的人 user.email 通常是 undefined，
        // 不能直接指定給 input.value，否則欄位會顯示成字面上的 "undefined"
        document.getElementById('email').value = user.email || '';

        // 電話登入的人目前收不到任何通知：網站沒有簡訊功能，訂單/匯款回報/
        // 出貨通知都只會寄到 customer.email，這個欄位又剛好沒東西可以預先
        // 帶入。提醒他們自己填一個信箱，不然什麼通知都收不到
        const isPhoneLogin = Array.isArray(user.providerData) &&
            user.providerData.some(p => p.providerId === 'phone');
        const phoneLoginHint = document.getElementById('phone-login-email-hint');
        if (phoneLoginHint) {
            phoneLoginHint.style.display = isPhoneLogin ? 'block' : 'none';
        }

        // 從 Firestore 獲取用戶資料
        firebaseServices.getDoc(firebaseServices.doc(firebaseServices.db, 'users', uid))
            .then((docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();

                    // 填充收件人資料
                    document.getElementById('name').value = userData.name || '';
                    document.getElementById('phone').value = userData.phone || '';
                    if (twDistrictSelect) {
                        twDistrictSelect.setValue(userData.city || '', userData.district || '');
                    }
                    document.getElementById('address').value = userData.address || '';
                } else {
                    // 還沒有會員資料時用登入資訊預先帶入。電話登入的人 user.email 是 null，
                    // 直接 .split() 會丟錯、整段自動填入靜默失敗；他們唯一有的是手機號碼
                    const nameField = document.getElementById('name');
                    const phoneField = document.getElementById('phone');
                    if (nameField && !nameField.value) {
                        if (user.displayName) nameField.value = user.displayName;
                        else if (user.email) nameField.value = user.email.split('@')[0];
                    }
                    if (phoneField && !phoneField.value && user.phoneNumber) {
                        phoneField.value = user.phoneNumber.replace(/^\+886/, '0');
                    }
                }
            })
            .catch((error) => {
                console.error('獲取用戶資料時出錯:', error);
            });
    }

    // 生成配送選項 - 僅保留宅配到府
async function generateShippingOptions() {
    // 顯示配送選項加載中
    showShippingOptionsLoading();

    // 更新加載文字
    updateLoadingText('正在載入運費設定', '正在從資料庫獲取運費設定資料...');

    // 讀不到運費設定就丟出例外（initializePage 會停用提交按鈕），
    // 不能用預設值繼續——預設運費是 0，顧客會看到比實際少的金額
    shippingConfig = await ShippingCalc.load(window.firebaseServices);

    // 更新加載文字
    updateLoadingText('正在計算運費', '正在計算各種配送方式的運費...');

    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    // 只計算宅配到府的運費
    const homeShipping = calculateShipping(cart, subtotal, 'home');

    // 隱藏配送選項加載中
    hideShippingOptionsLoading();

    let optionsHTML = '';

    // 僅宅配到府選項
    optionsHTML += `
        <label class="radio-label">
            <input type="radio" name="shipping" value="home" checked>
            <span class="custom-radio"></span>
            <div class="radio-info">
                <span class="radio-title">宅配到府</span>
                <span class="radio-desc">於 1-3 個工作天內送達</span>
            </div>
            <span class="radio-price">
                ${homeShipping.isFreeShipping ?
                    '<span class="payment-free-shipping-badge">免費</span>' :
                    `NT$ ${homeShipping.fee}`
                }
            </span>
        </label>
    `;

    if (homeShipping.isFreeShipping) {
        optionsHTML += `
            <div class="payment-shipping-details">
                <small>${homeShipping.description}</small>
            </div>
        `;
    }

    shippingOptionsContainer.innerHTML = optionsHTML;

    // 預設計算宅配到府運費
    updateOrderSummary(subtotal, homeShipping);
}

    // 顯示購物車商品
    async function displayCartItems() {
        // 更新加載文字
        updateLoadingText('正在載入商品資訊', '正在從資料庫獲取商品詳細資訊...');

        let orderItemsHTML = '';
        let subtotal = 0;

        // 為購物車項目補充產品資訊，並把價格／名稱更新成資料庫目前的值。
        // 購物車存在瀏覽器裡的是「加入當下」的價格，後台改價後如果不在這裡更新，
        // 畫面上的小計會跟實際建立訂單的金額對不上
        const priceChanged = [];
        const enrichedCart = cart.map(cartItem => {
            const product = allProducts.find(p => p.id === cartItem.id);
            const enriched = {
                ...cartItem,
                imageUrl: product?.imageUrl || 'images/placeholder.jpg',
                stock: product?.stock || 0,
                category: product?.category || 'other'
            };
            if (product && typeof product.price === 'number' && product.price !== Number(cartItem.price)) {
                priceChanged.push(`${product.name}：NT$ ${cartItem.price} → NT$ ${product.price}`);
                enriched.price = product.price;
            }
            if (product && product.name) enriched.name = product.name;
            return enriched;
        });

        // 更新購物車資料（寫回瀏覽器，回到購物車頁看到的也是新價格）
        cart = enrichedCart;
        localStorage.setItem('cart', JSON.stringify(cart.map(({ imageUrl, ...item }) => item)));
        showPriceChangeNotice(priceChanged);

        // 合併相同商品
        const mergedCart = [];
        cart.forEach(item => {
            const existingItem = mergedCart.find(i => i.id === item.id);
            if (existingItem) {
                existingItem.quantity += item.quantity;
            } else {
                mergedCart.push({...item});
            }
        });

        // 生成訂單項目 HTML
        mergedCart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            orderItemsHTML += `
                <div class="order-item">
                    <div class="item-image">
                        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null; this.src='images/placeholder.jpg'">
                        <span class="item-quantity">${item.quantity}</span>
                    </div>
                    <div class="item-info">
                        <h3>${escapeHtml(item.name)}</h3>
                        <p>NT$ ${item.price} x ${item.quantity}</p>
                    </div>
                    <div class="item-total">NT$ ${itemTotal}</div>
                </div>
            `;
        });

        // 更新 DOM
        orderItemsContainer.innerHTML = orderItemsHTML;

        // 進行庫存驗證
        validateCartStockWithLoadedProducts();

        // 生成配送選項（包含運費計算）
        await generateShippingOptions();
    }

    // 後台改過價格時，在商品清單上方提醒顧客
    function showPriceChangeNotice(changes) {
        if (!changes || changes.length === 0) return;
        let notice = document.getElementById('payment-price-notice');
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'payment-price-notice';
            notice.setAttribute('role', 'status');
            notice.style.cssText = 'background:#fff8e1;border:1px solid #ffe082;color:#6d5200;border-radius:6px;padding:0.8em 1em;margin-bottom:1em;';
            orderItemsContainer.parentNode.insertBefore(notice, orderItemsContainer);
        }
        notice.innerHTML = '<i class="fas fa-info-circle"></i> 商品價格已更新：' + changes.map(text => escapeHtml(text)).join('；');
    }

    // 停用提交按鈕（資料讀不到時用，避免用錯的金額下單）
    function disableSubmit(label) {
        [submitOrderBtn, mobileSubmitOrderBtn].forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.textContent = label;
            }
        });
    }

    // 更新訂單摘要
    function updateOrderSummary(subtotal, shippingResult) {
        subtotalElem.textContent = `NT$ ${subtotal}`;

        if (shippingResult.isFreeShipping) {
            shippingFeeElem.innerHTML = `免費 <span class="payment-free-shipping-badge">優惠</span>`;
            document.getElementById('shipping-details').innerHTML = `<small>${escapeHtml(shippingResult.description)}</small>`;
            document.getElementById('shipping-details').style.display = 'block';
        } else {
            shippingFeeElem.textContent = `NT$ ${shippingResult.fee}`;
            document.getElementById('shipping-details').innerHTML = `<small>${escapeHtml(shippingResult.description)}</small>`;
            document.getElementById('shipping-details').style.display = 'block';
        }

        const total = subtotal + shippingResult.fee;
        totalElem.textContent = `NT$ ${total}`;

        window.orderTotal = total;
        window.currentShippingResult = shippingResult;
    }

    // 配送方式變更事件
    function bindShippingChangeEvents() {
        document.addEventListener('change', function(e) {
            if (e.target.name === 'shipping') {
                // 顯示計算中狀態
                const shippingContainer = document.getElementById('shipping-options');
                if (shippingContainer) {
                    shippingContainer.classList.add('payment-shipping-calculating');
                }

                showSummaryCalculating();

                // 延遲計算以顯示加載效果
                setTimeout(() => {
                    const subtotalValue = parseInt(subtotalElem.textContent.replace(/[^\d]/g, ''));
                    const selectedMethod = e.target.value;

                    const shippingResult = calculateShipping(cart, subtotalValue, selectedMethod);
                    updateOrderSummary(subtotalValue, shippingResult);

                    // 隱藏計算中狀態
                    if (shippingContainer) {
                        shippingContainer.classList.remove('payment-shipping-calculating');
                    }
                    hideSummaryCalculating();
                }, 800);
            }
        });
    }

    // 標示出表單裡未填寫/未選擇的必填欄位，並捲動到第一個讓使用者看到
    function highlightInvalidFields() {
        const invalidFields = checkoutForm.querySelectorAll(':invalid');

        invalidFields.forEach(function (field) {
            field.classList.add('field-invalid');

            const clearHighlight = function () {
                field.classList.remove('field-invalid');
                field.removeEventListener('input', clearHighlight);
                field.removeEventListener('change', clearHighlight);
            };
            field.addEventListener('input', clearHighlight, { once: true });
            field.addEventListener('change', clearHighlight, { once: true });
        });

        if (invalidFields.length > 0) {
            invalidFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            invalidFields[0].focus({ preventScroll: true });
        }
    }

    // 提交訂單函數
    async function submitOrder() {
        if (!checkoutForm.checkValidity()) {
            showToast('請填寫所有必填欄位');
            highlightInvalidFields();
            return;
        }

        // 禁用提交按鈕，防止重複提交
        if (submitOrderBtn) {
            submitOrderBtn.disabled = true;
            submitOrderBtn.textContent = '驗證庫存中...';
        }
        if (mobileSubmitOrderBtn) {
            mobileSubmitOrderBtn.disabled = true;
            mobileSubmitOrderBtn.textContent = '驗證庫存中...';
        }

        try {
            // 第一步：進行即時庫存驗證
            const stockValid = await validateCartStockRealtime();
            if (!stockValid) {
                // 重新啟用提交按鈕
                if (submitOrderBtn) {
                    submitOrderBtn.disabled = false;
                    submitOrderBtn.textContent = '提交訂單';
                }
                if (mobileSubmitOrderBtn) {
                    mobileSubmitOrderBtn.disabled = false;
                    mobileSubmitOrderBtn.textContent = '提交訂單';
                }
                return;
            }

            // 更新按鈕文字
            if (submitOrderBtn) {
                submitOrderBtn.textContent = '建立訂單中...';
            }
            if (mobileSubmitOrderBtn) {
                mobileSubmitOrderBtn.textContent = '建立訂單中...';
            }

            // 第二步：生成智能訂單編號
            const orderNumber = generateOrderNumber();

            // 第三步：收集訂單數據
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;
            const city = document.getElementById('city').value;
            const district = document.getElementById('district').value;
            const address = document.getElementById('address').value;
            const shipping = document.querySelector('input[name="shipping"]:checked').value;
            const payment = document.querySelector('input[name="payment"]:checked').value;
            const notes = document.getElementById('notes').value;

            // 送禮相關資料
            const isGift = document.getElementById('is-gift').checked;
            const senderName = isGift ? document.getElementById('sender-name').value : '';
            const senderPhone = isGift ? document.getElementById('sender-phone').value : '';
            const senderAddress = isGift ? document.getElementById('sender-address').value : '';

            // 開著頁面的這段時間後台改了價格：先更新畫面讓顧客確認新金額，不要直接用新價格下單
            const changedWhileOpen = cart.filter(item => {
                const verified = verifiedProducts[item.id];
                return verified && typeof verified.price === 'number' && verified.price !== item.price;
            });
            if (changedWhileOpen.length > 0) {
                allProducts = allProducts.map(product => {
                    const verified = verifiedProducts[product.id];
                    return verified && typeof verified.price === 'number' ? { ...product, price: verified.price } : product;
                });
                await displayCartItems();
                alert('商品價格剛剛更新了，請確認新的金額後再送出訂單。');
                [submitOrderBtn, mobileSubmitOrderBtn].forEach(btn => {
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = '提交訂單';
                    }
                });
                return;
            }

            // 用剛才驗證庫存時取得的真實價格覆蓋購物車價格，
            // 避免有人竄改瀏覽器裡的 localStorage 購物車金額後直接送出訂單
            const verifiedCart = cart.map(item => {
                const verified = verifiedProducts[item.id];
                return {
                    ...item,
                    price: (verified && typeof verified.price === 'number') ? verified.price : item.price,
                    name: (verified && verified.name) ? verified.name : item.name
                };
            });

            const subtotal = verifiedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const shippingFee = window.currentShippingResult ? window.currentShippingResult.fee : 0;
            const total = subtotal + shippingFee;

            // 建立訂單對象
            const orderData = {
                customer: {
                    name: name,
                    phone: phone,
                    email: email,
                    address: `${city}${district}${address}`
                },
                shipping: shipping,
                shippingFee: shippingFee,
                shippingDetails: window.currentShippingResult || {},
                payment: payment,
                items: verifiedCart,
                subtotal: subtotal,
                total: total,
                notes: notes,
                orderDate: firebaseServices.serverTimestamp(),
                status: 'pending',
                orderNumber: orderNumber,
                // 送禮資訊
                isGift: isGift
            };

            // 如果是送禮訂單，添加寄件人資訊
            if (isGift) {
                orderData.sender = {
                    name: senderName,
                    phone: senderPhone,
                    address: senderAddress
                };
            }

            // 如果用戶已登入，記錄用戶ID
            const currentUser = firebaseServices.auth.currentUser;
            if (currentUser) {
                orderData.userId = currentUser.uid;
            }

            console.log('準備提交訂單資料:', orderData);

            // 第四步：將訂單保存到 Firestore
            const ordersCollectionRef = firebaseServices.collection(firebaseServices.db, 'orders');
            const docRef = await firebaseServices.addDoc(ordersCollectionRef, orderData);

            console.log('訂單已創建，ID:', docRef.id);
            console.log('訂單編號:', orderNumber);

            // 更新按鈕文字
            if (submitOrderBtn) {
                submitOrderBtn.textContent = '更新庫存中...';
            }
            if (mobileSubmitOrderBtn) {
                mobileSubmitOrderBtn.textContent = '更新庫存中...';
            }

            // 第五步：更新商品庫存
            try {
                await updateProductStock();
                console.log('庫存更新成功');
            } catch (stockError) {
                console.error('庫存更新失敗:', stockError);
                // 即使庫存更新失敗，訂單仍然建立成功
                // 可以記錄錯誤，後續手動處理
                console.warn('訂單已建立但庫存更新失敗，需要手動處理');
            }

            // 第六步：清空購物車
            localStorage.removeItem('cart');

            // 第七步：保存訂單號到 sessionStorage
            sessionStorage.setItem('lastOrder', JSON.stringify({
                id: docRef.id,
                orderNumber: orderNumber,
                total: orderData.total,
                items: cart.length,
                customerName: orderData.customer.name,
                customerPhone: orderData.customer.phone,
                orderDate: new Date().toISOString().split('T')[0],
                isGift: isGift,
                senderName: senderName
            }));

            // 第八步：顯示成功訊息並跳轉
            showSuccessMessage(orderNumber, orderData.total, isGift);

            // 3秒後跳轉到成功頁面
            setTimeout(() => {
                window.location.href = 'order-success.html';
            }, 3000);

        } catch (error) {
            console.error('提交訂單時出錯:', error);
            showErrorMessage(error.message);

            // 重新啟用提交按鈕
            if (submitOrderBtn) {
                submitOrderBtn.disabled = false;
                submitOrderBtn.textContent = '提交訂單';
            }
            if (mobileSubmitOrderBtn) {
                mobileSubmitOrderBtn.disabled = false;
                mobileSubmitOrderBtn.textContent = '提交訂單';
            }
        }
    }

    // 顯示成功訊息
    function showSuccessMessage(orderNumber, total, isGift) {
        const giftText = isGift ? '<p class="gift-order-text"><i class="fas fa-gift"></i> 送禮訂單</p>' : '';
        const successModal = document.createElement('div');
        successModal.className = 'order-success-modal';
        successModal.innerHTML = `
            <div class="success-overlay"></div>
            <div class="success-content">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>訂單提交成功！</h2>
                ${giftText}
                <div class="order-details">
                    <p><strong>訂單編號：</strong>${orderNumber}</p>
                    <p><strong>訂單金額：</strong>NT$ ${total}</p>
                </div>
                <p class="success-message">感謝您的訂購！我們會儘快為您處理訂單。</p>
                <p class="redirect-message">3秒後將自動跳轉到訂單詳情頁面...</p>
            </div>
        `;

        // 添加樣式
        addSuccessModalStyles();
        document.body.appendChild(successModal);
    }

    // 添加成功彈窗樣式
    function addSuccessModalStyles() {
        if (!document.querySelector('#order-success-styles')) {
            const styles = document.createElement('style');
            styles.id = 'order-success-styles';
            styles.textContent = `
                .order-success-modal {
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

                .success-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                }

                .success-content {
                    background: white;
                    padding: 2.5rem;
                    border-radius: 15px;
                    text-align: center;
                    max-width: 450px;
                    margin: 0 1rem;
                    position: relative;
                    z-index: 1;
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
                }

                .success-icon {
                    font-size: 4rem;
                    color: #4caf50;
                    margin-bottom: 1rem;
                    animation: checkAnimation 0.6s ease-in-out;
                }

                @keyframes checkAnimation {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }

                .success-content h2 {
                    color: #2c3e50;
                    margin: 0 0 1.5rem 0;
                    font-size: 1.5rem;
                }

                .gift-order-text {
                    color: #f0b900;
                    font-weight: 600;
                    margin: 0 0 1rem 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .order-details {
                    background: #f8f9fa;
                    padding: 1rem;
                    border-radius: 8px;
                    margin: 1rem 0;
                }

                .order-details p {
                    margin: 0.5rem 0;
                    color: #333;
                }

                .success-message {
                    color: #666;
                    margin: 1rem 0;
                    line-height: 1.5;
                }

                .redirect-message {
                    color: #888;
                    font-size: 0.9rem;
                    margin-top: 1rem;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    // 顯示錯誤訊息
    function showErrorMessage(errorMessage) {
        alert(`提交訂單時出錯：${errorMessage}\n\n請稍後再試或聯繫客服。`);
    }

    // 簡單的 Toast 通知函數
    function showToast(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    // 添加事件監聽器
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', submitOrder);
    }

    if (mobileSubmitOrderBtn) {
        mobileSubmitOrderBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (submitOrderBtn && !submitOrderBtn.disabled) {
                submitOrder();
            }
        });
    }

    // 初始化頁面
    async function initializePage() {
        // 顯示主加載覆蓋層
        showMainLoadingOverlay();

        // 初始化縣市／鄉鎮市區連動下拉選單
        if (window.initTWDistrictSelect) {
            twDistrictSelect = window.initTWDistrictSelect('city', 'district');
        }

        try {
            // 顯示訂單摘要計算中
            showSummaryCalculating();

            // 載入產品資料
            await loadAllProducts();

            // 載入商品和配送選項
            await displayCartItems();

            // 綁定配送方式變更事件
            bindShippingChangeEvents();

            // 初始化送禮選項
            initGiftOption();

            // 更新購物車計數
            updateCartCount();

            // 檢查登入狀態
            checkLoginStatus();

            // 延遲一點時間讓用戶看到加載效果
            setTimeout(() => {
                finishLoading();
            }, 800);

        } catch (error) {
            console.error('初始化結帳頁面失敗:', error);
            finishLoading();
            // 商品或運費讀不到時金額一定不正確，停用提交按鈕，寧可擋住也不要讓顧客用錯的金額下單
            disableSubmit('連線不穩定，請重新整理頁面');
            if (shippingOptionsContainer) {
                shippingOptionsContainer.innerHTML = '<p class="error-message">網路連線不穩定，暫時無法計算運費，請重新整理頁面。</p>';
            }
            showToast('網路連線不穩定，無法載入商品與運費資料，請重新整理頁面');
        }
    }

    // 啟動初始化
    initializePage();
});