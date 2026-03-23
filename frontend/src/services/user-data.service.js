// services/user-data.service.js
import authHelperService from '@/services/utils/auth-helper.service.js'

/**
 * 用户数据服务 - 只处理用户配置数据（localStorage）
 * 包括：用户偏好、分类体系、预算设置等
 */
class UserDataService {
    constructor() {
        this.currentUser = null
        this.dbPrefix = 'user_'
    }

    /**
     * 获取当前用户标识（手机号）
     */
    getCurrentUserId() {
        if (this.currentUser) {
            return this.currentUser.id
        }

        const user = authHelperService.getCurrentUser()
        if (user && user.id) {
            this.currentUser = user
            return user.id
        }

        return null
    }

    /**
     * 获取用户特定的存储键名
     */
    getUserKey(baseKey) {
        const userId = this.getCurrentUserId()
        if (!userId) {
            console.warn('用户未登录，使用匿名键')
            return `${this.dbPrefix}anonymous_${baseKey}`
        }
        return `${this.dbPrefix}${userId}_${baseKey}`
    }

    /**
     * 保存用户配置数据到localStorage（按用户隔离）
     */
    setUserData(key, data) {
        const userKey = this.getUserKey(key)
        localStorage.setItem(userKey, JSON.stringify(data))
        return true
    }

    /**
     * 获取用户配置数据从localStorage
     */
    getUserData(key, defaultValue = null) {
        const userKey = this.getUserKey(key)
        const data = localStorage.getItem(userKey)
        return data ? JSON.parse(data) : defaultValue
    }

    // ==================== localStorage 配置数据 ====================

    /**
     * 保存用户偏好设置
     */
    saveUserPreferences(preferences) {
        this.setUserData('user_preferences', preferences)
    }

    /**
     * 获取用户偏好设置
     */
    getUserPreferences() {
        return this.getUserData('user_preferences', {
            theme: 'light',
            defaultView: 'month',
            currency: 'CNY',
            language: 'zh-CN'
        })
    }

    /**
     * 保存分类体系
     */
    saveCategories(categories) {
        this.setUserData('categories', categories)
    }

    /**
     * 获取分类体系
     */
    getCategories() {
        return this.getUserData('categories', [])
    }

    /**
     * 保存预算设置
     */
    saveBudgets(budgets) {
        this.setUserData('budgets', budgets)
    }

    /**
     * 获取预算设置
     */
    getBudgets() {
        return this.getUserData('budgets', {})
    }

    /**
     * 保存收入类型配置
     */
    saveIncomeCategories(categories) {
        this.setUserData('incomeCategories', categories)
    }

    /**
     * 获取用户的收入类型配置
     */
    getIncomeCategories() {
        return this.getUserData('incomeCategories', [])
    }

    /**
     * 保存收入来源配置
     */
    saveIncomeSources(sources) {
        this.setUserData('incomeSources', sources)
    }

    /**
     * 获取用户的收入来源配置
     */
    getIncomeSources() {
        return this.getUserData('incomeSources', [])
    }

    /**
     * 保存支出类型配置
     */
    saveExpenseCategories(categories) {
        this.setUserData('expenseCategories', categories)
    }

    /**
     * 获取用户的支出类型配置
     */
    getExpenseCategories() {
        return this.getUserData('expenseCategories', [])
    }

    /**
     * 保存客户列表（生意记账用）
     */
    saveCustomers(customers) {
        this.setUserData('farmCustomers', customers)
    }

    /**
     * 获取客户的列表（生意记账用）
     */
    getCustomers() {
        return this.getUserData('farmCustomers', [])
    }

    /**
     * 初始化默认配置数据
     */
    initDefaultData() {
        // 初始化收入类型
        if (!this.getUserData('incomeCategories')) {
            this.saveIncomeCategories([
                { id: 1, name: '工资' },
                { id: 2, name: '兼职' },
                { id: 3, name: '投资' },
                { id: 4, name: '红包' },
                { id: 5, name: '其他' }
            ])
        }

        // 初始化收入来源
        if (!this.getUserData('incomeSources')) {
            this.saveIncomeSources([
                { id: 1, name: '公司' },
                { id: 2, name: '银行' },
                { id: 3, name: '微信' },
                { id: 4, name: '支付宝' },
                { id: 5, name: '现金' }
            ])
        }

        // 初始化支出类型
        if (!this.getUserData('expenseCategories')) {
            this.saveExpenseCategories([
                {
                    id: 1,
                    name: '生活支出',
                    subtypes: [
                        { id: 101, name: '餐饮' },
                        { id: 102, name: '购物' },
                        { id: 103, name: '交通' },
                        { id: 104, name: '医疗' },
                        { id: 105, name: '教育' }
                    ]
                },
                {
                    id: 2,
                    name: '娱乐消费',
                    subtypes: [
                        { id: 201, name: '游戏' },
                        { id: 202, name: '电影' },
                        { id: 203, name: '旅游' },
                        { id: 204, name: '运动' }
                    ]
                },
                {
                    id: 3,
                    name: '住房支出',
                    subtypes: [
                        { id: 301, name: '房租' },
                        { id: 302, name: '水电煤' },
                        { id: 303, name: '物业' },
                        { id: 304, name: '维修' }
                    ]
                }
            ])
        }

        // 初始化预算设置
        if (!this.getUserData('budgets')) {
            this.saveBudgets({
                monthly: 5000,
                categories: {}
            })
        }

        // 初始化用户偏好
        if (!this.getUserData('user_preferences')) {
            this.saveUserPreferences({
                theme: 'light',
                defaultView: 'month',
                currency: 'CNY',
                language: 'zh-CN'
            })
        }
    }

    /**
     * 清除当前用户所有配置数据（退出登录时调用）
     */
    clearUserData() {
        const userId = this.getCurrentUserId()
        if (!userId) return

        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(`${this.dbPrefix}${userId}_`)) {
                keysToRemove.push(key)
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        this.currentUser = null
    }

    /**
     * 更新当前用户信息
     */
    setCurrentUser(user) {
        this.currentUser = user
    }
}

export default new UserDataService()