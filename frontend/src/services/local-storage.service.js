/**
 * 本地存储服务
 * 管理 localStorage 数据
 */
class LocalStorageService {
    constructor() {
        this.prefix = 'finance_'
    }

    /**
     * 获取存储键名
     */
    getKey(key) {
        return this.prefix + key
    }

    /**
     * 设置数据
     */
    set(key, value, encrypt = false) {
        try {
            const data = encrypt ? btoa(JSON.stringify(value)) : JSON.stringify(value)
            localStorage.setItem(this.getKey(key), data)
            return true
        } catch (error) {
            console.error('存储失败:', error)
            return false
        }
    }

    /**
     * 获取数据
     */
    get(key, decrypt = false) {
        try {
            const data = localStorage.getItem(this.getKey(key))
            if (!data) return null

            if (decrypt) {
                return JSON.parse(atob(data))
            }
            return JSON.parse(data)
        } catch (error) {
            console.error('读取失败:', error)
            return null
        }
    }

    /**
     * 删除数据
     */
    remove(key) {
        localStorage.removeItem(this.getKey(key))
    }

    /**
     * 清除所有前缀数据
     */
    clear() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key)
            }
        })
    }

    /**
     * 获取所有数据
     */
    getAll() {
        const data = {}
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                const originalKey = key.replace(this.prefix, '')
                try {
                    data[originalKey] = JSON.parse(localStorage.getItem(key))
                } catch {
                    data[originalKey] = localStorage.getItem(key)
                }
            }
        })
        return data
    }

    // 用户偏好
    setUserPreferences(preferences) {
        return this.set('user_preferences', preferences)
    }

    getUserPreferences() {
        return this.get('user_preferences') || {}
    }

    // 分类体系
    setCategories(categories) {
        return this.set('categories', categories)
    }

    getCategories() {
        return this.get('categories') || []
    }

    // 预算设置
    setBudgets(budgets) {
        return this.set('budgets', budgets)
    }

    getBudgets() {
        return this.get('budgets') || {}
    }
}

export default new LocalStorageService()