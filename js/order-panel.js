// escapeHtml 由 admin-common.js 提供的全域函式（该檔案先載入，避免重複實作）

document.addEventListener('DOMContentLoaded', function() {
    // 等待 AdminCommon 載入完成
    const waitForAdminCommon = function() {
        if (window.AdminCommon) {
            console.log('AdminCommon 已載入');
            initializeOrderPanel();
        } else {
            console.log('等待 AdminCommon 載入...');
            setTimeout(waitForAdminCommon, 100);
        }
    };
    
    function initializeOrderPanel() {
        const ordersSection = document.getElementById('orders-section');
        const unauthorizedSection = document.getElementById('unauthorized-section');
        const orderList = document.getElementById('order-list');
        const orderDetail = document.getElementById('order-detail');
        const refreshBtn = document.getElementById('refresh-btn');
        const statusFilter = document.getElementById('status-filter');
        const searchInput = document.getElementById('search-order');
        const searchBtn = document.getElementById('search-btn');
        
        // 黑貓宅急便匯出相關元素
        const exportBlackcatBtn = document.getElementById('export-blackcat-btn');
        const blackcatExportModal = document.getElementById('blackcat-export-modal');
        const blackcatExportForm = document.getElementById('blackcat-export-form');
        const cancelBlackcatExportBtn = document.getElementById('cancel-blackcat-export');
        
        // Excel匯出相關元素
        const exportExcelBtn = document.getElementById('export-excel-btn');
        const excelExportModal = document.getElementById('excel-export-modal');
        const excelExportForm = document.getElementById('excel-export-form');
        const cancelExcelExportBtn = document.getElementById('cancel-excel-export');
        
        // 使用 AdminCommon 檢查管理員權限
        window.AdminCommon.checkAdminAccess(
            function(user) {
                // 成功回調
                ordersSection.style.display = 'block';
                unauthorizedSection.style.display = 'none';
                loadOrders();
            },
            function(error) {
                // 失敗回調
                ordersSection.style.display = 'none';
                unauthorizedSection.style.display = 'block';
                const currentUserEmail = document.getElementById('current-user-email');
                if (currentUserEmail) {
                    if (error === '未登入') {
                        currentUserEmail.textContent = '您尚未登入';
                    } else {
                        currentUserEmail.textContent = '權限不足';
                    }
                }
            }
        );
        
        // 黑貓宅急便匯出功能
        if (exportBlackcatBtn) {
            exportBlackcatBtn.addEventListener('click', function() {
                blackcatExportModal.classList.add('active');
            });
        }
        
        if (cancelBlackcatExportBtn) {
            cancelBlackcatExportBtn.addEventListener('click', function() {
                blackcatExportModal.classList.remove('active');
            });
        }
        
        // 黑貓宅急便表單提交
        if (blackcatExportForm) {
            blackcatExportForm.addEventListener('submit', function(e) {
                e.preventDefault();
                generateBlackcatExport();
            });
        }
        
        // Excel匯出功能
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', function() {
                excelExportModal.classList.add('active');
            });
        }
        
        if (cancelExcelExportBtn) {
            cancelExcelExportBtn.addEventListener('click', function() {
                excelExportModal.classList.remove('active');
            });
        }
        
        // Excel匯出表單提交
        if (excelExportForm) {
            excelExportForm.addEventListener('submit', function(e) {
                e.preventDefault();
                generateExcelReport();
            });
        }
        
        // 點擊模態框外部關閉
        window.addEventListener('click', function(e) {
            if (e.target === blackcatExportModal) {
                blackcatExportModal.classList.remove('active');
            }
            if (e.target === excelExportModal) {
                excelExportModal.classList.remove('active');
            }
        });
        
        // 刷新按鈕
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                loadOrders();
            });
        }
        
        // 狀態篩選
        if (statusFilter) {
            statusFilter.addEventListener('change', function() {
                loadOrders();
            });
        }
        
        // 搜尋功能
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                loadOrders();
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    loadOrders();
                }
            });
        }
        
        // 修正後的黑貓宅急便匯出功能
        async function generateBlackcatExport() {
            try {
                window.AdminCommon.showToast('正在生成黑貓宅急便格式...', 'info');
                
                // 獲取表單數據
                const defaultSenderName = document.getElementById('sender-name').value.trim();
                const defaultSenderPhone = document.getElementById('sender-phone').value.trim();
                const defaultSenderAddress = document.getElementById('sender-address').value.trim();
                const exportRange = document.querySelector('input[name="export-range"]:checked').value;

                if (!defaultSenderName || !defaultSenderPhone || !defaultSenderAddress) {
                    window.AdminCommon.showToast('請填寫完整的預設寄件人資訊', 'warning');
                    return;
                }
                
                // 查詢訂單
                const ordersCollectionRef = window.firebaseServices.collection(window.firebaseServices.db, 'orders');
                let q;
                
                if (exportRange === 'all') {
                    q = window.firebaseServices.query(ordersCollectionRef, 
                        window.firebaseServices.orderBy('orderDate', 'desc'));
                } else {
                    q = window.firebaseServices.query(ordersCollectionRef, 
                        window.firebaseServices.where('status', '==', exportRange));
                }
                
                const querySnapshot = await window.firebaseServices.getDocs(q);
                
                if (querySnapshot.empty) {
                    window.AdminCommon.showToast('沒有找到符合條件的訂單', 'warning');
                    blackcatExportModal.classList.remove('active');
                    return;
                }
                
                // 建立黑貓宅急便Excel格式
                const workbook = XLSX.utils.book_new();
                const blackcatData = [];
                
                // 添加黑貓宅急便格式標題
                blackcatData.push([
                    '訂單編號', '溫層', '距離', '規格', '代收貨款', 
                    '收件人-姓名', '收件人-電話', '收件人-手機', '收件人-地址',
                    '寄件人-姓名', '寄件人-電話', '寄件人-地址',
                    '出貨日期', '希望配達日', '希望配合時段', 
                    '品類代碼', '品名', '易碎物品', '精密儀器', '備註',
                    '報值(Y|N)', '報值金額', '到付單(Y|N)'
                ]);
                
                const today = new Date().toISOString().split('T')[0];

                // 黑貓格式的日期欄位是 YYYYMMDD；出貨日期為系統當日，希望配達日為出貨日+1天
                const formatDateYYYYMMDD = (date) => {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    return `${y}${m}${d}`;
                };
                const now = new Date();
                const shipDateStr = formatDateYYYYMMDD(now);
                const deliveryDateObj = new Date(now);
                deliveryDateObj.setDate(now.getDate() + 1);
                const deliveryDateStr = formatDateYYYYMMDD(deliveryDateObj);

                // 匯出後要自動標示為「待出貨」的訂單 id（已出貨/已完成/已取消的訂單不動，避免被誤降回待出貨）
                const orderIdsToMarkAwaitingShipment = [];

                querySnapshot.forEach((doc) => {
                    const orderData = doc.data();

                    if (!['shipped', 'completed', 'cancelled'].includes(orderData.status)) {
                        orderIdsToMarkAwaitingShipment.push(doc.id);
                    }

                    // 決定寄件人資訊 - 優先使用客戶填入的送禮資訊
                    let senderName = defaultSenderName;
                    let senderPhone = defaultSenderPhone;
                    let senderAddress = defaultSenderAddress;

                    // 如果是送禮訂單且有寄件人資訊，使用客戶填入的資訊
                    if (orderData.isGift && orderData.sender) {
                        if (orderData.sender.name && orderData.sender.name.trim()) {
                            senderName = orderData.sender.name.trim();
                        }
                        if (orderData.sender.phone && orderData.sender.phone.trim()) {
                            senderPhone = orderData.sender.phone.trim();
                        }
                        if (orderData.sender.address && orderData.sender.address.trim()) {
                            senderAddress = orderData.sender.address.trim();
                        }
                    }

                    const orderTotal = orderData.total || 0;

                    // 品名 - 依照訂單內的產品名稱
                    let productNames = '';
                    if (orderData.items && orderData.items.length > 0) {
                        productNames = orderData.items.map(item => item.name).join(', ');
                    }

                    blackcatData.push([
                        '', // 訂單編號 - 不填
                        '', // 溫層 - 不填
                        '', // 距離 - 不填
                        '', // 規格 - 不填
                        0, // 代收貨款 - 預設0
                        orderData.customer?.name || '', // 收件人姓名
                        orderData.customer?.phone || '', // 收件人電話
                        orderData.customer?.phone || '', // 收件人手機 (使用相同電話)
                        orderData.customer?.address || '', // 收件人地址
                        senderName, // 寄件人姓名 (優先使用客戶填入的送禮寄件人)
                        senderPhone, // 寄件人電話 (優先使用客戶填入的送禮寄件人)
                        senderAddress, // 寄件人地址 (優先使用客戶填入的送禮寄件人)
                        shipDateStr, // 出貨日期 - 系統當日
                        deliveryDateStr, // 希望配達日 - 出貨日+1天
                        '', // 希望配合時段 - 不填
                        '', // 品類代碼 - 不填
                        productNames, // 品名 - 依訂單產品名稱
                        'Y', // 易碎物品
                        'N', // 精密儀器
                        '', // 備註 - 不填
                        'Y', // 報值(Y|N)
                        orderTotal, // 報值金額 - 使用訂單總金額
                        'N' // 到付單(Y|N)
                    ]);
                });
                
                const blackcatSheet = XLSX.utils.aoa_to_sheet(blackcatData);
                
                // 設定欄寬
                blackcatSheet['!cols'] = [
                    { width: 30 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 10 },
                    { width: 15 }, { width: 15 }, { width: 15 }, { width: 30 },
                    { width: 15 }, { width: 15 }, { width: 30 },
                    { width: 12 }, { width: 12 }, { width: 15 },
                    { width: 10 }, { width: 25 }, { width: 10 }, { width: 10 }, { width: 20 },
                    { width: 10 }, { width: 10 }, { width: 10 }
                ];
                
                XLSX.utils.book_append_sheet(workbook, blackcatSheet, '黑貓宅急便');
                
                const fileName = `杰の御果園_黑貓宅急便_${today}.xlsx`;
                XLSX.writeFile(workbook, fileName);

                // 匯出成功後，把這批訂單自動標示為「待出貨」（已出貨/已完成/已取消的訂單不受影響）
                if (orderIdsToMarkAwaitingShipment.length > 0) {
                    const batch = window.firebaseServices.writeBatch(window.firebaseServices.db);
                    orderIdsToMarkAwaitingShipment.forEach(orderId => {
                        const orderRef = window.firebaseServices.doc(window.firebaseServices.db, 'orders', orderId);
                        batch.update(orderRef, { status: 'confirmed' });
                    });
                    await batch.commit();
                }

                window.AdminCommon.showToast('黑貓宅急便格式已成功生成並下載，訂單已標示為待出貨！', 'success');
                blackcatExportModal.classList.remove('active');
                loadOrders();

            } catch (error) {
                console.error('生成黑貓宅急便格式時出錯:', error);
                window.AdminCommon.showToast('生成黑貓宅急便格式時出錯，請稍後再試', 'error');
            }
        }
        
        // Excel詳細報表匯出功能
        async function generateExcelReport() {
            try {
                window.AdminCommon.showToast('正在生成Excel報表...', 'info');
                
                const exportRange = document.querySelector('input[name="excel-export-range"]:checked').value;
                
                const ordersCollectionRef = window.firebaseServices.collection(window.firebaseServices.db, 'orders');
                let q;
                
                if (exportRange === 'all') {
                    q = window.firebaseServices.query(ordersCollectionRef, 
                        window.firebaseServices.orderBy('orderDate', 'desc'));
                } else {
                    q = window.firebaseServices.query(ordersCollectionRef, 
                        window.firebaseServices.where('status', '==', exportRange));
                }
                
                const querySnapshot = await window.firebaseServices.getDocs(q);
                
                if (querySnapshot.empty) {
                    window.AdminCommon.showToast('沒有找到符合條件的訂單', 'warning');
                    excelExportModal.classList.remove('active');
                    return;
                }
                
                const workbook = XLSX.utils.book_new();
                const detailData = [];
                detailData.push([
                    '訂單日期', '訂單編號', '訂單類型', '客戶姓名', '客戶電話', '客戶Email',
                    '寄件人姓名', '寄件人電話', '寄件人地址',
                    '商品名稱', '分類', '數量', '單價', '小計', '訂單狀態', '配送方式', '付款方式'
                ]);
                
                querySnapshot.forEach((doc) => {
                    const orderData = doc.data();
                    
                    let orderDate = '未知日期';
                    if (orderData.orderDate && orderData.orderDate.toDate) {
                        orderDate = orderData.orderDate.toDate().toLocaleDateString('zh-TW');
                    }
                    
                    const orderNumber = orderData.orderNumber || doc.id;
                    const orderType = orderData.isGift ? '禮物訂單' : '一般訂單';
                    const customerName = orderData.customer?.name || '未知客戶';
                    const customerPhone = orderData.customer?.phone || '';
                    const customerEmail = orderData.customer?.email || '';
                    const orderStatus = getStatusText(orderData.status || 'pending');
                    const shippingMethod = orderData.shipping === 'home' ? '宅配到府' : '超商取貨';
                    const paymentMethod = orderData.payment === 'transfer' ? 'ATM轉帳' : '信用卡付款';
                    
                    // 寄件人資訊
                    let senderName = '';
                    let senderPhone = '';
                    let senderAddress = '';
                    
                    if (orderData.isGift && orderData.sender) {
                        senderName = orderData.sender.name || '';
                        senderPhone = orderData.sender.phone || '';
                        senderAddress = orderData.sender.address || '';
                    }
                    
                    if (orderData.items && orderData.items.length > 0) {
                        orderData.items.forEach(item => {
                            // 商品分類中文對照
                            let categoryText = '其他';
                            switch(item.category) {
                                case 'pear': categoryText = '梨子'; break;
                                case 'persimmon': categoryText = '柿子'; break;
                                case 'peach': categoryText = '水蜜桃'; break;
                                case 'apple': categoryText = '蘋果'; break;
                                case 'gift': categoryText = '禮盒'; break;
                            }
                            
                            detailData.push([
                                orderDate,
                                orderNumber,
                                orderType,
                                customerName,
                                customerPhone,
                                customerEmail,
                                senderName,
                                senderPhone,
                                senderAddress,
                                item.name || '未知商品',
                                categoryText,
                                item.quantity,
                                item.price,
                                item.price * item.quantity,
                                orderStatus,
                                shippingMethod,
                                paymentMethod
                            ]);
                        });
                    }
                });
                
                const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
                detailSheet['!cols'] = [
                    { width: 15 }, { width: 20 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 25 },
                    { width: 15 }, { width: 15 }, { width: 25 },
                    { width: 30 }, { width: 12 }, { width: 8 }, { width: 10 }, { width: 10 }, 
                    { width: 12 }, { width: 12 }, { width: 12 }
                ];
                
                XLSX.utils.book_append_sheet(workbook, detailSheet, '訂單明細');
                
                const today = new Date().toISOString().split('T')[0];
                const fileName = `杰の御果園_訂單報表_${today}.xlsx`;
                XLSX.writeFile(workbook, fileName);
                
                window.AdminCommon.showToast('Excel報表已成功生成並下載！', 'success');
                excelExportModal.classList.remove('active');
                
            } catch (error) {
                console.error('生成Excel報表時出錯:', error);
                window.AdminCommon.showToast('生成Excel報表時出錯，請稍後再試', 'error');
            }
        }
        
        function getStatusText(status) {
            const statusMap = {
                'pending': '待處理',
                'confirmed': '待出貨',
                'shipped': '已出貨',
                'completed': '已完成',
                'cancelled': '已取消'
            };
            return statusMap[status] || '未知狀態';
        }
        
        // 加載訂單
        function loadOrders() {
            orderList.innerHTML = '<p class="loading-message">載入訂單中...</p>';
            orderDetail.innerHTML = '<div class="no-order-selected"><p>請選擇一個訂單查看詳情</p></div>';
            
            const ordersCollectionRef = window.firebaseServices.collection(window.firebaseServices.db, 'orders');
            
            try {
                let q;
                const statusValue = statusFilter.value;
                
                if (statusValue === 'all') {
                    q = window.firebaseServices.query(ordersCollectionRef, 
                        window.firebaseServices.orderBy('orderDate', 'desc'));
                } else {
                    q = window.firebaseServices.query(ordersCollectionRef, 
                        window.firebaseServices.where('status', '==', statusValue));
                }
                
                window.firebaseServices.getDocs(q)
                    .then((querySnapshot) => {
                        if (querySnapshot.empty) {
                            orderList.innerHTML = '<p class="no-orders">沒有找到訂單</p>';
                            return;
                        }
                        
                        const searchTerm = searchInput.value.trim().toLowerCase();
                        let filteredOrders = [];
                        
                        querySnapshot.forEach((doc) => {
                            const orderData = doc.data();
                            orderData.id = doc.id;
                            
                            if (searchTerm) {
                                const orderNumber = orderData.orderNumber?.toLowerCase() || '';
                                const customerName = orderData.customer?.name?.toLowerCase() || '';
                                const customerPhone = orderData.customer?.phone?.toLowerCase() || '';
                                const customerEmail = orderData.customer?.email?.toLowerCase() || '';
                                
                                if (orderNumber.includes(searchTerm) || 
                                    customerName.includes(searchTerm) || 
                                    customerPhone.includes(searchTerm) || 
                                    customerEmail.includes(searchTerm)) {
                                    filteredOrders.push(orderData);
                                }
                            } else {
                                filteredOrders.push(orderData);
                            }
                        });
                        
                        if (filteredOrders.length === 0) {
                            orderList.innerHTML = '<p class="no-orders">沒有找到符合條件的訂單</p>';
                            return;
                        }
                        
                        if (statusValue !== 'all') {
                            filteredOrders.sort((a, b) => {
                                const dateA = a.orderDate && a.orderDate.toDate ? a.orderDate.toDate() : new Date(a.orderDate || 0);
                                const dateB = b.orderDate && b.orderDate.toDate ? b.orderDate.toDate() : new Date(b.orderDate || 0);
                                return dateB - dateA;
                            });
                        }
                        
                        let ordersHTML = '';
                        
                        filteredOrders.forEach(order => {
                            const orderDate = window.AdminCommon.formatDate(order.orderDate, 'full');
                            
                            let statusClass = '';
                            let statusText = '';
                            
                            switch(order.status) {
                                case 'pending':
                                    statusClass = 'pending';
                                    statusText = '待處理';
                                    break;
                                case 'confirmed':
                                    statusClass = 'confirmed';
                                    statusText = '待出貨';
                                    break;
                                case 'shipped':
                                    statusClass = 'shipped';
                                    statusText = '已出貨';
                                    break;
                                case 'completed':
                                    statusClass = 'completed';
                                    statusText = '已完成';
                                    break;
                                case 'cancelled':
                                    statusClass = 'cancelled';
                                    statusText = '已取消';
                                    break;
                                default:
                                    statusClass = 'pending';
                                    statusText = '待處理';
                            }
                            
                            // 送禮訂單標籤 - 移除文字，只保留圖標
                            const giftBadge = order.isGift ? 
                                '<div class="gift-order-badge"><i class="fas fa-gift"></i></div>' : '';
                            
                            ordersHTML += `
                                <div class="order-item" data-id="${order.id}">
                                    ${giftBadge}
                                    <div class="order-item-header">
                                        <span class="order-number">${order.orderNumber || '無訂單編號'}</span>
                                        <span class="status-badge ${statusClass}">${statusText}</span>
                                    </div>
                                    <div class="order-item-body">
                                        <p><strong>客戶:</strong> ${escapeHtml(order.customer?.name) || '未知'}</p>
                                        <p><strong>金額:</strong> ${order.total || 0}</p>
                                        <p><strong>日期:</strong> ${orderDate}</p>
                                        ${order.isGift ? '<p class="gift-order-text"><i class="fas fa-gift"></i> 送禮訂單</p>' : ''}
                                    </div>
                                </div>
                            `;
                        });
                        
                        orderList.innerHTML = ordersHTML;
                        
                        document.querySelectorAll('.order-item').forEach(item => {
                            item.addEventListener('click', function() {
                                document.querySelectorAll('.order-item').forEach(order => {
                                    order.classList.remove('selected');
                                });
                                
                                this.classList.add('selected');
                                
                                const orderId = this.getAttribute('data-id');
                                showOrderDetail(orderId);
                            });
                        });
                    })
                    .catch((error) => {
                        console.error('獲取訂單時出錯:', error);
                        orderList.innerHTML = '<p class="error-message">獲取訂單時出錯，請稍後再試</p>';
                    });
            } catch (error) {
                console.error('建立查詢時出錯:', error);
                orderList.innerHTML = '<p class="error-message">處理訂單查詢時出錯，請稍後再試</p>';
            }
        }
        
        // 顯示訂單詳情
        function showOrderDetail(orderId) {
            orderDetail.innerHTML = '<p class="loading-message">載入訂單詳情中...</p>';
            
            const orderDocRef = window.firebaseServices.doc(window.firebaseServices.db, 'orders', orderId);
            
            async function getProductImages() {
                try {
                    const productsCollection = window.firebaseServices.collection(window.firebaseServices.db, "products");
                    const productsSnapshot = await window.firebaseServices.getDocs(productsCollection);
                    
                    const productImages = {};
                    productsSnapshot.forEach(doc => {
                        const data = doc.data();
                        productImages[doc.id] = data.imageUrl || 'images/placeholder.jpg';
                    });
                    
                    return productImages;
                } catch (error) {
                    console.error('獲取產品圖片失敗:', error);
                    return {};
                }
            }
            
            window.firebaseServices.getDoc(orderDocRef)
                .then(async (docSnap) => {
                    if (docSnap.exists()) {
                        const order = docSnap.data();
                        const productImages = await getProductImages();
                        
                        const orderDate = window.AdminCommon.formatDate(order.orderDate, 'full');
                        
                        let itemsHTML = '';
                        if (order.items && order.items.length > 0) {
                            itemsHTML = '<div class="order-items-list">';
                            order.items.forEach(item => {
                                const imageUrl = productImages[item.id] || item.image || 'images/placeholder.jpg';
                                
                                itemsHTML += `
                                    <div class="order-item-detail">
                                        <div class="item-image">
                                            <img src="${imageUrl}" alt="${escapeHtml(item.name)}" onerror="this.src='images/placeholder.jpg'">
                                        </div>
                                        <div class="item-info">
                                            <h4>${escapeHtml(item.name)}</h4>
                                            <p>${item.price} x ${item.quantity} = ${item.price * item.quantity}</p>
                                        </div>
                                    </div>
                                `;
                            });
                            itemsHTML += '</div>';
                        } else {
                            itemsHTML = '<p>沒有商品信息</p>';
                        }
                        
                        let notesHTML = '';
                        if (order.notes && order.notes.trim() !== '') {
                            notesHTML = `
                                <div class="order-notes">
                                    <h4>客戶備註:</h4>
                                    <p>${order.notes ? escapeHtml(order.notes).replace(/\n/g, '<br>') : '無'}</p>
                                </div>
                            `;
                        }
                        
                        // 送禮訂單信息區塊
                        let giftInfoHTML = '';
                        if (order.isGift) {
                            giftInfoHTML = '';
                            
                            // 寄件人資訊區塊
                            if (order.sender && order.sender.name) {
                                giftInfoHTML += `
                                    <div class="sender-info-section">
                                        <h4><i class="fas fa-user-edit"></i> 寄件人資訊</h4>
                                        <p><strong>姓名:</strong> ${escapeHtml(order.sender.name)}</p>
                                        <p><strong>電話:</strong> ${escapeHtml(order.sender.phone) || '未提供'}</p>
                                        <p><strong>地址:</strong> ${escapeHtml(order.sender.address) || '未提供'}</p>
                                    </div>
                                `;
                            } else {
                                giftInfoHTML += `
                                    <div class="sender-missing-warning">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <span>客戶未填寫寄件人資訊，需要進一步確認</span>
                                    </div>
                                `;
                            }
                        }
                        
                        const statusOptions = [
                            { value: 'pending', text: '待處理' },
                            { value: 'confirmed', text: '待出貨' },
                            { value: 'shipped', text: '已出貨' },
                            { value: 'completed', text: '已完成' },
                            { value: 'cancelled', text: '已取消' }
                        ];
                        
                        let statusSelectHTML = '<select id="status-update" style="width: 150px; height: 40px; font-size: 15px; padding: 5px;">';
                        statusOptions.forEach(option => {
                            const selected = order.status === option.value ? 'selected' : '';
                            statusSelectHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
                        });
                        statusSelectHTML += '</select>';
                        
                        const shippingMethodText = order.shipping === 'home' ? '宅配到府' : '超商取貨';
                        const paymentMethodText = order.payment === 'transfer' ? 'ATM轉帳' : '信用卡付款';
                        
                        // 訂單標題（包含送禮標示）
                        const orderTitle = order.isGift ? 
                            `訂單詳情: ${order.orderNumber || '無訂單編號'} <i class="fas fa-gift" style="color: #f0b900; margin-left: 8px;" title="送禮訂單"></i>` :
                            `訂單詳情: ${order.orderNumber || '無訂單編號'}`;
                        
                        const detailHTML = `
                            <div class="order-detail-container">
                                <div class="order-detail-header">
                                    <div class="header-title-and-actions">
                                        <h3>${orderTitle}</h3>
                                        <button id="delete-order-btn" data-id="${orderId}" class="btn btn-danger">
                                            <i class="fas fa-trash-alt"></i> 刪除訂單
                                        </button>
                                    </div>
                                    <div class="order-actions">
                                        <div class="status-update-container">
                                            <label for="status-update">狀態:</label>
                                            ${statusSelectHTML}
                                        </div>
                                        <button id="update-status-btn" data-id="${orderId}" class="btn btn-primary">更新狀態</button>
                                    </div>
                                </div>
                                
                                <div class="order-detail-body">
                                    ${giftInfoHTML}
                                    
                                    <div class="order-section">
                                        <h4>客戶信息</h4>
                                        <p><strong>姓名:</strong> ${escapeHtml(order.customer?.name) || '未知'}</p>
                                        <p><strong>電話:</strong> ${escapeHtml(order.customer?.phone) || '未知'}</p>
                                        <p><strong>電子郵件:</strong> ${escapeHtml(order.customer?.email) || '未知'}</p>
                                        <p><strong>地址:</strong> ${escapeHtml(order.customer?.address) || '未知'}</p>
                                    </div>
                                    
                                    <div class="order-section">
                                        <h4>訂單信息</h4>
                                        <p><strong>訂單日期:</strong> ${orderDate}</p>
                                        <p><strong>配送方式:</strong> ${shippingMethodText}</p>
                                        <p><strong>付款方式:</strong> ${paymentMethodText}</p>
                                    </div>
                                    
                                    ${notesHTML}
                                    
                                    <div class="order-section">
                                        <h4>商品清單</h4>
                                        ${itemsHTML}
                                    </div>
                                    
                                    <div class="order-summary">
                                        <p><strong>商品小計:</strong> ${order.subtotal || 0}</p>
                                        <p><strong>運費:</strong> ${order.shippingFee || 0}</p>
                                        <p class="order-total"><strong>總計:</strong> ${order.total || 0}</p>
                                    </div>
                                    
                                    <div class="admin-notes-form">
                                        <h4>新增備註 (管理員)</h4>
                                        <textarea id="admin-order-notes" placeholder="添加備註，客戶可以看到..."></textarea>
                                        <button id="update-admin-notes-btn" data-id="${orderId}" class="btn btn-primary">新增備註</button>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        orderDetail.innerHTML = detailHTML;
                        
                        // 添加事件監聽器
                        const updateStatusBtn = document.getElementById('update-status-btn');
                        if (updateStatusBtn) {
                            updateStatusBtn.addEventListener('click', function() {
                                const newStatus = document.getElementById('status-update').value;
                                updateOrderStatus(orderId, newStatus);
                            });
                        }
                        
                        const deleteOrderBtn = document.getElementById('delete-order-btn');
                        if (deleteOrderBtn) {
                            deleteOrderBtn.addEventListener('click', async function() {
                                const confirmed = await window.AdminCommon.showConfirmDialog(
                                    '確定要刪除此訂單嗎？此操作無法恢復！',
                                    '刪除訂單'
                                );
                                if (confirmed) {
                                    deleteOrder(orderId);
                                }
                            });
                        }
                        
                        const updateAdminNotesBtn = document.getElementById('update-admin-notes-btn');
                        if (updateAdminNotesBtn) {
                            updateAdminNotesBtn.addEventListener('click', function() {
                                const adminNotes = document.getElementById('admin-order-notes').value;
                                updateOrderNotesAsAdmin(orderId, adminNotes);
                            });
                        }
                    } else {
                        orderDetail.innerHTML = '<p class="error-message">找不到訂單信息</p>';
                    }
                })
                .catch((error) => {
                    console.error('獲取訂單詳情時出錯:', error);
                    orderDetail.innerHTML = '<p class="error-message">獲取訂單詳情時出錯，請稍後再試</p>';
                });
        }
        
        // 更新訂單狀態
        function updateOrderStatus(orderId, newStatus) {
            const orderDocRef = window.firebaseServices.doc(window.firebaseServices.db, 'orders', orderId);
            
            window.firebaseServices.updateDoc(orderDocRef, {
                status: newStatus
            })
                .then(() => {
                    const orderItem = document.querySelector(`.order-item[data-id="${orderId}"]`);
                    if (orderItem) {
                        const statusElement = orderItem.querySelector('.status-badge');
                        if (statusElement) {
                            statusElement.classList.remove(
                                'pending', 'confirmed', 'shipped', 'completed', 'cancelled'
                            );
                            
                            statusElement.classList.add(newStatus);
                            
                            let statusText = '';
                            switch(newStatus) {
                                case 'pending': statusText = '待處理'; break;
                                case 'confirmed': statusText = '待出貨'; break;
                                case 'shipped': statusText = '已出貨'; break;
                                case 'completed': statusText = '已完成'; break;
                                case 'cancelled': statusText = '已取消'; break;
                                default: statusText = '待處理';
                            }
                            statusElement.textContent = statusText;
                        }
                    }
                    
                    window.AdminCommon.showToast('訂單狀態已更新', 'success');
                })
                .catch((error) => {
                    console.error('更新訂單狀態時出錯:', error);
                    window.AdminCommon.showToast('更新訂單狀態時出錯，請稍後再試', 'error');
                });
        }
        
        // 刪除訂單功能
        function deleteOrder(orderId) {
            const orderDocRef = window.firebaseServices.doc(window.firebaseServices.db, 'orders', orderId);
            
            window.firebaseServices.deleteDoc(orderDocRef)
                .then(() => {
                    const orderItem = document.querySelector(`.order-item[data-id="${orderId}"]`);
                    if (orderItem) {
                        orderItem.remove();
                    }
                    
                    orderDetail.innerHTML = '<div class="no-order-selected"><p>請選擇一個訂單查看詳情</p></div>';
                    
                    const orderItems = document.querySelectorAll('.order-item');
                    if (orderItems.length === 0) {
                        orderList.innerHTML = '<p class="no-orders">沒有找到訂單</p>';
                    }
                    
                    window.AdminCommon.showToast('訂單已成功刪除', 'success');
                })
                .catch((error) => {
                    console.error('刪除訂單時出錯:', error);
                    window.AdminCommon.showToast('刪除訂單時出錯，請稍後再試', 'error');
                });
        }
        
        // 管理員更新訂單備註
        function updateOrderNotesAsAdmin(orderId, notes) {
            if (!notes.trim()) {
                window.AdminCommon.showToast('備註不能為空', 'warning');
                return;
            }
            
            const orderDocRef = window.firebaseServices.doc(window.firebaseServices.db, 'orders', orderId);
            
            window.firebaseServices.getDoc(orderDocRef)
                .then((docSnap) => {
                    if (docSnap.exists()) {
                        const orderData = docSnap.data();
                        
                        const now = new Date();
                        const timestamp = now.toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        
                        const newNoteEntry = `[管理員 ${timestamp}] ${notes}`;
                        
                        const existingNotes = orderData.notes || '';
                        let updatedNotes;
                        
                        if (existingNotes.trim() === '') {
                            updatedNotes = newNoteEntry;
                        } else {
                            updatedNotes = existingNotes + '\n' + newNoteEntry;
                        }
                        
                        return window.firebaseServices.updateDoc(orderDocRef, {
                            notes: updatedNotes
                        });
                    }
                })
                .then(() => {
                    document.getElementById('admin-order-notes').value = '';
                    window.AdminCommon.showToast('備註已新增', 'success');
                    showOrderDetail(orderId);
                })
                .catch((error) => {
                    console.error('更新訂單備註時出錯:', error);
                    window.AdminCommon.showToast('更新備註時出錯，請稍後再試', 'error');
                });
        }
    }
    
    // 開始初始化流程
    waitForAdminCommon();
});