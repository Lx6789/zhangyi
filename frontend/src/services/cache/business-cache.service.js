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
            // 清理数据，移除无法克隆的内容
            const cleanedData = {
                ...order,
                ...data,
                updateTime: new Date().toISOString()
            }

            // 清理 items 数组中的循环引用
            if (cleanedData.items && Array.isArray(cleanedData.items)) {
                cleanedData.items = cleanedData.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price,
                    unit: item.unit,
                    category: item.category
                }))
            }

            // 清理其他可能包含循环引用的字段
            delete cleanedData.__ob__
            delete cleanedData._rawValue
            delete cleanedData._shallow

            return indexedDBService.update('purchase_orders', cleanedData)
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

    // ==================== 客户管理 (使用 IndexedDB) ====================

    /**
     * 获取所有客户列表
     */
    async getAllCustomers() {
        console.log('getAllCustomers 被调用，当前用户ID:', this.getCurrentUserId())
        const customers = await indexedDBService.getAll('customers')
        console.log('原始客户数据:', customers)

        const userId = this.getCurrentUserId()
        const filteredCustomers = customers.filter(c => c.userId === userId)
        console.log('过滤后的客户数据:', filteredCustomers)

        return filteredCustomers
    }

    /**
     * 获取单个客户
     */
    async getCustomerById(customerId) {
        const customer = await indexedDBService.get('customers', customerId)
        if (customer && customer.userId === this.getCurrentUserId()) {
            return customer
        }
        return null
    }

    /**
     * 添加客户
     */
    async addCustomer(customerData) {
        const customerId = idGenerator.generateCustomerId(this.getCurrentUserId())
        const newCustomer = this.addUserIdentifier({
            id: customerId,
            ...customerData,
            type: customerData.type || '零售客户',
            creditInfo: customerData.creditInfo || { hasCredit: false },
            stats: customerData.stats || { transactionCount: 0, totalAmount: 0, lastTransactionDate: null },
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        })
        return indexedDBService.add('customers', newCustomer)
    }

    /**
     * 批量添加客户
     */
    async addCustomers(customers) {
        const newCustomers = customers.map(customer => {
            const customerId = idGenerator.generateCustomerId(this.getCurrentUserId())
            return this.addUserIdentifier({
                id: customerId,
                ...customer,
                type: customer.type || '零售客户',
                creditInfo: customer.creditInfo || { hasCredit: false },
                stats: customer.stats || { transactionCount: 0, totalAmount: 0, lastTransactionDate: null },
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString()
            })
        })
        return indexedDBService.bulkAdd('customers', newCustomers)
    }

    /**
     * 更新客户
     */
    async updateCustomer(customerId, customerData) {
        console.log('updateCustomer 被调用:', customerId)

        const customer = await indexedDBService.get('customers', customerId)
        if (!customer) {
            console.error('客户不存在:', customerId)
            return false
        }

        if (customer.userId !== this.getCurrentUserId()) {
            console.error('无权修改此客户')
            return false
        }

        // 创建完全干净的客户对象
        const cleanedData = {
            id: customerId,
            name: customerData.name || customer.name,
            type: customerData.type || customer.type || '零售客户',
            phone: customerData.phone || customer.phone || '',
            address: customerData.address || customer.address || '',
            note: customerData.note || customer.note || '',
            creditInfo: {
                hasCredit: customerData.creditInfo?.hasCredit || false,
                balance: customerData.creditInfo?.balance || 0,
                creditLimit: customerData.creditInfo?.creditLimit || null,
                settlementDays: customerData.creditInfo?.settlementDays || null,
                note: customerData.creditInfo?.note || '',
                lastCreditDate: customerData.creditInfo?.lastCreditDate || null,
                lastCreditAmount: customerData.creditInfo?.lastCreditAmount || 0,
                lastRepayDate: customerData.creditInfo?.lastRepayDate || null,
                lastRepayAmount: customerData.creditInfo?.lastRepayAmount || 0
            },
            stats: {
                transactionCount: customerData.stats?.transactionCount || 0,
                totalAmount: customerData.stats?.totalAmount || 0,
                lastTransactionDate: customerData.stats?.lastTransactionDate || null
            },
            userId: customer.userId,
            createTime: customer.createTime,
            updateTime: new Date().toISOString()
        }

        console.log('清理后的客户数据:', cleanedData)

        return indexedDBService.update('customers', cleanedData)
    }

    /**
     * 删除客户
     */
    async deleteCustomer(customerId) {
        const customer = await indexedDBService.get('customers', customerId)
        if (customer && customer.userId === this.getCurrentUserId()) {
            // 同时删除该客户的还款记录
            const repayments = await this.getCustomerRepayments(customerId)
            for (const repayment of repayments) {
                await indexedDBService.delete('customer_repayments', repayment.id)
            }
            return indexedDBService.delete('customers', customerId)
        }
        return false
    }

    /**
     * 按名称查找客户
     */
    async getCustomerByName(name) {
        const customers = await this.getAllCustomers()
        return customers.find(c => c.name === name) || null
    }

    /**
     * 按电话查找客户
     */
    async getCustomerByPhone(phone) {
        const customers = await this.getAllCustomers()
        return customers.find(c => c.phone === phone) || null
    }

    /**
     * 按类型筛选客户
     */
    async getCustomersByType(type) {
        const customers = await this.getAllCustomers()
        return customers.filter(c => c.type === type)
    }

    /**
     * 获取有赊账的客户
     */
    async getCustomersWithCredit() {
        const customers = await this.getAllCustomers()
        return customers.filter(c => c.creditInfo?.hasCredit === true && (c.creditInfo?.balance || 0) > 0)
    }

    // ==================== 客户还款记录管理 ====================

    /**
     * 添加客户还款记录
     */
    async addCustomerRepayment(repayment) {
        const repaymentId = idGenerator.generateRepaymentId(this.getCurrentUserId())
        const newRepayment = this.addUserIdentifier({
            ...repayment,
            id: repayment.id || repaymentId,
            repaymentDate: repayment.repaymentDate || new Date().toISOString(),
            createTime: new Date().toISOString()
        })
        return indexedDBService.add('customer_repayments', newRepayment)
    }

    /**
     * 获取客户的所有还款记录
     */
    async getCustomerRepayments(customerId) {
        const repayments = await indexedDBService.getAll('customer_repayments')
        const userId = this.getCurrentUserId()
        return repayments.filter(r => r.userId === userId && r.customerId === customerId)
            .sort((a, b) => new Date(b.repaymentDate) - new Date(a.repaymentDate))
    }

    /**
     * 获取客户的还款历史（带统计）
     */
    async getCustomerRepaymentHistory(customerId) {
        const repayments = await this.getCustomerRepayments(customerId)
        const totalRepaid = repayments.reduce((sum, r) => sum + (r.amount || 0), 0)
        const repaymentCount = repayments.length
        const lastRepaymentDate = repayments.length > 0 ? repayments[0].repaymentDate : null

        return {
            repayments,
            totalRepaid,
            repaymentCount,
            lastRepaymentDate
        }
    }

    /**
     * 记录客户还款（业务方法）
     */
    async recordCustomerRepayment(customerId, repaymentData) {
        const { amount, date, paymentMethod, note } = repaymentData
        const repaymentAmount = parseFloat(amount)

        console.log('=== 开始记录还款 ===')
        console.log('客户ID:', customerId)
        console.log('还款金额:', repaymentAmount)

        if (repaymentAmount <= 0) throw new Error('还款金额必须大于0')

        // 获取客户信息
        const customer = await this.getCustomerById(customerId)
        if (!customer) throw new Error('客户不存在')

        // 获取该客户的所有未还清赊账记录
        const incomeRecords = await this.getAllIncomeRecords()
        const customerCreditRecords = incomeRecords.filter(r =>
            r.customerId === customerId &&
            r.paymentMethod === '赊账' &&
            !r.isPaid  // 未还清的记录
        ).sort((a, b) => new Date(a.date) - new Date(b.date))

        console.log('客户赊账记录数量:', customerCreditRecords.length)

        // 如果没有未结清的赊账记录，只更新客户余额
        if (customerCreditRecords.length === 0) {
            const currentBalance = customer.creditInfo?.balance || 0
            const newBalance = Math.max(0, currentBalance - repaymentAmount)

            console.log(`没有未结清的赊账记录，直接更新客户余额: ${currentBalance} -> ${newBalance}`)

            // 更新客户欠款余额
            await this.updateCustomer(customerId, {
                creditInfo: {
                    ...customer.creditInfo,
                    balance: newBalance,
                    lastRepayDate: date,
                    lastRepayAmount: repaymentAmount
                }
            })

            // 记录还款历史（不关联具体赊账记录）
            await this.addCustomerRepayment({
                id: idGenerator.generateRepaymentId(this.getCurrentUserId()),
                customerId: customerId,
                amount: repaymentAmount,
                repaymentDate: date,
                paymentMethod: paymentMethod,
                note: note,
                originalBalance: currentBalance,
                newBalance: newBalance,
                repaymentDetails: []
            })

            console.log('=== 还款完成（仅更新余额）===')
            return true
        }

        // 计算总欠款
        const totalDebt = customerCreditRecords.reduce((sum, r) => {
            const repaid = r.repaidAmount || 0
            const remaining = r.amount - repaid
            console.log(`记录 ${r.id}: 原金额=${r.amount}, 已还=${repaid}, 剩余=${remaining}`)
            return sum + remaining
        }, 0)

        console.log('总欠款:', totalDebt)
        console.log('还款金额:', repaymentAmount)

        if (repaymentAmount > totalDebt) {
            throw new Error(`还款金额不能大于总欠款（总欠款：¥${totalDebt}）`)
        }

        let remainingAmount = repaymentAmount
        const repaymentDetails = []

        // 按时间顺序分配还款到各个赊账记录
        for (const record of customerCreditRecords) {
            if (remainingAmount <= 0) break

            const recordRemaining = record.amount - (record.repaidAmount || 0)
            console.log(`处理记录 ${record.id}: 剩余欠款=${recordRemaining}, 待分配=${remainingAmount}`)

            if (remainingAmount >= recordRemaining) {
                // 完全还清这笔赊账
                const repaidAmount = recordRemaining
                repaymentDetails.push({
                    creditId: record.id,
                    amount: repaidAmount,
                    isPaid: true
                })
                remainingAmount -= repaidAmount

                console.log(`完全还清记录 ${record.id}: 还款金额=${repaidAmount}`)

                // 更新赊账记录
                await this.updateIncomeRecord(record.id, {
                    repaidAmount: record.amount,
                    isPaid: true,
                    lastRepayDate: date,
                    lastRepayAmount: repaidAmount,
                    repayments: [...(record.repayments || []), {
                        id: idGenerator.generateRepaymentId(this.getCurrentUserId()),
                        amount: repaidAmount,
                        date: date,
                        paymentMethod: paymentMethod,
                        note: note,
                        type: 'full'
                    }]
                })
            } else {
                // 部分还清
                repaymentDetails.push({
                    creditId: record.id,
                    amount: remainingAmount,
                    isPaid: false
                })

                const newRepaidAmount = (record.repaidAmount || 0) + remainingAmount
                console.log(`部分还清记录 ${record.id}: 原已还=${record.repaidAmount || 0}, 新已还=${newRepaidAmount}`)

                await this.updateIncomeRecord(record.id, {
                    repaidAmount: newRepaidAmount,
                    isPaid: false,
                    lastRepayDate: date,
                    lastRepayAmount: remainingAmount,
                    repayments: [...(record.repayments || []), {
                        id: idGenerator.generateRepaymentId(this.getCurrentUserId()),
                        amount: remainingAmount,
                        date: date,
                        paymentMethod: paymentMethod,
                        note: note,
                        type: 'partial'
                    }]
                })
                remainingAmount = 0
            }
        }

        // 计算新的客户欠款余额
        const currentBalance = customer.creditInfo?.balance || 0
        const newBalance = Math.max(0, currentBalance - repaymentAmount)

        console.log(`客户余额: 原=${currentBalance}, 新=${newBalance}`)

        // 更新客户欠款余额
        await this.updateCustomer(customerId, {
            creditInfo: {
                ...customer.creditInfo,
                balance: newBalance,
                lastRepayDate: date,
                lastRepayAmount: repaymentAmount
            }
        })

        // 记录还款历史
        await this.addCustomerRepayment({
            id: idGenerator.generateRepaymentId(this.getCurrentUserId()),
            customerId: customerId,
            amount: repaymentAmount,
            repaymentDate: date,
            paymentMethod: paymentMethod,
            note: note,
            originalBalance: currentBalance,
            newBalance: newBalance,
            repaymentDetails: repaymentDetails
        })

        console.log('=== 还款完成 ===')
        return true
    }

    /**
     * 记录应付账款还款（支出赊账）- 数据库操作
     */
    async recordPayableRepayment(recordId, repaymentData) {
        const { amount, date, paymentMethod, note } = repaymentData
        const repaymentAmount = parseFloat(amount)

        console.log('=== 开始记录应付账款还款 ===')
        console.log('记录ID:', recordId)
        console.log('还款金额:', repaymentAmount)

        if (repaymentAmount <= 0) throw new Error('还款金额必须大于0')

        // 获取支出记录
        const record = await this.getExpenseRecordById(recordId)
        if (!record) throw new Error('赊账记录不存在')
        if (record.paymentMethod !== '赊账') throw new Error('该记录不是赊账记录')

        // 计算剩余欠款
        const currentRemaining = record.amount - (record.repaidAmount || 0)
        console.log(`当前剩余欠款: ${currentRemaining}, 原始金额: ${record.amount}, 已还: ${record.repaidAmount || 0}`)

        if (repaymentAmount > currentRemaining) {
            throw new Error(`还款金额不能大于当前欠款（当前欠款：¥${currentRemaining}）`)
        }

        const newRepaidAmount = (record.repaidAmount || 0) + repaymentAmount
        const isFullyPaid = newRepaidAmount >= record.amount

        // 更新支出记录（不修改 amount）
        const updatedRecord = {
            ...record,
            repaidAmount: newRepaidAmount,
            isPaid: isFullyPaid,
            lastRepayDate: date,
            lastRepayAmount: repaymentAmount,
            repayments: [...(record.repayments || []), {
                id: idGenerator.generateRepaymentId(this.getCurrentUserId()),
                amount: repaymentAmount,
                date: date,
                paymentMethod: paymentMethod,
                note: note,
                type: isFullyPaid ? 'full' : 'partial'
            }]
        }

        console.log(`更新支出记录: 原已还=${record.repaidAmount || 0}, 新已还=${newRepaidAmount}, 是否还清=${isFullyPaid}`)

        // 更新到数据库
        const result = await this.updateExpenseRecord(recordId, updatedRecord)

        // 记录还款历史到专门的还款表
        await this.addExpenseRepayment({
            expenseRecordId: recordId,
            amount: repaymentAmount,
            repaymentDate: date,
            paymentMethod: paymentMethod,
            note: note,
            originalRemaining: currentRemaining,
            newRemaining: currentRemaining - repaymentAmount
        })

        console.log('=== 应付账款还款完成 ===')
        return result
    }

    /**
     * 记录应收账款收款（收入赊账）- 数据库操作
     */
    async recordReceivableCollection(recordId, collectionData) {
        const { amount, date, paymentMethod, note } = collectionData
        const collectionAmount = parseFloat(amount)

        console.log('=== 开始记录应收账款收款 ===')
        console.log('记录ID:', recordId)
        console.log('收款金额:', collectionAmount)

        if (collectionAmount <= 0) throw new Error('收款金额必须大于0')

        // 获取收入记录
        const record = await this.getIncomeRecordById(recordId)
        if (!record) throw new Error('赊账记录不存在')
        if (record.paymentMethod !== '赊账') throw new Error('该记录不是赊账记录')

        // 计算剩余欠款
        const currentRemaining = record.amount - (record.repaidAmount || 0)
        console.log(`当前剩余欠款: ${currentRemaining}, 原始金额: ${record.amount}, 已收: ${record.repaidAmount || 0}`)

        if (collectionAmount > currentRemaining) {
            throw new Error(`收款金额不能大于当前欠款（当前欠款：¥${currentRemaining}）`)
        }

        const newRepaidAmount = (record.repaidAmount || 0) + collectionAmount
        const isFullyPaid = newRepaidAmount >= record.amount

        // 更新收入记录（不修改 amount）
        const updatedRecord = {
            ...record,
            repaidAmount: newRepaidAmount,
            isPaid: isFullyPaid,
            lastRepayDate: date,
            lastRepayAmount: collectionAmount,
            repayments: [...(record.repayments || []), {
                id: idGenerator.generateRepaymentId(this.getCurrentUserId()),
                amount: collectionAmount,
                date: date,
                paymentMethod: paymentMethod,
                note: note,
                type: isFullyPaid ? 'full' : 'partial'
            }]
        }

        console.log(`更新收入记录: 原已收=${record.repaidAmount || 0}, 新已收=${newRepaidAmount}, 是否收清=${isFullyPaid}`)

        // 更新到数据库
        const result = await this.updateIncomeRecord(recordId, updatedRecord)

        // 记录收款历史到专门的收款表
        await this.addIncomeCollection({
            incomeRecordId: recordId,
            amount: collectionAmount,
            collectionDate: date,
            paymentMethod: paymentMethod,
            note: note,
            originalRemaining: currentRemaining,
            newRemaining: currentRemaining - collectionAmount
        })

        // 更新客户赊账余额（仅当有客户ID且客户存在时）
        if (result && record.customerId) {
            try {
                // 先获取客户信息
                const customer = await this.getCustomerById(record.customerId)
                if (customer && customer.creditInfo?.hasCredit) {
                    // 只有当客户有赊账功能且当前有欠款时才更新
                    const currentBalance = customer.creditInfo?.balance || 0

                    // 检查客户是否有对应的赊账记录
                    const incomeRecords = await this.getAllIncomeRecords()
                    const customerCreditRecords = incomeRecords.filter(r =>
                        r.customerId === record.customerId &&
                        r.paymentMethod === '赊账' &&
                        !r.isPaid
                    )

                    // 只有当存在未结清的赊账记录时才更新客户余额
                    if (customerCreditRecords.length > 0) {
                        const repaymentData = {
                            amount: collectionAmount,
                            date: date,
                            paymentMethod: paymentMethod,
                            note: note
                        }
                        await this.recordCustomerRepayment(record.customerId, repaymentData)
                    } else {
                        // 如果没有未结清的赊账记录，只更新客户的 creditInfo 余额
                        const newBalance = Math.max(0, currentBalance - collectionAmount)
                        await this.updateCustomer(record.customerId, {
                            creditInfo: {
                                ...customer.creditInfo,
                                balance: newBalance,
                                lastRepayDate: date,
                                lastRepayAmount: collectionAmount
                            }
                        })
                        console.log(`直接更新客户余额: ${currentBalance} -> ${newBalance}`)
                    }
                }
            } catch (error) {
                console.error('更新客户赊账余额失败:', error)
                // 不抛出错误，因为主要操作（收入记录更新）已经成功
            }
        }

        console.log('=== 应收账款收款完成 ===')
        return result
    }

    /**
     * 添加收入收款记录
     */
    async addIncomeCollection(collection) {
        const collectionId = idGenerator.generateRepaymentId(this.getCurrentUserId())
        const newCollection = this.addUserIdentifier({
            ...collection,
            id: collection.id || collectionId,
            collectionDate: collection.collectionDate || new Date().toISOString(),
            createTime: new Date().toISOString()
        })
        return indexedDBService.add('income_collections', newCollection)
    }

    /**
     * 获取收入收款记录
     */
    async getIncomeCollections(incomeRecordId) {
        const collections = await indexedDBService.getAll('income_collections')
        const userId = this.getCurrentUserId()
        return collections.filter(c =>
            c.userId === userId &&
            c.incomeRecordId === incomeRecordId
        ).sort((a, b) => new Date(b.collectionDate) - new Date(a.collectionDate))
    }

    /**
     * 添加支出还款记录
     */
    async addExpenseRepayment(repayment) {
        const repaymentId = idGenerator.generateRepaymentId(this.getCurrentUserId())
        const newRepayment = this.addUserIdentifier({
            ...repayment,
            id: repayment.id || repaymentId,
            repaymentDate: repayment.repaymentDate || new Date().toISOString(),
            createTime: new Date().toISOString()
        })
        return indexedDBService.add('expense_repayments', newRepayment)
    }

    /**
     * 获取支出还款记录
     */
    async getExpenseRepayments(expenseRecordId) {
        const repayments = await indexedDBService.getAll('expense_repayments')
        const userId = this.getCurrentUserId()
        return repayments.filter(r =>
            r.userId === userId &&
            r.expenseRecordId === expenseRecordId
        ).sort((a, b) => new Date(b.repaymentDate) - new Date(a.repaymentDate))
    }

    // ==================== 客户统计方法 ====================

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
        console.log('getAllCustomersWithStats 被调用')
        const customers = await this.getAllCustomers()
        console.log('从数据库获取到的客户:', customers)

        const allIncomeRecords = await this.getAllIncomeRecords()
        console.log('收入记录数量:', allIncomeRecords.length)

        const transactionsByCustomer = this.groupTransactionsByCustomer(allIncomeRecords)
        console.log('按客户分组的交易:', transactionsByCustomer)

        // 获取每个客户的还款统计
        const customersWithStats = []
        for (const customer of customers) {
            const customerTransactions = transactionsByCustomer[customer.id] || []
            const stats = this.calculateCustomerStats(customerTransactions)

            // 获取还款统计
            const repaymentHistory = await this.getCustomerRepaymentHistory(customer.id)

            customersWithStats.push({
                ...customer,
                stats,
                repaymentStats: {
                    totalRepaid: repaymentHistory.totalRepaid,
                    repaymentCount: repaymentHistory.repaymentCount,
                    lastRepaymentDate: repaymentHistory.lastRepaymentDate
                }
            })
        }

        console.log('最终返回的客户数据:', customersWithStats)
        return customersWithStats
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

        // 获取还款记录
        const repaymentHistory = await this.getCustomerRepaymentHistory(customerId)

        return {
            ...customer,
            transactions,
            repaymentHistory: repaymentHistory.repayments
        }
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
                price: r.price,
                isPaid: r.isPaid
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取客户赊账统计
     */
    async getCustomerCreditStats() {
        const customers = await this.getAllCustomers()
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

    /**
     * 获取所有支出还款记录
     */
    async getAllExpenseRepayments() {
        const repayments = await indexedDBService.getAll('expense_repayments')
        const userId = this.getCurrentUserId()
        return repayments.filter(r => r.userId === userId)
    }

    /**
     * 获取所有收入收款记录
     */
    async getAllIncomeCollections() {
        const collections = await indexedDBService.getAll('income_collections')
        const userId = this.getCurrentUserId()
        return collections.filter(c => c.userId === userId)
    }

    /**
     * 获取所有客户还款记录
     */
    async getAllCustomerRepayments() {
        const repayments = await indexedDBService.getAll('customer_repayments')
        const userId = this.getCurrentUserId()
        return repayments.filter(r => r.userId === userId)
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
            'purchase_history',
            'customers',
            'customer_repayments',
            'expense_repayments',
            'income_collections'
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
     * 获取所有业务记录（日常+收入+支出）
     * 用于统计分析等需要全局数据的场景
     */
    async getAllBusinessRecords() {
        try {
            const [dailyRecords, incomeRecords, expenseRecords] = await Promise.all([
                this.getDailyRecordsWithDecrypt(),
                this.getAllIncomeRecords(),
                this.getAllExpenseRecords()
            ])

            const allRecords = [
                ...dailyRecords.map(r => ({ ...r, _sourceTable: 'daily_records' })),
                ...incomeRecords.map(r => ({ ...r, _sourceTable: 'income_records' })),
                ...expenseRecords.map(r => ({ ...r, _sourceTable: 'expense_records' }))
            ]

            console.log('获取所有业务记录:', {
                daily: dailyRecords.length,
                income: incomeRecords.length,
                expense: expenseRecords.length,
                total: allRecords.length
            })

            return allRecords
        } catch (error) {
            console.error('获取所有业务记录失败:', error)
            return []
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
            'purchase_history',
            'customers',
            'customer_repayments'
        ]

        for (const store of stores) {
            await indexedDBService.clear(store)
        }
    }
}

export default new BusinessCacheService()