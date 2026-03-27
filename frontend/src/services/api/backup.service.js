// src/services/backup.service.js
import indexedDBService from '@/services/db/indexed-db.service.js'
import businessDataService from '@/services/cache/business-cache.service.js'
import personalSavingCache from '@/services/cache/personal-saving-cache.service.js'
import { uploadBackup as apiUploadBackup,
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
            inventory: 0,
            // ========== 新增 ==========
            expense: 0,
            income: 0,
            expense_repayment: 0,
            income_collection: 0,
            customer_repayment: 0
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

            // 库存管理
            const inventory = await businessDataService.getAllInventory()
            counts.inventory = inventory?.length || 0

            // ========== 新增统计 ==========
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
                    backupData.categories = await businessDataService.getAllCategories()
                    backupData.suppliers = await businessDataService.getAllSuppliers()
                    break

                case 'inventory':
                    backupData.inventory = await businessDataService.getAllInventory()
                    backupData.purchase_orders = await businessDataService.getAllPurchaseOrders()
                    backupData.purchase_history = await businessDataService.getAllPurchaseHistory()
                    break

                // ========== 新增数据收集 ==========
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

            let backups = []
            if (response && response.records) {
                backups = response.records
            } else if (Array.isArray(response)) {
                backups = response
            }

            // 按备份时间倒序排序
            backups.sort((a, b) => new Date(b.backupTime) - new Date(a.backupTime))

            return backups
        } catch (error) {
            console.error('【BackupService】获取备份列表失败:', error)
            return []
        }
    }

    /**
     * 恢复备份
     * @param {Object} backup - 备份记录
     * @returns {Promise<Object>} 恢复结果
     */
    async restoreBackup(backup) {
        if (!backup || !backup.id) {
            throw new Error('无效的备份记录')
        }

        try {
            const response = await apiRestoreBackup(backup.id)

            if (response && response.code === 200) {
                return {
                    success: true,
                    message: '数据恢复成功，请刷新页面'
                }
            } else {
                throw new Error(response.message || '恢复失败')
            }
        } catch (error) {
            console.error('【BackupService】恢复备份失败:', error)
            throw error
        }
    }

    /**
     * 删除备份
     * @param {Object} backup - 备份记录
     * @returns {Promise<Object>} 删除结果
     */
    async deleteBackup(backup) {
        if (!backup || !backup.id) {
            throw new Error('无效的备份记录')
        }

        try {
            const response = await apiDeleteBackup(backup.id)

            if (response && response.code === 200) {
                return {
                    success: true,
                    message: '备份删除成功'
                }
            } else {
                throw new Error(response.message || '删除失败')
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
            if (response) {
                return response || 0
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
            inventory: '库存管理',
            // ========== 新增 ==========
            expense: '支出记录',
            income: '收入记录',
            expense_repayment: '支出还款',
            income_collection: '收入收款',
            customer_repayment: '客户还款'
        }
        return names[type] || type
    }
}

export default new BackupService()