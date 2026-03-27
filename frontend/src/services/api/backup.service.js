// src/services/backup.service.js
import indexedDBService from '@/services/db/indexed-db.service.js'
import businessDataService from '@/services/cache/business-cache.service.js'
import personalSavingCache from '@/services/cache/personal-saving-cache.service.js'
import {
    uploadBackup as apiUploadBackup,
    getBackupList as apiGetBackupList,
    restoreBackup as apiRestoreBackup,
    deleteBackup as apiDeleteBackup,
    getBackupCount as apiGetBackupCount
} from '@/api/backup.js'

/**
 * 云端备份服务
 * 负责备份数据的收集、恢复和云端同步
 */
class BackupService {
    constructor() {
        this.currentUserId = null
    }

    /**
     * 初始化服务
     */
    init(userId) {
        this.currentUserId = userId
        console.log('【BackupService】初始化完成，用户ID:', userId)
    }

    /**
     * 获取当前用户ID
     */
    getCurrentUserId() {
        return this.currentUserId || localStorage.getItem('userId')
    }

    /**
     * 获取各类型数据统计数量
     * @returns {Promise<Object>} 数据统计对象
     */
    async getDataCounts() {
        const userId = this.getCurrentUserId()
        const counts = {
            personal: 0,
            business: 0,
            personal_saving: 0,
            customer: 0,
            product: 0,
            category: 0,
            supplier: 0,
            inventory: 0,
            expense: 0,
            income: 0,
            expense_repayment: 0,
            income_collection: 0,
            customer_repayment: 0,
            purchase_order: 0,
            purchase_history: 0
        }

        try {
            // 个人记账 + 生意记账
            const dailyRecords = await businessDataService.getAllDailyRecords()
            counts.personal = dailyRecords.filter(r => r.businessType === 'personal').length
            counts.business = dailyRecords.filter(r => r.businessType === 'business').length

            // 个人存钱计划
            const personalSavings = await personalSavingCache.getAllPlans(userId)
            counts.personal_saving = personalSavings?.length || 0

            // 客户管理
            const customers = await businessDataService.getAllCustomers()
            counts.customer = customers?.length || 0

            // 商品管理
            const products = await businessDataService.getAllProducts()
            counts.product = products?.length || 0

            // 商品分类
            const categories = await businessDataService.getAllCategories()
            counts.category = categories?.length || 0

            // 供应商
            const suppliers = await businessDataService.getAllSuppliers()
            counts.supplier = suppliers?.length || 0

            // 库存管理
            const inventory = await businessDataService.getAllInventory()
            counts.inventory = inventory?.length || 0

            // 支出记录
            const expenseRecords = await businessDataService.getAllExpenseRecords()
            counts.expense = expenseRecords?.length || 0

            // 收入记录
            const incomeRecords = await businessDataService.getAllIncomeRecords()
            counts.income = incomeRecords?.length || 0

            // 支出还款记录
            const expenseRepayments = await businessDataService.getAllExpenseRepayments?.() || []
            counts.expense_repayment = expenseRepayments?.length || 0

            // 收入收款记录
            const incomeCollections = await businessDataService.getAllIncomeCollections?.() || []
            counts.income_collection = incomeCollections?.length || 0

            // 客户还款记录
            const customerRepayments = await businessDataService.getAllCustomerRepayments?.() || []
            counts.customer_repayment = customerRepayments?.length || 0

            // 采购订单
            const purchaseOrders = await businessDataService.getAllPurchaseOrders?.() || []
            counts.purchase_order = purchaseOrders?.length || 0

            // 采购历史
            const purchaseHistory = await businessDataService.getAllPurchaseHistory?.() || []
            counts.purchase_history = purchaseHistory?.length || 0

            console.log('【BackupService】数据统计加载完成:', counts)
            return counts
        } catch (error) {
            console.error('【BackupService】加载数据统计失败:', error)
            return counts
        }
    }

    /**
     * 收集指定类型的数据
     * @param {Array<string>} dataTypes - 要收集的数据类型列表
     * @returns {Promise<Object>} 收集的数据对象
     */
    async collectBackupData(dataTypes) {
        const backupData = {}
        const userId = this.getCurrentUserId()

        for (const type of dataTypes) {
            switch (type) {
                case 'personal':
                    const personalRecords = await businessDataService.getAllDailyRecords()
                    backupData.personal = personalRecords.filter(r => r.businessType === 'personal')
                    break

                case 'business':
                    const businessRecords = await businessDataService.getAllDailyRecords()
                    backupData.business = businessRecords.filter(r => r.businessType === 'business')
                    break

                case 'personal_saving':
                    const personalSavings = await personalSavingCache.getAllPlans(userId)
                    backupData.personal_savings = personalSavings || []
                    for (const plan of personalSavings) {
                        const records = await personalSavingCache.getDepositRecords(userId, plan.id, { page: 1, size: 9999 })
                        if (records.records && records.records.length > 0) {
                            backupData[`personal_saving_${plan.id}_records`] = records.records
                        }
                    }
                    break

                case 'customer':
                    backupData.customers = await businessDataService.getAllCustomers()
                    break

                case 'product':
                    backupData.products = await businessDataService.getAllProducts()
                    break

                case 'category':
                    backupData.categories = await businessDataService.getAllCategories()
                    break

                case 'supplier':
                    backupData.suppliers = await businessDataService.getAllSuppliers()
                    break

                case 'inventory':
                    const inventory = await businessDataService.getAllInventory()
                    backupData.inventory = inventory || []
                    break

                case 'purchase_order':
                    const purchaseOrders = await businessDataService.getAllPurchaseOrders?.() || []
                    backupData.purchase_orders = purchaseOrders.map(item => ({
                        ...item,
                        totalAmount: item.totalAmount || 0
                    }))
                    backupData.purchase_orders = await businessDataService.getAllPurchaseOrders?.() || []
                    break

                case 'purchase_history':
                    const purchaseHistory = await businessDataService.getAllPurchaseHistory?.() || []
                    backupData.purchase_history = purchaseHistory.map(item => ({
                        ...item,
                        productName: item.productName || item.product_name || ''  // 确保 productName 不为空
                    }))
                    break

                case 'expense':
                    backupData.expense = await businessDataService.getAllExpenseRecords()
                    break

                case 'income':
                    backupData.income = await businessDataService.getAllIncomeRecords()
                    break

                case 'expense_repayment':
                    backupData.expense_repayments = await businessDataService.getAllExpenseRepayments?.() || []
                    break

                case 'income_collection':
                    backupData.income_collections = await businessDataService.getAllIncomeCollections?.() || []
                    break

                case 'customer_repayment':
                    backupData.customer_repayments = await businessDataService.getAllCustomerRepayments?.() || []
                    break
            }
        }

        return backupData
    }

    /**
     * 上传备份到云端
     * @param {Object} params - 上传参数
     * @param {Array<string>} params.dataTypes - 选择的数据类型
     * @param {string} params.note - 备份备注
     * @param {Function} params.onProgress - 进度回调
     * @returns {Promise<Object>} 上传结果
     */
    async uploadBackup({ dataTypes, note, onProgress }) {
        if (!dataTypes || dataTypes.length === 0) {
            throw new Error('请至少选择一种数据类型')
        }

        const userId = this.getCurrentUserId()
        if (!userId) {
            throw new Error('用户未登录')
        }

        try {
            // 通知进度开始
            onProgress && onProgress(0)

            // 模拟进度步骤
            const updateProgress = (progress) => {
                onProgress && onProgress(progress)
            }

            updateProgress(10)

            // 收集数据
            const backupData = await this.collectBackupData(dataTypes)
            updateProgress(50)

            // 计算数据大小
            const dataStr = JSON.stringify(backupData)
            const dataSize = dataStr.length
            updateProgress(70)

            // 准备上传数据
            const uploadData = {
                userId: parseInt(userId),
                backupTime: new Date().toISOString(),
                dataSize: dataSize,
                dataTypes: dataTypes,
                note: note || '',
                data: backupData
            }

            updateProgress(85)

            // 调用API上传
            const response = await apiUploadBackup(uploadData)
            updateProgress(100)

            console.log('【BackupService】上传备份成功:', response)
            return {
                success: true,
                message: `备份成功！已备份 ${dataTypes.length} 种数据类型，共 ${this.formatSize(dataSize)}`,
                data: response
            }
        } catch (error) {
            console.error('【BackupService】上传备份失败:', error)
            throw error
        }
    }

    /**
     * 获取备份列表
     * @param {Object} params - 查询参数
     * @returns {Promise<Array>} 备份列表
     */
    async getBackupList(params = {}) {
        try {
            const userId = this.getCurrentUserId()
            if (!userId) {
                return []
            }

            const response = await apiGetBackupList({ userId: parseInt(userId), ...params })
            console.log('【BackupService】获取备份列表原始响应:', response)

            let backups = []

            // 如果 response 本身就是数组
            if (Array.isArray(response)) {
                backups = response
            }
            // 如果 response 包含 data 字段且是数组
            else if (response && response.data && Array.isArray(response.data)) {
                backups = response.data
            }
            // 如果 response 是对象且包含备份数据
            else if (response && typeof response === 'object') {
                // 尝试获取可能的备份数组
                backups = response.backups || response.list || []
            }

            // 验证数据是否正确
            if (backups.length > 0) {
                console.log('第一条备份原始数据:', JSON.stringify(backups[0]))
                console.log('备份的 id 字段值:', backups[0].id)
                console.log('备份的 userId 字段值:', backups[0].userId)
            }

            // 解析 dataTypes
            backups = backups.map(backup => {
                const processedBackup = { ...backup }
                if (processedBackup.dataTypes && typeof processedBackup.dataTypes === 'string') {
                    try {
                        processedBackup.dataTypes = JSON.parse(processedBackup.dataTypes)
                    } catch (e) {
                        processedBackup.dataTypes = []
                    }
                }
                return processedBackup
            })

            backups.sort((a, b) => new Date(b.backupTime) - new Date(a.backupTime))

            console.log('最终备份列表:', backups.map(b => ({ id: b.id, userId: b.userId })))

            return backups
        } catch (error) {
            console.error('【BackupService】获取备份列表失败:', error)
            return []
        }
    }

    /**
     * 恢复备份
     * @param {Object} backup - 备份记录
     * @param {boolean} clearExisting - 是否清空现有数据（默认 true）
     * @returns {Promise<Object>} 恢复结果
     */
    async restoreBackup(backup, clearExisting = true) {
        // 使用 id 作为备份标识
        if (!backup || (!backup.id && !backup.backupId)) {
            throw new Error('无效的备份记录')
        }

        const backupIdentifier = backup.id || backup.backupId

        try {
            console.log('【BackupService】开始恢复备份:', backupIdentifier)

            // 1. 从后端获取备份数据
            const response = await apiRestoreBackup(backupIdentifier)
            console.log('【BackupService】获取备份数据成功:', response)

            // 2. 获取备份数据中的 data 部分
            const backupData = response.data

            if (!backupData) {
                throw new Error('备份数据为空')
            }

            // 3. 如果需要清空现有数据，先清空
            if (clearExisting) {
                console.log('【BackupService】开始清空现有数据...')
                await this.clearUserData()
                console.log('【BackupService】清空现有数据完成')
            } else {
                console.log('【BackupService】保留现有数据，将进行数据合并')
            }

            // 4. 将备份数据写入 IndexedDB
            await this.writeBackupDataToIndexedDB(backupData)

            console.log('【BackupService】备份数据写入 IndexedDB 成功')

            return {
                success: true,
                message: '数据恢复成功，请刷新页面'
            }
        } catch (error) {
            console.error('【BackupService】恢复备份失败:', error)
            throw error
        }
    }

    /**
     * 清空当前用户的所有数据
     * @returns {Promise<boolean>} 清空结果
     */
    async clearUserData() {
        try {
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
                // 检查表是否存在
                if (await indexedDBService.hasStore(storeName)) {
                    // 如果表存在，获取所有记录并删除当前用户的
                    const records = await indexedDBService.getAll(storeName)
                    const userRecords = records.filter(r => r.userId === userId)

                    for (const record of userRecords) {
                        await indexedDBService.delete(storeName, record.id)
                    }
                    console.log(`清空 ${storeName} 中用户 ${userId} 的数据: ${userRecords.length} 条`)
                }
            }

            return true
        } catch (error) {
            console.error('【BackupService】清空用户数据失败:', error)
            throw error
        }
    }

    /**
     * 将备份数据写入 IndexedDB
     * @param {Object} backupData - 备份数据对象
     */
    async writeBackupDataToIndexedDB(backupData) {
        const userId = this.getCurrentUserId()

        console.log('【BackupService】开始写入备份数据到 IndexedDB...')

        // 1. 写入个人记账数据
        if (backupData.personal && backupData.personal.length > 0) {
            // 为每条记录设置正确的 userId 和业务类型
            const personalRecords = backupData.personal.map(record => ({
                ...record,
                userId: userId,
                businessType: 'personal',
                syncStatus: 'pending'
            }))
            await businessDataService.addDailyRecords(personalRecords)
            console.log(`✅ 恢复个人记账数据: ${personalRecords.length} 条`)
        }

        // 2. 写入生意记账数据
        if (backupData.business && backupData.business.length > 0) {
            const businessRecords = backupData.business.map(record => ({
                ...record,
                userId: userId,
                businessType: 'business',
                syncStatus: 'pending'
            }))
            await businessDataService.addDailyRecords(businessRecords)
            console.log(`✅ 恢复生意记账数据: ${businessRecords.length} 条`)
        }

        // 3. 写入个人存钱计划
        if (backupData.personalSavings && backupData.personalSavings.length > 0) {
            for (const plan of backupData.personalSavings) {
                // 确保计划有正确的 userId
                const planWithUserId = {
                    ...plan,
                    userId: userId,
                    records: []  // 清空记录，后面单独恢复
                }
                await personalSavingCache.createPlan(userId, planWithUserId)
            }
            console.log(`✅ 恢复个人存钱计划: ${backupData.personalSavings.length} 条`)
        }

        // 4. 写入个人存钱记录
        if (backupData.personalSavingRecords && Object.keys(backupData.personalSavingRecords).length > 0) {
            let totalRecords = 0
            for (const [planId, records] of Object.entries(backupData.personalSavingRecords)) {
                if (records && records.length > 0) {
                    for (const record of records) {
                        // 将存钱记录添加到对应的计划中
                        const plan = await personalSavingCache.getPlanById(userId, planId)
                        if (plan) {
                            if (!plan.records) plan.records = []
                            plan.records.push(record)
                            plan.currentAmount = (plan.currentAmount || 0) + record.amount
                            plan.progress = (plan.currentAmount / plan.targetAmount) * 100
                            plan.completed = plan.currentAmount >= plan.targetAmount
                            await personalSavingCache.updatePlan(userId, planId, plan)
                            totalRecords++
                        }
                    }
                }
            }
            console.log(`✅ 恢复个人存钱记录: ${totalRecords} 条`)
        }

        // 5. 写入客户数据
        if (backupData.customers && backupData.customers.length > 0) {
            const customersWithUserId = backupData.customers.map(customer => ({
                ...customer,
                userId: userId
            }))
            await businessDataService.addCustomers(customersWithUserId)
            console.log(`✅ 恢复客户数据: ${customersWithUserId.length} 条`)
        }

        // 6. 写入客户还款记录
        if (backupData.customerRepayments && backupData.customerRepayments.length > 0) {
            for (const repayment of backupData.customerRepayments) {
                const repaymentWithUserId = {
                    ...repayment,
                    userId: userId
                }
                await businessDataService.addCustomerRepayment(repaymentWithUserId)
            }
            console.log(`✅ 恢复客户还款记录: ${backupData.customerRepayments.length} 条`)
        }

        // 7. 写入商品数据
        if (backupData.products && backupData.products.length > 0) {
            const productsWithUserId = backupData.products.map(product => ({
                ...product,
                userId: userId
            }))
            await businessDataService.addProducts(productsWithUserId)
            console.log(`✅ 恢复商品数据: ${productsWithUserId.length} 条`)
        }

        // 8. 写入商品分类
        if (backupData.categories && backupData.categories.length > 0) {
            const categoriesWithUserId = backupData.categories.map(category => ({
                ...category,
                userId: userId,
                isDefault: category.isDefault || false
            }))
            await businessDataService.addCategories(categoriesWithUserId)
            console.log(`✅ 恢复商品分类: ${categoriesWithUserId.length} 条`)
        }

        // 9. 写入供应商数据
        if (backupData.suppliers && backupData.suppliers.length > 0) {
            for (const supplier of backupData.suppliers) {
                const supplierWithUserId = {
                    ...supplier,
                    userId: userId
                }
                await businessDataService.addSupplier(supplierWithUserId)
            }
            console.log(`✅ 恢复供应商数据: ${backupData.suppliers.length} 条`)
        }

        // 10. 写入库存数据
        if (backupData.inventory && backupData.inventory.length > 0) {
            const inventoryWithUserId = backupData.inventory.map(item => ({
                ...item,
                userId: userId
            }))
            await businessDataService.addInventoryItems(inventoryWithUserId)
            console.log(`✅ 恢复库存数据: ${inventoryWithUserId.length} 条`)
        }

        // 11. 写入采购订单
        if (backupData.purchaseOrders && backupData.purchaseOrders.length > 0) {
            for (const order of backupData.purchaseOrders) {
                const orderWithUserId = {
                    ...order,
                    userId: userId
                }
                await businessDataService.addPurchaseOrder(orderWithUserId)
            }
            console.log(`✅ 恢复采购订单: ${backupData.purchaseOrders.length} 条`)
        }

        // 12. 写入采购历史
        if (backupData.purchaseHistory && backupData.purchaseHistory.length > 0) {
            for (const history of backupData.purchaseHistory) {
                const historyWithUserId = {
                    ...history,
                    userId: userId
                }
                await businessDataService.addPurchaseHistory(historyWithUserId)
            }
            console.log(`✅ 恢复采购历史: ${backupData.purchaseHistory.length} 条`)
        }

        // 13. 写入支出记录
        if (backupData.expense && backupData.expense.length > 0) {
            const expenseWithUserId = backupData.expense.map(record => ({
                ...record,
                userId: userId,
                type: '支出'
            }))
            await businessDataService.addExpenseRecords(expenseWithUserId)
            console.log(`✅ 恢复支出记录: ${expenseWithUserId.length} 条`)
        }

        // 14. 写入支出还款记录
        if (backupData.expenseRepayments && backupData.expenseRepayments.length > 0) {
            for (const repayment of backupData.expenseRepayments) {
                const repaymentWithUserId = {
                    ...repayment,
                    userId: userId
                }
                await businessDataService.addExpenseRepayment(repaymentWithUserId)
            }
            console.log(`✅ 恢复支出还款记录: ${backupData.expenseRepayments.length} 条`)
        }

        // 15. 写入收入记录
        if (backupData.income && backupData.income.length > 0) {
            const incomeWithUserId = backupData.income.map(record => ({
                ...record,
                userId: userId,
                type: '收入'
            }))
            await businessDataService.addIncomeRecords(incomeWithUserId)
            console.log(`✅ 恢复收入记录: ${incomeWithUserId.length} 条`)
        }

        // 16. 写入收入收款记录
        if (backupData.incomeCollections && backupData.incomeCollections.length > 0) {
            for (const collection of backupData.incomeCollections) {
                const collectionWithUserId = {
                    ...collection,
                    userId: userId
                }
                await businessDataService.addIncomeCollection(collectionWithUserId)
            }
            console.log(`✅ 恢复收入收款记录: ${backupData.incomeCollections.length} 条`)
        }

        console.log('【BackupService】所有备份数据写入完成')
        return true
    }

    /**
     * 删除备份
     * @param {Object} backup - 备份记录
     * @returns {Promise<Object>} 删除结果
     */
    async deleteBackup(backup) {
        // 使用 id 作为备份标识
        if (!backup || (!backup.id && !backup.backupId)) {
            throw new Error('无效的备份记录')
        }

        const backupIdentifier = backup.id || backup.backupId

        try {
            const response = await apiDeleteBackup(backupIdentifier)
            console.log('【BackupService】删除备份响应:', response)

            // 只要没有抛出异常，就认为删除成功
            // 因为后端返回 200 就表示操作成功
            return {
                success: true,
                message: '备份删除成功'
            }
        } catch (error) {
            console.error('【BackupService】删除备份失败:', error)
            throw error
        }
    }

    /**
     * 获取用户备份数量
     * @returns {Promise<number>} 备份数量
     */
    async getBackupCount() {
        const userId = this.getCurrentUserId()
        if (!userId) {
            return 0
        }
        try {
            const response = await apiGetBackupCount(userId)
            console.log('【BackupService】获取备份数量原始响应:', response)

            // 根据返回结构解析
            // 情况1: 直接返回数组
            if (Array.isArray(response)) {
                return response.length
            }
            // 情况2: 返回对象包含 data 数组
            if (response && response.data && Array.isArray(response.data)) {
                return response.data.length
            }
            // 情况3: 直接返回数字
            if (typeof response === 'number') {
                return response
            }
            return 0
        } catch (error) {
            console.error('【BackupService】获取备份数量失败:', error)
            return 0
        }
    }

    /**
     * 格式化文件大小
     */
    formatSize(bytes) {
        if (!bytes) return '0 KB'
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    /**
     * 格式化日期
     */
    formatDate(dateStr) {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
    }

    /**
     * 格式化日期时间
     */
    formatDateTime(dateStr) {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    /**
     * 获取数据类型名称
     */
    getDataTypeName(type) {
        const names = {
            personal: '个人记账',
            business: '生意记账',
            personal_saving: '个人存钱计划',
            customer: '客户管理',
            product: '商品管理',
            category: '商品分类',
            supplier: '供应商',
            inventory: '库存管理',
            expense: '支出记录',
            income: '收入记录',
            expense_repayment: '支出还款',
            income_collection: '收入收款',
            customer_repayment: '客户还款',
            purchase_order: '采购订单',
            purchase_history: '采购历史'
        }
        return names[type] || type
    }
}

export default new BackupService()