// src/services/api/saving.service.js

import http from '@/services/utils/http-interceptor'
import * as savingApi from '@/api/saving'
import { notificationService } from '@/services'
import businessDataService from '@/services/business-data.service'
// import groupSavingCache from '@/services/cache/group-saving-cache.service'

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
        if (groupSavingCache && groupSavingCache.init) {
            groupSavingCache.init(userId).catch(console.warn)
        }
        // 初始化业务数据服务
        businessDataService.init(userId).catch(console.warn)
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
            alwaysFetchFromServer = true
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
        const shouldFetchFromServer = alwaysFetchFromServer || forceRefresh || !cacheHit

        if (shouldFetchFromServer) {
            // 3. 尝试从服务器获取
            try {
                console.log(`【Cache-First】从服务器获取数据: ${cacheKey}, 当前网络状态: ${navigator.onLine ? '在线' : '离线'}`)

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

                if (cacheHit) {
                    const isEmpty = this._isCacheDataEmpty(cachedData, strategy)

                    return {
                        code: 200,
                        data: cachedData,
                        source: 'stale-cache',
                        offline: !navigator.onLine,
                        message: isEmpty ? '服务器请求失败，缓存为空' : '获取成功（降级缓存）'
                    }
                }

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
                    if (data.records && Array.isArray(data.records)) {
                        return data.records.length === 0
                    }
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

                    if (memberId && memberId !== 'null' && memberId !== 'undefined' && memberId !== '') {
                        filters.memberId = parseInt(memberId)
                    }

                    const records = await groupSavingCache.getCachedDepositRecordsByGroupId(
                        parseInt(pId),
                        filters
                    )

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
                        await groupSavingCache.deleteDepositRecordsByGroupId(context.planId)
                        refreshPromises.push(
                            this.getPlanSavingRecordsByPost(context.planId, { page: 1, size: 20 }, true)
                        )
                    }
                    break

                case 'MEMBER_RECORDS':
                    if (context.planId && context.memberId) {
                        await groupSavingCache.deleteDepositRecordsByGroupId(context.planId)
                        refreshPromises.push(
                            this.getMemberSavingRecords(context.planId, context.memberId, true)
                        )
                    }
                    break

                case 'MEMBERS':
                    if (context.planId) {
                        await groupSavingCache.deleteMembersByGroupId(context.planId)
                    }
                    break
            }
        }

        await Promise.allSettled(refreshPromises)
        console.log(`【缓存刷新】完成: ${operation}`)
    }

    // ==================== 多人存钱计划（后端API） ====================

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
                alwaysFetchFromServer: true
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
                alwaysFetchFromServer: true
            }
        )
    }

    /**
     * 创建多人存钱计划 - 修复版
     * 适配后端的 GroupSavingRequestDTO
     */
    async createGroupSavings(data) {
        try {
            console.log('创建多人存钱计划 - 原始数据:', data)

            // 深拷贝数据，避免修改原对象
            const requestData = JSON.parse(JSON.stringify(data))

            // 1. 处理必填字段
            if (!requestData.name?.trim()) {
                throw new Error('计划名称不能为空')
            }

            // 2. 处理金额 - 转换为 BigDecimal 需要的数字格式
            requestData.targetAmount = parseFloat(requestData.targetAmount) || 0
            if (requestData.targetAmount <= 0) {
                throw new Error('目标金额必须大于0')
            }

            // 3. 处理理由 - 非必填，如果没有则传空字符串
            requestData.reason = requestData.reason?.trim() || ''

            // 4. 处理描述 - 如果没有则使用理由或空字符串
            requestData.description = requestData.description?.trim() || requestData.reason || ''

            // 5. 处理截止日期
            if (requestData.deadline) {
                // 确保日期格式正确 (YYYY-MM-DD)
                requestData.deadline = requestData.deadline.split('T')[0]
            }

            // 6. 处理类型
            requestData.type = requestData.type || '日常储蓄'

            // 7. 处理成员数据 - 关键修复！确保所有成员都被发送
            if (requestData.members && Array.isArray(requestData.members)) {
                console.log('处理前的成员列表:', requestData.members)

                // 计算总金额
                let totalAmount = 0

                // 映射所有成员，不要过滤掉任何人
                const processedMembers = requestData.members.map(member => {
                    // 转换 userId 为数字
                    let userId = parseInt(member.userId || member.id)

                    // 如果 userId 无效，尝试使用其他字段
                    if (isNaN(userId) || userId <= 0) {
                        userId = parseInt(member.friendId) || 0
                    }

                    const amount = parseFloat(member.amount) || 0
                    totalAmount += amount

                    // 严格按照后端 DTO 的 GroupSavingMemberRequestDTO 格式
                    return {
                        userId: userId,  // 后端用 Integer 接收
                        name: member.name || member.nickname || '',
                        amount: amount,  // BigDecimal
                        isCreator: member.isCreator || false
                    }
                }).filter(member =>
                    member.userId > 0 // 只过滤掉 userId 为 0 的无效成员
                )

                console.log('处理后的成员列表:', processedMembers)

                // 验证是否有成员
                if (processedMembers.length === 0) {
                    throw new Error('至少需要一位有效成员')
                }

                // 验证是否有创建者
                const hasCreator = processedMembers.some(m => m.isCreator)
                if (!hasCreator) {
                    throw new Error('必须有一位创建者')
                }

                requestData.members = processedMembers
                requestData.currentAmount = totalAmount
            } else {
                throw new Error('成员列表不能为空')
            }

            console.log('最终发送到后端的请求数据:', requestData)

            // 调用后端 API
            const requestConfig = savingApi.createGroupSaving(requestData)
            const response = await http.post(requestConfig.url, requestData)

            // 刷新缓存
            await this.refreshAfterOperation('join', { planId: response?.id })

            notificationService.showNotification('创建成功', 'success')

            return {
                code: 200,
                data: response,
                message: '创建成功'
            }
        } catch (error) {
            console.error('创建多人存钱计划失败:', error)
            notificationService.showNotification(error.message || '创建失败', 'error')
            return {
                code: 500,
                message: error.message || '创建失败'
            }
        }
    }

    /**
     * 更新多人存钱计划
     */
    async updateGroupSavings(id, data) {
        try {
            console.log('更新多人存钱计划 - 原始数据:', id, data)

            // 深拷贝数据，避免修改原对象
            const requestData = JSON.parse(JSON.stringify(data))

            // 处理必填字段
            if (!requestData.name?.trim()) {
                throw new Error('计划名称不能为空')
            }

            requestData.targetAmount = parseFloat(requestData.targetAmount) || 0
            if (requestData.targetAmount <= 0) {
                throw new Error('目标金额必须大于0')
            }

            requestData.reason = requestData.reason?.trim() || ''
            requestData.description = requestData.description?.trim() || requestData.reason || ''

            if (requestData.deadline) {
                requestData.deadline = requestData.deadline.split('T')[0]
            }

            requestData.type = requestData.type || '日常储蓄'

            // 处理成员数据
            if (requestData.members && Array.isArray(requestData.members)) {
                let totalAmount = 0

                const processedMembers = requestData.members.map(member => {
                    let userId = parseInt(member.userId || member.id)

                    if (isNaN(userId) || userId <= 0) {
                        userId = parseInt(member.friendId) || 0
                    }

                    const amount = parseFloat(member.amount) || 0
                    totalAmount += amount

                    return {
                        userId: userId,
                        name: member.name || member.nickname || '',
                        amount: amount,
                        isCreator: member.isCreator || false
                    }
                }).filter(member => member.userId > 0)

                if (processedMembers.length === 0) {
                    throw new Error('至少需要一位有效成员')
                }

                const hasCreator = processedMembers.some(m => m.isCreator)
                if (!hasCreator) {
                    throw new Error('必须有一位创建者')
                }

                requestData.members = processedMembers
                requestData.currentAmount = totalAmount
            } else {
                throw new Error('成员列表不能为空')
            }

            console.log('更新多人存钱计划 - 处理后数据:', requestData)

            const requestConfig = savingApi.updateGroupSaving(id, requestData)
            const response = await http.put(requestConfig.url, requestData)

            await this.refreshAfterOperation('join', { planId: id })

            notificationService.showNotification('更新成功', 'success')

            return {
                code: 200,
                data: response,
                message: '更新成功'
            }
        } catch (error) {
            console.error('更新多人存钱计划失败:', error)
            notificationService.showNotification(error.message || '更新失败', 'error')
            return {
                code: 500,
                message: error.message || '更新失败'
            }
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
     * 向多人存钱计划存钱
     */
    async depositToGroupSaving(planId, data) {
        try {
            console.log('多人存钱 - 原始数据:', planId, data)

            const requestData = {
                memberId: parseInt(data.memberId),
                amount: parseFloat(data.amount) || 0,
                note: data.note || ''
            }

            if (isNaN(requestData.memberId) || requestData.memberId <= 0) {
                throw new Error('成员ID无效')
            }

            if (requestData.memberId > 2147483647) {
                throw new Error('成员ID格式错误')
            }

            if (requestData.amount <= 0) {
                throw new Error('存入金额必须大于0')
            }

            console.log('多人存钱 - 处理后数据:', requestData)

            const requestConfig = savingApi.depositToGroupSaving(planId, requestData)
            const response = await http.post(requestConfig.url, requestData)

            notificationService.showNotification(`成功存入 ¥${requestData.amount}`, 'success')

            await this.refreshAfterOperation('deposit', {
                planId: Number(planId),
                memberId: requestData.memberId
            })

            return {
                code: 200,
                data: response,
                message: '存钱成功'
            }
        } catch (error) {
            console.error('多人存钱失败:', error)
            notificationService.showNotification(error.message || '存钱失败', 'error')
            return {
                code: 500,
                message: error.message || '存钱失败'
            }
        }
    }

    /**
     * 退出多人存钱计划
     */
    async leaveGroupSavings(planId, data) {
        try {
            console.log('退出计划参数:', { planId, data })

            const requestData = {
                isCreator: data.isCreator || false
            }

            if (data.isCreator && data.newCreatorId) {
                requestData.newCreatorId = parseInt(data.newCreatorId)
            }

            console.log('发送到后端的请求数据:', requestData)

            const requestConfig = savingApi.leaveGroupSaving(planId, requestData)
            const response = await http.post(requestConfig.url, requestData)

            notificationService.showNotification(
                data.isCreator ? '退出成功，已移交创建者权限' : '退出计划成功',
                'success'
            )

            await this.refreshAfterOperation('leave', {
                planId: Number(planId),
                memberId: data.memberId || this.currentUserId
            })

            return {
                code: 200,
                message: '操作成功',
                data: response
            }

        } catch (error) {
            console.error('退出多人存钱计划失败:', error)

            if (this.isNetworkError(error)) {
                notificationService.showNotification('当前网络不可用，请稍后重试', 'warning')
                return { code: 503, message: 'service unavailable' }
            }

            notificationService.showNotification('退出失败，请重试', 'error')
            return { code: 500, message: '退出失败' }
        }
    }

    /**
     * 获取计划的存钱记录（Cache-First）
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
                const requestData = {
                    page: params.page ? Number(params.page) : 1,
                    size: params.size ? Number(params.size) : 20
                }

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
     * 获取成员的存钱记录（Cache-First）
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

                return response
            },
            {
                strategy: 'MEMBER_RECORDS',
                forceRefresh,
                alwaysFetchFromServer: true
            }
        )
    }

    // ==================== 个人存钱计划（前端存储） ====================

    /**
     * 获取个人存钱计划列表
     * 从 IndexedDB 中获取数据
     */
    async getPersonalSavingsList(params = {}) {
        try {
            // 确保业务数据服务已初始化
            await businessDataService.init(this.currentUserId)

            // 从 IndexedDB 获取个人存钱计划
            const plans = await businessDataService.getSavingsPlans(params.status)

            return {
                code: 200,
                data: plans || [],
                message: '获取成功'
            }
        } catch (error) {
            console.error('获取个人存钱计划列表失败:', error)

            return {
                code: 500,
                data: [],
                message: '获取失败: ' + error.message
            }
        }
    }

    /**
     * 创建个人存钱计划
     * 保存到 IndexedDB 中
     */
    async createPersonalSavings(data) {
        try {
            console.log('创建个人存钱计划 - 原始数据:', data)

            // 确保业务数据服务已初始化
            await businessDataService.init(this.currentUserId)

            // 处理金额字段
            const targetAmount = parseFloat(data.targetAmount) || 0
            const currentAmount = parseFloat(data.currentAmount) || 0

            if (targetAmount <= 0) {
                throw new Error('目标金额必须大于0')
            }

            if (currentAmount > targetAmount) {
                throw new Error('已存金额不能大于目标金额')
            }

            // 理由非必填
            const planData = {
                ...data,
                reason: data.reason?.trim() || '',
                targetAmount,
                currentAmount,
                status: 'active',
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString()
            }

            console.log('创建个人存钱计划 - 处理后数据:', planData)

            // 保存到 IndexedDB
            const result = await businessDataService.addSavingsPlan(planData)

            notificationService.showNotification('创建成功', 'success')

            return {
                code: 200,
                data: result,
                message: '创建成功'
            }
        } catch (error) {
            console.error('创建个人存钱计划失败:', error)

            notificationService.showNotification(error.message || '创建失败', 'error')
            return {
                code: 500,
                message: error.message || '创建失败'
            }
        }
    }

    /**
     * 更新个人存钱计划
     * 更新 IndexedDB 中的数据
     */
    async updatePersonalSavings(id, data) {
        try {
            console.log('更新个人存钱计划 - 原始数据:', id, data)

            // 确保业务数据服务已初始化
            await businessDataService.init(this.currentUserId)

            // 处理金额字段
            const targetAmount = parseFloat(data.targetAmount) || 0
            const currentAmount = parseFloat(data.currentAmount) || 0

            if (targetAmount <= 0) {
                throw new Error('目标金额必须大于0')
            }

            if (currentAmount > targetAmount) {
                throw new Error('已存金额不能大于目标金额')
            }

            // 准备更新数据
            const updateData = {
                ...data,
                reason: data.reason?.trim() || '',
                targetAmount,
                currentAmount,
                updateTime: new Date().toISOString()
            }

            console.log('更新个人存钱计划 - 处理后数据:', updateData)

            // 更新 IndexedDB
            const result = await businessDataService.updateSavingsPlan(id, updateData)

            if (result) {
                notificationService.showNotification('更新成功', 'success')
                return {
                    code: 200,
                    data: result,
                    message: '更新成功'
                }
            } else {
                throw new Error('计划不存在或无权更新')
            }
        } catch (error) {
            console.error('更新个人存钱计划失败:', error)

            notificationService.showNotification(error.message || '更新失败', 'error')
            return {
                code: 500,
                message: error.message || '更新失败'
            }
        }
    }

    /**
     * 删除个人存钱计划
     * 从 IndexedDB 中删除数据
     */
    async deletePersonalSavings(id) {
        try {
            console.log('删除个人存钱计划:', id)

            // 确保业务数据服务已初始化
            await businessDataService.init(this.currentUserId)

            // 从 IndexedDB 删除
            const result = await businessDataService.deleteSavingsPlan(id)

            if (result) {
                notificationService.showNotification('删除成功', 'success')
                return {
                    code: 200,
                    message: '删除成功'
                }
            } else {
                throw new Error('计划不存在或无权删除')
            }
        } catch (error) {
            console.error('删除个人存钱计划失败:', error)

            notificationService.showNotification(error.message || '删除失败', 'error')
            return {
                code: 500,
                message: error.message || '删除失败'
            }
        }
    }

    /**
     * 个人存钱 - 存钱
     * 更新计划中的已存金额
     */
    async depositToPersonalSaving(planId, data) {
        try {
            console.log('个人存钱 - 原始数据:', planId, data)

            // 确保业务数据服务已初始化
            await businessDataService.init(this.currentUserId)

            const amount = parseFloat(data.amount) || 0

            if (amount <= 0) {
                throw new Error('存入金额必须大于0')
            }

            // 获取当前计划
            const plans = await businessDataService.getSavingsPlans()
            const currentPlan = plans.find(p => p.id === planId)

            if (!currentPlan) {
                throw new Error('计划不存在')
            }

            // 更新金额
            const newAmount = (currentPlan.currentAmount || 0) + amount

            if (newAmount > currentPlan.targetAmount) {
                throw new Error(`存入金额不能超过目标金额，最多可存 ¥${currentPlan.targetAmount - (currentPlan.currentAmount || 0)}`)
            }

            const updateData = {
                currentAmount: newAmount,
                updateTime: new Date().toISOString()
            }

            console.log('个人存钱 - 处理后数据:', updateData)

            // 保存更新
            const result = await businessDataService.updateSavingsPlan(planId, updateData)

            // 计算进度
            const progress = Math.min(Math.round((newAmount / currentPlan.targetAmount) * 100), 100)

            notificationService.showNotification(`成功存入 ¥${amount}`, 'success')

            return {
                code: 200,
                message: '存钱成功',
                data: {
                    ...result,
                    id: planId,
                    currentAmount: newAmount,
                    progress: progress,
                    completed: newAmount >= currentPlan.targetAmount
                }
            }

        } catch (error) {
            console.error('个人存钱失败:', error)

            notificationService.showNotification(error.message || '存钱失败', 'error')
            return {
                code: 500,
                message: error.message || '存钱失败'
            }
        }
    }
}

export default new SavingService()