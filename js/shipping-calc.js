/**
 * 運費設定讀取與計算（購物車、結帳、加購頁、後台運費試算共用同一份）。
 *
 * 以前這段邏輯在四個頁面各有一份，彼此有細微差異：
 * - 階梯的「最大數量」是 0 或沒填時，Math.min(remaining, 0) 讓剩餘數量永遠不會變少，
 *   while 迴圈跑不完、整個頁面當掉
 * - 結帳頁固定運費寫成 `data.home || 130`，後台把宅配運費設成 0 元時結帳頁卻收 130 元，
 *   購物車頁顯示的又是 0 元
 * 統一放在這裡，改一次全站一致。
 *
 * 資料來源（Firestore）：
 *   shippingSettings/freeShipping    { enabled, threshold }
 *   shippingSettings/calculationMode { mode: 'fixed' | 'tiered' }
 *   shippingRates/fixedRates         { home, store }
 *   tieredRates/*                    { method, category, minQuantity, maxQuantity, fee }
 */
(function() {
    function toNumber(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function normalizeRate(rate) {
        return {
            id: rate.id,
            method: rate.method,
            category: rate.category || 'other',
            minQuantity: toNumber(rate.minQuantity, 1),
            maxQuantity: toNumber(rate.maxQuantity, 0),
            fee: toNumber(rate.fee, 0)
        };
    }

    /**
     * 從 Firestore 讀取運費設定。讀不到（連線失敗）會丟出例外——呼叫端一定要處理，
     * 不能吞掉後用預設值繼續：預設值的運費是 0，顧客會看到比實際少的金額。
     * @param {object} services window.firebaseServices
     */
    async function load(services) {
        const { db, doc, getDoc, collection } = services;
        const getDocs = services.getDocsFromServer || services.getDocs;
        const timeout = window.withReadTimeout || (p => p);

        const [freeShippingSnap, calculationModeSnap, fixedRatesSnap, tieredSnap] = await timeout(Promise.all([
            getDoc(doc(db, 'shippingSettings', 'freeShipping')),
            getDoc(doc(db, 'shippingSettings', 'calculationMode')),
            getDoc(doc(db, 'shippingRates', 'fixedRates')),
            getDocs(collection(db, 'tieredRates'))
        ]));

        const config = {
            freeShipping: { enabled: false, threshold: 0 },
            calculationMode: 'fixed',
            fixedRates: { home: 0, store: 0 },
            tieredRates: { home: [], store: [] }
        };

        if (freeShippingSnap.exists()) {
            const data = freeShippingSnap.data();
            config.freeShipping = {
                enabled: data.enabled === true,
                threshold: toNumber(data.threshold, 0)
            };
        }

        if (calculationModeSnap.exists()) {
            config.calculationMode = calculationModeSnap.data().mode === 'tiered' ? 'tiered' : 'fixed';
        }

        if (fixedRatesSnap.exists()) {
            const data = fixedRatesSnap.data();
            // 很舊的資料格式把運費存成物件，當成 0
            config.fixedRates.home = toNumber(typeof data.home === 'object' ? 0 : data.home, 0);
            config.fixedRates.store = toNumber(typeof data.store === 'object' ? 0 : data.store, 0);
        }

        tieredSnap.forEach(docSnap => {
            const rate = normalizeRate({ id: docSnap.id, ...docSnap.data() });
            if (rate.method === 'home' || rate.method === 'store') {
                config.tieredRates[rate.method].push(rate);
            }
        });
        config.tieredRates.home.sort((a, b) => a.minQuantity - b.minQuantity);
        config.tieredRates.store.sort((a, b) => a.minQuantity - b.minQuantity);

        return config;
    }

    /**
     * 階梯式運費：從能套用的最高階梯開始，每用一次階梯就收一次該階梯的運費，
     * 並扣掉該階梯最多能裝的數量，直到剩餘數量低於最低階梯為止。
     * 最大數量是 0、空白或不合理時視為「不限」，一次裝完剩下的全部。
     */
    function calculateTiered(quantity, categoryRates) {
        const rates = categoryRates.map(normalizeRate).sort((a, b) => a.minQuantity - b.minQuantity);
        if (rates.length === 0) {
            return { fee: 0, descriptions: ['未設定階梯運費'] };
        }

        let totalFee = 0;
        let remaining = toNumber(quantity, 0);
        const descriptions = [];
        // 保險：就算資料再怪也不會無窮迴圈
        let guard = 1000;

        while (remaining > 0 && guard-- > 0) {
            let handled = false;
            for (let i = rates.length - 1; i >= 0; i--) {
                const rate = rates[i];
                if (remaining >= rate.minQuantity) {
                    const capacity = rate.maxQuantity > 0 ? rate.maxQuantity : remaining;
                    const used = Math.max(1, Math.min(remaining, capacity));
                    totalFee += rate.fee;
                    descriptions.push(`${rate.minQuantity}-${rate.maxQuantity > 0 ? rate.maxQuantity : '不限'}個區間：NT$ ${rate.fee}`);
                    remaining -= used;
                    handled = true;
                    break;
                }
            }
            if (!handled) {
                descriptions.push(`${remaining}個：數量低於最低階梯，NT$ 0`);
                break;
            }
        }

        return { fee: totalFee, descriptions };
    }

    /**
     * 計算整筆訂單的運費
     * @param {object} config load() 的回傳值
     * @param {Array<{category?: string, quantity: number}>} items
     * @param {number} subtotal 商品小計（判斷免運門檻用）
     * @param {'home'|'store'} method
     */
    function calculate(config, items, subtotal, method) {
        const deliveryMethod = method === 'store' ? 'store' : 'home';
        const methodLabel = deliveryMethod === 'home' ? '宅配到府運費' : '超商取貨運費';

        if (config.freeShipping.enabled && toNumber(subtotal, 0) >= config.freeShipping.threshold) {
            return {
                fee: 0,
                isFreeShipping: true,
                description: `購滿 NT$ ${config.freeShipping.threshold.toLocaleString()} 元享免運優惠`
            };
        }

        if (!items || items.length === 0) {
            return { fee: 0, isFreeShipping: false, description: methodLabel };
        }

        if (config.calculationMode === 'fixed') {
            return { fee: config.fixedRates[deliveryMethod], isFreeShipping: false, description: methodLabel };
        }

        const categoryTotals = {};
        items.forEach(item => {
            const category = item.category || 'other';
            categoryTotals[category] = (categoryTotals[category] || 0) + toNumber(item.quantity, 0);
        });

        let fee = 0;
        Object.keys(categoryTotals).forEach(category => {
            const categoryRates = config.tieredRates[deliveryMethod].filter(r => r.category === category);
            if (categoryRates.length > 0) {
                fee += calculateTiered(categoryTotals[category], categoryRates).fee;
            }
        });

        return { fee, isFreeShipping: false, description: methodLabel + '（階梯計算）' };
    }

    window.ShippingCalc = { load, calculate, calculateTiered };
})();
