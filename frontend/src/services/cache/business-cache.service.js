// business-cache.service.js
// 负责所有数据库操作、数据加密解密、数据持久化
// 只负责数据的 CRUD 操作，不包含业务逻辑

import indexedDBService from '../db/indexed-db.service.js'
import encryptionService from '../encryption.service.js'
import userDataService from '../user-data.service.js'
import idGenerator from '@/services/id-generator.service.js'

/**
 * 业务数据服务 - 处理所有 IndexedDB 数据操作
 * 只负责数据的 CRUD 操作，不包含业务逻辑
 */
class BusinessCacheService {
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
            this.userSecret = this.currentUserId
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

    // ==================== 日常记账 (daily_records) ====================

    /**
     * 添加日常记账记录
     */
    async addDailyRecord(record) {
        const recordId = idGenerator.generateDailyRecordId(this.getCurrentUserId())
        const newRecord = this.addUserIdentifier({
            ...record,
            id: record.id || recordId,
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

        return indexedDBService.add('daily_records', newRecord)
    }

    /**
     * 批量添加日常记账记录
     */
    async addDailyRecords(records) {
        const newRecords = []
        for (const record of records) {
            const recordId = idGenerator.generateDailyRecordId(this.getCurrentUserId())
            const newRecord = this.addUserIdentifier({
                ...record,
                id: record.id || recordId,
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
     * 获取所有日常记账记录（不解密）
     */
    async getAllDailyRecords() {
        const allRecords = await indexedDBService.getAll('daily_records')
        const userId = this.getCurrentUserId()
        return allRecords.filter(r => r.userId === userId && r.businessType === 'personal')
    }

    /**
     * 获取日常记账记录（带解密）
     */
    async getDailyRecordsWithDecrypt() {
        const records = await this.getAllDailyRecords()

        for (const record of records) {
            if (record.encryptedData) {
                const decrypted = await this.decryptSensitiveData(record.encryptedData)
                record.note = decrypted.note
                record.supplier = decrypted.supplier
                record.description = decrypted.description
            }
        }

        return records
    }

    /**
     * 获取单个日常记账记录
     */
    async getDailyRecordById(id) {
        const record = await indexedDBService.get('daily_records', id)
        if (record && record.userId === this.getCurrentUserId()) {
            if (record.encryptedData) {
                const decrypted = await this.decryptSensitiveData(record.encryptedData)
                record.note = decrypted.note
                record.supplier = decrypted.supplier
                record.description = decrypted.description
            }
            return record
        }
        return null
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

    // ==================== 支出记录 (expense_records) ====================

    /**
     * 添加支出记录
     */
    async addExpenseRecord(record) {
        const recordId = idGenerator.generateExpenseRecordId(this.getCurrentUserId())
        const newRecord = this.addUserIdentifier({
            ...record,
            id: record.id || recordId,
            type: '支出',
            amount: Math.abs(record.amount || 0),
            businessType: record.businessType || 'business',
            syncStatus: 'pending'
        })
        return indexedDBService.add('expense_records', newRecord)
    }

    /**
     * 批量添加支出记录
     */
    async addExpenseRecords(records) {
        const newRecords = records.map(record => {
            const recordId = idGenerator.generateExpenseRecordId(this.getCurrentUserId())
            return this.addUserIdentifier({
                ...record,
                id: record.id || recordId,
                type: '支出',
                amount: Math.abs(record.amount || 0),
                businessType: record.businessType || 'business',
                syncStatus: 'pending'
            })
        })
        return indexedDBService.bulkAdd('expense_records', newRecords)
    }

    /**
     * 获取所有支出记录
     */
    async getAllExpenseRecords() {
        const records = await indexedDBService.getAll('expense_records')
        const userId = this.getCurrentUserId()
        return records.filter(r => r.userId === userId)
    }

    /**
     * 获取单个支出记录
     */
    async getExpenseRecordById(id) {
        const record = await indexedDBService.get('expense_records', id)
        if (record && record.userId === this.getCurrentUserId()) {
            return record
        }
        return null
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

    // ==================== 收入记录 (income_records) ====================

    /**
     * 添加收入记录
     */
    async addIncomeRecord(record) {
        const recordId = idGenerator.generateIncomeRecordId(this.getCurrentUserId())
        const newRecord = this.addUserIdentifier({
            ...record,
            id: record.id || recordId,
            type: '收入',
            amount: Math.abs(record.amount || 0),
            businessType: record.businessType || 'business',
            syncStatus: 'pending'
        })
        return indexedDBService.add('income_records', newRecord)
    }

    /**
     * 批量添加收入记录
     */
    async addIncomeRecords(records) {
        const newRecords = records.map(record => {
            const recordId = idGenerator.generateIncomeRecordId(this.getCurrentUserId())
            return this.addUserIdentifier({
                ...record,
                id: record.id || recordId,
                type: '收入',
                amount: Math.abs(record.amount || 0),
                businessType: record.businessType || 'business',
                syncStatus: 'pending'
            })
        })
        return indexedDBService.bulkAdd('income_records', newRecords)
    }

    /**
     * 获取所有收入记录
     */
    async getAllIncomeRecords() {
        const records = await indexedDBService.getAll('income_records')
        const userId = this.getCurrentUserId()
        return records.filter(r => r.userId === userId)
    }

    /**
     * 获取单个收入记录
     */
    async getIncomeRecordById(id) {
        const record = await indexedDBService.get('income_records', id)
        if (record && record.userId === this.getCurrentUserId()) {
            return record
        }
        return null
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

    // ==================== 商品管理 ====================

    /**
     * 添加商品
     */
    async addProduct(product) {
        const productId = idGenerator.generateProductId(this.getCurrentUserId())
        const newProduct = this.addUserIdentifier({
            ...product,
            id: product.id || productId
        })
        return indexedDBService.add('products', newProduct)
    }

    /**
     * 批量添加商品
     */
    async addProducts(products) {
        const newProducts = products.map(product => {
            const productId = idGenerator.generateProductId(this.getCurrentUserId())
            return this.addUserIdentifier({
                ...product,
                id: product.id || productId
            })
        })
        return indexedDBService.bulkAdd('products', newProducts)
    }

    /**
     * 获取所有商品
     */
    async getAllProducts() {
        const products = await indexedDBService.getAll('products')
        const userId = this.getCurrentUserId()
        return products.filter(p => p.userId === userId)
    }

    /**
     * 获取单个商品
     */
    async getProductById(id) {
        const product = await indexedDBService.get('products', id)
        if (product && product.userId === this.getCurrentUserId()) {
            return product
        }
        return null
    }

    /**
     * 更新商品
     */
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

    /**
     * 删除商品
     */
    async deleteProduct(id) {
        const product = await indexedDBService.get('products', id)
        if (product && product.userId === this.getCurrentUserId()) {
            return indexedDBService.delete('products', id)
        }
        return false
    }

    /**
     * 检查商品是否存在
     */
    async isProductExists(productId) {
        const product = await this.getProductById(productId)
        return product !== null
    }

    /**
     * 按名称查找商品
     */
    async getProductByName(name) {
        const products = await this.getAllProducts()
        return products.find(p => p.name === name) || null
    }

    // ==================== 商品分类 ====================

    /**
     * 获取所有分类
     */
    async getAllCategories() {
        const categories = await indexedDBService.getAll('product_categories')
        const userId = this.getCurrentUserId()
        if (!userId) {
            console.warn('用户未登录，返回空分类')
            return []
        }
        return categories.filter(c => c.userId === userId)
    }

    /**
     * 添加分类
     */
    async addCategory(category) {
        const categoryId = idGenerator.generateCategoryId(this.getCurrentUserId())
        const newCategory = this.addUserIdentifier({
            ...category,
            id: category.id || categoryId,
            isDefault: false
        })
        return indexedDBService.add('product_categories', newCategory)
    }

    /**
     * 批量添加分类
     */
    async addCategories(categories) {
        const newCategories = categories.map(category => {
            const categoryId = idGenerator.generateCategoryId(this.getCurrentUserId())
            return this.addUserIdentifier({
                ...category,
                id: category.id || categoryId,
                isDefault: category.isDefault || false
            })
        })
        return indexedDBService.bulkAdd('product_categories', newCategories)
    }

    /**
     * 更新分类
     */
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

    /**
     * 删除分类
     */
    async deleteCategory(id) {
        const category = await indexedDBService.get('product_categories', id)
        if (category && category.userId === this.getCurrentUserId() && !category.isDefault) {
            return indexedDBService.delete('product_categories', id)
        }
        return false
    }

    /**
     * 获取单个分类
     */
    async getCategoryById(id) {
        const category = await indexedDBService.get('product_categories', id)
        if (category && (category.userId === this.getCurrentUserId() || category.isDefault)) {
            return category
        }
        return null
    }

    /**
     * 按名称获取分类
     */
    async getCategoryByName(name) {
        const categories = await this.getAllCategories()
        return categories.find(c => c.name === name) || null
    }

    // ==================== 库存管理 ====================

    /**
     * 添加库存项
     */
    async addInventoryItem(item) {
        const inventoryId = idGenerator.generateInventoryId(this.getCurrentUserId())
        const newItem = this.addUserIdentifier({
            ...item,
            id: item.id || inventoryId
        })
        return indexedDBService.add('inventory', newItem)
    }

    /**
     * 批量添加库存项
     */
    async addInventoryItems(items) {
        const newItems = items.map(item => {
            const inventoryId = idGenerator.generateInventoryId(this.getCurrentUserId())
            return this.addUserIdentifier({
                ...item,
                id: item.id || inventoryId
            })
        })
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
     * 获取单个库存项
     */
    async getInventoryItemById(id) {
        const item = await indexedDBService.get('inventory', id)
        if (item && item.userId === this.getCurrentUserId()) {
            return item
        }
        return null
    }

    /**
     * 按商品ID获取库存
     */
    async getInventoryByProductId(productId) {
        const items = await this.getAllInventory()
        return items.filter(i => i.productId === productId)
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
     * 更新库存数量（原子操作）
     */
    async updateStockQuantity(id, delta) {
        const item = await this.getInventoryItemById(id)
        if (!item) return false

        const newQuantity = Math.max(0, (item.quantity || 0) + delta)
        return this.updateInventoryItem(id, { quantity: newQuantity })
    }

    // ==================== 供应商管理 ====================

    /**
     * 添加供应商
     */
    async addSupplier(supplier) {
        const supplierId = idGenerator.generateSupplierId(this.getCurrentUserId())
        const newSupplier = this.addUserIdentifier({
            ...supplier,
            id: supplier.id || supplierId
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
     * 获取单个供应商
     */
    async getSupplierById(id) {
        const supplier = await indexedDBService.get('suppliers', id)
        if (supplier && supplier.userId === this.getCurrentUserId()) {
            return supplier
        }
        return null
    }

    /**
     * 按名称获取供应商
     */
    async getSupplierByName(name) {
        const suppliers = await this.getAllSuppliers()
        return suppliers.find(s => s.name === name) || null
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
        const orderId = idGenerator.generatePurchaseOrderId(this.getCurrentUserId())
        const newOrder = this.addUserIdentifier({
            ...order,
            id: order.id || orderId,
            status: order.status || 'pending'
        })
        return indexedDBService.add('purchase_orders', newOrder)
    }

    /**
     * 获取所有采购订单
     */
    async getAllPurchaseOrders() {
        const orders = await indexedDBService.getAll('purchase_orders')
        const userId = this.getCurrentUserId()
        return orders.filter(o => o.userId === userId)
    }

    /**
     * 获取单个采购订单
     */
    async getPurchaseOrderById(id) {
        const order = await indexedDBService.get('purchase_orders', id)
        if (order && order.userId === this.getCurrentUserId()) {
            return order
        }
        return null
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
        const historyId = idGenerator.generatePurchaseHistoryId(this.getCurrentUserId())
        const newHistory = this.addUserIdentifier({
            ...history,
            id: history.id || historyId
        })
        return indexedDBService.add('purchase_history', newHistory)
    }

    /**
     * 获取所有采购历史
     */
    async getAllPurchaseHistory() {
        const history = await indexedDBService.getAll('purchase_history')
        const userId = this.getCurrentUserId()
        return history.filter(h => h.userId === userId)
    }

    // ==================== 客户管理 (使用 userDataService) ====================

    /**
     * 获取所有客户列表
     */
    getAllCustomers() {
        return userDataService.getCustomers() || []
    }

    /**
     * 保存客户列表
     */
    saveCustomers(customers) {
        userDataService.saveCustomers(customers)
    }

    /**
     * 获取单个客户
     */
    getCustomerById(customerId) {
        const customers = this.getAllCustomers()
        return customers.find(c => c.id === customerId) || null
    }

    /**
     * 添加客户
     */
    addCustomer(customerData) {
        const customers = this.getAllCustomers()
        const newCustomer = {
            id: Date.now().toString(),
            ...customerData,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        }
        customers.push(newCustomer)
        this.saveCustomers(customers)
        return newCustomer
    }

    /**
     * 更新客户
     */
    updateCustomer(customerId, customerData) {
        const customers = this.getAllCustomers()
        const index = customers.findIndex(c => c.id === customerId)
        if (index === -1) return null

        customers[index] = {
            ...customers[index],
            ...customerData,
            updateTime: new Date().toISOString()
        }
        this.saveCustomers(customers)
        return customers[index]
    }

    /**
     * 删除客户
     */
    deleteCustomer(customerId) {
        const customers = this.getAllCustomers()
        const index = customers.findIndex(c => c.id === customerId)
        if (index === -1) return false

        customers.splice(index, 1)
        this.saveCustomers(customers)
        return true
    }

    /**
     * 按客户ID分组交易记录
     */
    groupTransactionsByCustomer(incomeRecords) {
        const grouped = {}
        incomeRecords.forEach(record => {
            if (record.customerId) {
                if (!grouped[record.customerId]) grouped[record.customerId] = []
                grouped[record.customerId].push(record)
            }
        })
        return grouped
    }

    /**
     * 计算客户交易统计
     */
    calculateCustomerStats(transactions) {
        const transactionCount = transactions.length
        const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)

        let lastTransactionDate = null
        if (transactions.length > 0) {
            const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
            lastTransactionDate = sorted[0].date
        }

        return { transactionCount, totalAmount, lastTransactionDate }
    }

    /**
     * 获取所有客户（带交易统计）
     */
    async getAllCustomersWithStats() {
        const customers = this.getAllCustomers()
        const allIncomeRecords = await this.getAllIncomeRecords()
        const transactionsByCustomer = this.groupTransactionsByCustomer(allIncomeRecords)

        return customers.map(customer => {
            const customerTransactions = transactionsByCustomer[customer.id] || []
            const stats = this.calculateCustomerStats(customerTransactions)
            return { ...customer, stats }
        })
    }

    /**
     * 获取客户详情（含交易记录）
     */
    async getCustomerDetail(customerId) {
        const customers = await this.getAllCustomersWithStats()
        const customer = customers.find(c => c.id === customerId)

        if (!customer) throw new Error('客户不存在')

        const allIncomeRecords = await this.getAllIncomeRecords()
        const transactions = allIncomeRecords
            .filter(r => r.customerId === customerId)
            .map(r => ({
                id: r.id,
                type: '收入',
                description: r.productName || r.category || '交易',
                amount: r.amount,
                date: r.date,
                paymentMethod: r.paymentMethod,
                note: r.note,
                productName: r.productName,
                quantity: r.quantity,
                unit: r.unit,
                price: r.price,
                isPaid: r.isPaid
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))

        return { ...customer, transactions }
    }

    /**
     * 获取客户交易记录
     */
    async getCustomerTransactions(customerId, range = 'all') {
        const allIncomeRecords = await this.getAllIncomeRecords()
        let records = allIncomeRecords.filter(r => r.customerId === customerId)

        if (range !== 'all') {
            const today = this.formatDateYMD(new Date())
            let startDate

            switch (range) {
                case 'month':
                    startDate = this.addDays(today, -30)
                    break
                case 'quarter':
                    startDate = this.addDays(today, -90)
                    break
                case 'year':
                    startDate = this.addDays(today, -365)
                    break
                default:
                    startDate = null
            }

            if (startDate) records = records.filter(r => r.date >= startDate)
        }

        return records
            .map(r => ({
                id: r.id,
                type: '收入',
                description: r.productName || r.category || '交易',
                amount: r.amount,
                date: r.date,
                paymentMethod: r.paymentMethod,
                note: r.note,
                productName: r.productName,
                quantity: r.quantity,
                unit: r.unit,
                price: r.price
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 记录客户还款
     */
    async recordCustomerRepayment(customerId, repaymentData) {
        const { amount, date, paymentMethod, note } = repaymentData
        const repaymentAmount = parseFloat(amount)

        if (repaymentAmount <= 0) throw new Error('还款金额必须大于0')

        const customers = this.getAllCustomers()
        const customerIndex = customers.findIndex(c => c.id === customerId)

        if (customerIndex === -1) throw new Error('客户不存在')

        const customer = customers[customerIndex]
        const currentBalance = customer.creditInfo?.balance || 0

        if (repaymentAmount > currentBalance) throw new Error('还款金额不能大于当前欠款')

        // 1. 更新客户欠款余额
        customers[customerIndex].creditInfo.balance = currentBalance - repaymentAmount
        customers[customerIndex].creditInfo.lastRepayDate = date
        this.saveCustomers(customers)

        // 2. 更新该客户的收入记录（赊账记录）
        const incomeRecords = await this.getAllIncomeRecords()
        const customerCreditRecords = incomeRecords.filter(r =>
            r.customerId === customerId &&
            r.paymentMethod === '赊账' &&
            !r.isPaid
        ).sort((a, b) => new Date(a.date) - new Date(b.date))

        let remainingAmount = repaymentAmount

        for (const record of customerCreditRecords) {
            if (remainingAmount <= 0) break

            const recordAmount = record.amount
            if (remainingAmount >= recordAmount) {
                await this.updateIncomeRecord(record.id, {
                    amount: 0,
                    isPaid: true,
                    repayDate: date,
                    repayMethod: paymentMethod,
                    repayNote: note
                })
                remainingAmount -= recordAmount
            } else {
                await this.updateIncomeRecord(record.id, {
                    amount: recordAmount - remainingAmount,
                    isPaid: false,
                    partialRepay: true,
                    lastRepayDate: date,
                    lastRepayAmount: remainingAmount
                })
                remainingAmount = 0
            }
        }

        // 3. 记录还款历史
        const repayments = userDataService.getUserData(`customer_repayments_${customerId}`, [])
        repayments.push({
            id: Date.now(),
            amount: repaymentAmount,
            date: date,
            paymentMethod: paymentMethod,
            note: note,
            timestamp: new Date().toISOString()
        })
        userDataService.setUserData(`customer_repayments_${customerId}`, repayments)

        return true
    }

    /**
     * 获取客户还款历史
     */
    getCustomerRepaymentHistory(customerId) {
        return userDataService.getUserData(`customer_repayments_${customerId}`, [])
    }

    /**
     * 获取客户赊账统计
     */
    async getCustomerCreditStats() {
        const customers = await this.getAllCustomersWithStats()
        let totalCreditBalance = 0
        let customersWithCredit = 0
        let totalCreditLimit = 0

        customers.forEach(customer => {
            if (customer.creditInfo?.hasCredit) {
                customersWithCredit++
                totalCreditBalance += customer.creditInfo.balance || 0
                totalCreditLimit += customer.creditInfo.creditLimit || 0
            }
        })

        return {
            totalCreditBalance,
            customersWithCredit,
            totalCreditLimit,
            averageCreditBalance: customersWithCredit > 0 ? totalCreditBalance / customersWithCredit : 0
        }
    }

    // ==================== 辅助方法 ====================

    /**
     * 添加天数
     */
    addDays(dateStr, days) {
        const date = new Date(dateStr)
        date.setDate(date.getDate() + days)
        return this.formatDateYMD(date)
    }

    /**
     * 格式化日期（YYYY-MM-DD）
     */
    formatDateYMD(date) {
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    /**
     * 格式化日期时间
     */
    formatDateTime(date) {
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}`
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
            'product_categories',
            'inventory',
            'suppliers',
            'purchase_orders',
            'purchase_history'
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
            'product_categories',
            'inventory',
            'suppliers',
            'purchase_orders',
            'purchase_history'
        ]

        for (const store of stores) {
            await indexedDBService.clear(store)
        }
    }
}

export default new BusinessCacheService()