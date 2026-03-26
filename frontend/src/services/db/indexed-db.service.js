// services/db/indexed-db.service.js

/**
 * IndexedDB 服务
 * 提供数据库初始化和基本 CRUD 操作
 */
class IndexedDBService {
    constructor() {
        this.dbName = 'FinanceDB'
        this.version = 8
        this.db = null
        this.initPromise = null
        this.isInitializing = false
        this.ready = false  // 添加就绪标志
    }

    /**
     * 初始化数据库
     */
    async init() {
        // 如果已经初始化完成且有数据库连接，直接返回
        if (this.ready && this.db && this.db.name === this.dbName) {
            console.log('数据库已初始化，直接返回')
            return this.db
        }

        // 如果正在初始化中，等待初始化完成
        if (this.initPromise) {
            console.log('数据库正在初始化中，等待完成...')
            return this.initPromise
        }

        console.log(`开始初始化数据库 ${this.dbName}，版本 ${this.version}`)

        this.isInitializing = true

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version)

            request.onerror = (event) => {
                console.error('数据库打开失败:', event.target.error)
                this.initPromise = null
                this.db = null
                this.ready = false
                this.isInitializing = false
                reject(event.target.error)
            }

            request.onsuccess = (event) => {
                this.db = event.target.result
                this.ready = true  // 标记就绪
                this.isInitializing = false
                console.log('数据库连接成功，当前版本:', this.db.version)
                console.log('数据库中的表:', Array.from(this.db.objectStoreNames))

                // 添加连接关闭事件监听
                this.db.onclose = () => {
                    console.warn('数据库连接被关闭')
                    this.db = null
                    this.ready = false
                    this.initPromise = null
                }

                // 添加连接错误事件监听
                this.db.onerror = (event) => {
                    console.error('数据库连接错误:', event.target.error)
                    this.db = null
                    this.ready = false
                    this.initPromise = null
                }

                this.initPromise = null
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                const oldVersion = event.oldVersion
                const newVersion = event.newVersion

                console.log(`数据库升级: ${oldVersion} -> ${newVersion}`)

                // ==================== 创建所有必要的表 ====================

                // 1. 创建产品表
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' })
                    productStore.createIndex('category', 'category', { unique: false })
                    productStore.createIndex('name', 'name', { unique: false })
                    productStore.createIndex('createTime', 'createTime', { unique: false })
                    productStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 products 表')
                }

                // 2. 创建产品分类表
                if (!db.objectStoreNames.contains('product_categories')) {
                    const categoryStore = db.createObjectStore('product_categories', { keyPath: 'id' })
                    categoryStore.createIndex('name', 'name', { unique: true })
                    categoryStore.createIndex('sortOrder', 'sortOrder', { unique: false })
                    categoryStore.createIndex('isDefault', 'isDefault', { unique: false })
                    categoryStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 product_categories 表')
                }

                // 3. 创建日常记账表
                if (!db.objectStoreNames.contains('daily_records')) {
                    const dailyStore = db.createObjectStore('daily_records', { keyPath: 'id' })
                    dailyStore.createIndex('date', 'date', { unique: false })
                    dailyStore.createIndex('syncStatus', 'syncStatus', { unique: false })
                    dailyStore.createIndex('userId', 'userId', { unique: false })
                    dailyStore.createIndex('businessType', 'businessType', { unique: false })
                    console.log('创建 daily_records 表')
                }

                // 4. 创建支出记录表
                if (!db.objectStoreNames.contains('expense_records')) {
                    const expenseStore = db.createObjectStore('expense_records', { keyPath: 'id' })
                    expenseStore.createIndex('date', 'date', { unique: false })
                    expenseStore.createIndex('category', 'category', { unique: false })
                    expenseStore.createIndex('businessType', 'businessType', { unique: false })
                    expenseStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 expense_records 表')
                }

                // 5. 创建收入记录表
                if (!db.objectStoreNames.contains('income_records')) {
                    const incomeStore = db.createObjectStore('income_records', { keyPath: 'id' })
                    incomeStore.createIndex('date', 'date', { unique: false })
                    incomeStore.createIndex('category', 'category', { unique: false })
                    incomeStore.createIndex('businessType', 'businessType', { unique: false })
                    incomeStore.createIndex('paymentMethod', 'paymentMethod', { unique: false })
                    incomeStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 income_records 表')
                }

                // 6. 创建个人存钱计划表
                if (!db.objectStoreNames.contains('personal_savings')) {
                    const savingsStore = db.createObjectStore('personal_savings', { keyPath: 'id' })
                    savingsStore.createIndex('userId', 'userId', { unique: false })
                    savingsStore.createIndex('status', 'status', { unique: false })
                    savingsStore.createIndex('deadline', 'deadline', { unique: false })
                    savingsStore.createIndex('createdAt', 'createdAt', { unique: false })
                    savingsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
                    savingsStore.createIndex('type', 'type', { unique: false })
                    savingsStore.createIndex('completed', 'completed', { unique: false })
                    savingsStore.createIndex('deleted', 'deleted', { unique: false })
                    console.log('创建 personal_savings 表')
                }

                // 7. 创建图表缓存表
                if (!db.objectStoreNames.contains('chart_data_cache')) {
                    const chartStore = db.createObjectStore('chart_data_cache', { keyPath: 'id' })
                    chartStore.createIndex('type', 'type', { unique: false })
                    chartStore.createIndex('expireTime', 'expireTime', { unique: false })
                    chartStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 chart_data_cache 表')
                }

                // 8. 创建同步状态表
                if (!db.objectStoreNames.contains('sync_status')) {
                    const syncStore = db.createObjectStore('sync_status', { keyPath: 'id' })
                    syncStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 sync_status 表')
                }

                // 9. 创建库存表
                if (!db.objectStoreNames.contains('inventory')) {
                    const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' })
                    inventoryStore.createIndex('productId', 'productId', { unique: false })
                    inventoryStore.createIndex('productName', 'productName', { unique: false })
                    inventoryStore.createIndex('category', 'category', { unique: false })
                    inventoryStore.createIndex('status', 'status', { unique: false })
                    inventoryStore.createIndex('expiryDate', 'expiryDate', { unique: false })
                    inventoryStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 inventory 表')
                }

                // 10. 创建供应商表
                if (!db.objectStoreNames.contains('suppliers')) {
                    const supplierStore = db.createObjectStore('suppliers', { keyPath: 'id' })
                    supplierStore.createIndex('name', 'name', { unique: false })
                    supplierStore.createIndex('category', 'category', { unique: false })
                    supplierStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 suppliers 表')
                }

                // 11. 创建采购订单表
                if (!db.objectStoreNames.contains('purchase_orders')) {
                    const orderStore = db.createObjectStore('purchase_orders', { keyPath: 'id' })
                    orderStore.createIndex('orderNo', 'orderNo', { unique: true })
                    orderStore.createIndex('supplierId', 'supplierId', { unique: false })
                    orderStore.createIndex('status', 'status', { unique: false })
                    orderStore.createIndex('orderDate', 'orderDate', { unique: false })
                    orderStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 purchase_orders 表')
                }

                // 12. 创建采购历史表
                if (!db.objectStoreNames.contains('purchase_history')) {
                    const historyStore = db.createObjectStore('purchase_history', { keyPath: 'id' })
                    historyStore.createIndex('supplierId', 'supplierId', { unique: false })
                    historyStore.createIndex('productId', 'productId', { unique: false })
                    historyStore.createIndex('purchaseDate', 'purchaseDate', { unique: false })
                    historyStore.createIndex('userId', 'userId', { unique: false })
                    console.log('创建 purchase_history 表')
                }

                // 13. 创建好友缓存表
                if (!db.objectStoreNames.contains('friends_cache')) {
                    const friendStore = db.createObjectStore('friends_cache', { keyPath: 'id' })
                    friendStore.createIndex('userId', 'userId', { unique: false })
                    friendStore.createIndex('friendId', 'friendId', { unique: false })
                    friendStore.createIndex('updateTime', 'updateTime', { unique: false })
                    console.log('创建 friends_cache 表')
                }

                // 14. 创建多人存钱计划缓存表
                if (!db.objectStoreNames.contains('group_savings_cache')) {
                    const groupCacheStore = db.createObjectStore('group_savings_cache', { keyPath: 'id' })
                    groupCacheStore.createIndex('userId', 'userId', { unique: false })
                    groupCacheStore.createIndex('createdBy', 'createdBy', { unique: false })
                    groupCacheStore.createIndex('planName', 'planName', { unique: false })
                    groupCacheStore.createIndex('reason', 'reason', { unique: false })
                    groupCacheStore.createIndex('type', 'type', { unique: false })
                    groupCacheStore.createIndex('color', 'color', { unique: false })
                    groupCacheStore.createIndex('icon', 'icon', { unique: false })
                    groupCacheStore.createIndex('creatorId', 'creatorId', { unique: false })
                    groupCacheStore.createIndex('deadline', 'deadline', { unique: false })
                    groupCacheStore.createIndex('creatAt', 'creatAt', { unique: false })
                    groupCacheStore.createIndex('status', 'status', { unique: false })
                    groupCacheStore.createIndex('updateAt', 'updateAt', { unique: false })
                    groupCacheStore.createIndex('cacheAt', 'cacheAt', { unique: false })
                    groupCacheStore.createIndex('targetAmount', 'targetAmount', { unique: false })
                    groupCacheStore.createIndex('currentAmount', 'currentAmount', { unique: false })
                    console.log('创建 group_savings_cache 表')
                }

                // 15. 创建成员缓存表
                if (!db.objectStoreNames.contains('savings_members_cache')) {
                    const memberCacheStore = db.createObjectStore('savings_members_cache', { keyPath: 'id' })
                    memberCacheStore.createIndex('groupSavingId', 'groupSavingId', { unique: false })
                    memberCacheStore.createIndex('userId', 'userId', { unique: false })
                    memberCacheStore.createIndex('memberId', 'memberId', { unique: false })
                    memberCacheStore.createIndex('memberName', 'memberName', { unique: false })
                    memberCacheStore.createIndex('isCreator', 'isCreator', { unique: false })
                    memberCacheStore.createIndex('avatar', 'avatar', { unique: false })
                    memberCacheStore.createIndex('amount', 'amount', { unique: false })
                    memberCacheStore.createIndex('status', 'status', { unique: false })
                    memberCacheStore.createIndex('updateTime', 'updateTime', { unique: false })
                    memberCacheStore.createIndex('cacheTime', 'cacheTime', { unique: false })
                    console.log('创建 savings_members_cache 表')
                }

                // 16. 创建存钱记录缓存表
                if (!db.objectStoreNames.contains('saving_deposit_records_cache')) {
                    const recordCacheStore = db.createObjectStore('saving_deposit_records_cache', { keyPath: 'id' })
                    recordCacheStore.createIndex('groupSavingId', 'groupSavingId', { unique: false })
                    recordCacheStore.createIndex('memberId', 'memberId', { unique: false })
                    recordCacheStore.createIndex('userId', 'userId', { unique: false })
                    recordCacheStore.createIndex('amount', 'amount', { unique: false })
                    recordCacheStore.createIndex('depositTime', 'depositTime', { unique: false })
                    recordCacheStore.createIndex('cacheTime', 'cacheTime', { unique: false })
                    console.log('创建 saving_deposit_records_cache 表')
                }

                // 17. 创建离线操作队列表
                if (!db.objectStoreNames.contains('offline_queue')) {
                    const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' })
                    queueStore.createIndex('planId', 'planId', { unique: false })
                    queueStore.createIndex('status', 'status', { unique: false })
                    queueStore.createIndex('timestamp', 'timestamp', { unique: false })
                    console.log('创建 offline_queue 表')
                }

                // 18. 创建客户表
                if (!db.objectStoreNames.contains('customers')) {
                    const customerStore = db.createObjectStore('customers', { keyPath: 'id' })
                    customerStore.createIndex('name', 'name', { unique: false })
                    customerStore.createIndex('phone', 'phone', { unique: false })
                    customerStore.createIndex('type', 'type', { unique: false })
                    customerStore.createIndex('userId', 'userId', { unique: false })
                    customerStore.createIndex('createTime', 'createTime', { unique: false })
                    customerStore.createIndex('updateTime', 'updateTime', { unique: false })
                    customerStore.createIndex('hasCredit', 'hasCredit', { unique: false })
                    console.log('创建 customers 表')
                }

                // 19. 创建客户还款记录表
                if (!db.objectStoreNames.contains('customer_repayments')) {
                    const repaymentStore = db.createObjectStore('customer_repayments', { keyPath: 'id' })
                    repaymentStore.createIndex('customerId', 'customerId', { unique: false })
                    repaymentStore.createIndex('userId', 'userId', { unique: false })
                    repaymentStore.createIndex('date', 'date', { unique: false })
                    repaymentStore.createIndex('repaymentDate', 'repaymentDate', { unique: false })
                    repaymentStore.createIndex('createTime', 'createTime', { unique: false })
                    console.log('创建 customer_repayments 表')
                }

                // 20. 创建支出还款记录表
                if (!db.objectStoreNames.contains('expense_repayments')) {
                    const expenseRepaymentStore = db.createObjectStore('expense_repayments', { keyPath: 'id' })
                    expenseRepaymentStore.createIndex('expenseRecordId', 'expenseRecordId', { unique: false })
                    expenseRepaymentStore.createIndex('userId', 'userId', { unique: false })
                    expenseRepaymentStore.createIndex('repaymentDate', 'repaymentDate', { unique: false })
                    console.log('创建 expense_repayments 表')
                }

                if (!db.objectStoreNames.contains('income_collections')) {
                    const incomeCollectionStore = db.createObjectStore('income_collections', { keyPath: 'id' })
                    incomeCollectionStore.createIndex('incomeRecordId', 'incomeRecordId', { unique: false })
                    incomeCollectionStore.createIndex('userId', 'userId', { unique: false })
                    incomeCollectionStore.createIndex('collectionDate', 'collectionDate', { unique: false })
                    console.log('创建 income_collections 表')
                }

                console.log('升级完成，当前所有表:', Array.from(db.objectStoreNames))
            }
        })

        return this.initPromise
    }

    /**
     * 确保数据库已初始化（带重试机制）
     * @param {number} retries - 重试次数
     * @param {number} delay - 重试延迟（毫秒）
     * @returns {Promise<IDBDatabase>} 数据库实例
     */
    async ensureReady(retries = 5, delay = 500) {
        // 如果已经就绪，直接返回，不打印日志
        if (this.ready && this.db) {
            // 移除这行日志，或者改为 debug 级别
            // console.log('数据库已就绪')
            return this.db
        }

        // 只在第一次初始化时打印日志
        if (!this._initializingLogged) {
            console.log(`数据库未就绪，开始初始化，最多重试 ${retries} 次...`)
            this._initializingLogged = true
        }

        // 尝试初始化
        for (let i = 0; i < retries; i++) {
            try {
                // 如果还没有初始化，调用 init
                if (!this.db) {
                    await this.init()
                }

                // 检查是否就绪
                if (this.ready && this.db) {
                    if (i > 0) {
                        console.log(`数据库就绪成功 (尝试 ${i + 1}/${retries})`)
                    }
                    this._initializingLogged = false
                    return this.db
                }

                // 等待一小段时间，让数据库完全就绪
                await new Promise(resolve => setTimeout(resolve, delay))

                // 只在重试时打印
                if (i === 0) {
                    console.log(`等待数据库就绪...`)
                }
            } catch (error) {
                console.warn(`数据库初始化尝试 ${i + 1} 失败:`, error.message)
                if (i === retries - 1) {
                    this._initializingLogged = false
                    throw error
                }
            }
        }

        this._initializingLogged = false
        throw new Error(`数据库初始化失败，已重试 ${retries} 次`)
    }

    /**
     * 确保数据库已初始化（简写，兼容旧代码）
     * @deprecated 使用 ensureReady 替代
     */
    async ensureInitialized() {
        return this.ensureReady()
    }

    /**
     * 获取数据库连接（确保就绪）
     */
    async getDB() {
        await this.ensureReady()
        if (!this.db) {
            console.error('数据库连接为 null')
            throw new Error('数据库未初始化')
        }
        return this.db
    }

    /**
     * 获取数据库实例（不等待初始化）
     */
    getDBInstance() {
        return this.db
    }

    /**
     * 检查数据库是否就绪
     */
    isReady() {
        return this.ready && this.db !== null
    }

    /**
     * 添加数据
     */
    async add(storeName, data) {
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                // 检查表是否存在
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在，返回 false`)
                    resolve(false)
                    return
                }

                const transaction = this.db.transaction([storeName], 'readwrite')
                const store = transaction.objectStore(storeName)
                const request = store.add(data)

                request.onsuccess = () => {
                    console.log(`数据添加到 ${storeName} 成功:`, data.id)
                    resolve(request.result)
                }

                request.onerror = (event) => {
                    console.error(`添加数据到 ${storeName} 失败:`, event.target.error)
                    reject(event.target.error)
                }

                transaction.oncomplete = () => {
                    console.log(`事务完成: ${storeName}`)
                }

                transaction.onerror = (event) => {
                    console.error(`事务错误: ${storeName}`, event.target.error)
                    reject(event.target.error)
                }
            } catch (error) {
                console.error(`添加数据异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 批量添加数据
     */
    async bulkAdd(storeName, dataArray) {
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                if (!dataArray || dataArray.length === 0) {
                    resolve()
                    return
                }

                // 检查表是否存在
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在`)
                    reject(new Error(`表 ${storeName} 不存在`))
                    return
                }

                console.log(`开始批量添加数据到 ${storeName}，共 ${dataArray.length} 条`)

                const transaction = this.db.transaction([storeName], 'readwrite')
                const store = transaction.objectStore(storeName)
                let completed = 0
                let hasError = false

                dataArray.forEach(data => {
                    const request = store.add(data)

                    request.onsuccess = () => {
                        completed++
                        if (completed === dataArray.length && !hasError) {
                            console.log(`批量添加数据到 ${storeName} 成功，共 ${completed} 条`)
                            resolve()
                        }
                    }

                    request.onerror = (event) => {
                        if (!hasError) {
                            hasError = true
                            console.error(`批量添加数据到 ${storeName} 失败:`, event.target.error)
                            reject(event.target.error)
                        }
                    }
                })

                transaction.oncomplete = () => {
                    console.log(`批量添加事务完成: ${storeName}`)
                }

                transaction.onerror = (event) => {
                    if (!hasError) {
                        hasError = true
                        console.error(`批量添加事务错误: ${storeName}`, event.target.error)
                        reject(event.target.error)
                    }
                }
            } catch (error) {
                console.error(`批量添加数据异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 获取所有数据
     */
    async getAll(storeName) {
        console.log(`开始获取 ${storeName} 表数据`)
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在，返回空数组`)
                    resolve([])
                    return
                }

                const transaction = this.db.transaction([storeName], 'readonly')
                const store = transaction.objectStore(storeName)
                const request = store.getAll()

                request.onsuccess = () => {
                    console.log(`获取 ${storeName} 数据成功，共 ${request.result?.length || 0} 条`)
                    resolve(request.result || [])
                }

                request.onerror = (event) => {
                    console.error(`获取 ${storeName} 数据失败:`, event.target.error)
                    reject(event.target.error)
                }
            } catch (error) {
                console.error(`获取数据异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 根据ID获取数据
     */
    async get(storeName, id) {
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在`)
                    resolve(null)
                    return
                }

                const transaction = this.db.transaction([storeName], 'readonly')
                const store = transaction.objectStore(storeName)
                const request = store.get(id)

                request.onsuccess = () => {
                    resolve(request.result || null)
                }

                request.onerror = (event) => {
                    console.error(`从 ${storeName} 获取数据失败:`, event.target.error)
                    reject(event.target.error)
                }
            } catch (error) {
                console.error(`获取数据异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 更新数据
     */
    async update(storeName, data) {
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在`)
                    reject(new Error(`表 ${storeName} 不存在`))
                    return
                }

                const cleanedData = this._cleanObjectForStorage(data)
                const transaction = this.db.transaction([storeName], 'readwrite')
                const store = transaction.objectStore(storeName)
                const request = store.put(data)

                request.onsuccess = () => {
                    console.log(`更新 ${storeName} 数据成功:`, data.id)
                    resolve(request.result)
                }

                request.onerror = (event) => {
                    console.error(`更新 ${storeName} 数据失败:`, event.target.error)
                    reject(event.target.error)
                }
            } catch (error) {
                console.error(`更新数据异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 删除数据
     */
    async delete(storeName, id) {
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在`)
                    resolve(false)
                    return
                }

                const transaction = this.db.transaction([storeName], 'readwrite')
                const store = transaction.objectStore(storeName)
                const request = store.delete(id)

                request.onsuccess = () => {
                    console.log(`从 ${storeName} 删除数据成功:`, id)
                    resolve(true)
                }

                request.onerror = (event) => {
                    console.error(`从 ${storeName} 删除数据失败:`, event.target.error)
                    reject(event.target.error)
                }
            } catch (error) {
                console.error(`删除数据异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 清空表
     */
    async clear(storeName) {
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在`)
                    resolve()
                    return
                }

                const transaction = this.db.transaction([storeName], 'readwrite')
                const store = transaction.objectStore(storeName)
                const request = store.clear()

                request.onsuccess = () => {
                    console.log(`清空 ${storeName} 成功`)
                    resolve()
                }

                request.onerror = (event) => {
                    console.error(`清空 ${storeName} 失败:`, event.target.error)
                    reject(event.target.error)
                }
            } catch (error) {
                console.error(`清空数据异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 根据索引查询
     */
    async query(storeName, indexName, value) {
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在`)
                    resolve([])
                    return
                }

                const transaction = this.db.transaction([storeName], 'readonly')
                const store = transaction.objectStore(storeName)

                if (!store.indexNames.contains(indexName)) {
                    console.warn(`❌ 索引 ${indexName} 在表 ${storeName} 中不存在`)
                    console.log('可用的索引:', Array.from(store.indexNames))
                    resolve([])
                    return
                }

                console.log(`✅ 使用索引 ${indexName} 查询值:`, value)
                const index = store.index(indexName)
                const request = index.getAll(value)

                request.onsuccess = () => {
                    console.log(`索引查询成功，返回 ${request.result?.length || 0} 条记录`)
                    resolve(request.result || [])
                }

                request.onerror = (event) => {
                    console.error(`索引查询失败:`, event.target.error)
                    reject(event.target.error)
                }
            } catch (error) {
                console.error(`查询数据异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 范围查询
     */
    async rangeQuery(storeName, indexName, start, end) {
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在`)
                    resolve([])
                    return
                }

                const transaction = this.db.transaction([storeName], 'readonly')
                const store = transaction.objectStore(storeName)

                if (!store.indexNames.contains(indexName)) {
                    console.warn(`索引 ${indexName} 在表 ${storeName} 中不存在`)
                    resolve([])
                    return
                }

                const index = store.index(indexName)

                let range
                if (start !== undefined && end !== undefined) {
                    range = IDBKeyRange.bound(start, end)
                } else if (start !== undefined) {
                    range = IDBKeyRange.lowerBound(start)
                } else if (end !== undefined) {
                    range = IDBKeyRange.upperBound(end)
                }

                const request = index.getAll(range)

                request.onsuccess = () => {
                    resolve(request.result || [])
                }

                request.onerror = (event) => {
                    console.error(`范围查询 ${storeName} 失败:`, event.target.error)
                    reject(event.target.error)
                }
            } catch (error) {
                console.error(`范围查询异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 检查表是否存在
     */
    async hasStore(storeName) {
        await this.ensureReady()
        return this.db.objectStoreNames.contains(storeName)
    }

    /**
     * 获取所有表名
     */
    async getStoreNames() {
        await this.ensureReady()
        return Array.from(this.db.objectStoreNames)
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close()
            this.db = null
            this.ready = false
            this.initPromise = null
            console.log('数据库连接已关闭')
        }
    }

    /**
     * 删除整个数据库（慎用）
     */
    async deleteDatabase() {
        this.close()
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName)

            request.onsuccess = () => {
                console.log(`数据库 ${this.dbName} 删除成功`)
                resolve()
            }

            request.onerror = (event) => {
                console.error(`删除数据库失败:`, event.target.error)
                reject(event.target.error)
            }

            request.onblocked = () => {
                console.warn(`数据库删除被阻塞`)
                // 可以尝试关闭所有连接后重试
            }
        })
    }

    /**
     * 批量更新或添加数据（如果存在则更新，不存在则添加）
     */
    async bulkPut(storeName, dataArray) {
        await this.ensureReady()
        return new Promise((resolve, reject) => {
            try {
                if (!dataArray || dataArray.length === 0) {
                    resolve()
                    return
                }

                if (!this.db.objectStoreNames.contains(storeName)) {
                    console.warn(`表 ${storeName} 不存在`)
                    reject(new Error(`表 ${storeName} 不存在`))
                    return
                }

                console.log(`开始批量更新数据到 ${storeName}，共 ${dataArray.length} 条`)

                const transaction = this.db.transaction([storeName], 'readwrite')
                const store = transaction.objectStore(storeName)
                let completed = 0
                let hasError = false

                dataArray.forEach(data => {
                    const request = store.put(data)

                    request.onsuccess = () => {
                        completed++
                        if (completed === dataArray.length && !hasError) {
                            console.log(`批量更新数据到 ${storeName} 成功，共 ${completed} 条`)
                            resolve()
                        }
                    }

                    request.onerror = (event) => {
                        if (!hasError) {
                            hasError = true
                            console.error(`批量更新数据到 ${storeName} 失败:`, event.target.error)
                            reject(event.target.error)
                        }
                    }
                })

                transaction.oncomplete = () => {
                    console.log(`批量更新事务完成: ${storeName}`)
                }

                transaction.onerror = (event) => {
                    if (!hasError) {
                        hasError = true
                        console.error(`批量更新事务错误: ${storeName}`, event.target.error)
                        reject(event.target.error)
                    }
                }
            } catch (error) {
                console.error(`批量更新数据异常:`, error)
                reject(error)
            }
        })
    }

    /**
     * 重新连接数据库（当连接失效时使用）
     */
    async reconnect() {
        console.log('尝试重新连接数据库...')
        this.close()
        this.initPromise = null
        this.ready = false
        return await this.init()
    }

    /**
     * 清理对象，移除无法克隆的数据
     */
    _cleanObjectForStorage(obj) {
        if (obj === null || obj === undefined) return obj

        // 如果是数组，递归清理
        if (Array.isArray(obj)) {
            return obj.map(item => this._cleanObjectForStorage(item))
        }

        // 如果是对象，清理每个属性
        if (typeof obj === 'object') {
            // 跳过 Vue 响应式对象
            if (obj.__ob__) {
                const cleaned = {}
                for (const key in obj) {
                    if (key !== '__ob__' && obj.hasOwnProperty(key)) {
                        const value = obj[key]
                        if (value === undefined) continue
                        if (typeof value === 'function') continue
                        if (typeof value === 'symbol') continue
                        cleaned[key] = this._cleanObjectForStorage(value)
                    }
                }
                return cleaned
            }

            const cleaned = {}
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key]
                    if (value === undefined) continue
                    if (typeof value === 'function') continue
                    if (typeof value === 'symbol') continue
                    cleaned[key] = this._cleanObjectForStorage(value)
                }
            }
            return cleaned
        }

        return obj
    }
}

export default new IndexedDBService()