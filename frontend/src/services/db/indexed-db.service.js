// services/db/indexed-db.service.js

/**
 * IndexedDB 服务
 * 提供数据库初始化和基本 CRUD 操作
 */
class IndexedDBService {
    constructor() {
        this.dbName = 'FinanceDB'
        this.version = 7  // 升级到版本6，添加离线操作队列表
        this.db = null
        this.initPromise = null
    }

    /**
     * 初始化数据库
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise
        }

        this.initPromise = new Promise((resolve, reject) => {
            console.log(`正在打开数据库 ${this.dbName}，版本 ${this.version}`)
            const request = indexedDB.open(this.dbName, this.version)

            request.onerror = (event) => {
                console.error('数据库打开失败:', event.target.error)
                reject(event.target.error)
            }

            request.onsuccess = (event) => {
                this.db = event.target.result
                console.log('数据库连接成功，当前版本:', this.db.version)
                console.log('数据库中的表:', Array.from(this.db.objectStoreNames))
                resolve()
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
                    savingsStore.createIndex('status', 'status', { unique: false })
                    savingsStore.createIndex('targetDate', 'targetDate', { unique: false })
                    savingsStore.createIndex('userId', 'userId', { unique: false })
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

                // ==================== 新增的多人存钱计划缓存表（版本6） ====================

                // 14. 创建多人存钱计划缓存表
                if (!db.objectStoreNames.contains('group_savings_cache')) {
                    const groupCacheStore = db.createObjectStore('group_savings_cache', { keyPath: 'id' })

                    // 用户隔离索引
                    groupCacheStore.createIndex('userId', 'userId', { unique: false })
                    groupCacheStore.createIndex('createdBy', 'createdBy', { unique: false })

                    groupCacheStore.createIndex('planName', 'planName', { unique: false })
                    groupCacheStore.createIndex('reason', 'reason', {unique: false})
                    groupCacheStore.createIndex('type', 'type', {unique: false})
                    groupCacheStore.createIndex('color', 'color', {unique: false})
                    groupCacheStore.createIndex('icon', 'icon', {unique: false})
                    groupCacheStore.createIndex('creatorId', 'creatorId', {unique: false})
                    groupCacheStore.createIndex('deadline', 'deadline', {unique: false})
                    groupCacheStore.createIndex('creatAt', 'creatAt', {unique: false})

                    // 状态索引
                    groupCacheStore.createIndex('status', 'status', { unique: false })

                    // 时间索引
                    groupCacheStore.createIndex('updateAt', 'updateAt', { unique: false })
                    groupCacheStore.createIndex('cacheAt', 'cacheAt', { unique: false })

                    // 金额相关索引
                    groupCacheStore.createIndex('targetAmount', 'targetAmount', { unique: false }) // 目标金额索引
                    groupCacheStore.createIndex('currentAmount', 'currentAmount', { unique: false }) // 当前金额索引

                    console.log('创建 group_savings_cache 表')
                }

                // 15. 创建成员缓存表
                if (!db.objectStoreNames.contains('savings_members_cache')) {
                    const memberCacheStore = db.createObjectStore('savings_members_cache', { keyPath: 'id' })

                    // 关联索引
                    memberCacheStore.createIndex('groupSavingId', 'groupSavingId', { unique: false })
                    memberCacheStore.createIndex('userId', 'userId', { unique: false })
                    memberCacheStore.createIndex('memberId', 'memberId', { unique: false }) //成员id

                    // 成员属性索引
                    memberCacheStore.createIndex('memberName', 'memberName', {unique: false})
                    memberCacheStore.createIndex('isCreator', 'isCreator', { unique: false })
                    memberCacheStore.createIndex('avatar', 'avatar', {unique: false})
                    memberCacheStore.createIndex('amount', 'amount', {unique: false})
                    memberCacheStore.createIndex('status', 'status', { unique: false }) // 成员状态（活跃/退出等）

                    // 时间索引
                    memberCacheStore.createIndex('updateTime', 'updateTime', { unique: false })
                    memberCacheStore.createIndex('cacheTime', 'cacheTime', { unique: false })

                    console.log('创建 savings_members_cache 表')
                }

                // 16. 创建存钱记录缓存表
                if (!db.objectStoreNames.contains('saving_deposit_records_cache')) {
                    const recordCacheStore = db.createObjectStore('saving_deposit_records_cache', { keyPath: 'id' })

                    // 关联索引
                    recordCacheStore.createIndex('groupSavingId', 'groupSavingId', { unique: false })
                    recordCacheStore.createIndex('memberId', 'memberId', { unique: false })
                    recordCacheStore.createIndex('userId', 'userId', { unique: false }) // 用户隔离

                    // 金额索引
                    recordCacheStore.createIndex('amount', 'amount', { unique: false }) // 每次存储金额

                    // 时间索引
                    recordCacheStore.createIndex('depositTime', 'depositTime', { unique: false })
                    recordCacheStore.createIndex('cacheTime', 'cacheTime', { unique: false })

                    console.log('创建 saving_deposit_records_cache 表')
                }

                if (!db.objectStoreNames.contains('offline_queue')) {
                    const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' })
                    queueStore.createIndex('planId', 'planId', { unique: false })
                    queueStore.createIndex('status', 'status', { unique: false })
                    queueStore.createIndex('timestamp', 'timestamp', { unique: false })
                    console.log('创建 offline_queue 表')
                }

                // 数据迁移逻辑
                if (oldVersion < 5) {
                    console.log('从旧版本升级到版本5，处理数据迁移...')
                    // 版本5的数据迁移逻辑
                }

                if (oldVersion < 6) {
                    console.log('从旧版本升级到版本6，创建多人存钱计划缓存表...')
                    // 版本6的数据迁移逻辑
                }

                console.log('升级完成，当前所有表:', Array.from(db.objectStoreNames))
            }
        })

        return this.initPromise
    }

    /**
     * 确保数据库已初始化
     */
    async ensureInitialized() {
        if (!this.db) {
            console.log('数据库未初始化，开始初始化...')
            await this.init()
        }
        return this.db
    }

    /**
     * 获取数据库连接
     */
    async getDB() {
        await this.ensureInitialized()
        return this.db
    }

    /**
     * 添加数据
     */
    async add(storeName, data) {
        await this.ensureInitialized()
        return new Promise((resolve, reject) => {
            try {
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
        await this.ensureInitialized()
        return new Promise((resolve, reject) => {
            try {
                if (!dataArray || dataArray.length === 0) {
                    resolve()
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
        await this.ensureInitialized()
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly')
                const store = transaction.objectStore(storeName)
                const request = store.getAll()

                request.onsuccess = () => {
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
        await this.ensureInitialized()
        return new Promise((resolve, reject) => {
            try {
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
        await this.ensureInitialized()
        return new Promise((resolve, reject) => {
            try {
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
        await this.ensureInitialized()
        return new Promise((resolve, reject) => {
            try {
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
        await this.ensureInitialized()
        return new Promise((resolve, reject) => {
            try {
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
        await this.ensureInitialized()
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly')
                const store = transaction.objectStore(storeName)

                if (!store.indexNames.contains(indexName)) {
                    console.warn(`❌ 索引 ${indexName} 在表 ${storeName} 中不存在`)
                    console.log('可用的索引:', Array.from(store.indexNames))
                    resolve([])
                    return
                }

                console.log(`✅ 使用索引 ${indexName} 查询值:`, value);
                const index = store.index(indexName)
                const request = index.getAll(value)

                request.onsuccess = () => {
                    console.log(`索引查询成功，返回 ${request.result?.length || 0} 条记录`);
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
        await this.ensureInitialized()
        return new Promise((resolve, reject) => {
            try {
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
        await this.ensureInitialized()
        return this.db.objectStoreNames.contains(storeName)
    }

    /**
     * 获取所有表名
     */
    async getStoreNames() {
        await this.ensureInitialized()
        return Array.from(this.db.objectStoreNames)
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close()
            this.db = null
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
        await this.ensureInitialized();
        return new Promise((resolve, reject) => {
            try {
                if (!dataArray || dataArray.length === 0) {
                    resolve();
                    return;
                }

                console.log(`开始批量更新数据到 ${storeName}，共 ${dataArray.length} 条`);

                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                let completed = 0;
                let hasError = false;

                dataArray.forEach(data => {
                    const request = store.put(data);

                    request.onsuccess = () => {
                        completed++;
                        if (completed === dataArray.length && !hasError) {
                            console.log(`批量更新数据到 ${storeName} 成功，共 ${completed} 条`);
                            resolve();
                        }
                    };

                    request.onerror = (event) => {
                        if (!hasError) {
                            hasError = true;
                            console.error(`批量更新数据到 ${storeName} 失败:`, event.target.error);
                            reject(event.target.error);
                        }
                    };
                });

                transaction.oncomplete = () => {
                    console.log(`批量更新事务完成: ${storeName}`);
                };

                transaction.onerror = (event) => {
                    if (!hasError) {
                        hasError = true;
                        console.error(`批量更新事务错误: ${storeName}`, event.target.error);
                        reject(event.target.error);
                    }
                };
            } catch (error) {
                console.error(`批量更新数据异常:`, error);
                reject(error);
            }
        });
    }
}

export default new IndexedDBService()