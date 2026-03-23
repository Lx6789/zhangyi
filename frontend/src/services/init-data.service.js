// services/init-data.service.js
import friendsService from '@/services/api/friends.service.js'
import savingService from '@/services/api/saving.service.js'
import notificationService from '@/services/utils/notification.service.js'

/**
 * 初始化数据服务
 * 用于在用户登录后自动获取并缓存数据
 */
class InitDataService {
    constructor() {
        this.isInitializing = false
        this.initialized = false
        this.initPromise = null
    }

    /**
     * 获取所有需要初始化的数据
     * @param {number} userId - 用户ID
     * @param {Object} options - 配置选项
     * @param {boolean} options.forceRefresh - 是否强制刷新（忽略缓存）
     * @param {boolean} options.silent - 是否静默执行（不显示通知）
     * @returns {Promise<Object>} 初始化结果
     */
    async initUserData(userId, options = {}) {
        const { forceRefresh = false, silent = false } = options

        // 如果正在初始化，返回之前的 Promise
        if (this.isInitializing && this.initPromise) {
            console.log('【InitData】数据正在初始化中，等待完成...')
            return this.initPromise
        }

        // 如果已经初始化且不强制刷新，直接返回成功
        if (this.initialized && !forceRefresh) {
            console.log('【InitData】数据已初始化，跳过')
            return { success: true, message: '数据已初始化' }
        }

        this.isInitializing = true
        this.initPromise = this._doInit(userId, { forceRefresh, silent })

        try {
            const result = await this.initPromise
            return result
        } finally {
            this.isInitializing = false
        }
    }

    /**
     * 执行初始化
     * @private
     */
    async _doInit(userId, { forceRefresh, silent }) {
        const results = {
            success: true,
            data: {
                friends: { success: false, count: 0, error: null },
                groupSavings: { success: false, count: 0, error: null },
                groupSavingsDetails: { success: false, count: 0, error: null }
            },
            errors: [],
            startTime: Date.now()
        }

        console.log('【InitData】开始初始化用户数据，用户ID:', userId)

        // 并行获取数据
        const promises = []

        // 1. 获取好友列表
        promises.push(
            this._initFriends(userId, forceRefresh, silent)
                .then(result => {
                    results.data.friends = result
                    if (!result.success) {
                        results.errors.push(`好友数据: ${result.error}`)
                    }
                    return result
                })
                .catch(error => {
                    console.error('【InitData】获取好友数据异常:', error)
                    results.data.friends = { success: false, count: 0, error: error.message }
                    results.errors.push(`好友数据: ${error.message}`)
                })
        )

        // 2. 获取多人存钱计划列表
        promises.push(
            this._initGroupSavingsList(userId, forceRefresh, silent)
                .then(result => {
                    results.data.groupSavings = result
                    if (!result.success) {
                        results.errors.push(`多人存钱计划: ${result.error}`)
                    }
                    return result
                })
                .catch(error => {
                    console.error('【InitData】获取多人存钱计划异常:', error)
                    results.data.groupSavings = { success: false, count: 0, error: error.message }
                    results.errors.push(`多人存钱计划: ${error.message}`)
                })
        )

        // 等待所有请求完成
        await Promise.allSettled(promises)

        // 获取计划详情（需要基于计划列表）
        if (results.data.groupSavings.success && results.data.groupSavings.count > 0) {
            // 获取所有计划详情（并行）
            const plans = await this._getCachedGroupSavingsList(userId)
            if (plans && plans.length > 0) {
                const detailPromises = plans.map(plan =>
                    this._initGroupSavingsDetail(userId, plan.id, forceRefresh, silent)
                )
                const detailResults = await Promise.allSettled(detailPromises)

                let successCount = 0
                let failCount = 0
                detailResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value && result.value.success) {
                        successCount++
                    } else {
                        failCount++
                    }
                })

                results.data.groupSavingsDetails = {
                    success: successCount > 0,
                    count: successCount,
                    total: plans.length,
                    failCount: failCount,
                    error: failCount > 0 ? `${failCount}个计划详情获取失败` : null
                }

                if (failCount > 0) {
                    results.errors.push(`计划详情: ${failCount}个获取失败`)
                }
            }
        }

        results.endTime = Date.now()
        results.duration = results.endTime - results.startTime
        results.success = results.errors.length === 0

        console.log(`【InitData】初始化完成，耗时: ${results.duration}ms，成功: ${results.success}，错误数: ${results.errors.length}`)

        if (!silent && !results.success) {
            const errorMsg = `部分数据加载失败: ${results.errors.join(', ')}`
            notificationService.showNotification(errorMsg, 'warning')
        }

        this.initialized = results.success
        return results
    }

    /**
     * 初始化好友数据
     * @private
     */
    async _initFriends(userId, forceRefresh, silent) {
        try {
            console.log('【InitData】开始获取好友数据...')
            const friendsList = await friendsService.getFriendsList(forceRefresh)

            const count = friendsList?.length || 0
            console.log(`【InitData】好友数据获取成功，共 ${count} 条`)

            return {
                success: true,
                count: count,
                data: friendsList,
                error: null
            }
        } catch (error) {
            console.error('【InitData】获取好友数据失败:', error)
            return {
                success: false,
                count: 0,
                data: null,
                error: error.message || '获取好友数据失败'
            }
        }
    }

    /**
     * 初始化多人存钱计划列表
     * @private
     */
    async _initGroupSavingsList(userId, forceRefresh, silent) {
        try {
            console.log('【InitData】开始获取多人存钱计划列表...')
            const response = await savingService.getGroupSavingsList({}, forceRefresh)

            let plans = []
            let count = 0

            // 处理不同的响应格式
            if (response && response.code === 200) {
                plans = response.data || []
                count = plans.length
            } else if (Array.isArray(response)) {
                plans = response
                count = plans.length
            } else if (response && response.data && Array.isArray(response.data)) {
                plans = response.data
                count = plans.length
            }

            console.log(`【InitData】多人存钱计划列表获取成功，共 ${count} 条`)

            return {
                success: true,
                count: count,
                data: plans,
                error: null
            }
        } catch (error) {
            console.error('【InitData】获取多人存钱计划列表失败:', error)
            return {
                success: false,
                count: 0,
                data: null,
                error: error.message || '获取多人存钱计划列表失败'
            }
        }
    }

    /**
     * 初始化多人存钱计划详情
     * @private
     */
    async _initGroupSavingsDetail(userId, planId, forceRefresh, silent) {
        try {
            console.log(`【InitData】开始获取计划详情: ${planId}`)
            const response = await savingService.getGroupSavingsDetail(planId, forceRefresh)

            let planDetail = null
            let success = false

            if (response && response.code === 200 && response.data) {
                planDetail = response.data
                success = true
            } else if (response && response.data) {
                planDetail = response.data
                success = true
            }

            if (success) {
                console.log(`【InitData】计划详情获取成功: ${planDetail?.name || planId}`)
            } else {
                console.warn(`【InitData】计划详情获取失败: ${planId}`)
            }

            return {
                success: success,
                planId: planId,
                data: planDetail,
                error: success ? null : '获取计划详情失败'
            }
        } catch (error) {
            console.error(`【InitData】获取计划详情失败 ${planId}:`, error)
            return {
                success: false,
                planId: planId,
                data: null,
                error: error.message || '获取计划详情失败'
            }
        }
    }

    /**
     * 获取已缓存的多人的存钱计划列表
     * @private
     */
    async _getCachedGroupSavingsList(userId) {
        try {
            // 从缓存获取（不强制刷新）
            const response = await savingService.getGroupSavingsList({}, false)

            if (response && response.code === 200 && response.data) {
                return response.data
            }
            if (Array.isArray(response)) {
                return response
            }
            if (response && response.data && Array.isArray(response.data)) {
                return response.data
            }
            return []
        } catch (error) {
            console.error('【InitData】获取缓存计划列表失败:', error)
            return []
        }
    }

    /**
     * 重置初始化状态
     */
    reset() {
        this.isInitializing = false
        this.initialized = false
        this.initPromise = null
        console.log('【InitData】初始化状态已重置')
    }

    /**
     * 获取初始化状态
     */
    getStatus() {
        return {
            isInitializing: this.isInitializing,
            initialized: this.initialized
        }
    }
}

export default new InitDataService()