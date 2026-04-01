// src/services/cache/personal-saving-cache.service.js
import indexedDBService from '@/services/db/indexed-db.service.js'
import idGenerator from "@/services/id-generator.service.js";

/**
 * 个人存钱计划缓存服务
 * 负责个人存钱计划的本地存储管理
 */
class PersonalSavingCacheService {
    constructor() {
        this.storeName = 'personal_savings'
        this.db = null
    }

    /**
     * 初始化服务
     */
    async init(userId) {
        this.userId = userId
        await indexedDBService.ensureInitialized()
        console.log('【PersonalSavingCache】服务已初始化，用户ID:', userId)
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return idGenerator.generatePersonalSavingId(this.userId)
    }

    /**
     * 获取当前时间戳
     */
    getCurrentTimestamp() {
        return new Date().toISOString()
    }

    /**
     * 获取所有个人存钱计划
     * @param {number} userId - 用户ID
     * @returns {Promise<Array>} 计划列表
     */
    async getAllPlans(userId) {
        try {
            const allPlans = await indexedDBService.getAll(this.storeName)
            // 过滤当前用户的计划
            const userPlans = allPlans.filter(plan => plan.userId === userId)
            // 按创建时间倒序排列
            userPlans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            console.log('【PersonalSavingCache】获取个人计划列表，共', userPlans.length, '条')
            return userPlans
        } catch (error) {
            console.error('【PersonalSavingCache】获取计划列表失败:', error)
            return []
        }
    }

    /**
     * 获取单个计划详情
     * @param {number} userId - 用户ID
     * @param {string} planId - 计划ID
     * @returns {Promise<Object|null>} 计划详情
     */
    async getPlanById(userId, planId) {
        try {
            const plan = await indexedDBService.get(this.storeName, planId)
            if (plan && plan.userId === userId && plan.deleted !== 1) {
                return plan
            }
            return null
        } catch (error) {
            console.error('【PersonalSavingCache】获取计划详情失败:', error)
            return null
        }
    }

    /**
     * 创建个人存钱计划
     * @param {number} userId - 用户ID
     * @param {Object} planData - 计划数据
     * @returns {Promise<Object>} 创建结果
     */
    async createPlan(userId, planData) {
        try {
            const now = this.getCurrentTimestamp()
            const planId = this.generateId()

            // 确保 deadline 是有效的日期字符串
            const deadline = planData.deadline ? new Date(planData.deadline).toISOString().split('T')[0] : planData.deadline

            const newPlan = {
                id: planId,
                userId: userId,
                name: planData.name,
                reason: planData.reason || '',
                targetAmount: planData.targetAmount,
                currentAmount: planData.currentAmount || 0,
                deadline: deadline,
                type: planData.type || '日常储蓄',
                icon: planData.icon || this.getIconByType(planData.type),
                color: planData.color || this.getColorByType(planData.type),
                status: planData.status || 'active',
                progress: this.calculateProgress(planData.currentAmount || 0, planData.targetAmount),
                completed: (planData.currentAmount || 0) >= planData.targetAmount,
                createdAt: planData.createdAt || now,        // 保留原创建时间
                updatedAt: planData.updatedAt || now,        // 保留原更新时间
                deleted: planData.deleted !== undefined ? planData.deleted : 0,  // 保留原 deleted 值
                deletedAt: planData.deletedAt || null,
                records: planData.records || [] // 保留存钱记录
            }

            await indexedDBService.add(this.storeName, newPlan)
            console.log('【PersonalSavingCache】创建计划成功:', planId, '创建时间:', newPlan.createdAt)
            return { success: true, data: newPlan }
        } catch (error) {
            console.error('【PersonalSavingCache】创建计划失败:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 更新个人存钱计划
     * @param {number} userId - 用户ID
     * @param {string} planId - 计划ID
     * @param {Object} planData - 更新数据
     * @returns {Promise<Object>} 更新结果
     */
    async updatePlan(userId, planId, planData) {
        try {
            const existingPlan = await indexedDBService.get(this.storeName, planId)

            if (!existingPlan) {
                return { success: false, error: '计划不存在' }
            }

            if (existingPlan.userId !== userId) {
                return { success: false, error: '无权修改此计划' }
            }

            // 确保 deadline 是有效的日期字符串
            const deadline = planData.deadline ? new Date(planData.deadline).toISOString().split('T')[0] : planData.deadline

            // 计算新的进度和完成状态
            const newCurrentAmount = planData.currentAmount !== undefined ? planData.currentAmount : existingPlan.currentAmount
            const newTargetAmount = planData.targetAmount !== undefined ? planData.targetAmount : existingPlan.targetAmount
            const newProgress = this.calculateProgress(newCurrentAmount, newTargetAmount)
            const newCompleted = newCurrentAmount >= newTargetAmount

            const updatedPlan = {
                ...existingPlan,
                name: planData.name !== undefined ? planData.name : existingPlan.name,
                reason: planData.reason !== undefined ? planData.reason : existingPlan.reason,
                targetAmount: newTargetAmount,
                currentAmount: newCurrentAmount,
                deadline: deadline !== undefined ? deadline : existingPlan.deadline,
                type: planData.type !== undefined ? planData.type : existingPlan.type,
                icon: planData.icon !== undefined ? planData.icon : this.getIconByType(planData.type || existingPlan.type),
                color: planData.color !== undefined ? planData.color : this.getColorByType(planData.type || existingPlan.type),
                updatedAt: this.getCurrentTimestamp(),
                progress: newProgress,
                completed: newCompleted,
                deleted: planData.deleted !== undefined ? planData.deleted : existingPlan.deleted,  // 保留 deleted 值
                deletedAt: planData.deletedAt !== undefined ? planData.deletedAt : existingPlan.deletedAt
            }

            await indexedDBService.update(this.storeName, updatedPlan)
            console.log('【PersonalSavingCache】更新计划成功:', planId, '更新时间:', updatedPlan.updatedAt)
            return { success: true, data: updatedPlan }
        } catch (error) {
            console.error('【PersonalSavingCache】更新计划失败:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 删除个人存钱计划（软删除）
     * @param {number} userId - 用户ID
     * @param {string} planId - 计划ID
     * @returns {Promise<Object>} 删除结果
     */
    async deletePlan(userId, planId) {
        try {
            const existingPlan = await indexedDBService.get(this.storeName, planId)

            if (!existingPlan) {
                return { success: false, error: '计划不存在' }
            }

            if (existingPlan.userId !== userId) {
                return { success: false, error: '无权删除此计划' }
            }

            // 软删除
            existingPlan.deleted = 1
            existingPlan.deletedAt = this.getCurrentTimestamp()
            existingPlan.status = 'deleted'
            existingPlan.updatedAt = this.getCurrentTimestamp()

            await indexedDBService.update(this.storeName, existingPlan)
            console.log('【PersonalSavingCache】删除计划成功:', planId)
            return { success: true, data: existingPlan }
        } catch (error) {
            console.error('【PersonalSavingCache】删除计划失败:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 永久删除计划（慎用）
     * @param {string} planId - 计划ID
     * @returns {Promise<Object>} 删除结果
     */
    async hardDeletePlan(planId) {
        try {
            await indexedDBService.delete(this.storeName, planId)
            console.log('【PersonalSavingCache】永久删除计划成功:', planId)
            return { success: true }
        } catch (error) {
            console.error('【PersonalSavingCache】永久删除计划失败:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 存钱操作
     * @param {number} userId - 用户ID
     * @param {string} planId - 计划ID
     * @param {Object} depositData - 存钱数据 { amount, note }
     * @returns {Promise<Object>} 存钱结果
     */
    async deposit(userId, planId, depositData) {
        try {
            const plan = await indexedDBService.get(this.storeName, planId)

            if (!plan) {
                return { success: false, error: '计划不存在' }
            }

            if (plan.userId !== userId) {
                return { success: false, error: '无权操作此计划' }
            }

            if (plan.deleted === 1) {
                return { success: false, error: '计划已删除' }
            }

            const amount = Number(depositData.amount)
            if (isNaN(amount) || amount <= 0) {
                return { success: false, error: '请输入有效的金额' }
            }

            const newAmount = (plan.currentAmount || 0) + amount
            if (newAmount > plan.targetAmount) {
                const maxAmount = plan.targetAmount - (plan.currentAmount || 0)
                return {
                    success: false,
                    error: `最多可存 ¥${maxAmount.toFixed(2)}`,
                    maxAmount: maxAmount
                }
            }

            // 获取当前时间戳
            const now = this.getCurrentTimestamp()
            const nowDate = new Date()

            // 创建存钱记录
            const record = {
                id: this.generateId(),
                planId: planId,
                amount: amount,
                note: depositData.note || '',
                depositDate: nowDate.toISOString().split('T')[0],    // 存钱日期（YYYY-MM-DD）
                beforeAmount: plan.currentAmount || 0,
                afterAmount: newAmount,
                createdAt: now,                                       // 记录创建时间
            }

            // 更新计划
            plan.currentAmount = newAmount
            plan.updatedAt = now                                      // 更新计划的更新时间
            plan.progress = this.calculateProgress(newAmount, plan.targetAmount)
            plan.completed = newAmount >= plan.targetAmount

            // 添加记录到计划中
            if (!plan.records) {
                plan.records = []
            }
            plan.records.unshift(record) // 最新的记录放在前面

            await indexedDBService.update(this.storeName, plan)
            console.log('【PersonalSavingCache】存钱成功:', {
                planId,
                amount,
                newAmount,
                depositTime: now,
                depositDate: record.depositDate
            })

            return {
                success: true,
                data: {
                    plan: plan,
                    record: record,
                    newAmount: newAmount,
                    progress: plan.progress,
                    completed: plan.completed
                }
            }
        } catch (error) {
            console.error('【PersonalSavingCache】存钱失败:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 获取计划的存钱记录
     * @param {number} userId - 用户ID
     * @param {string} planId - 计划ID
     * @param {Object} options - 分页参数 { page, size }
     * @returns {Promise<Object>} 存钱记录列表
     */
    async getDepositRecords(userId, planId, options = { page: 1, size: 20 }) {
        try {
            const plan = await indexedDBService.get(this.storeName, planId)

            if (!plan || plan.userId !== userId || plan.deleted === 1) {
                return { records: [], total: 0, page: options.page, size: options.size, pages: 0 }
            }

            const records = plan.records || []
            const total = records.length
            const page = options.page || 1
            const size = options.size || 20
            const start = (page - 1) * size
            const end = start + size
            const paginatedRecords = records.slice(start, end)

            return {
                records: paginatedRecords,
                total: total,
                page: page,
                size: size,
                pages: Math.ceil(total / size)
            }
        } catch (error) {
            console.error('【PersonalSavingCache】获取存钱记录失败:', error)
            return { records: [], total: 0, page: options.page, size: options.size, pages: 0 }
        }
    }

    /**
     * 按日期范围获取存钱记录
     * @param {number} userId - 用户ID
     * @param {string} planId - 计划ID
     * @param {string} startDate - 开始日期 (YYYY-MM-DD)
     * @param {string} endDate - 结束日期 (YYYY-MM-DD)
     * @returns {Promise<Array>} 存钱记录列表
     */
    async getDepositRecordsByDateRange(userId, planId, startDate, endDate) {
        try {
            const plan = await indexedDBService.get(this.storeName, planId)

            if (!plan || plan.userId !== userId || plan.deleted === 1) {
                return []
            }

            const records = plan.records || []

            // 按日期范围过滤
            const filteredRecords = records.filter(record => {
                const recordDate = record.depositDate || record.createdAt?.split('T')[0]
                if (!recordDate) return false
                return recordDate >= startDate && recordDate <= endDate
            })

            return filteredRecords
        } catch (error) {
            console.error('【PersonalSavingCache】按日期范围获取存钱记录失败:', error)
            return []
        }
    }

    /**
     * 按月份获取存钱统计
     * @param {number} userId - 用户ID
     * @param {string} planId - 计划ID
     * @param {number} year - 年份
     * @param {number} month - 月份 (1-12)
     * @returns {Promise<Object>} 统计信息 { totalAmount, recordCount, records }
     */
    async getDepositStatsByMonth(userId, planId, year, month) {
        try {
            const plan = await indexedDBService.get(this.storeName, planId)

            if (!plan || plan.userId !== userId || plan.deleted === 1) {
                return { totalAmount: 0, recordCount: 0, records: [] }
            }

            const records = plan.records || []

            // 按年月过滤（从 depositDate 或 createdAt 中提取）
            const filteredRecords = records.filter(record => {
                const dateStr = record.depositDate || record.createdAt?.split('T')[0]
                if (!dateStr) return false
                const [recordYear, recordMonth] = dateStr.split('-')
                return parseInt(recordYear) === year && parseInt(recordMonth) === month
            })

            const totalAmount = filteredRecords.reduce((sum, record) => sum + record.amount, 0)

            return {
                totalAmount: totalAmount,
                recordCount: filteredRecords.length,
                records: filteredRecords
            }
        } catch (error) {
            console.error('【PersonalSavingCache】按月份获取存钱统计失败:', error)
            return { totalAmount: 0, recordCount: 0, records: [] }
        }
    }

    /**
     * 清除用户的所有个人计划
     * @param {number} userId - 用户ID
     * @returns {Promise<Object>} 清除结果
     */
    async clearUserPlans(userId) {
        try {
            const allPlans = await indexedDBService.getAll(this.storeName)
            const userPlans = allPlans.filter(plan => plan.userId === userId)

            for (const plan of userPlans) {
                await indexedDBService.delete(this.storeName, plan.id)
            }

            console.log('【PersonalSavingCache】清除用户所有计划成功，共', userPlans.length, '条')
            return { success: true, count: userPlans.length }
        } catch (error) {
            console.error('【PersonalSavingCache】清除用户计划失败:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * 获取统计信息
     * @param {number} userId - 用户ID
     * @returns {Promise<Object>} 统计信息
     */
    async getStats(userId) {
        try {
            const plans = await this.getAllPlans(userId)
            const activePlans = plans.filter(p => p.deleted !== 1)
            const completedPlans = activePlans.filter(p => p.completed)
            const totalTarget = activePlans.reduce((sum, p) => sum + p.targetAmount, 0)
            const totalCurrent = activePlans.reduce((sum, p) => sum + p.currentAmount, 0)

            // 计算总存钱记录数
            const totalRecords = activePlans.reduce((sum, p) => sum + (p.records?.length || 0), 0)

            // 计算总存钱金额（所有存钱记录的总和）
            let totalDepositAmount = 0
            for (const plan of activePlans) {
                if (plan.records) {
                    totalDepositAmount += plan.records.reduce((sum, record) => sum + record.amount, 0)
                }
            }

            return {
                total: activePlans.length,
                completed: completedPlans.length,
                inProgress: activePlans.length - completedPlans.length,
                totalTarget: totalTarget,
                totalCurrent: totalCurrent,
                overallProgress: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0,
                totalRecords: totalRecords,
                totalDepositAmount: totalDepositAmount
            }
        } catch (error) {
            console.error('【PersonalSavingCache】获取统计信息失败:', error)
            return {
                total: 0,
                completed: 0,
                inProgress: 0,
                totalTarget: 0,
                totalCurrent: 0,
                overallProgress: 0,
                totalRecords: 0,
                totalDepositAmount: 0
            }
        }
    }

    /**
     * 计算进度
     */
    calculateProgress(current, target) {
        if (!target || target <= 0) return 0
        const progress = (current / target) * 100
        return Math.min(Math.round(progress), 100)
    }

    /**
     * 根据类型获取图标
     */
    getIconByType(type) {
        const icons = {
            '日常储蓄': 'fas fa-coins',
            '旅行基金': 'fas fa-plane',
            '教育基金': 'fas fa-graduation-cap',
            '购房基金': 'fas fa-home',
            '购车基金': 'fas fa-car',
            '应急资金': 'fas fa-first-aid',
            '其他': 'fas fa-star'
        }
        return icons[type] || 'fas fa-piggy-bank'
    }

    /**
     * 根据类型获取颜色
     */
    getColorByType(type) {
        const colors = {
            '日常储蓄': '#2ecc71',
            '旅行基金': '#3498DB',
            '教育基金': '#9B59B6',
            '购房基金': '#E74C3C',
            '购车基金': '#F39C12',
            '应急资金': '#E67E22',
            '其他': '#80A492'
        }
        return colors[type] || '#80A492'
    }
}

export default new PersonalSavingCacheService()