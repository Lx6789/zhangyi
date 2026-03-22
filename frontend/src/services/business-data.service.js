// services/business-data.service.js
import indexedDBService from './db/indexed-db.service.js'
import encryptionService from './encryption.service.js'
import userDataService from './user-data.service.js'
import dateHelperService from "@/services/utils/date-helper.service.js";

/**
 * 业务数据服务 - 处理所有 IndexedDB 数据
 * 包括：日常记账、支出记录、收入记录、个人存钱计划、图表缓存、同步状态
 */
class BusinessDataService {
    constructor() {
        this.initialized = false
        this.userSecret = null
        this.currentUserId = null
    }

    /**
     * 初始化
     */
    async init(userId) {
        if (!this.initialized) {
            await indexedDBService.init()
            this.currentUserId = userId || userDataService.getCurrentUserId()
            this.userSecret = this.currentUserId // 用于加密
            this.initialized = true
            console.log('业务数据服务初始化成功，用户ID:', this.currentUserId)
        }
    }

    /**
     * 获取当前用户ID
     */
    getCurrentUserId() {
        return this.currentUserId || userDataService.getCurrentUserId()
    }

    /**
     * 为记录添加用户标识
     */
    addUserIdentifier(record) {
        return {
            ...record,
            userId: this.getCurrentUserId(),
            createTime: record.createTime || new Date().toISOString(),
            updateTime: new Date().toISOString()
        }
    }

    /**
     * 加密敏感数据
     */
    async encryptSensitiveData(data) {
        if (this.userSecret && data) {
            try {
                return await encryptionService.encrypt(data, this.userSecret)
            } catch (error) {
                console.error('加密失败:', error)
                return data
            }
        }
        return data
    }

    /**
     * 解密敏感数据
     */
    async decryptSensitiveData(encryptedData) {
        if (this.userSecret && encryptedData && encryptedData.data && encryptedData.iv) {
            try {
                return await encryptionService.decrypt(encryptedData, this.userSecret)
            } catch (error) {
                console.error('解密失败:', error)
                return encryptedData
            }
        }
        return encryptedData
    }

    // ==================== 日常记账 (daily_records) - 加密存储 ====================

    /**
     * 添加日常记账记录
     */
    async addDailyRecord(record) {
        const newRecord = this.addUserIdentifier({
            ...record,
            id: record.id || Date.now().toString(),
            type: record.type || (record.amount > 0 ? '收入' : '支出'),
            amount: Math.abs(record.amount || 0),
            businessType: 'personal', // 标记为个人记账
            syncStatus: 'pending'
        })

        // 加密敏感信息（如备注、供应商等）
        if (newRecord.note || newRecord.supplier) {
            const sensitiveData = {
                note: newRecord.note,
                supplier: newRecord.supplier,
                description: newRecord.description
            }
            const encrypted = await this.encryptSensitiveData(sensitiveData)
            newRecord.encryptedData = encrypted
            // 删除明文敏感信息
            delete newRecord.note
            delete newRecord.supplier
            delete newRecord.description
        }

        return indexedDBService.add('daily_records', newRecord)
    }

    /**
     * 批量添加日常记账记录
     */
    async addDailyRecords(records) {
        const newRecords = []
        for (const record of records) {
            const newRecord = this.addUserIdentifier({
                ...record,
                id: record.id || Date.now() + Math.random().toString(),
                type: record.type || (record.amount > 0 ? '收入' : '支出'),
                amount: Math.abs(record.amount || 0),
                businessType: 'personal',
                syncStatus: 'pending'
            })

            if (newRecord.note || newRecord.supplier) {
                const sensitiveData = {
                    note: newRecord.note,
                    supplier: newRecord.supplier,
                    description: newRecord.description
                }
                const encrypted = await this.encryptSensitiveData(sensitiveData)
                newRecord.encryptedData = encrypted
                delete newRecord.note
                delete newRecord.supplier
                delete newRecord.description
            }

            newRecords.push(newRecord)
        }
        return indexedDBService.bulkAdd('daily_records', newRecords)
    }

    /**
     * 获取日常记账记录
     */
    async getDailyRecords(dateRange = null) {
        const allRecords = await indexedDBService.getAll('daily_records')
        const userId = this.getCurrentUserId()

        let records = allRecords.filter(r => r.userId === userId && r.businessType === 'personal')

        // 解密敏感信息
        for (const record of records) {
            if (record.encryptedData) {
                const decrypted = await this.decryptSensitiveData(record.encryptedData)
                record.note = decrypted.note
                record.supplier = decrypted.supplier
                record.description = decrypted.description
            }
        }

        if (dateRange) {
            records = records.filter(r =>
                r.date >= dateRange.start && r.date <= dateRange.end
            )
        }

        return records.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取指定日期的日常记账记录
     */
    async getDailyRecordsByDate(date) {
        const records = await this.getDailyRecords()
        return records.filter(r => r.date === date)
    }

    /**
     * 更新日常记账记录
     */
    async updateDailyRecord(id, data) {
        const record = await indexedDBService.get('daily_records', id)
        if (record && record.userId === this.getCurrentUserId()) {
            const updatedRecord = {
                ...record,
                ...data,
                updateTime: new Date().toISOString()
            }

            // 重新加密敏感信息
            if (updatedRecord.note || updatedRecord.supplier) {
                const sensitiveData = {
                    note: updatedRecord.note,
                    supplier: updatedRecord.supplier,
                    description: updatedRecord.description
                }
                const encrypted = await this.encryptSensitiveData(sensitiveData)
                updatedRecord.encryptedData = encrypted
                delete updatedRecord.note
                delete updatedRecord.supplier
                delete updatedRecord.description
            }

            return indexedDBService.update('daily_records', updatedRecord)
        }
        return false
    }

    /**
     * 删除日常记账记录
     */
    async deleteDailyRecord(id) {
        const record = await indexedDBService.get('daily_records', id)
        if (record && record.userId === this.getCurrentUserId()) {
            return indexedDBService.delete('daily_records', id)
        }
        return false
    }

    // ==================== 支出记录 (expense_records) - 完全本地 ====================

    /**
     * 添加支出记录
     */
    async addExpenseRecord(record) {
        const newRecord = this.addUserIdentifier({
            ...record,
            id: record.id || Date.now().toString(),
            type: '支出',
            amount: Math.abs(record.amount || 0),
            businessType: record.businessType || 'business', // 默认为生意记账
            syncStatus: 'pending'
        })
        return indexedDBService.add('expense_records', newRecord)
    }

    /**
     * 获取支出记录 - 统一参数处理
     * @param {Object|string|null} param1 - 可以是日期范围对象、筛选对象或null
     * @param {string|null} param2 - businessType (仅当第一个参数为日期范围时使用)
     */
    async getExpenseRecords(param1 = null, param2 = null) {
        const records = await indexedDBService.getAll('expense_records')
        const userId = this.getCurrentUserId()

        let filtered = records.filter(r => r.userId === userId)

        // 处理不同的参数情况
        if (param1) {
            // 情况1：参数是日期范围对象 { start, end }
            if (param1.start && param1.end) {
                filtered = filtered.filter(r =>
                    r.date >= param1.start && r.date <= param1.end
                )
                // 如果有第二个参数且是 businessType
                if (param2) {
                    filtered = filtered.filter(r => r.businessType === param2)
                }
            }
            // 情况2：参数是筛选对象 { startDate, endDate, category, businessType }
            else if (typeof param1 === 'object') {
                if (param1.startDate && param1.endDate) {
                    filtered = filtered.filter(r =>
                        r.date >= param1.startDate && r.date <= param1.endDate
                    )
                }
                if (param1.category) {
                    filtered = filtered.filter(r => r.category === param1.category)
                }
                if (param1.businessType) {
                    filtered = filtered.filter(r => r.businessType === param1.businessType)
                }
            }
            // 情况3：参数直接是 businessType (字符串)
            else if (typeof param1 === 'string') {
                filtered = filtered.filter(r => r.businessType === param1)
            }
        }

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 更新支出记录
     */
    async updateExpenseRecord(id, data) {
        const record = await indexedDBService.get('expense_records', id)
        if (record && record.userId === this.getCurrentUserId()) {
            const updatedRecord = {
                ...record,
                ...data,
                updateTime: new Date().toISOString()
            }
            return indexedDBService.update('expense_records', updatedRecord)
        }
        return false
    }

    /**
     * 删除支出记录
     */
    async deleteExpenseRecord(id) {
        const record = await indexedDBService.get('expense_records', id)
        if (record && record.userId === this.getCurrentUserId()) {
            return indexedDBService.delete('expense_records', id)
        }
        return false
    }

    // ==================== 收入记录 (income_records) - 完全本地 ====================

    /**
     * 添加收入记录
     */
    async addIncomeRecord(record) {
        const newRecord = this.addUserIdentifier({
            ...record,
            id: record.id || Date.now().toString(),
            type: '收入',
            amount: Math.abs(record.amount || 0),
            businessType: record.businessType || 'business', // 默认为生意记账
            syncStatus: 'pending'
        })
        return indexedDBService.add('income_records', newRecord)
    }

    /**
     * 获取收入记录 - 统一参数处理
     * @param {Object|string|null} param1 - 可以是日期范围对象、筛选对象或null
     * @param {string|null} param2 - businessType (仅当第一个参数为日期范围时使用)
     */
    async getIncomeRecords(param1 = null, param2 = null) {
        const records = await indexedDBService.getAll('income_records')
        const userId = this.getCurrentUserId()

        let filtered = records.filter(r => r.userId === userId)

        // 处理不同的参数情况
        if (param1) {
            // 情况1：参数是日期范围对象 { start, end }
            if (param1.start && param1.end) {
                filtered = filtered.filter(r =>
                    r.date >= param1.start && r.date <= param1.end
                )
                // 如果有第二个参数且是 businessType
                if (param2) {
                    filtered = filtered.filter(r => r.businessType === param2)
                }
            }
            // 情况2：参数是筛选对象 { startDate, endDate, category, businessType }
            else if (typeof param1 === 'object') {
                if (param1.startDate && param1.endDate) {
                    filtered = filtered.filter(r =>
                        r.date >= param1.startDate && r.date <= param1.endDate
                    )
                }
                if (param1.category) {
                    filtered = filtered.filter(r => r.category === param1.category)
                }
                if (param1.businessType) {
                    filtered = filtered.filter(r => r.businessType === param1.businessType)
                }
                if (param1.paymentMethod) {
                    filtered = filtered.filter(r => r.paymentMethod === param1.paymentMethod)
                }
            }
            // 情况3：参数直接是 businessType (字符串)
            else if (typeof param1 === 'string') {
                filtered = filtered.filter(r => r.businessType === param1)
            }
        }

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 更新收入记录
     */
    async updateIncomeRecord(id, data) {
        const record = await indexedDBService.get('income_records', id)
        if (record && record.userId === this.getCurrentUserId()) {
            const updatedRecord = {
                ...record,
                ...data,
                updateTime: new Date().toISOString()
            }
            return indexedDBService.update('income_records', updatedRecord)
        }
        return false
    }

    /**
     * 删除收入记录
     */
    async deleteIncomeRecord(id) {
        const record = await indexedDBService.get('income_records', id)
        if (record && record.userId === this.getCurrentUserId()) {
            return indexedDBService.delete('income_records', id)
        }
        return false
    }

    // ==================== 获取所有记录（合并日常记账、收入、支出） ====================

    /**
     * 获取所有业务记录
     */
    async getAllBusinessRecords(dateRange = null, type = null) {
        // 统一处理 dateRange 参数
        let dailyPromise, incomePromise, expensePromise

        if (dateRange && dateRange.start && dateRange.end) {
            // 如果是日期范围对象
            dailyPromise = this.getDailyRecords(dateRange)
            incomePromise = this.getIncomeRecords({ startDate: dateRange.start, endDate: dateRange.end })
            expensePromise = this.getExpenseRecords({ startDate: dateRange.start, endDate: dateRange.end })
        } else if (dateRange && typeof dateRange === 'object') {
            // 如果是筛选对象
            dailyPromise = this.getDailyRecords(dateRange)
            incomePromise = this.getIncomeRecords(dateRange)
            expensePromise = this.getExpenseRecords(dateRange)
        } else {
            // 如果是 null 或其他
            dailyPromise = this.getDailyRecords()
            incomePromise = this.getIncomeRecords({})
            expensePromise = this.getExpenseRecords({})
        }

        const [dailyRecords, incomeRecords, expenseRecords] = await Promise.all([
            dailyPromise,
            incomePromise,
            expensePromise
        ])

        let allRecords = [...dailyRecords, ...incomeRecords, ...expenseRecords]

        if (type) {
            allRecords = allRecords.filter(r => r.type === type)
        }

        return allRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取个人记账记录（daily_records）
     */
    async getPersonalRecords(dateRange = null) {
        return this.getDailyRecords(dateRange)
    }

    /**
     * 获取生意记账记录（income_records + expense_records）
     */
    async getBusinessRecords(dateRange = null) {
        let incomePromise, expensePromise

        if (dateRange && dateRange.start && dateRange.end) {
            incomePromise = this.getIncomeRecords({
                startDate: dateRange.start,
                endDate: dateRange.end,
                businessType: 'business'
            })
            expensePromise = this.getExpenseRecords({
                startDate: dateRange.start,
                endDate: dateRange.end,
                businessType: 'business'
            })
        } else {
            incomePromise = this.getIncomeRecords({ businessType: 'business' })
            expensePromise = this.getExpenseRecords({ businessType: 'business' })
        }

        const [incomeRecords, expenseRecords] = await Promise.all([
            incomePromise,
            expensePromise
        ])

        return [...incomeRecords, ...expenseRecords]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取商业月度统计数据（只包含 business 类型）
     */
    async getBusinessMonthlyStats(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

        console.log(`获取月度统计: ${startDate} 至 ${endDate}`)

        // 只获取商业记录
        const records = await this.getBusinessRecords({
            start: startDate,
            end: endDate
        })

        console.log(`找到 ${records.length} 条商业记录`)

        let income = 0
        let expense = 0
        let pendingReceivables = 0

        records.forEach(record => {
            console.log(`记录: ${record.type}, 金额: ${record.amount}, 支付方式: ${record.paymentMethod}`)
            if (record.type === '收入') {
                income += record.amount || 0
                // 统计待收账款（赊账且未支付的收入）
                if (record.paymentMethod === '赊账' && !record.isPaid) {
                    pendingReceivables += record.amount || 0
                }
            } else if (record.type === '支出') {
                expense += record.amount || 0
            }
        })

        console.log(`统计结果: 收入=${income}, 支出=${expense}, 待收=${pendingReceivables}`)

        return {
            income,
            expense,
            profit: income - expense,
            pendingReceivables,
            transactionCount: records.length
        }
    }

    /**
     * 获取最近记录
     */
    async getRecentRecords(limit = 10, type = null) {
        const allRecords = await this.getAllBusinessRecords(null, type)
        return allRecords.slice(0, limit)
    }

    /**
     * 获取月度统计数据
     */
    async getMonthlyStats(year, month, recordType = null) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

        const records = await this.getAllBusinessRecords({
            start: startDate,
            end: endDate
        }, recordType)

        let income = 0
        let expense = 0

        records.forEach(record => {
            if (record.type === '收入') {
                income += record.amount || 0
            } else {
                expense += record.amount || 0
            }
        })

        return {
            income,
            expense,
            profit: income - expense,
            transactionCount: records.length
        }
    }

    // ==================== 商品管理（生意记账用） ====================

    async addProduct(product) {
        const newProduct = this.addUserIdentifier({
            ...product,
            id: product.id || Date.now().toString()
        })
        return indexedDBService.add('products', newProduct)
    }

    async getAllProducts() {
        const products = await indexedDBService.getAll('products')
        const userId = this.getCurrentUserId()
        return products.filter(p => p.userId === userId)
    }

    async getProduct(id) {
        const product = await indexedDBService.get('products', id)
        if (product && product.userId === this.getCurrentUserId()) {
            return product
        }
        return null
    }

    async updateProduct(id, data) {
        const product = await indexedDBService.get('products', id)
        if (product && product.userId === this.getCurrentUserId()) {
            const updatedProduct = {
                ...product,
                ...data,
                updateTime: new Date().toISOString()
            }
            return indexedDBService.update('products', updatedProduct)
        }
        return false
    }

    async deleteProduct(id) {
        const product = await indexedDBService.get('products', id)
        if (product && product.userId === this.getCurrentUserId()) {
            return indexedDBService.delete('products', id)
        }
        return false
    }

    async getProductCategories() {
        const products = await this.getAllProducts()
        const categories = [...new Set(products.map(p => p.category))]
        return categories.sort()
    }

    async initDefaultProducts() {
        const products = await this.getAllProducts()
        if (products.length === 0) {
            const defaultProducts = [
                { name: '大白菜', category: '蔬菜', unit: '斤', defaultPrice: 2.5 },
                { name: '土豆', category: '蔬菜', unit: '斤', defaultPrice: 2.0 },
                { name: '苹果', category: '水果', unit: '斤', defaultPrice: 5.0 },
                { name: '香蕉', category: '水果', unit: '斤', defaultPrice: 4.5 }
            ]

            for (const product of defaultProducts) {
                await this.addProduct(product)
            }
        }
    }

    // ==================== 商品分类（生意记账用） ====================

    async getAllCategories() {
        const categories = await indexedDBService.getAll('product_categories')
        const userId = this.getCurrentUserId()

        if (!userId) {
            console.warn('用户未登录，返回空分类')
            return []
        }

        // 返回当前用户的分类和默认分类
        const userCategories = categories.filter(c => c.userId === userId)
        console.log(`获取到 ${userCategories.length} 个分类`)

        return userCategories.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999))
    }

    async addCategory(category) {
        const newCategory = this.addUserIdentifier({
            ...category,
            id: category.id || Date.now().toString(),
            isDefault: false
        })
        return indexedDBService.add('product_categories', newCategory)
    }

    async updateCategory(id, data) {
        const category = await indexedDBService.get('product_categories', id)
        if (category && (category.userId === this.getCurrentUserId() || category.isDefault)) {
            const updatedCategory = {
                ...category,
                ...data,
                updateTime: new Date().toISOString()
            }
            return indexedDBService.update('product_categories', updatedCategory)
        }
        return false
    }

    async deleteCategory(id) {
        const category = await indexedDBService.get('product_categories', id)
        if (!category || category.isDefault) {
            throw new Error('默认分类不能删除')
        }
        if (category.userId !== this.getCurrentUserId()) {
            return false
        }

        const products = await this.getAllProducts()
        if (products.some(p => p.category === category.name)) {
            throw new Error('该分类下还有商品，无法删除')
        }

        return indexedDBService.delete('product_categories', id)
    }

    async initDefaultCategories() {
        const categories = await indexedDBService.getAll('product_categories')
        const userId = this.getCurrentUserId()

        if (!userId) {
            console.error('用户未登录，无法初始化分类')
            return
        }

        // 过滤出当前用户的分类
        const userCategories = categories.filter(c => c.userId === userId)

        // 默认分类列表
        const defaultCategories = [
            { name: '蔬菜', icon: 'fas fa-carrot', sortOrder: 1, isDefault: true },
            { name: '水果', icon: 'fas fa-apple-alt', sortOrder: 2, isDefault: true },
            { name: '粮油', icon: 'fas fa-seedling', sortOrder: 3, isDefault: true },
            { name: '调味品', icon: 'fas fa-mortar-pestle', sortOrder: 4, isDefault: true },
            { name: '早餐', icon: 'fas fa-bread-slice', sortOrder: 5, isDefault: true },
            { name: '日用品', icon: 'fas fa-tshirt', sortOrder: 6, isDefault: true },
            { name: '其他', icon: 'fas fa-tag', sortOrder: 99, isDefault: true }
        ]

        // 如果用户没有任何分类，添加默认分类
        if (userCategories.length === 0) {
            console.log('为用户初始化默认分类:', userId)

            for (const category of defaultCategories) {
                const newCategory = {
                    id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    ...category,
                    userId: userId,
                    createTime: new Date().toISOString(),
                    updateTime: new Date().toISOString()
                }

                try {
                    await indexedDBService.add('product_categories', newCategory)
                    console.log('添加分类成功:', newCategory.name)
                } catch (error) {
                    console.error('添加分类失败:', error)
                }
            }
        } else {
            console.log('用户已有分类，数量:', userCategories.length)
        }
    }

    // ==================== 库存管理 ====================

    /**
     * 添加库存项
     */
    async addInventoryItem(item) {
        const newItem = this.addUserIdentifier({
            ...item,
            id: item.id || Date.now().toString(),
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        })
        return indexedDBService.add('inventory', newItem)
    }

    /**
     * 批量添加库存项
     */
    async addInventoryItems(items) {
        const newItems = items.map(item => this.addUserIdentifier({
            ...item,
            id: item.id || Date.now() + Math.random().toString(),
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        }))
        return indexedDBService.bulkAdd('inventory', newItems)
    }

    /**
     * 获取所有库存项
     */
    async getAllInventory() {
        const items = await indexedDBService.getAll('inventory')
        const userId = this.getCurrentUserId()
        return items.filter(i => i.userId === userId)
    }

    /**
     * 获取库存项
     */
    async getInventoryItem(id) {
        const item = await indexedDBService.get('inventory', id)
        if (item && item.userId === this.getCurrentUserId()) {
            return item
        }
        return null
    }

    /**
     * 更新库存项
     */
    async updateInventoryItem(id, data) {
        const item = await indexedDBService.get('inventory', id)
        if (item && item.userId === this.getCurrentUserId()) {
            const updatedItem = {
                ...item,
                ...data,
                updateTime: new Date().toISOString()
            }
            return indexedDBService.update('inventory', updatedItem)
        }
        return false
    }

    /**
     * 删除库存项
     */
    async deleteInventoryItem(id) {
        const item = await indexedDBService.get('inventory', id)
        if (item && item.userId === this.getCurrentUserId()) {
            return indexedDBService.delete('inventory', id)
        }
        return false
    }

    /**
     * 按商品ID获取库存
     */
    async getInventoryByProductId(productId) {
        const items = await this.getAllInventory()
        return items.filter(i => i.productId === productId)
    }

    /**
     * 获取低库存预警列表
     */
    async getLowStockItems(threshold = 10) {
        const items = await this.getAllInventory()
        return items.filter(i => i.quantity <= threshold)
    }

    /**
     * 获取临期商品列表
     */
    async getExpiringItems(days = 7) {
        const items = await this.getAllInventory()
        const today = new Date()
        const futureDate = new Date()
        futureDate.setDate(today.getDate() + days)

        return items.filter(i => {
            if (!i.expiryDate) return false
            const expiry = new Date(i.expiryDate)
            return expiry >= today && expiry <= futureDate
        })
    }

    /**
     * 获取过期商品列表
     */
    async getExpiredItems() {
        const items = await this.getAllInventory()
        const today = new Date()
        return items.filter(i => {
            if (!i.expiryDate) return false
            const expiry = new Date(i.expiryDate)
            return expiry < today
        })
    }

    /**
     * 更新库存数量
     */
    async updateStockQuantity(id, quantity, operation = 'add') {
        const item = await this.getInventoryItem(id)
        if (!item) return false

        let newQuantity
        if (operation === 'add') {
            newQuantity = (item.quantity || 0) + quantity
        } else if (operation === 'subtract') {
            newQuantity = Math.max(0, (item.quantity || 0) - quantity)
        } else {
            newQuantity = quantity
        }

        return this.updateInventoryItem(id, { quantity: newQuantity })
    }

    /**
     * 初始化默认库存数据
     */
    async initDefaultInventory() {
        const inventory = await this.getAllInventory()
        console.log(`当前库存数量: ${inventory.length}`)
        return inventory
    }

    // ==================== 赊账管理 ====================

    /**
     * 获取所有赊账记录（个人和客户）
     */
    async getAllCreditRecords() {
        // 从收入记录中获取赊账记录
        const incomeRecords = await this.getIncomeRecords({})
        const creditFromIncome = incomeRecords.filter(r =>
            r.paymentMethod === '赊账' && !r.isPaid
        )

        // 从客户管理中获取客户赊账信息
        const customers = userDataService.getCustomers()
        const customerCredits = customers
            .filter(c => c.creditInfo?.hasCredit && c.creditInfo?.balance > 0)
            .map(c => ({
                id: `customer_${c.id}`,
                type: 'customer',
                customerId: c.id,
                customerName: c.name,
                amount: c.creditInfo.balance,
                creditLimit: c.creditInfo.creditLimit,
                dueDate: c.creditInfo.lastRepayDate,
                note: c.creditInfo.note,
                status: 'pending'
            }))

        return {
            personal: creditFromIncome,
            customer: customerCredits,
            all: [...creditFromIncome, ...customerCredits]
        }
    }

    /**
     * 获取个人赊账记录
     */
    async getPersonalCreditRecords() {
        const records = await this.getIncomeRecords({})
        return records.filter(r =>
            r.paymentMethod === '赊账' &&
            !r.isPaid &&
            r.businessType === 'personal'
        )
    }

    /**
     * 获取客户赊账记录
     */
    async getCustomerCreditRecords() {
        const customers = userDataService.getCustomers()
        return customers
            .filter(c => c.creditInfo?.hasCredit && c.creditInfo?.balance > 0)
            .map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                phone: c.phone,
                balance: c.creditInfo.balance,
                creditLimit: c.creditInfo.creditLimit,
                lastRepayDate: c.creditInfo.lastRepayDate,
                note: c.creditInfo.note
            }))
    }

    /**
     * 记录赊账还款
     */
    async recordCreditRepayment(creditId, amount, date, paymentMethod, note) {
        // 如果是客户赊账
        if (creditId.startsWith('customer_')) {
            const customerId = creditId.replace('customer_', '')
            const customers = userDataService.getCustomers()
            const index = customers.findIndex(c => c.id === customerId)

            if (index !== -1) {
                customers[index].creditInfo.balance -= amount
                customers[index].creditInfo.lastRepayDate = date
                userDataService.saveCustomers(customers)

                // 记录还款历史
                const repayments = userDataService.getUserData(`customer_repayments_${customerId}`, [])
                repayments.push({
                    id: Date.now(),
                    amount,
                    date,
                    paymentMethod,
                    note,
                    timestamp: new Date().toISOString()
                })
                userDataService.setUserData(`customer_repayments_${customerId}`, repayments)

                return true
            }
        }
        // 如果是个人赊账
        else {
            const record = await indexedDBService.get('income_records', creditId)
            if (record) {
                record.isPaid = true
                record.repayDate = date
                record.repayMethod = paymentMethod
                record.repayNote = note
                await this.updateIncomeRecord(creditId, record)
                return true
            }
        }

        return false
    }

    /**
     * 获取赊账统计数据
     */
    async getCreditStats() {
        const creditRecords = await this.getAllCreditRecords()

        let totalPersonal = 0
        let totalCustomer = 0
        let overdueCount = 0

        creditRecords.all.forEach(record => {
            if (record.type === 'customer') {
                totalCustomer += record.amount || 0
            } else {
                totalPersonal += record.amount || 0

                // 检查是否逾期（假设30天为期限）
                if (record.expectedRepayDate) {
                    const today = new Date()
                    const dueDate = new Date(record.expectedRepayDate)
                    if (dueDate < today) {
                        overdueCount++
                    }
                }
            }
        })

        return {
            totalPersonal,
            totalCustomer,
            total: totalPersonal + totalCustomer,
            personalCount: creditRecords.personal.length,
            customerCount: creditRecords.customer.length,
            overdueCount
        }
    }

    // ==================== 供应商管理 ====================

    /**
     * 添加供应商
     */
    async addSupplier(supplier) {
        const newSupplier = this.addUserIdentifier({
            ...supplier,
            id: supplier.id || Date.now().toString(),
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        })
        return indexedDBService.add('suppliers', newSupplier)
    }

    /**
     * 获取所有供应商
     */
    async getAllSuppliers() {
        const suppliers = await indexedDBService.getAll('suppliers')
        const userId = this.getCurrentUserId()
        return suppliers.filter(s => s.userId === userId)
    }

    /**
     * 更新供应商
     */
    async updateSupplier(id, data) {
        const supplier = await indexedDBService.get('suppliers', id)
        if (supplier && supplier.userId === this.getCurrentUserId()) {
            const updatedSupplier = {
                ...supplier,
                ...data,
                updateTime: new Date().toISOString()
            }
            return indexedDBService.update('suppliers', updatedSupplier)
        }
        return false
    }

    /**
     * 删除供应商
     */
    async deleteSupplier(id) {
        const supplier = await indexedDBService.get('suppliers', id)
        if (supplier && supplier.userId === this.getCurrentUserId()) {
            return indexedDBService.delete('suppliers', id)
        }
        return false
    }

    // ==================== 采购订单管理 ====================

    /**
     * 添加采购订单
     */
    async addPurchaseOrder(order) {
        const newOrder = this.addUserIdentifier({
            ...order,
            id: order.id || Date.now().toString(),
            status: order.status || 'pending', // pending, completed, cancelled
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        })
        return indexedDBService.add('purchase_orders', newOrder)
    }

    /**
     * 获取所有采购订单
     */
    async getAllPurchaseOrders(filters = {}) {
        const orders = await indexedDBService.getAll('purchase_orders')
        const userId = this.getCurrentUserId()

        let filtered = orders.filter(o => o.userId === userId)

        if (filters.status) {
            filtered = filtered.filter(o => o.status === filters.status)
        }

        if (filters.supplierId) {
            filtered = filtered.filter(o => o.supplierId === filters.supplierId)
        }

        if (filters.startDate && filters.endDate) {
            filtered = filtered.filter(o =>
                o.orderDate >= filters.startDate && o.orderDate <= filters.endDate
            )
        }

        return filtered.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    }

    /**
     * 更新采购订单
     */
    async updatePurchaseOrder(id, data) {
        const order = await indexedDBService.get('purchase_orders', id)
        if (order && order.userId === this.getCurrentUserId()) {
            const updatedOrder = {
                ...order,
                ...data,
                updateTime: new Date().toISOString()
            }
            return indexedDBService.update('purchase_orders', updatedOrder)
        }
        return false
    }

    /**
     * 删除采购订单
     */
    async deletePurchaseOrder(id) {
        const order = await indexedDBService.get('purchase_orders', id)
        if (order && order.userId === this.getCurrentUserId()) {
            return indexedDBService.delete('purchase_orders', id)
        }
        return false
    }

    // ==================== 采购历史记录 ====================

    /**
     * 添加采购历史
     */
    async addPurchaseHistory(history) {
        const newHistory = this.addUserIdentifier({
            ...history,
            id: history.id || Date.now().toString(),
            createTime: new Date().toISOString()
        })
        return indexedDBService.add('purchase_history', newHistory)
    }

    /**
     * 获取采购历史
     */
    async getPurchaseHistory(filters = {}) {
        const history = await indexedDBService.getAll('purchase_history')
        const userId = this.getCurrentUserId()

        let filtered = history.filter(h => h.userId === userId)

        if (filters.supplierId) {
            filtered = filtered.filter(h => h.supplierId === filters.supplierId)
        }

        if (filters.productId) {
            filtered = filtered.filter(h => h.productId === filters.productId)
        }

        if (filters.startDate && filters.endDate) {
            filtered = filtered.filter(h =>
                h.purchaseDate >= filters.startDate && h.purchaseDate <= filters.endDate
            )
        }

        return filtered.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
    }

    // ==================== 数据清理 ====================

    /**
     * 清理当前用户的所有数据
     */
    async clearUserData() {
        const userId = this.getCurrentUserId()
        const stores = [
            'daily_records',
            'income_records',
            'expense_records',
            'products',
            'personal_savings',
            'chart_data_cache',
            'sync_status',
            'product_categories'
        ]

        for (const storeName of stores) {
            const records = await indexedDBService.getAll(storeName)
            const userRecords = records.filter(r => r.userId === userId)

            for (const record of userRecords) {
                await indexedDBService.delete(storeName, record.id)
            }
        }
    }

    /**
     * 清理所有数据（慎用）
     */
    async clearAll() {
        const stores = [
            'daily_records',
            'income_records',
            'expense_records',
            'products',
            'personal_savings',
            'chart_data_cache',
            'sync_status',
            'product_categories'
        ]

        for (const store of stores) {
            await indexedDBService.clear(store)
        }
    }

    /**
     * 根据客户ID获取收入记录
     */
    async getIncomeRecordsByCustomer(customerId) {
        const records = await this.getIncomeRecords({})
        return records.filter(r =>
            r.customerId === customerId ||
            r.customer === customerId
        )
    }
}

export default new BusinessDataService()