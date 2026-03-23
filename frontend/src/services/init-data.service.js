// services/init-database.service.js

import indexedDBService from '@/services/db/indexed-db.service.js'
import friendsService from '@/services/api/friends.service.js'
import friendsCacheService from '@/services/cache/friends-cache.service.js'
import savingService from '@/services/api/saving.service.js'
import notificationService from '@/services/utils/notification.service.js'
import idGenerator from '@/services/id-generator.service.js'

/**
 * 数据库初始化服务
 * 负责在用户登录后初始化所有表的数据
 * 直接使用 indexedDBService 提供的方法
 */
class InitDatabaseService {
    constructor() {
        this.isInitializing = false
        this.initialized = false
        this.initPromise = null
    }

    /**
     * 需要强制初始化的表（不管是否有数据都会重新获取）
     */
    FORCE_INIT_TABLES = [
        'group_savings_cache',        // 多人存钱计划缓存
        'savings_members_cache',       // 成员缓存
        'saving_deposit_records_cache', // 存钱记录缓存
        'friends_cache'                // 好友缓存
    ]

    /**
     * 所有需要检查初始化的表
     */
    ALL_TABLES = [
        // 强制初始化表（必须从后端获取）
        { name: 'friends_cache', force: true, dependsOn: [] },
        { name: 'group_savings_cache', force: true, dependsOn: [] },
        { name: 'savings_members_cache', force: true, dependsOn: ['group_savings_cache'] },
        { name: 'saving_deposit_records_cache', force: true, dependsOn: [] }, // 改为无依赖，独立获取
        // 普通表（有数据则跳过初始化）
        { name: 'personal_savings', force: false, dependsOn: [] },
        { name: 'daily_records', force: false, dependsOn: [] },
        { name: 'expense_records', force: false, dependsOn: [] },
        { name: 'income_records', force: false, dependsOn: [] },
        { name: 'products', force: false, dependsOn: [] },
        { name: 'product_categories', force: false, dependsOn: [] },
        { name: 'inventory', force: false, dependsOn: [] },
        { name: 'suppliers', force: false, dependsOn: [] },
        { name: 'purchase_orders', force: false, dependsOn: [] },
        { name: 'purchase_history', force: false, dependsOn: [] },
        { name: 'chart_data_cache', force: false, dependsOn: [] },
        { name: 'sync_status', force: false, dependsOn: [] },
        { name: 'offline_queue', force: false, dependsOn: [] }
    ]

    /**
     * 初始化所有表数据
     * @param {number} userId - 用户ID
     * @param {Object} options - 配置选项
     * @param {boolean} options.forceRefresh - 是否强制刷新所有表（忽略数据存在检查）
     * @param {boolean} options.silent - 是否静默执行（不显示通知）
     * @returns {Promise<Object>} 初始化结果
     */
    async initAllTables(userId, options = {}) {
        const { forceRefresh = false, silent = false } = options

        if (!userId) {
            console.error('【InitDatabase】用户ID不能为空')
            return { success: false, error: '用户ID不能为空' }
        }

        // 如果正在初始化，返回之前的 Promise
        if (this.isInitializing && this.initPromise) {
            console.log('【InitDatabase】数据正在初始化中，等待完成...')
            return this.initPromise
        }

        // 如果已经初始化且不强制刷新，直接返回成功
        if (this.initialized && !forceRefresh) {
            console.log('【InitDatabase】数据已初始化，跳过')
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
        const startTime = Date.now()
        const results = {
            success: true,
            tables: {},
            errors: [],
            startTime,
            endTime: null,
            duration: null
        }

        console.log('【InitDatabase】开始初始化所有表数据，用户ID:', userId)
        console.log('【InitDatabase】强制刷新模式:', forceRefresh)

        // 确保数据库已初始化
        await indexedDBService.init()

        // 按依赖顺序处理表
        // 先处理没有依赖的表，再处理有依赖的表
        const independentTables = this.ALL_TABLES.filter(t => t.dependsOn.length === 0)
        const dependentTables = this.ALL_TABLES.filter(t => t.dependsOn.length > 0)

        // 1. 并行初始化所有无依赖的表
        console.log('【InitDatabase】开始初始化无依赖的表...')
        const independentPromises = independentTables.map(table =>
            this._initTable(userId, table, forceRefresh, silent)
        )
        const independentResults = await Promise.allSettled(independentPromises)

        // 收集无依赖表的初始化结果
        independentResults.forEach((result, index) => {
            const tableName = independentTables[index].name
            if (result.status === 'fulfilled') {
                results.tables[tableName] = result.value
                if (!result.value.success) {
                    results.errors.push(`${tableName}: ${result.value.error}`)
                }
            } else {
                results.tables[tableName] = { success: false, error: result.reason?.message || '初始化失败' }
                results.errors.push(`${tableName}: ${result.reason?.message || '初始化失败'}`)
            }
        })

        // 🔥 关键优化：先获取计划数据（只请求一次），用于后续的依赖表初始化
        let plansData = null

        // 检查是否需要获取计划数据（仅用于成员缓存）
        const needsPlansData = dependentTables.some(table =>
            table.name === 'savings_members_cache'
        )

        if (needsPlansData && results.tables['group_savings_cache']?.success) {
            try {
                console.log('【InitDatabase】预获取计划数据，用于成员缓存初始化...')
                const response = await savingService.getGroupSavingsList({}, forceRefresh)
                if (response && response.code === 200) {
                    plansData = response.data || []
                    console.log(`【InitDatabase】获取到 ${plansData.length} 个计划数据`)
                } else if (Array.isArray(response)) {
                    plansData = response
                    console.log(`【InitDatabase】获取到 ${plansData.length} 个计划数据`)
                } else {
                    console.warn('【InitDatabase】获取计划数据失败，将使用缓存数据')
                    // 如果获取失败，尝试从缓存读取
                    const cachedPlans = await indexedDBService.query('group_savings_cache', 'userId', userId)
                    plansData = cachedPlans.map(plan => ({
                        id: plan.originalId,
                        name: plan.planName,
                        reason: plan.reason,
                        description: plan.description,
                        targetAmount: plan.targetAmount,
                        currentAmount: plan.currentAmount,
                        type: plan.type,
                        deadline: plan.deadline,
                        creatorId: plan.creatorId,
                        status: plan.status,
                        createdAt: plan.createdAt,
                        updatedAt: plan.updatedAt,
                        deleted: plan.deleted,
                        deletedAt: plan.deletedAt,
                        color: plan.color,
                        icon: plan.icon
                    }))
                    console.log(`【InitDatabase】从缓存读取到 ${plansData.length} 个计划数据`)
                }
            } catch (error) {
                console.error('【InitDatabase】获取计划数据失败:', error)
                // 尝试从缓存读取
                const cachedPlans = await indexedDBService.query('group_savings_cache', 'userId', userId)
                plansData = cachedPlans.map(plan => ({
                    id: plan.originalId,
                    name: plan.planName,
                    reason: plan.reason,
                    description: plan.description,
                    targetAmount: plan.targetAmount,
                    currentAmount: plan.currentAmount,
                    type: plan.type,
                    deadline: plan.deadline,
                    creatorId: plan.creatorId,
                    status: plan.status,
                    createdAt: plan.createdAt,
                    updatedAt: plan.updatedAt,
                    deleted: plan.deleted,
                    deletedAt: plan.deletedAt,
                    color: plan.color,
                    icon: plan.icon
                }))
                console.log(`【InitDatabase】从缓存读取到 ${plansData.length} 个计划数据`)
            }
        }

        // 2. 顺序初始化有依赖的表（依赖的表必须初始化成功）
        console.log('【InitDatabase】开始初始化有依赖的表...')
        for (const table of dependentTables) {
            // 检查依赖的表是否初始化成功
            const depsSatisfied = table.dependsOn.every(dep =>
                results.tables[dep] && results.tables[dep].success
            )

            if (!depsSatisfied) {
                const msg = `依赖表未初始化成功: ${table.dependsOn.join(', ')}`
                console.warn(`【InitDatabase】跳过 ${table.name}，${msg}`)
                results.tables[table.name] = {
                    success: false,
                    error: msg,
                    skipped: true
                }
                results.errors.push(`${table.name}: ${msg}`)
                continue
            }

            try {
                let result
                // 🔥 对于成员缓存，使用共享的 plansData
                if (table.name === 'savings_members_cache') {
                    result = await this._initSavingsMembersCacheWithPlans(userId, plansData, forceRefresh, silent)
                } else {
                    result = await this._initTable(userId, table, forceRefresh, silent)
                }
                results.tables[table.name] = result
                if (!result.success) {
                    results.errors.push(`${table.name}: ${result.error}`)
                }
            } catch (error) {
                results.tables[table.name] = { success: false, error: error.message }
                results.errors.push(`${table.name}: ${error.message}`)
            }
        }

        results.endTime = Date.now()
        results.duration = results.endTime - startTime
        results.success = results.errors.length === 0

        console.log(`【InitDatabase】初始化完成，耗时: ${results.duration}ms，成功表数: ${Object.keys(results.tables).filter(k => results.tables[k]?.success).length}/${Object.keys(results.tables).length}`)

        if (results.errors.length > 0) {
            console.warn('【InitDatabase】初始化错误:', results.errors)
        }

        this.initialized = results.success

        if (!silent && !results.success) {
            notificationService.showNotification(`部分数据加载失败: ${results.errors.slice(0, 3).join(', ')}${results.errors.length > 3 ? '...' : ''}`, 'warning')
        }

        return results
    }

    /**
     * 初始化单个表
     * @private
     */
    async _initTable(userId, tableConfig, forceRefresh, silent) {
        const { name: tableName, force: isForceTable } = tableConfig

        console.log(`【InitDatabase】开始处理表: ${tableName} (强制表: ${isForceTable})`)

        try {
            // 检查表是否存在
            const hasStore = await indexedDBService.hasStore(tableName)
            if (!hasStore) {
                console.warn(`【InitDatabase】表 ${tableName} 不存在，跳过`)
                return { success: true, message: '表不存在，跳过', dataCount: 0, skipped: true }
            }

            // 判断是否需要初始化
            let shouldInit = forceRefresh || isForceTable

            if (!shouldInit) {
                // 非强制表：检查是否有数据，有数据则跳过
                const existingData = await indexedDBService.getAll(tableName)
                if (existingData && existingData.length > 0) {
                    console.log(`【InitDatabase】表 ${tableName} 已有 ${existingData.length} 条数据，跳过初始化`)
                    return {
                        success: true,
                        message: '已有数据，跳过初始化',
                        dataCount: existingData.length,
                        skipped: true
                    }
                }
                shouldInit = true
            }

            // 需要初始化，根据表类型调用对应的获取方法
            console.log(`【InitDatabase】开始初始化表: ${tableName}`)

            let initResult = { success: true, dataCount: 0, message: '' }

            switch (tableName) {
                case 'friends_cache':
                    initResult = await this._initFriendsCache(userId)
                    break
                case 'group_savings_cache':
                    initResult = await this._initGroupSavingsCache(userId)
                    break
                case 'savings_members_cache':
                    // 这个方法现在不会直接被调用，因为已经改用 _initSavingsMembersCacheWithPlans
                    // 但为了兼容性保留
                    initResult = await this._initSavingsMembersCache(userId)
                    break
                case 'saving_deposit_records_cache':
                    // 🔥 使用新的方法，通过 getPlanSavingRecordsByUserId 获取数据
                    initResult = await this._initSavingDepositRecordsCacheByUserId(userId)
                    break
                case 'product_categories':
                    initResult = await this._initProductCategories(userId)
                    break
                case 'products':
                    initResult = await this._initProducts(userId)
                    break
                default:
                    // 普通表：如果没有数据，创建空记录或默认数据
                    initResult = await this._initDefaultTable(tableName, userId)
                    break
            }

            return initResult

        } catch (error) {
            console.error(`【InitDatabase】初始化表 ${tableName} 失败:`, error)
            return { success: false, error: error.message, dataCount: 0 }
        }
    }

    /**
     * 初始化好友缓存表
     * 使用 friendsCacheService 的方法，确保 ID 格式一致
     * @private
     */
    async _initFriendsCache(userId) {
        try {
            console.log('【InitDatabase】开始获取好友列表...')

            // 先清除当前用户的好友缓存
            await friendsCacheService.clearUserCache(userId)

            // 从后端获取好友列表（forceRefresh=true 强制从API获取）
            const friendsList = await friendsService.getFriendsList(true)

            if (!friendsList || friendsList.length === 0) {
                console.log('【InitDatabase】好友列表为空')
                return { success: true, dataCount: 0, message: '好友列表为空' }
            }

            // 使用 friendsCacheService 的 saveFriendsList 方法保存
            // 这个方法会使用正确的 ID 格式：`friend_${currentUserId}_${friend.friendId}`
            await friendsCacheService.saveFriendsList(friendsList)

            console.log(`【InitDatabase】好友缓存初始化成功，共 ${friendsList.length} 条`)
            return {
                success: true,
                dataCount: friendsList.length,
                message: '好友缓存初始化成功'
            }

        } catch (error) {
            console.error('【InitDatabase】初始化好友缓存失败:', error)
            return { success: false, error: error.message, dataCount: 0 }
        }
    }

    /**
     * 初始化多人存钱计划缓存表
     * 使用字符串ID格式
     * @private
     */
    async _initGroupSavingsCache(userId) {
        try {
            console.log('【InitDatabase】开始获取多人存钱计划列表...')

            // 先删除当前用户的所有计划缓存
            const existingPlans = await indexedDBService.query('group_savings_cache', 'userId', userId)
            for (const plan of existingPlans) {
                await indexedDBService.delete('group_savings_cache', plan.id)
            }

            // 从后端获取计划列表（forceRefresh=true 强制从API获取）
            const response = await savingService.getGroupSavingsList({}, true)

            let plans = []
            if (response && response.code === 200) {
                plans = response.data || []
            } else if (Array.isArray(response)) {
                plans = response
            } else if (response && response.data && Array.isArray(response.data)) {
                plans = response.data
            }

            if (!plans || plans.length === 0) {
                console.log('【InitDatabase】多人存钱计划列表为空')
                return { success: true, dataCount: 0, message: '计划列表为空' }
            }

            // 准备保存到缓存的数据（使用ID生成服务）
            const planCacheData = []

            for (const plan of plans) {
                planCacheData.push({
                    // 使用ID生成服务生成计划ID
                    id: idGenerator.generateGroupSavingId(userId, plan.id),
                    originalId: plan.id,
                    userId: userId,
                    planName: plan.name,
                    reason: plan.reason || '',
                    description: plan.description || '',
                    targetAmount: plan.targetAmount,
                    currentAmount: plan.currentAmount,
                    type: plan.type || '日常储蓄',
                    deadline: plan.deadline,
                    creatorId: plan.creatorId,
                    status: plan.status || 'active',
                    createdAt: plan.createdAt,
                    updatedAt: plan.updatedAt,
                    deleted: plan.deleted || 0,
                    deletedAt: plan.deletedAt || null,
                    color: plan.color,
                    icon: plan.icon,
                    cacheTime: new Date().toISOString()
                })
            }

            // 使用 indexedDBService 批量保存
            if (planCacheData.length > 0) {
                await indexedDBService.bulkPut('group_savings_cache', planCacheData)
            }

            console.log(`【InitDatabase】计划缓存初始化成功，共 ${planCacheData.length} 个计划`)
            return {
                success: true,
                dataCount: planCacheData.length,
                message: '计划缓存初始化成功'
            }

        } catch (error) {
            console.error('【InitDatabase】初始化计划缓存失败:', error)
            return { success: false, error: error.message, dataCount: 0 }
        }
    }

    /**
     * 🔥 新增：通过用户ID初始化存钱记录缓存
     * 使用 savingService.getPlanSavingRecordsByUserId 获取当前用户的所有存钱记录
     * @private
     */
    async _initSavingDepositRecordsCacheByUserId(userId) {
        try {
            console.log('【InitDatabase】开始获取当前用户的存钱记录（通过用户ID）...')

            // 先删除当前用户的所有存钱记录缓存
            const existingRecords = await indexedDBService.query('saving_deposit_records_cache', 'userId', userId)
            for (const record of existingRecords) {
                await indexedDBService.delete('saving_deposit_records_cache', record.id)
            }

            // 调用 savingService 的 getPlanSavingRecordsByUserId 方法获取当前用户的所有存钱记录
            const response = await savingService.getPlanSavingRecordsByUserId(userId)

            let records = []
            if (response && response.code === 200) {
                records = response.data || []
                console.log(`【InitDatabase】成功获取到 ${records.length} 条存钱记录`)
            } else {
                console.warn('【InitDatabase】获取存钱记录失败:', response?.message)
                return { success: true, dataCount: 0, message: response?.message || '获取存钱记录失败' }
            }

            if (!records || records.length === 0) {
                console.log('【InitDatabase】没有存钱记录')
                return { success: true, dataCount: 0, message: '没有存钱记录' }
            }

            // 注意：getPlanSavingRecordsByUserId 方法内部已经将数据保存到了缓存
            // 所以这里不需要重复保存，只需要返回结果即可
            console.log(`【InitDatabase】存钱记录缓存初始化成功，共 ${records.length} 条`)
            return {
                success: true,
                dataCount: records.length,
                message: '存钱记录初始化成功'
            }

        } catch (error) {
            console.error('【InitDatabase】初始化存钱记录缓存失败:', error)
            return { success: false, error: error.message, dataCount: 0 }
        }
    }

    /**
     * 使用共享的计划数据初始化成员缓存（优化版本，避免重复请求）
     * @private
     */
    async _initSavingsMembersCacheWithPlans(userId, plansData, forceRefresh, silent) {
        try {
            console.log('【InitDatabase】开始获取成员数据（使用共享计划数据）...')

            // 先删除当前用户的所有成员缓存
            const existingMembers = await indexedDBService.query('savings_members_cache', 'userId', userId)
            for (const member of existingMembers) {
                await indexedDBService.delete('savings_members_cache', member.id)
            }

            if (!plansData || plansData.length === 0) {
                console.log('【InitDatabase】没有计划，跳过成员缓存初始化')
                return { success: true, dataCount: 0, message: '没有计划' }
            }

            const memberCacheData = []

            // 🔥 如果需要获取成员详情，记录需要获取详情的计划
            const plansNeedDetail = []

            for (const plan of plansData) {
                // 检查计划是否已包含成员信息
                if (plan.members && plan.members.length > 0) {
                    // 直接使用计划中的成员信息
                    console.log(`【InitDatabase】计划 ${plan.id} 已有成员信息，共 ${plan.members.length} 个成员`)
                    for (const member of plan.members) {
                        // 只添加未删除的成员
                        if (member.deleted === 1) continue

                        memberCacheData.push({
                            id: idGenerator.generateMemberId(userId, plan.id, member.userId),
                            originalId: member.id,
                            userId: userId,
                            groupSavingId: plan.id,
                            memberId: member.userId,
                            memberName: member.name || member.memberName,
                            amount: member.amount || 0,
                            isCreator: member.isCreator || false,
                            avatar: member.avatar,
                            status: member.status || 'active',
                            joinTime: member.joinTime,
                            deleted: member.deleted || 0,
                            deletedAt: member.deletedAt || null,
                            updateTime: new Date().toISOString(),
                            cacheTime: new Date().toISOString()
                        })
                    }
                } else {
                    // 计划中没有成员信息，需要单独获取详情
                    console.log(`【InitDatabase】计划 ${plan.id} 缺少成员信息，需要获取详情`)
                    plansNeedDetail.push(plan)
                }
            }

            // 🔥 批量获取缺少成员信息的计划详情
            if (plansNeedDetail.length > 0) {
                console.log(`【InitDatabase】需要获取 ${plansNeedDetail.length} 个计划的详情以获取成员信息`)

                for (const plan of plansNeedDetail) {
                    try {
                        // 获取计划详情（包含完整成员列表）
                        const detailResponse = await savingService.getGroupSavingsDetail(plan.id, forceRefresh)

                        let planDetail = null
                        if (detailResponse && detailResponse.code === 200) {
                            planDetail = detailResponse.data
                        } else if (detailResponse && detailResponse.data) {
                            planDetail = detailResponse.data
                        } else if (detailResponse && !detailResponse.code) {
                            planDetail = detailResponse
                        }

                        if (planDetail && planDetail.members && planDetail.members.length > 0) {
                            console.log(`【InitDatabase】计划 ${plan.id} 获取到 ${planDetail.members.length} 个成员`)
                            for (const member of planDetail.members) {
                                // 只添加未删除的成员
                                if (member.deleted === 1) continue

                                memberCacheData.push({
                                    id: idGenerator.generateMemberId(userId, plan.id, member.userId),
                                    originalId: member.id,
                                    userId: userId,
                                    groupSavingId: plan.id,
                                    memberId: member.userId,
                                    memberName: member.name || member.memberName,
                                    amount: member.amount || 0,
                                    isCreator: member.isCreator || member.userId === planDetail.creatorId,
                                    avatar: member.avatar,
                                    status: member.status || 'active',
                                    joinTime: member.joinTime,
                                    deleted: member.deleted || 0,
                                    deletedAt: member.deletedAt || null,
                                    updateTime: new Date().toISOString(),
                                    cacheTime: new Date().toISOString()
                                })
                            }
                        }
                    } catch (error) {
                        console.warn(`【InitDatabase】获取计划 ${plan.id} 的成员详情失败:`, error.message)
                    }
                }
            }

            // 使用 indexedDBService 批量保存
            if (memberCacheData.length > 0) {
                await indexedDBService.bulkPut('savings_members_cache', memberCacheData)
            }

            console.log(`【InitDatabase】成员缓存初始化成功，共 ${memberCacheData.length} 个成员`)
            return {
                success: true,
                dataCount: memberCacheData.length,
                message: '成员缓存初始化成功'
            }

        } catch (error) {
            console.error('【InitDatabase】初始化成员缓存失败:', error)
            return { success: false, error: error.message, dataCount: 0 }
        }
    }

    /**
     * 初始化成员缓存表（保留原有方法作为兼容）
     * 使用字符串ID格式
     * @private
     */
    async _initSavingsMembersCache(userId) {
        try {
            console.log('【InitDatabase】开始获取成员数据...')

            // 先删除当前用户的所有成员缓存
            const existingMembers = await indexedDBService.query('savings_members_cache', 'userId', userId)
            for (const member of existingMembers) {
                await indexedDBService.delete('savings_members_cache', member.id)
            }

            // 获取所有计划列表
            const response = await savingService.getGroupSavingsList({}, true)

            let plans = []
            if (response && response.code === 200) {
                plans = response.data || []
            } else if (Array.isArray(response)) {
                plans = response
            }

            if (!plans || plans.length === 0) {
                console.log('【InitDatabase】没有计划，跳过成员缓存初始化')
                return { success: true, dataCount: 0, message: '没有计划' }
            }

            const memberCacheData = []

            for (const plan of plans) {
                // 获取计划详情（包含完整成员列表）
                const detailResponse = await savingService.getGroupSavingsDetail(plan.id, true)

                let planDetail = null
                if (detailResponse && detailResponse.code === 200) {
                    planDetail = detailResponse.data
                } else if (detailResponse && detailResponse.data) {
                    planDetail = detailResponse.data
                }

                if (planDetail && planDetail.members && planDetail.members.length > 0) {
                    for (const member of planDetail.members) {
                        memberCacheData.push({
                            id: idGenerator.generateMemberId(userId, plan.id, member.userId),
                            originalId: member.id,
                            userId: userId,
                            groupSavingId: plan.id,
                            memberId: member.userId,
                            memberName: member.name || member.memberName,
                            amount: member.amount || 0,
                            isCreator: member.isCreator || false,
                            avatar: member.avatar,
                            status: member.status || 'active',
                            joinTime: member.joinTime,
                            deleted: member.deleted || 0,
                            deletedAt: member.deletedAt || null,
                            updateTime: new Date().toISOString(),
                            cacheTime: new Date().toISOString()
                        })
                    }
                }
            }

            if (memberCacheData.length > 0) {
                await indexedDBService.bulkPut('savings_members_cache', memberCacheData)
            }

            console.log(`【InitDatabase】成员缓存初始化成功，共 ${memberCacheData.length} 个成员`)
            return {
                success: true,
                dataCount: memberCacheData.length,
                message: '成员缓存初始化成功'
            }

        } catch (error) {
            console.error('【InitDatabase】初始化成员缓存失败:', error)
            return { success: false, error: error.message, dataCount: 0 }
        }
    }

    /**
     * 初始化存钱记录缓存表（保留原有方法作为兼容，但建议使用新的方法）
     * 使用字符串ID格式
     * @private
     */
    async _initSavingDepositRecordsCache(userId) {
        // 直接调用新的方法
        return this._initSavingDepositRecordsCacheByUserId(userId)
    }

    /**
     * 初始化商品分类表
     * 如果用户没有分类，创建默认分类
     * @private
     */
    async _initProductCategories(userId) {
        try {
            console.log('【InitDatabase】开始初始化商品分类表...')

            // 检查是否已有分类
            const existingCategories = await indexedDBService.query('product_categories', 'userId', userId)

            if (existingCategories && existingCategories.length > 0) {
                console.log(`【InitDatabase】商品分类表已有 ${existingCategories.length} 条数据，跳过初始化`)
                return { success: true, dataCount: existingCategories.length, message: '已有数据，跳过', skipped: true }
            }

            // 默认分类列表
            const defaultCategories = [
                { name: '蔬菜', icon: 'fas fa-carrot', sortOrder: 1, isDefault: true },
                { name: '水果', icon: 'fas fa-apple-alt', sortOrder: 2, isDefault: true },
                { name: '粮油', icon: 'fas fa-seedling', sortOrder: 3, isDefault: true },
                { name: '调味品', icon: 'fas fa-mortar-pestle', sortOrder: 4, isDefault: true },
                { name: '早餐', icon: 'fas fa-bread-slice', sortOrder: 5, isDefault: true },
                { name: '日用品', icon: 'fas fa-tshirt', sortOrder: 6, isDefault: true },
                { name: '其他', icon: 'fas fa-tag', sortOrder: 99, isDefault: true }
            ]

            // 创建默认分类（使用ID生成服务）
            const categoryCacheData = defaultCategories.map(category => ({
                id: idGenerator.generateCategoryId(userId),
                ...category,
                userId: userId,
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString()
            }))

            await indexedDBService.bulkPut('product_categories', categoryCacheData)

            console.log(`【InitDatabase】商品分类表初始化成功，共 ${categoryCacheData.length} 个默认分类`)
            return { success: true, dataCount: categoryCacheData.length, message: '商品分类初始化成功' }

        } catch (error) {
            console.error('【InitDatabase】初始化商品分类表失败:', error)
            return { success: false, error: error.message, dataCount: 0 }
        }
    }

    /**
     * 初始化商品表
     * 如果用户没有商品，创建默认商品
     * @private
     */
    async _initProducts(userId) {
        try {
            console.log('【InitDatabase】开始初始化商品表...')

            // 检查是否已有商品
            const existingProducts = await indexedDBService.query('products', 'userId', userId)

            if (existingProducts && existingProducts.length > 0) {
                console.log(`【InitDatabase】商品表已有 ${existingProducts.length} 条数据，跳过初始化`)
                return { success: true, dataCount: existingProducts.length, message: '已有数据，跳过', skipped: true }
            }

            // 默认商品列表
            const defaultProducts = [
                { name: '大白菜', category: '蔬菜', unit: '斤', defaultPrice: 2.5 },
                { name: '土豆', category: '蔬菜', unit: '斤', defaultPrice: 2.0 },
                { name: '苹果', category: '水果', unit: '斤', defaultPrice: 5.0 },
                { name: '香蕉', category: '水果', unit: '斤', defaultPrice: 4.5 },
                { name: '大米', category: '粮油', unit: '袋', defaultPrice: 50.0 },
                { name: '食用油', category: '粮油', unit: '桶', defaultPrice: 80.0 },
                { name: '酱油', category: '调味品', unit: '瓶', defaultPrice: 15.0 },
                { name: '醋', category: '调味品', unit: '瓶', defaultPrice: 12.0 }
            ]

            // 创建默认商品（使用ID生成服务）
            const productCacheData = defaultProducts.map(product => ({
                id: idGenerator.generateProductId(userId),
                ...product,
                userId: userId,
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString()
            }))

            await indexedDBService.bulkPut('products', productCacheData)

            console.log(`【InitDatabase】商品表初始化成功，共 ${productCacheData.length} 个默认商品`)
            return { success: true, dataCount: productCacheData.length, message: '商品初始化成功' }

        } catch (error) {
            console.error('【InitDatabase】初始化商品表失败:', error)
            return { success: false, error: error.message, dataCount: 0 }
        }
    }

    /**
     * 初始化普通表（创建默认数据或空结构）
     * 使用 indexedDBService 的方法
     * @private
     */
    async _initDefaultTable(tableName, userId) {
        try {
            // 检查是否已有数据
            const existingData = await indexedDBService.getAll(tableName)
            if (existingData && existingData.length > 0) {
                return { success: true, dataCount: existingData.length, message: '已有数据，跳过', skipped: true }
            }

            // 对于普通表，如果没有数据，可以创建一些默认数据（根据表类型）
            // 这里只做空初始化，不创建默认数据
            console.log(`【InitDatabase】表 ${tableName} 为空，无需初始化`)
            return { success: true, dataCount: 0, message: '表为空，无需初始化' }

        } catch (error) {
            console.error(`【InitDatabase】初始化表 ${tableName} 失败:`, error)
            return { success: false, error: error.message, dataCount: 0 }
        }
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

    /**
     * 重置初始化状态
     */
    reset() {
        this.isInitializing = false
        this.initialized = false
        this.initPromise = null
        console.log('【InitDatabase】初始化状态已重置')
    }
}

export default new InitDatabaseService()