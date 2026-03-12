// src/services/api/saving.service.js

import http from '@/services/utils/http-interceptor'
import * as savingApi from '@/api/saving'
import { notificationService } from '@/services'

class SavingService {
    constructor() {
        // 缓存配置
        this.cacheConfig = {
            // 不同数据类型的缓存策略
            strategies: {
                PLAN_LIST: {
                    type: 'list',
                    ttl: 5 * 60 * 1000, // 5分钟
                    priority: 'normal'
                },
                PLAN_DETAIL: {
                    type: 'detail',
                    ttl: 10 * 60 * 1000, // 10分钟
                    priority: 'high'
                },
                DEPOSIT_RECORDS: {
                    type: 'records',
                    ttl: 2 * 60 * 1000, // 2分钟
                    priority: 'normal'
                },
                MEMBER_RECORDS: {
                    type: 'member-records',
                    ttl: 2 * 60 * 1000, // 2分钟
                    priority: 'normal'
                }
            },
            // 操作后需要刷新的数据类型
            refreshAfterOperation: {
                deposit: ['PLAN_DETAIL', 'DEPOSIT_RECORDS', 'MEMBER_RECORDS'],
                leave: ['PLAN_LIST', 'PLAN_DETAIL', 'MEMBERS'],
                delete: ['PLAN_LIST'],
                join: ['PLAN_LIST', 'PLAN_DETAIL', 'MEMBERS']
            }
        }

        // 当前用户ID（需要在登录后设置）
        this.currentUserId = null
    }

    /**
     * 检查是否网络连接错误
     */
    isNetworkError(error) {
        return !error.response &&
            (error.message === 'Network Error' ||
                error.message.includes('network') ||
                error.message?.toLowerCase().includes('offline') ||
                error.code === 'ECONNABORTED' ||
                error.message.includes('timeout'))
    }

    /**
     * 设置当前用户ID
     */
    setCurrentUser(userId) {
        this.currentUserId = userId
        // 初始化缓存服务
        groupSavingCache.init(userId).catch(console.warn)
    }

    /**
     * Cache-First 策略的核心方法
     * @param {string} cacheKey - 缓存键
     * @param {Function} fetchFromServer - 从服务器获取数据的函数
     * @param {Object} options - 配置选项
     */
    async cacheFirst(cacheKey, fetchFromServer, options = {}) {
        const {
            strategy = 'DEPOSIT_RECORDS',
            forceRefresh = false,
            params = {},
            showNotification = true,
            alwaysFetchFromServer = true // 新增：缓存为空时是否总是请求服务器
        } = options

        console.log(`【Cache-First】开始获取数据: ${cacheKey}, 强制刷新: ${forceRefresh}, 总是请求服务器: ${alwaysFetchFromServer}`)

        // 1. 如果不是强制刷新，先尝试从缓存获取
        let cachedData = null
        let cacheHit = false

        if (!forceRefresh) {
            try {
                cachedData = await this.getFromCache(cacheKey, strategy)

                if (cachedData) {
                    cacheHit = true
                    // 检查缓存数据是否为空
                    const isEmpty = this._isCacheDataEmpty(cachedData, strategy)

                    if (!isEmpty) {
                        console.log(`【Cache-First】从缓存获取成功: ${cacheKey}`, {
                            dataSize: this._getDataSize(cachedData, strategy),
                            strategy
                        })

                        return {
                            code: 200,
                            data: cachedData,
                            source: 'cache',
                            message: '获取成功（缓存数据）'
                        }
                    } else {
                        console.log(`【Cache-First】缓存数据为空，将继续请求服务器: ${cacheKey}`)
                        // 缓存为空，继续请求服务器
                    }
                } else {
                    console.log(`【Cache-First】缓存未命中: ${cacheKey}`)
                }
            } catch (cacheError) {
                console.warn(`【Cache-First】缓存读取失败: ${cacheKey}`, cacheError)
                // 缓存读取失败，继续从服务器获取
            }
        }

        // 2. 检查是否应该请求服务器
        // 总是尝试请求服务器，除非 explicitly 设置 alwaysFetchFromServer = false
        const shouldFetchFromServer = alwaysFetchFromServer || forceRefresh || !cacheHit

        if (shouldFetchFromServer) {
            // 3. 尝试从服务器获取
            try {
                console.log(`【Cache-First】从服务器获取数据: ${cacheKey}, 当前网络状态: ${navigator.onLine ? '在线' : '离线'}`)

                // 即使离线也尝试请求（可能会失败，但我们要尝试）
                const serverData = await fetchFromServer()

                // 4. 更新缓存
                if (serverData) {
                    await this.saveToCache(cacheKey, serverData, strategy, params)
                    console.log(`【Cache-First】缓存更新成功: ${cacheKey}`)
                }

                return {
                    code: 200,
                    data: serverData,
                    source: 'server',
                    message: '获取成功'
                }

            } catch (error) {
                console.error(`【Cache-First】服务器请求失败: ${cacheKey}`, error)

                // 服务器请求失败，但有缓存数据（即使是空的）？
                if (cacheHit) {
                    // 有缓存数据（可能是空的），返回缓存
                    console.log(`【Cache-First】返回缓存数据（服务器请求失败）: ${cacheKey}`)

                    // 检查缓存是否为空，用于提示
                    const isEmpty = this._isCacheDataEmpty(cachedData, strategy)

                    return {
                        code: 200,
                        data: cachedData,
                        source: 'stale-cache',
                        offline: !navigator.onLine,
                        message: isEmpty ? '服务器请求失败，缓存为空' : '获取成功（降级缓存）'
                    }
                }

                // 无任何数据可用，返回空数据
                const emptyData = this.getEmptyDataByStrategy(strategy)
                return {
                    code: error.response?.status || 500,
                    data: emptyData,
                    source: 'error',
                    offline: !navigator.onLine,
                    message: error.message || '获取失败'
                }
            }
        } else {
            // 不应该请求服务器，但这种情况很少发生
            // 返回空数据
            return {
                code: 200,
                data: this.getEmptyDataByStrategy(strategy),
                source: 'no-data',
                message: '无数据'
            }
        }
    }

    /**
     * 检查缓存数据是否为空
     * @private
     */
    _isCacheDataEmpty(data, strategy) {
        if (data === null || data === undefined) return true

        switch (strategy) {
            case 'PLAN_LIST':
                return Array.isArray(data) && data.length === 0

            case 'PLAN_DETAIL':
                return data === null || Object.keys(data).length === 0

            case 'DEPOSIT_RECORDS':
                if (data && typeof data === 'object') {
                    // 检查 records 数组
                    if (data.records && Array.isArray(data.records)) {
                        return data.records.length === 0
                    }
                    // 检查直接是数组的情况
                    if (Array.isArray(data)) {
                        return data.length === 0
                    }
                }
                return true

            case 'MEMBER_RECORDS':
                return Array.isArray(data) && data.length === 0

            default:
                return false
        }
    }

    /**
     * 获取数据大小（用于日志）
     * @private
     */
    _getDataSize(data, strategy) {
        if (data === null || data === undefined) return 0

        switch (strategy) {
            case 'PLAN_LIST':
                return Array.isArray(data) ? data.length : 0

            case 'PLAN_DETAIL':
                return data ? 1 : 0

            case 'DEPOSIT_RECORDS':
                if (data && data.records && Array.isArray(data.records)) {
                    return data.records.length
                }
                if (Array.isArray(data)) {
                    return data.length
                }
                return 0

            case 'MEMBER_RECORDS':
                return Array.isArray(data) ? data.length : 0

            default:
                return 0
        }
    }

    /**
     * 从缓存获取数据
     */
    async getFromCache(cacheKey, strategy, allowStale = false) {
        // 解析缓存键
        const [type, ...keyParts] = cacheKey.split(':')

        try {
            switch (type) {
                case 'plan-list':
                    return await groupSavingCache.getCachedGroupSavingsList()

                case 'plan-detail':
                    const planId = parseInt(keyParts[0])
                    return await groupSavingCache.getCachedGroupSavingById(planId)

                case 'deposit-records':
                    const [pId, memberId, page, size] = keyParts
                    const filters = {}

                    // 解析 memberId（可能是 'null' 字符串）
                    if (memberId && memberId !== 'null' && memberId !== 'undefined' && memberId !== '') {
                        filters.memberId = parseInt(memberId)
                    }

                    // 从缓存获取所有记录
                    const records = await groupSavingCache.getCachedDepositRecordsByGroupId(
                        parseInt(pId),
                        filters
                    )

                    // 分页处理
                    const currentPage = parseInt(page) || 1
                    const pageSize = parseInt(size) || 20
                    const start = (currentPage - 1) * pageSize
                    const paginatedRecords = records.slice(start, start + pageSize)

                    return {
                        records: paginatedRecords,
                        total: records.length,
                        page: currentPage,
                        size: pageSize,
                        pages: Math.ceil(records.length / pageSize)
                    }

                case 'member-records':
                    const [planId2, memberId2] = keyParts
                    return await groupSavingCache.getCachedDepositRecordsByMemberId(
                        parseInt(memberId2),
                        parseInt(planId2)
                    )

                default:
                    return null
            }
        } catch (error) {
            console.warn(`【缓存读取失败】${cacheKey}:`, error)
            return null
        }
    }

    /**
     * 保存数据到缓存
     */
    async saveToCache(cacheKey, data, strategy, params = {}) {
        const [type, ...keyParts] = cacheKey.split(':')

        try {
            switch (type) {
                case 'plan-list':
                    if (Array.isArray(data)) {
                        await groupSavingCache.cacheGroupSavingsList(data)
                    }
                    break

                case 'plan-detail':
                    const planId = parseInt(keyParts[0])
                    if (data) {
                        await groupSavingCache.updateGroupSavingCache(data)

                        // 如果有成员数据，也缓存成员
                        if (data.members && Array.isArray(data.members)) {
                            await groupSavingCache.cacheMembers(data.members, planId)
                        }
                    }
                    break

                case 'deposit-records':
                    const [pId] = keyParts
                    if (data?.records && Array.isArray(data.records)) {
                        await groupSavingCache.cacheDepositRecords(data.records, parseInt(pId))
                    }
                    break

                case 'member-records':
                    const [planId3, memberId3] = keyParts
                    if (Array.isArray(data)) {
                        // 为成员记录添加计划ID信息
                        const recordsWithPlanId = data.map(r => ({
                            ...r,
                            groupSavingId: parseInt(planId3)
                        }))
                        await groupSavingCache.cacheDepositRecords(recordsWithPlanId, parseInt(planId3))
                    }
                    break
            }
        } catch (error) {
            console.warn(`【缓存保存失败】${cacheKey}:`, error)
        }
    }

    /**
     * 根据策略返回空数据结构
     */
    getEmptyDataByStrategy(strategy) {
        switch (strategy) {
            case 'PLAN_LIST':
                return []
            case 'PLAN_DETAIL':
                return null
            case 'DEPOSIT_RECORDS':
                return {
                    records: [],
                    total: 0,
                    page: 1,
                    size: 20,
                    pages: 0
                }
            case 'MEMBER_RECORDS':
                return []
            default:
                return null
        }
    }

    /**
     * 操作后刷新相关缓存
     */
    async refreshAfterOperation(operation, context = {}) {
        console.log(`【缓存刷新】操作: ${operation}`, context)

        const strategies = this.cacheConfig.refreshAfterOperation[operation] || []
        const refreshPromises = []

        for (const strategy of strategies) {
            switch (strategy) {
                case 'PLAN_LIST':
                    // 重新获取计划列表
                    refreshPromises.push(
                        this.getGroupSavingsList({}, true)
                    )
                    break

                case 'PLAN_DETAIL':
                    if (context.planId) {
                        refreshPromises.push(
                            this.getGroupSavingsDetail(context.planId, true)
                        )
                    }
                    break

                case 'DEPOSIT_RECORDS':
                    if (context.planId) {
                        // 清除记录缓存
                        await groupSavingCache.deleteDepositRecordsByGroupId(context.planId)
                        // 重新获取第一页
                        refreshPromises.push(
                            this.getPlanSavingRecordsByPost(context.planId, { page: 1, size: 20 }, true)
                        )
                    }
                    break

                case 'MEMBER_RECORDS':
                    if (context.planId && context.memberId) {
                        // 清除成员记录缓存
                        await groupSavingCache.deleteDepositRecordsByGroupId(context.planId)
                        // 重新获取
                        refreshPromises.push(
                            this.getMemberSavingRecords(context.planId, context.memberId, true)
                        )
                    }
                    break

                case 'MEMBERS':
                    if (context.planId) {
                        // 清除成员缓存
                        await groupSavingCache.deleteMembersByGroupId(context.planId)
                    }
                    break
            }
        }

        await Promise.allSettled(refreshPromises)
        console.log(`【缓存刷新】完成: ${operation}`)
    }

    // ==================== 多人存钱计划 ====================

    /**
     * 获取多人存钱计划列表（Cache-First）
     */
    async getGroupSavingsList(params = {}, forceRefresh = false) {
        const cacheKey = 'plan-list:all'

        return this.cacheFirst(
            cacheKey,
            async () => {
                console.log('【服务器请求】获取计划列表，网络状态:', navigator.onLine ? '在线' : '离线')
                const requestConfig = savingApi.getGroupSavingList(params)
                const response = await http.get(requestConfig.url, { params: requestConfig.params })
                return response || []
            },
            {
                strategy: 'PLAN_LIST',
                forceRefresh,
                params,
                alwaysFetchFromServer: true // 缓存为空时总是请求服务器
            }
        )
    }

    /**
     * 获取多人存钱计划详情（Cache-First）
     */
    async getGroupSavingsDetail(id, forceRefresh = false) {
        const cacheKey = `plan-detail:${id}`

        return this.cacheFirst(
            cacheKey,
            async () => {
                console.log('【服务器请求】获取计划详情，网络状态:', navigator.onLine ? '在线' : '离线')
                const requestConfig = savingApi.getGroupSavingDetail(id)
                const response = await http.get(requestConfig.url)
                return response
            },
            {
                strategy: 'PLAN_DETAIL',
                forceRefresh,
                alwaysFetchFromServer: true // 缓存为空时总是请求服务器
            }
        )
    }

    /**
     * 创建多人存钱计划
     */
    async createGroupSavings(data) {
        try {
            const requestConfig = savingApi.createGroupSaving(data)
            const response = await http.post(requestConfig.url, requestConfig.data)

            notificationService.showNotification('创建成功', 'success')

            // 刷新计划列表缓存
            await this.refreshAfterOperation('join', { planId: response?.id })

            return {
                code: 200,
                data: response,
                message: '创建成功'
            }
        } catch (error) {
            console.error('创建多人存钱计划失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前处于离线模式，无法创建计划', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('创建失败，请重试', 'error')
            return { code: 500, message: '创建失败' }
        }
    }

    /**
     * 更新多人存钱计划
     */
    async updateGroupSavings(id, data) {
        try {
            const requestConfig = savingApi.updateGroupSaving(id, data)
            const response = await http.put(requestConfig.url, requestConfig.data)

            notificationService.showNotification('更新成功', 'success')
            return {
                code: 200,
                data: response,
                message: '更新成功'
            }
        } catch (error) {
            console.error('更新多人存钱计划失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前处于离线模式，无法更新计划', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('更新失败，请重试', 'error')
            return { code: 500, message: '更新失败' }
        }
    }

    /**
     * 删除多人存钱计划
     */
    async deleteGroupSavings(id) {
        try {
            const requestConfig = savingApi.deleteGroupSaving(id)
            await http.delete(requestConfig.url)

            notificationService.showNotification('删除成功', 'success')

            // 刷新计划列表缓存
            await this.refreshAfterOperation('delete', { planId: Number(id) })

            return {
                code: 200,
                message: '删除成功'
            }
        } catch (error) {
            console.error('删除多人存钱计划失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前处于离线模式，无法删除计划', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('删除失败，请重试', 'error')
            return { code: 500, message: '删除失败' }
        }
    }

    /**
     * 加入多人存钱计划
     */
    async joinGroupSavings(id, data) {
        try {
            const requestConfig = savingApi.joinGroupSaving(id, data)
            const response = await http.post(requestConfig.url, requestConfig.data)

            notificationService.showNotification('加入成功', 'success')
            return {
                code: 200,
                data: response,
                message: '加入成功'
            }
        } catch (error) {
            console.error('加入多人存钱计划失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前处于离线模式，无法加入计划', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('加入失败，请重试', 'error')
            return { code: 500, message: '加入失败' }
        }
    }

    /**
     * 退出多人存钱计划
     */
    async leaveGroupSavings(id, data) {
        try {
            console.log('【SavingService】退出计划参数:', { id, data });

            const requestConfig = savingApi.leaveGroupSaving(id, data)

            const requestData = {
                isCreator: data.isCreator || false
            }

            if (data.isCreator && data.newCreatorId) {
                requestData.newCreatorId = data.newCreatorId
            }

            console.log('【SavingService】发送到后端的请求数据:', requestData)

            const response = await http.post(requestConfig.url, requestData)

            console.log('【SavingService】退出计划接口响应:', response)

            notificationService.showNotification(
                data.isCreator ? '退出成功，已移交创建者权限' : '退出计划成功',
                'success'
            )

            // 刷新相关缓存
            await this.refreshAfterOperation('leave', {
                planId: Number(id),
                memberId: data.memberId || this.currentUserId
            })

            return {
                code: 200,
                message: '操作成功',
                data: response
            }

        } catch (error) {
            console.error('【SavingService】退出多人存钱计划失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前网络不可用，请稍后重试', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('退出失败，请重试', 'error')
            return { code: 500, message: '退出失败' }
        }
    }

    /**
     * 多人存钱计划 - 存钱
     */
    async depositToGroupSaving(planId, data) {
        try {
            console.log(`调用存钱接口: 计划ID=${planId}, 成员ID=${data.memberId}, 金额=${data.amount}`)

            const requestConfig = savingApi.depositToGroupSaving(planId, data)
            const response = await http.post(requestConfig.url, requestConfig.data)

            console.log('存钱接口响应:', response)

            notificationService.showNotification(`成功存入 ¥${data.amount}`, 'success')

            // 刷新相关缓存
            await this.refreshAfterOperation('deposit', {
                planId: Number(planId),
                memberId: Number(data.memberId)
            })

            return {
                code: 200,
                message: '存钱成功',
                data: response
            }

        } catch (error) {
            console.error('存钱失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前网络不可用，请稍后重试', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('存钱失败，请重试', 'error')
            return { code: 500, message: '存钱失败' }
        }
    }

    /**
     * 获取计划的存钱记录（Cache-First，缓存为空时总是请求服务器）
     */
    async getPlanSavingRecordsByPost(planId, params = {}, forceRefresh = false) {
        if (!planId) {
            return {
                code: 400,
                data: { records: [], total: 0, page: 1, size: 20, pages: 0 },
                message: '计划ID不能为空'
            }
        }

        const targetPlanId = Number(planId)

        // 构建缓存键时包含成员ID
        const memberIdValue = params.memberId && params.memberId !== '' && params.memberId !== 'null' ? params.memberId : 'all'
        const cacheKey = `deposit-records:${targetPlanId}:${memberIdValue}:${params.page || 1}:${params.size || 20}`

        console.log('【按成员查询】开始查询:', {
            planId: targetPlanId,
            memberId: params.memberId,
            page: params.page,
            size: params.size,
            currentUserId: this.currentUserId
        })

        return this.cacheFirst(
            cacheKey,
            async () => {
                // 构建请求参数
                const requestData = {
                    page: params.page ? Number(params.page) : 1,
                    size: params.size ? Number(params.size) : 20
                }

                // 重要：只有memberId有有效值时才添加到请求中
                if (params.memberId && params.memberId !== '' && params.memberId !== 'null' && params.memberId !== 'undefined') {
                    requestData.memberId = Number(params.memberId)
                    console.log('【按成员查询】发送到服务器的memberId:', requestData.memberId)
                }

                if (params.startTime) {
                    requestData.startTime = params.startTime
                }
                if (params.endTime) {
                    requestData.endTime = params.endTime
                }

                console.log('【按成员查询】请求数据:', requestData)

                const requestConfig = savingApi.getSavingRecordsByPost(planId, requestData)
                const response = await http.post(requestConfig.url, requestConfig.data)

                // 直接返回后端响应，不做前端处理
                return response
            },
            {
                strategy: 'DEPOSIT_RECORDS',
                forceRefresh,
                params,
                alwaysFetchFromServer: true
            }
        )
    }

    /**
     * 获取成员的存钱记录（Cache-First，缓存为空时总是请求服务器）
     */
    async getMemberSavingRecords(planId, memberId, forceRefresh = false) {
        const pId = Number(planId)
        const mId = Number(memberId)
        const cacheKey = `member-records:${pId}:${mId}`

        return this.cacheFirst(
            cacheKey,
            async () => {
                console.log(`【服务器请求】获取成员存钱记录: planId=${pId}, memberId=${mId}, 当前用户=${this.currentUserId}`)

                const requestConfig = savingApi.getMemberSavingRecords(pId, mId)
                const response = await http.get(requestConfig.url)

                // 直接返回后端响应
                return response
            },
            {
                strategy: 'MEMBER_RECORDS',
                forceRefresh,
                alwaysFetchFromServer: true
            }
        )
    }

    // ==================== 个人存钱计划 ====================

    /**
     * 获取个人存钱计划列表
     */
    async getPersonalSavingsList(params = {}) {
        try {
            const requestConfig = savingApi.getPersonalSavingList(params)
            const response = await http.get(requestConfig.url, { params: requestConfig.params })

            return {
                code: 200,
                data: response || []
            }
        } catch (error) {
            console.error('获取个人存钱计划列表失败:', error)

            if (this.isNetworkError(error)) {
                return {
                    code: 200,
                    data: [],
                    message: 'offline-mode'
                }
            }

            notificationService.showNotification('获取个人计划列表失败', 'error')
            return { code: 500, data: [], message: '获取失败' }
        }
    }

    /**
     * 创建个人存钱计划
     */
    async createPersonalSavings(data) {
        try {
            const requestConfig = savingApi.createPersonalSaving(data)
            const response = await http.post(requestConfig.url, requestConfig.data)

            notificationService.showNotification('创建成功', 'success')
            return {
                code: 200,
                data: response,
                message: '创建成功'
            }
        } catch (error) {
            console.error('创建个人存钱计划失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前处于离线模式，无法创建计划', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('创建失败，请重试', 'error')
            return { code: 500, message: '创建失败' }
        }
    }

    /**
     * 更新个人存钱计划
     */
    async updatePersonalSavings(id, data) {
        try {
            const requestConfig = savingApi.updatePersonalSaving(id, data)
            const response = await http.put(requestConfig.url, requestConfig.data)

            notificationService.showNotification('更新成功', 'success')
            return {
                code: 200,
                data: response,
                message: '更新成功'
            }
        } catch (error) {
            console.error('更新个人存钱计划失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前处于离线模式，无法更新计划', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('更新失败，请重试', 'error')
            return { code: 500, message: '更新失败' }
        }
    }

    /**
     * 删除个人存钱计划
     */
    async deletePersonalSavings(id) {
        try {
            const requestConfig = savingApi.deletePersonalSaving(id)
            await http.delete(requestConfig.url)

            notificationService.showNotification('删除成功', 'success')
            return {
                code: 200,
                message: '删除成功'
            }
        } catch (error) {
            console.error('删除个人存钱计划失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前处于离线模式，无法删除计划', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('删除失败，请重试', 'error')
            return { code: 500, message: '删除失败' }
        }
    }

    /**
     * 个人存钱 - 存钱
     */
    async depositToPersonalSaving(planId, data) {
        try {
            const requestConfig = savingApi.depositToPersonalSaving(planId, data)
            const response = await http.post(requestConfig.url, requestConfig.data)

            notificationService.showNotification(`成功存入 ¥${data.amount}`, 'success')

            return {
                code: 200,
                message: '存钱成功',
                data: response
            }

        } catch (error) {
            console.error('个人存钱失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前网络不可用，请稍后重试', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('存钱失败，请重试', 'error')
            return { code: 500, message: '存钱失败' }
        }
    }
}

export default new SavingService()