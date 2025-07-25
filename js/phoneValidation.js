// phoneValidation.js - 手機號碼處理工具
// 負責手機號碼的格式化、驗證等功能

class PhoneValidation {
    constructor() {
        this.taiwanPhoneRegex = /^09\d{8}$/; // 台灣手機號碼格式
        this.internationalPhoneRegex = /^\+886[0-9]{9}$/; // 國際格式
    }

    /**
     * 格式化手機號碼為國際格式
     * @param {string} phone - 輸入的手機號碼
     * @returns {string} - 格式化後的手機號碼
     */
    formatPhoneNumber(phone) {
        if (!phone) return '';
        
        // 移除所有非數字字符和+號
        let cleanPhone = phone.replace(/[^\d+]/g, '');
        
        // 如果是09開頭的台灣手機號碼，轉換為+886格式
        if (cleanPhone.startsWith('09') && cleanPhone.length === 10) {
            return '+886' + cleanPhone.substring(1);
        }
        
        // 如果是886開頭，加上+號
        if (cleanPhone.startsWith('886') && cleanPhone.length === 12) {
            return '+' + cleanPhone;
        }
        
        // 如果已經是+886開頭，直接返回
        if (cleanPhone.startsWith('+886') && cleanPhone.length === 13) {
            return cleanPhone;
        }
        
        // 其他情況返回清理後的號碼
        return cleanPhone;
    }

    /**
     * 驗證手機號碼格式
     * @param {string} phone - 手機號碼
     * @returns {boolean} - 是否有效
     */
    validatePhoneNumber(phone) {
        if (!phone) return false;
        
        const formattedPhone = this.formatPhoneNumber(phone);
        
        // 檢查是否符合國際格式
        return this.internationalPhoneRegex.test(formattedPhone);
    }

    /**
     * 驗證原始台灣手機號碼格式
     * @param {string} phone - 手機號碼
     * @returns {boolean} - 是否有效
     */
    validateTaiwanPhone(phone) {
        if (!phone) return false;
        
        // 移除所有非數字字符
        const cleanPhone = phone.replace(/\D/g, '');
        
        return this.taiwanPhoneRegex.test(cleanPhone);
    }

    /**
     * 將國際格式轉換為台灣本地格式顯示
     * @param {string} phone - 國際格式手機號碼
     * @returns {string} - 台灣本地格式
     */
    toLocalFormat(phone) {
        if (!phone) return '';
        
        if (phone.startsWith('+886')) {
            return '0' + phone.substring(4);
        }
        
        return phone;
    }

    /**
     * 格式化顯示手機號碼（加入連字符）
     * @param {string} phone - 手機號碼
     * @returns {string} - 格式化顯示的手機號碼
     */
    formatForDisplay(phone) {
        if (!phone) return '';
        
        const localPhone = this.toLocalFormat(phone);
        
        // 台灣手機號碼格式：0XXX-XXX-XXX
        if (localPhone.length === 10 && localPhone.startsWith('09')) {
            return `${localPhone.substring(0, 4)}-${localPhone.substring(4, 7)}-${localPhone.substring(7)}`;
        }
        
        return localPhone;
    }

    /**
     * 檢查是否為管理員手機號碼
     * @param {string} phone - 手機號碼
     * @returns {boolean} - 是否為管理員
     */
    isAdminPhone(phone) {
        const adminPhones = ['+886978603608', '+886937163179'];
        const formattedPhone = this.formatPhoneNumber(phone);
        return adminPhones.includes(formattedPhone);
    }

    /**
     * 獲取錯誤訊息
     * @param {string} phone - 手機號碼
     * @returns {string} - 錯誤訊息
     */
    getValidationError(phone) {
        if (!phone) {
            return '請輸入手機號碼';
        }
        
        // 移除所有非數字字符
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.length === 0) {
            return '請輸入有效的手機號碼';
        }
        
        if (!cleanPhone.startsWith('09')) {
            return '台灣手機號碼必須以09開頭';
        }
        
        if (cleanPhone.length < 10) {
            return '手機號碼長度不足，請輸入完整的10位數字';
        }
        
        if (cleanPhone.length > 10) {
            return '手機號碼長度過長，請輸入正確的10位數字';
        }
        
        if (!this.validateTaiwanPhone(cleanPhone)) {
            return '請輸入正確的台灣手機號碼格式（例：0978603608）';
        }
        
        return ''; // 無錯誤
    }

    /**
     * 設置手機號碼輸入框的即時驗證
     * @param {string} inputId - 輸入框ID
     * @param {string} errorId - 錯誤訊息元素ID（可選）
     */
    setupPhoneInput(inputId, errorId = null) {
        const input = document.getElementById(inputId);
        const errorElement = errorId ? document.getElementById(errorId) : null;
        
        if (!input) return;
        
        // 限制輸入只能是數字
        input.addEventListener('input', (e) => {
            // 只允許數字輸入
            let value = e.target.value.replace(/\D/g, '');
            
            // 限制最大長度為10
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            
            e.target.value = value;
            
            // 顯示驗證錯誤
            if (errorElement) {
                const error = this.getValidationError(value);
                if (error) {
                    errorElement.textContent = error;
                    errorElement.style.display = 'block';
                    errorElement.style.color = 'red';
                } else {
                    errorElement.style.display = 'none';
                }
            }
        });
        
        // 失去焦點時進行完整驗證
        input.addEventListener('blur', (e) => {
            const value = e.target.value;
            const error = this.getValidationError(value);
            
            if (errorElement) {
                if (error) {
                    errorElement.textContent = error;
                    errorElement.style.display = 'block';
                    errorElement.style.color = 'red';
                } else if (value) {
                    errorElement.textContent = '手機號碼格式正確';
                    errorElement.style.display = 'block';
                    errorElement.style.color = 'green';
                }
            }
        });
        
        // 設置 placeholder
        if (!input.placeholder) {
            input.placeholder = '例：0978603608';
        }
        
        // 設置輸入類型和屬性
        input.type = 'tel';
        input.maxLength = 10;
        input.pattern = '[0-9]*';
        input.inputMode = 'numeric';
    }
}

// 創建全局實例
window.phoneValidation = new PhoneValidation();

// 為需要手機號碼驗證的頁面自動設置輸入框
document.addEventListener('DOMContentLoaded', function() {
    // 自動設置所有手機號碼輸入框
    const phoneInputs = [
        'login-phone',
        'register-phone', 
        'sms-phone'
    ];
    
    phoneInputs.forEach(inputId => {
        if (document.getElementById(inputId)) {
            window.phoneValidation.setupPhoneInput(inputId);
        }
    });
    
    console.log('手機號碼驗證系統初始化完成');
});