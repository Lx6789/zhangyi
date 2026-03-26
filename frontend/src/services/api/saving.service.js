// src/services/api/saving.service.js

import * as savingApi from '@/api/saving'
import {authHelperService, notificationService} from '@/services'
import businessDataService from '@/services/cache/business-cache.service.js'
import groupSavingCacheService from "@/services/cache/group-saving-cache.service";
import indexedDBService from '@/services/db/indexed-db.service.js'
import {personalSavingCache} from "@/services";
import idGenerator from '@/services/id-generator.service.js'

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
                join: ['PLAN_LIST', 'PLAN_DETAIL', 'MEMBERS'],
                create: ['PLAN_LIST'],
                update: ['PLAN_LIST', 'PLAN_DETAIL']
            }
        }

        // 当前用户ID（需要在登录后设置）
        this.currentUserId = null

        // 🔥 添加请求去重机制
        this.pendingRequests = new Map() // 存储正在进行的请求
        this.cacheExpiry = 5000 // 5秒内相同请求不重复发送

        // 尝试从 localStorage 初始化用户ID
        this.initFromStorage()
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
     * 生成请求的唯一键
     * @param {string} method - 方法名
     * @param {...any} args - 参数
     * @returns {string} 唯一键
     */
    _generateRequestKey(method, ...args) {
        try {
            return `${method}_${JSON.stringify(args)}`
        } catch (error) {
            // 如果序列化失败，使用备用方案
            return `${method}_${Date.now()}_${Math.random()}`
        }
    }

    /**
     * 带去重的请求包装器
     * @param {string} key - 请求唯一键
     * @param {Function} requestFn - 实际请求函数
     * @returns {Promise<any>} 请求结果
     */
    async _deduplicateRequest(key, requestFn) {
        // 检查是否有正在进行的相同请求
        if (this.pendingRequests.has(key)) {
            console.log(`【Service】复用正在进行的请求: ${key}`)
            return this.pendingRequests.get(key)
        }

        // 创建新的请求 Promise
        const requestPromise = requestFn()

        // 存储到 pendingRequests
        this.pendingRequests.set(key, requestPromise)

        try {
            const result = await requestPromise
            return result
        } finally {
            // 延迟删除，避免短时间内重复请求
            setTimeout(() => {
                this.pendingRequests.delete(key)
            }, this.cacheExpiry)
        }
    }

    /**
     * 从 localStorage 初始化
     */
    initFromStorage() {
        try {
            const savedUserId = localStorage.getItem('userId')
            if (savedUserId) {
                this.currentUserId = parseInt(savedUserId)
                console.log('【SavingService】从 localStorage 初始化用户ID:', this.currentUserId)

                // 初始化缓存服务
                if (groupSavingCacheService && groupSavingCacheService.init) {
                    groupSavingCacheService.init(this.currentUserId).catch(console.warn)
                }
                // 初始化业务数据服务
                businessDataService.init().catch(console.warn)
            }
        } catch (error) {
            console.warn('【SavingService】从 localStorage 初始化失败:', error)
        }
    }

    /**
     * 设置当前用户ID
     */
    setCurrentUser(userId) {
        this.currentUserId = userId
        // 初始化缓存服务
        if (groupSavingCacheService && groupSavingCacheService.init) {
            groupSavingCacheService.init(userId).catch(console.warn)
        }
        if (personalSavingCache && personalSavingCache.init) {
            personalSavingCache.init(userId).catch(console.warn)
        }
        // 初始化业务数据服务
        businessDataService.init(userId).catch(console.warn)

        // 保存到 localStorage
        localStorage.setItem('userId', userId)
        console.log('【SavingService】用户ID已设置:', userId)
    }

    // ==================== 多人存钱计划（后端API） ====================

    /**
     * 获取多人存钱计划列表（带去重）
     * 策略：优先从后端获取最新数据并更新前端数据库
     *       只有在网络不可用或后端接口失败时才使用前端缓存数据
     */
    async getGroupSavingsList(params = {}, forceRefresh = false) {
        const userId = authHelperService.getCurrentUser()?.id;
        if (!userId) {
            console.error('【Service】无法获取用户ID');
            return {
                code: 401,
                message: '用户未登录',
                data: []
            };
        }

        // 生成请求唯一键
        const requestKey = this._generateRequestKey('getGroupSavingsList', userId, forceRefresh);

        // 使用去重包装器
        return this._deduplicateRequest(requestKey, async () => {
            return this._fetchGroupSavingsList(params, forceRefresh, userId);
        });
    }

    /**
     * 实际获取计划列表的方法
     * @private
     */
    async _fetchGroupSavingsList(params, forceRefresh, userId) {
        // 标记是否使用缓存（仅在网络不可用或后端失败时使用）
        let useCache = false;

        // 1. 如果不是强制刷新，先检查网络状态
        if (!forceRefresh && !navigator.onLine) {
            console.log('【Service】网络不可用，尝试使用缓存数据');
            useCache = true;
        }

        // 2. 优先从后端获取数据
        if (!useCache) {
            try {
                console.log('【Service】从后端获取数据, userId:', userId);
                const responseData = await savingApi.getGroupSavingList();
                console.log('【Service】后端返回数据:', responseData);

                if (responseData && Array.isArray(responseData)) {
                    // 后端返回成功，更新前端数据库
                    console.log('【Service】后端数据获取成功，开始更新前端数据库');

                    // 🔥 修改：保存所有数据（包括已删除的计划和成员），不过滤
                    const allData = responseData;
                    console.log('【Service】保存所有计划到缓存，计划数:', allData.length);
                    console.log('【Service】计划详情:', allData.map(p => ({ id: p.id, name: p.name, deleted: p.deleted })));

                    // 清除旧缓存
                    await groupSavingCacheService.clearUserCache(userId);

                    // 保存新数据到缓存（保存所有数据，不过滤）
                    const saveSuccess = await groupSavingCacheService.saveData(userId, allData, true);

                    if (saveSuccess) {
                        console.log('【Service】前端数据库更新成功');
                    } else {
                        console.warn('【Service】前端数据库更新失败，但后端数据获取成功');
                    }

                    // 返回所有数据（包括已删除的）
                    return {
                        code: 200,
                        message: '获取成功',
                        data: allData
                    };
                }
                // 如果后端返回的是包含 code 和 data 的对象（兼容处理）
                else if (responseData && responseData.code === 200 && responseData.data) {
                    console.log('【Service】后端数据获取成功（包装格式），开始更新前端数据库');

                    // 🔥 修改：保存所有数据（包括已删除的计划和成员），不过滤
                    const allData = responseData.data;
                    console.log('【Service】保存所有计划到缓存，计划数:', allData.length);
                    console.log('【Service】计划详情:', allData.map(p => ({ id: p.id, name: p.name, deleted: p.deleted })));

                    await groupSavingCacheService.clearUserCache(userId);
                    await groupSavingCacheService.saveData(userId, allData, true);

                    return {
                        code: 200,
                        message: responseData.message || '获取成功',
                        data: allData
                    };
                }
                // 后端返回格式异常
                else {
                    console.warn('【Service】后端返回格式异常，尝试使用缓存数据:', responseData);
                    useCache = true;
                }
            } catch (error) {
                console.error('【Service】从后端获取数据失败:', error);
                // 网络错误或后端异常，使用缓存数据
                useCache = true;

                // 如果是网络错误，显示提示但不弹出错误通知（静默降级）
                if (this.isNetworkError(error)) {
                    console.log('【Service】网络错误，降级使用缓存数据');
                }
            }
        }

        // 3. 使用缓存数据（网络不可用或后端失败时）
        if (useCache) {
            console.log('【Service】从缓存获取数据, userId:', userId);

            try {
                // 🔥 修复：查询当前用户的成员记录（按 userId 过滤）
                const allMembersCache = await indexedDBService.query('savings_members_cache', 'userId', parseInt(userId));

                console.log('【Service】缓存中查询到的所有成员记录数:', allMembersCache.length);
                console.log('【Service】缓存成员记录详情:', allMembersCache.map(m => ({
                    memberId: m.memberId,
                    groupSavingId: m.groupSavingId,
                    memberName: m.memberName,
                    deleted: m.deleted,
                    amount: m.amount,
                    userId: m.userId
                })));

                // 获取所有成员记录（包括已删除的），用于后续过滤
                const userActiveMembers = allMembersCache.filter(member => member.deleted !== 1);

                console.log('【Service】缓存中用户参与的活跃成员记录:', userActiveMembers.length);
                console.log('【Service】缓存中已退出的成员记录:', allMembersCache.filter(m => m.deleted === 1).length);

                if (userActiveMembers.length === 0) {
                    console.log('【Service】缓存中用户没有参与任何活跃计划');
                    return {
                        code: 200,
                        message: '获取成功（缓存无数据）',
                        data: []
                    };
                }

                // 获取用户参与的所有计划ID（去重）
                const userPlanIds = [...new Set(userActiveMembers.map(member => member.groupSavingId))];
                console.log('【Service】缓存中用户参与的计划ID:', userPlanIds);

                // 🔥 修复：查询计划表时，只查询当前用户的计划
                const allGroupSavings = await indexedDBService.query('group_savings_cache', 'userId', parseInt(userId));

                console.log('【Service】缓存中当前用户计划数量:', allGroupSavings.length);
                console.log('【Service】缓存中计划详情:', allGroupSavings.map(p => ({
                    id: p.id,
                    originalId: p.originalId,
                    planName: p.planName,
                    userId: p.userId,
                    deleted: p.deleted
                })));

                // 过滤出用户参与的计划（包括已删除的计划，但会在组装时标记）
                const userPlans = allGroupSavings.filter(group => {
                    const groupId = group.originalId || group.id;
                    return userPlanIds.includes(groupId);
                });

                console.log('【Service】缓存中找到用户参与的计划:', userPlans.length);
                console.log('【Service】用户计划详情:', userPlans.map(g => ({
                    id: g.originalId || g.id,
                    name: g.planName,
                    creatorId: g.creatorId,
                    deleted: g.deleted
                })));

                if (userPlans.length === 0) {
                    console.log('【Service】缓存中没有用户参与的计划');
                    return {
                        code: 200,
                        message: '获取成功（缓存无用户计划）',
                        data: []
                    };
                }

                // 🔥 修复：查询成员数据时，也只查询当前用户的成员
                const allMembers = await indexedDBService.query('savings_members_cache', 'userId', parseInt(userId));

                console.log('【Service】当前用户成员缓存总数:', allMembers.length);

                // 将成员信息按计划ID分组，保留所有成员（包括已删除的）
                const membersByPlanId = {};
                for (const member of allMembers) {
                    if (userPlanIds.includes(member.groupSavingId)) {
                        if (!membersByPlanId[member.groupSavingId]) {
                            membersByPlanId[member.groupSavingId] = [];
                        }
                        membersByPlanId[member.groupSavingId].push({
                            userId: member.memberId,
                            name: member.memberName,
                            avatar: member.avatar || member.memberName?.charAt(0) || '👤',
                            amount: member.amount || 0,
                            isCreator: member.isCreator || false,
                            deleted: member.deleted || 0,
                            deletedAt: member.deletedAt || null
                        });
                    }
                }

                console.log('【Service】按计划分组的成员:', Object.keys(membersByPlanId).map(planId => ({
                    planId: planId,
                    memberCount: membersByPlanId[planId]?.length || 0
                })));

                // 组装每个计划的数据（包括已删除的计划和成员）
                const assembledData = userPlans.map(group => {
                    const groupId = group.originalId || group.id;
                    const members = membersByPlanId[groupId] || [];

                    // 🔥 重要：即使计划没有成员（已删除所有成员），也显示计划，但标记为已删除
                    if (members.length === 0 && group.deleted !== 1) {
                        console.log('【Service】计划', group.planName, '没有成员，但计划未删除，保留显示');
                    }

                    const totalAmount = members.reduce((sum, member) => sum + (member.amount || 0), 0);
                    const targetAmount = group.targetAmount || 0;
                    const progress = targetAmount > 0
                        ? Math.min(Math.round((totalAmount / targetAmount) * 100), 100)
                        : 0;

                    return {
                        id: groupId,
                        name: group.planName,
                        reason: group.reason || '',
                        description: group.description || '',
                        targetAmount: targetAmount,
                        currentAmount: totalAmount,
                        deadline: group.deadline || '',
                        type: group.type || '日常储蓄',
                        status: group.status || 'active',
                        creatorId: group.creatorId,
                        createdAt: group.createdAt || group.cacheTime,
                        updatedAt: group.updatedAt || group.cacheTime,
                        icon: group.icon || groupSavingCacheService.getIconByType(group.type),
                        color: group.color || groupSavingCacheService.getColorByType(group.type),
                        progress: progress,
                        completed: totalAmount >= targetAmount,
                        members: members,
                        memberCount: members.length,
                        deleted: group.deleted || 0,
                        deletedAt: group.deletedAt || null
                    };
                });

                // 按更新时间排序（最新的在前）
                assembledData.sort((a, b) => {
                    const timeA = new Date(a.updatedAt || 0).getTime();
                    const timeB = new Date(b.updatedAt || 0).getTime();
                    return timeB - timeA;
                });

                console.log('【Service】从缓存返回组装后的计划数:', assembledData.length);
                console.log('【Service】组装后的计划:', assembledData.map(p => ({ id: p.id, name: p.name, memberCount: p.memberCount, deleted: p.deleted })));

                return {
                    code: 200,
                    message: '获取成功（缓存）',
                    data: assembledData
                };

            } catch (cacheError) {
                console.error('【Service】读取缓存失败:', cacheError);
                return {
                    code: 500,
                    message: '数据加载失败',
                    data: []
                };
            }
        }

        // 4. 不应该走到这里，但作为兜底
        return {
            code: 500,
            message: '未知错误',
            data: []
        };
    }

    /**
     * 获取活跃计划（过滤掉已删除的计划和成员）
     * 用于需要只显示活跃计划的场景
     */
    getActivePlans(plansData) {
        if (!plansData || !Array.isArray(plansData)) {
            return [];
        }

        return plansData
            .filter(plan => {
                if (plan.deleted === 1) return false;
                if (!plan.members || plan.members.length === 0) return false;
                const hasActiveMembers = plan.members.some(member => member.deleted !== 1);
                return hasActiveMembers;
            })
            .map(plan => {
                const activeMembers = plan.members.filter(member => member.deleted !== 1);
                const totalAmount = activeMembers.reduce((sum, member) => sum + (member.amount || 0), 0);
                const progress = plan.targetAmount > 0
                    ? Math.min(Math.round((totalAmount / plan.targetAmount) * 100), 100)
                    : 0;

                return {
                    ...plan,
                    currentAmount: totalAmount,
                    progress: progress,
                    members: activeMembers,
                    memberCount: activeMembers.length,
                    completed: totalAmount >= plan.targetAmount
                };
            });
    }

    /**
     * 获取多人存钱计划详情（带去重）
     * @param {number} id - 计划ID
     * @param {boolean} forceRefresh - 是否强制从服务器刷新
     * @returns {Promise<Object>} 计划详情
     */
    async getGroupSavingsDetail(id, forceRefresh = false) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id;
        if (!userId) {
            console.error('【Service】无法获取用户ID');
            return {
                code: 401,
                message: '用户未登录',
                data: null
            };
        }

        // 生成请求唯一键
        const requestKey = this._generateRequestKey('getGroupSavingsDetail', userId, id, forceRefresh);

        // 使用去重包装器
        return this._deduplicateRequest(requestKey, async () => {
            return this._fetchGroupSavingsDetail(id, forceRefresh, userId);
        });
    }

    /**
     * 实际获取计划详情的方法
     * @private
     */
    async _fetchGroupSavingsDetail(id, forceRefresh, userId) {
        // 标记是否使用缓存
        let useCache = false;

        // 1. 如果不是强制刷新，先检查网络状态
        if (!forceRefresh && !navigator.onLine) {
            console.log('【Service】网络不可用，尝试从缓存获取详情');
            useCache = true;
        }

        // 2. 优先从后端获取数据
        if (!useCache) {
            try {
                console.log('【Service】从后端获取计划详情, planId:', id);
                const responseData = await savingApi.getGroupSavingDetail(id);
                console.log('【Service】后端返回详情:', responseData);

                if (responseData && responseData.code === 200 && responseData.data) {
                    const planDetail = responseData.data;

                    // 后端返回成功，更新前端数据库
                    console.log('【Service】后端数据获取成功，开始更新前端数据库');

                    // 转换为缓存格式
                    const planToCache = this.convertPlanDetailToCacheFormat(planDetail, userId);

                    // 保存到缓存
                    await groupSavingCacheService.savePlanDetail(userId, planToCache);

                    // 保存存钱记录
                    if (planDetail.records && planDetail.records.length > 0) {
                        // 先清除该计划的旧存钱记录缓存
                        await groupSavingCacheService.clearPlanDepositRecordsCache(userId, id);
                        // 保存新的存钱记录
                        await groupSavingCacheService.saveDepositRecords(userId, id, planDetail.records);
                    }

                    return {
                        code: 200,
                        message: responseData.message || '获取成功',
                        data: planToCache
                    };
                } else if (responseData && responseData.code === 200 && !responseData.data) {
                    // 计划不存在或已删除
                    console.log('【Service】计划不存在或已删除');
                    // 清除缓存中该计划的数据
                    await groupSavingCacheService.clearPlanCache(userId, id);
                    return {
                        code: 404,
                        message: '计划不存在或已删除',
                        data: null
                    };
                } else {
                    console.warn('【Service】后端返回格式异常:', responseData);
                    useCache = true;
                }
            } catch (error) {
                console.error('【Service】从后端获取详情失败:', error);
                useCache = true;

                if (this.isNetworkError(error)) {
                    console.log('【Service】网络错误，降级使用缓存数据');
                }
            }
        }

        // 3. 使用缓存数据
        if (useCache) {
            console.log('【Service】从缓存获取计划详情, planId:', id);

            try {
                const cachedPlan = await groupSavingCacheService.getPlanDetail(userId, id);

                if (cachedPlan) {
                    console.log('【Service】从缓存获取到计划详情:', cachedPlan.name);
                    return {
                        code: 200,
                        message: '获取成功（缓存）',
                        data: cachedPlan
                    };
                } else {
                    console.log('【Service】缓存中没有该计划详情');
                    return {
                        code: 404,
                        message: '计划不存在',
                        data: null
                    };
                }
            } catch (cacheError) {
                console.error('【Service】读取缓存失败:', cacheError);
                return {
                    code: 500,
                    message: '数据加载失败',
                    data: null
                };
            }
        }

        return {
            code: 500,
            message: '未知错误',
            data: null
        };
    }

    /**
     * 将后端返回的计划详情转换为缓存格式
     * @param {Object} planDetail - 后端返回的计划详情
     * @param {number} userId - 用户ID
     * @returns {Object} 缓存格式的计划详情
     */
    convertPlanDetailToCacheFormat(planDetail, userId) {
        const now = new Date().toISOString();

        // 计算进度
        const targetAmount = planDetail.targetAmount || 0;
        const currentAmount = planDetail.currentAmount || 0;
        const progress = targetAmount > 0
            ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100)
            : 0;

        return {
            id: planDetail.id,
            name: planDetail.name,
            reason: planDetail.reason || '',
            description: planDetail.description || '',
            targetAmount: targetAmount,
            currentAmount: currentAmount,
            type: planDetail.type || '日常储蓄',
            deadline: planDetail.deadline,
            creatorId: planDetail.creatorId,
            status: planDetail.status || 'active',
            createdAt: planDetail.createTime || now,
            updatedAt: planDetail.updateTime || now,
            deleted: planDetail.deleted || 0,
            deletedAt: planDetail.deletedAt || null,
            progress: progress,
            completed: currentAmount >= targetAmount,
            color: planDetail.color || groupSavingCacheService.getColorByType(planDetail.type),
            icon: planDetail.icon || groupSavingCacheService.getIconByType(planDetail.type),
            members: (planDetail.members || []).map(m => ({
                id: m.id,
                userId: m.userId,
                memberName: m.memberName,
                name: m.memberName || `用户${m.userId}`,
                amount: m.amount || 0,
                isCreator: m.isCreator || m.userId === planDetail.creatorId,
                joinTime: m.joinTime || now,
                deleted: m.deleted || 0,
                deletedAt: m.deletedAt || null,
                avatar: m.avatar || this.getDefaultAvatar(m.memberName)
            })),
            memberCount: (planDetail.members || []).filter(m => m.deleted !== 1).length
        };
    }

    /**
     * 获取计划的存钱记录（分页）
     * @param {number} planId - 计划ID
     * @param {Object} params - 查询参数 { page, size, memberId, startTime, endTime }
     * @param {boolean} forceRefresh - 是否强制从服务器刷新
     * @returns {Promise<Object>} 分页记录
     */
    async getPlanSavingRecordsByPost(planId, params = {}, forceRefresh = false) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id;
        if (!userId) {
            console.error('【Service】无法获取用户ID');
            return {
                code: 401,
                message: '用户未登录',
                data: { records: [], total: 0, page: 1, size: 10, pages: 0 }
            };
        }

        // 构建查询参数
        const queryParams = {
            page: params.page || 1,
            size: params.size || 10,
            memberId: params.memberId || null,
            startTime: params.startTime || null,
            endTime: params.endTime || null
        };

        let useCache = false;

        // 1. 如果不是强制刷新，先检查网络状态
        if (!forceRefresh && !navigator.onLine) {
            console.log('【Service】网络不可用，尝试从缓存获取存钱记录');
            useCache = true;
        }

        // 2. 优先从后端获取数据
        if (!useCache) {
            try {
                console.log('【Service】从后端获取存钱记录, planId:', planId, 'params:', queryParams);
                const responseData = await savingApi.getSavingRecordsByPost(planId, queryParams);
                console.log('【Service】后端返回记录:', responseData);

                if (responseData && responseData.code === 200 && responseData.data) {
                    const recordsData = responseData.data;

                    // 后端返回成功，更新前端数据库
                    console.log('【Service】后端数据获取成功，开始更新前端数据库');

                    // ========== 保存存钱记录到缓存 ==========
                    const records = recordsData.records || [];

                    if (records.length > 0) {
                        console.log('【Service】保存存钱记录到缓存，共', records.length, '条');

                        // 先清除该计划的旧存钱记录缓存
                        await groupSavingCacheService.clearPlanDepositRecordsCache(userId, planId);

                        // 保存新的存钱记录
                        await groupSavingCacheService.saveDepositRecords(
                            userId,
                            planId,
                            records,
                            queryParams
                        );
                    } else {
                        console.log('【Service】没有存钱记录需要保存');
                        // 如果没有记录，也清除旧缓存
                        await groupSavingCacheService.clearPlanDepositRecordsCache(userId, planId);
                    }

                    // 保存统计信息
                    await groupSavingCacheService.saveRecordsStats(userId, planId, {
                        total: recordsData.total || 0,
                        normalCount: recordsData.stats?.normalCount || 0,
                        deletedCount: recordsData.stats?.deletedCount || 0
                    });

                    return {
                        code: 200,
                        message: responseData.message || '获取成功',
                        data: {
                            records: records,
                            total: recordsData.total || 0,
                            page: queryParams.page,
                            size: queryParams.size,
                            pages: recordsData.pages || 0,
                            stats: recordsData.stats || { normalCount: 0, deletedCount: 0 }
                        }
                    };
                } else {
                    console.warn('【Service】后端返回格式异常:', responseData);
                    useCache = true;
                }
            } catch (error) {
                console.error('【Service】从后端获取存钱记录失败:', error);
                useCache = true;
            }
        }

        // 3. 使用缓存数据
        if (useCache) {
            console.log('【Service】从缓存获取存钱记录, planId:', planId);

            try {
                const cachedRecords = await groupSavingCacheService.getDepositRecords(
                    userId,
                    planId,
                    queryParams
                );

                if (cachedRecords) {
                    console.log('【Service】从缓存获取到存钱记录:', cachedRecords.records?.length || 0);
                    return {
                        code: 200,
                        message: '获取成功（缓存）',
                        data: cachedRecords
                    };
                } else {
                    console.log('【Service】缓存中没有存钱记录');
                    return {
                        code: 200,
                        message: '暂无记录',
                        data: {
                            records: [],
                            total: 0,
                            page: queryParams.page,
                            size: queryParams.size,
                            pages: 0,
                            stats: { normalCount: 0, deletedCount: 0 }
                        }
                    };
                }
            } catch (cacheError) {
                console.error('【Service】读取缓存失败:', cacheError);
                return {
                    code: 500,
                    message: '数据加载失败',
                    data: {
                        records: [],
                        total: 0,
                        page: queryParams.page,
                        size: queryParams.size,
                        pages: 0,
                        stats: { normalCount: 0, deletedCount: 0 }
                    }
                };
            }
        }

        return {
            code: 500,
            message: '未知错误',
            data: {
                records: [],
                total: 0,
                page: queryParams.page,
                size: queryParams.size,
                pages: 0,
                stats: { normalCount: 0, deletedCount: 0 }
            }
        };
    }

    /**
     * 根据userId获取多人存钱记录详细信息
     * @param {number|string} userId - 用户ID
     * @returns {Promise<Object>} 存钱记录列表
     */
    async getPlanSavingRecordsByUserId(userId) {
        try {
            console.log('【Service】开始获取用户存钱记录，userId:', userId);

            // 1. 获取当前登录用户ID（用于权限验证和缓存隔离）
            const currentUserId = this.currentUserId || authHelperService.getCurrentUser()?.id;
            if (!currentUserId) {
                console.error('【Service】无法获取当前用户ID');
                return {
                    code: 401,
                    message: '用户未登录',
                    data: []
                };
            }

            // 2. 参数验证
            if (!userId) {
                console.error('【Service】用户ID不能为空');
                return {
                    code: 400,
                    message: '用户ID不能为空',
                    data: []
                };
            }

            // 3. 调用后端API获取数据
            console.log('【Service】从后端获取用户存钱记录，userId:', userId);
            const response = await savingApi.getSavingRecordsByUserId(userId);
            console.log('【Service】后端返回用户存钱记录:', response);

            // 4. 处理响应数据
            let records = [];

            if (response && Array.isArray(response)) {
                records = response;
                console.log('【Service】后端返回数据格式为数组，共', records.length, '条记录');
                console.log('【Service】记录示例:', records[0]);
            }
            else if (response && response.code === 200 && response.data) {
                records = response.data;
                console.log('【Service】后端返回数据格式为包装对象，共', records.length, '条记录');
                console.log('【Service】记录示例:', records[0]);
            }
            else if (response && response.data && Array.isArray(response.data)) {
                records = response.data;
                console.log('【Service】后端返回数据格式为嵌套数组，共', records.length, '条记录');
            }
            else {
                console.warn('【Service】后端返回数据格式异常:', response);
                return {
                    code: 200,
                    message: '获取成功',
                    data: []
                };
            }

            // 5. 如果有数据，保存到缓存
            if (records.length > 0) {
                console.log('【Service】开始保存存钱记录到缓存，共', records.length, '条');

                await indexedDBService.ensureInitialized();

                // 先清除该用户的所有旧存钱记录缓存
                await groupSavingCacheService.clearUserDepositRecordsCache(currentUserId, userId);

                // 保存新的存钱记录到缓存
                const saveSuccess = await groupSavingCacheService.saveUserDepositRecords(
                    currentUserId,
                    userId,  // userId 就是目标用户ID
                    records
                );

                if (saveSuccess) {
                    console.log('【Service】成功保存', records.length, '条存钱记录到缓存');
                } else {
                    console.warn('【Service】保存存钱记录到缓存失败');
                }

                return {
                    code: 200,
                    message: '获取成功',
                    data: records
                };
            } else {
                console.log('【Service】用户没有存钱记录');

                await groupSavingCacheService.clearUserDepositRecordsCache(currentUserId, userId);

                return {
                    code: 200,
                    message: '暂无记录',
                    data: []
                };
            }

        } catch (error) {
            console.error('【Service】获取用户存钱记录失败:', error);

            if (this.isNetworkError(error)) {
                console.log('【Service】网络错误，尝试从缓存获取用户存钱记录');
                const cachedRecords = await groupSavingCacheService.getUserDepositRecordsFromCache(
                    this.currentUserId,
                    userId
                );

                if (cachedRecords && cachedRecords.length > 0) {
                    return {
                        code: 200,
                        message: '获取成功（缓存）',
                        data: cachedRecords
                    };
                }
            }

            return {
                code: 500,
                message: error.message || '获取失败',
                data: []
            };
        }
    }

    /**
     * 获取成员的存钱记录
     * @param {number} planId - 计划ID
     * @param {number} memberId - 成员用户ID
     * @param {boolean} forceRefresh - 是否强制从服务器刷新
     * @returns {Promise<Object>} 成员存钱记录
     */
    async getMemberSavingRecords(planId, memberId, forceRefresh = false) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id;
        if (!userId) {
            console.error('【Service】无法获取用户ID');
            return {
                code: 401,
                message: '用户未登录',
                data: []
            };
        }

        let useCache = false;

        // 1. 如果不是强制刷新，先检查网络状态
        if (!forceRefresh && !navigator.onLine) {
            console.log('【Service】网络不可用，尝试从缓存获取成员记录');
            useCache = true;
        }

        // 2. 优先从后端获取数据
        if (!useCache) {
            try {
                console.log('【Service】从后端获取成员存钱记录, planId:', planId, 'memberId:', memberId);
                const response = await savingApi.getMemberSavingRecords(planId, memberId);
                console.log('【Service】后端返回成员记录:', response);

                // http-interceptor 在 code === 200 时返回 response.data
                // 所以 response 直接就是 data 数组
                if (response && Array.isArray(response)) {
                    const records = response;

                    // 后端返回成功，更新前端数据库
                    console.log('【Service】后端数据获取成功，共', records.length, '条记录');

                    // 保存成员存钱记录到缓存
                    await groupSavingCacheService.saveMemberDepositRecords(
                        userId,
                        planId,
                        memberId,
                        records
                    );

                    return {
                        code: 200,
                        message: '获取成功',
                        data: records
                    };
                } else if (response && response.code === 200 && response.data) {
                    // 兼容其他格式
                    const records = response.data;
                    await groupSavingCacheService.saveMemberDepositRecords(
                        userId,
                        planId,
                        memberId,
                        records
                    );
                    return {
                        code: 200,
                        message: response.message || '获取成功',
                        data: records
                    };
                } else {
                    console.warn('【Service】后端返回格式异常:', response);
                    useCache = true;
                }
            } catch (error) {
                console.error('【Service】从后端获取成员记录失败:', error);
                useCache = true;
            }
        }

        // 3. 使用缓存数据
        if (useCache) {
            console.log('【Service】从缓存获取成员存钱记录, planId:', planId, 'memberId:', memberId);

            try {
                const cachedRecords = await groupSavingCacheService.getMemberDepositRecords(
                    userId,
                    planId,
                    memberId
                );

                if (cachedRecords && cachedRecords.length > 0) {
                    console.log('【Service】从缓存获取到成员记录:', cachedRecords.length);
                    return {
                        code: 200,
                        message: '获取成功（缓存）',
                        data: cachedRecords
                    };
                } else {
                    console.log('【Service】缓存中没有成员记录');
                    return {
                        code: 200,
                        message: '暂无记录',
                        data: []
                    };
                }
            } catch (cacheError) {
                console.error('【Service】读取缓存失败:', cacheError);
                return {
                    code: 500,
                    message: '数据加载失败',
                    data: []
                };
            }
        }

        return {
            code: 500,
            message: '未知错误',
            data: []
        };
    }

    /**
     * 创建多人存钱计划
     */
    async createGroupSavings(data) {
        // 1. 先检查网络状态
        if (!navigator.onLine) {
            console.warn('离线状态无法创建多人存钱计划');
            notificationService.showNotification('当前处于离线状态，无法创建多人存钱计划，请连接网络后重试', 'warning');
            return {
                success: false,
                message: '当前处于离线状态，无法创建多人存钱计划，请连接网络后重试'
            };
        }

        // 2. 获取当前用户ID
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id;
        if (!userId) {
            console.error('无法获取用户ID');
            notificationService.showNotification('用户未登录，请重新登录', 'error');
            return {
                success: false,
                message: '用户未登录，请重新登录'
            };
        }

        // 3. 构造传给后端的数据
        const creator = data.members?.find(m => m.isCreator) || { userId };

        const newData = {
            name: data.name,
            description: data.description || '',
            reason: data.reason || '',
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount || 0,
            deadline: data.deadline,
            type: data.type || '日常储蓄',
            creatorId: creator.userId,
            // 构造成员信息 - 多个成员，包含 deleted 字段（新增成员默认为0）
            members: data.members && data.members.length > 0
                ? data.members.map(member => ({
                    userId: member.userId,
                    memberName: member.name,
                    amount: member.amount || 0,
                    isCreator: member.isCreator || member.userId === creator.userId,
                    // 新增成员默认 deleted 为 0
                    deleted: 0,
                    deletedAt: null
                }))
                : []
        };

        try {
            console.log('【Service】创建多人存钱计划，发送数据:', newData);

            // 4. 调用后端接口
            const response = await savingApi.createGroupSaving(newData);
            console.log('【Service】创建多人存钱计划响应:', response);

            // 5. 处理响应
            if (response) {
                // 后端可能直接返回groupId，也可能返回包含groupId的对象
                const groupId = response.data || response.groupId || response;

                console.log('【Service】创建成功，计划ID:', groupId);

                // 6. 准备缓存数据
                const now = new Date().toISOString();
                const planToCache = {
                    id: groupId,
                    name: data.name,
                    reason: data.reason || '',
                    description: data.description || '',
                    targetAmount: data.targetAmount,
                    currentAmount: data.currentAmount || 0,
                    type: data.type || '日常储蓄',
                    deadline: data.deadline,
                    creatorId: creator.userId,
                    status: 'active',
                    createdAt: now,
                    updatedAt: now,
                    deleted: 0,
                    deletedAt: null,
                    color: data.color || groupSavingCacheService.getColorByType(data.type || '日常储蓄'),
                    icon: data.icon || groupSavingCacheService.getIconByType(data.type || '日常储蓄'),
                    members: data.members && data.members.length > 0
                        ? data.members.map(member => ({
                            userId: member.userId,
                            memberName: member.name,
                            name: member.name,
                            amount: member.amount || 0,
                            isCreator: member.isCreator || member.userId === creator.userId,
                            avatar: member.avatar || this.getDefaultAvatar(member.name),
                            status: 'active',
                            joinTime: now,
                            deleted: 0,
                            deletedAt: null
                        }))
                        : []
                };

                // 7. 调用缓存服务保存数据（异步，不阻塞返回）
                groupSavingCacheService.saveData(userId, [planToCache])
                    .then(success => {
                        if (success) {
                            console.log('【Service】计划缓存保存成功');
                        } else {
                            console.warn('【Service】计划缓存保存失败');
                        }
                    })
                    .catch(err => {
                        console.error('【Service】计划缓存保存异常:', err);
                    });

                // 8. 显示成功通知
                notificationService.showNotification('创建成功', 'success');

                // 9. 返回成功结果
                return {
                    success: true,
                    code: 200,
                    data: {
                        id: groupId,
                        ...planToCache
                    },
                    message: '创建成功'
                };
            } else {
                const errorMsg = response?.message || '创建失败';
                console.error('【Service】创建失败:', errorMsg);
                notificationService.showNotification(errorMsg, 'error');
                return {
                    success: false,
                    code: response?.code || 500,
                    message: errorMsg
                };
            }
        } catch (error) {
            console.error('【Service】创建多人存钱计划异常:', error);

            // 如果是网络错误，给出明确的提示
            if (this.isNetworkError(error)) {
                notificationService.showNotification('网络连接失败，请检查网络后重试', 'error');
                return {
                    success: false,
                    message: '网络连接失败，请检查网络后重试'
                };
            }

            const errorMsg = error.response?.data?.message || error.message || '创建失败';
            notificationService.showNotification(errorMsg, 'error');

            return {
                success: false,
                message: errorMsg
            };
        }
    }

    /**
     * 获取默认头像
     * @param {string} name - 成员姓名
     * @returns {string} 头像URL或初始
     */
    getDefaultAvatar(name) {
        if (!name) return '';
        // 返回姓名首字母作为头像
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    }

    /**
     * 通知成员（可选）
     * @param {Array} members - 成员列表
     * @param {Object} plan - 计划信息
     */
    notifyMembers(members, plan) {
        // 这里可以实现发送通知的逻辑
        // 比如通过WebSocket或推送服务
        console.log(`计划 ${plan.name} 创建成功，共 ${members.length} 名成员`);

        // 排除创建者自己
        const otherMembers = members.filter(m => !m.isCreator);
        if (otherMembers.length > 0) {
            console.log(`将通知以下成员:`, otherMembers.map(m => m.name));
            // TODO: 调用通知服务
            // notificationService.notifyMembers(otherMembers, {
            //     title: '新的多人存钱计划',
            //     content: `你已被邀请加入存钱计划：${plan.name}`,
            //     planId: plan.id
            // });
        }
    }

    /**
     * 更新多人存钱计划
     */
    async updateGroupSavings(id, data) {
        // 1. 先检查网络状态
        if (!navigator.onLine) {
            console.warn('离线状态无法更新多人存钱计划');
            notificationService.showNotification('当前处于离线状态，无法更新多人存钱计划，请连接网络后重试', 'warning');
            return {
                success: false,
                message: '当前处于离线状态，无法更新多人存钱计划，请连接网络后重试'
            };
        }

        // 2. 获取当前用户ID
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id;
        if (!userId) {
            console.error('无法获取用户ID');
            notificationService.showNotification('用户未登录，请重新登录', 'error');
            return {
                success: false,
                message: '用户未登录，请重新登录'
            };
        }

        // 3. 检查是否是创建者（只有创建者可以更新计划信息）
        const isCreator = data.creatorId === userId;
        if (!isCreator) {
            console.warn('非创建者无权更新计划');
            notificationService.showNotification('只有创建者可以更新计划信息', 'error');
            return {
                success: false,
                message: '只有创建者可以更新计划信息'
            };
        }

        // 4. 构造传给后端的数据（根据后端 DTO 格式）
        const creator = data.members?.find(m => m.isCreator) || { userId };

        const updateData = {
            name: data.name,
            description: data.description || '',
            reason: data.reason || '',
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount || 0,
            deadline: data.deadline,
            type: data.type || '日常储蓄',
            // 构造成员信息 - 多个成员，保留 deleted 字段
            members: data.members && data.members.length > 0
                ? data.members.map(member => ({
                    memberName: member.name || member.memberName,
                    amount: member.amount || 0,
                    userId: member.userId,
                    isCreator: member.isCreator || member.userId === creator.userId,
                    // 关键修改：保留 deleted 字段，如果成员被删除则设为1，否则设为0
                    deleted: member.deleted === 1 ? 1 : 0,
                    deletedAt: member.deleted === 1 ? (member.deletedAt || new Date().toISOString()) : null,
                }))
                : []
        };

        try {
            console.log('【Service】更新多人存钱计划，ID:', id, '请求数据:', updateData);

            // 5. 调用后端接口
            const response = await savingApi.updateGroupSaving(id, updateData);
            console.log('【Service】更新多人存钱计划响应:', response);

            // 6. 处理响应 - 根据后端返回格式，response 直接就是 data 对象
            if (response) {
                // 检查响应中是否包含计划数据
                if (response.id || response.name) {
                    console.log('【Service】更新成功，计划ID:', response.id || id);

                    // 7. 准备缓存数据（使用后端返回的最新数据，包含deleted字段）
                    const now = new Date().toISOString();

                    // 重要：使用后端返回的 members，确保是最新的成员列表（包含deleted字段）
                    const latestMembers = response.members || [];

                    const planToCache = {
                        id: response.id || id,
                        name: response.name || data.name,
                        reason: response.reason || data.reason || '',
                        description: response.description || data.description || '',
                        targetAmount: response.targetAmount || data.targetAmount,
                        currentAmount: response.currentAmount || data.currentAmount || 0,
                        type: response.type || data.type || '日常储蓄',
                        deadline: response.deadline || data.deadline,
                        creatorId: response.creatorId || creator.userId,
                        status: response.status || 'active',
                        createdAt: response.createTime || data.createdAt || now,
                        updatedAt: response.updateTime || now,
                        deleted: response.deleted || 0,
                        deletedAt: response.deletedAt || null,
                        color: data.color || groupSavingCacheService.getColorByType(response.type || data.type || '日常储蓄'),
                        icon: data.icon || groupSavingCacheService.getIconByType(response.type || data.type || '日常储蓄'),
                        // 使用后端返回的最新成员数据（包含deleted字段）
                        members: latestMembers.map(member => ({
                            userId: member.userId,
                            memberName: member.memberName || member.name,
                            name: member.memberName || member.name,
                            amount: member.amount || 0,
                            isCreator: member.isCreator || member.userId === (response.creatorId || creator.userId),
                            avatar: member.avatar || this.getDefaultAvatar(member.memberName || member.name),
                            status: member.status || 'active',
                            joinTime: member.joinTime || now,
                            deleted: member.deleted || 0,
                            deletedAt: member.deletedAt || null
                        }))
                    };

                    // 8. 重要：先清除该计划的所有旧成员缓存
                    await groupSavingCacheService.clearPlanMembersCache(userId, id);

                    // 9. 然后保存新的计划数据和成员数据（skipClear=true 表示跳过全局清除）
                    await groupSavingCacheService.saveData(userId, [planToCache], true);

                    console.log('【Service】计划缓存更新成功，成员数:', latestMembers.length);

                    // 10. 显示成功通知
                    notificationService.showNotification('更新成功', 'success');

                    // 11. 返回成功结果
                    return {
                        success: true,
                        code: 200,
                        data: planToCache,
                        message: '更新成功'
                    };
                } else {
                    // 如果响应中没有计划数据，但可能是成功的标志
                    console.log('【Service】更新成功（简单响应）');

                    // 使用前端数据构造缓存（包含deleted字段）
                    const now = new Date().toISOString();

                    const planToCache = {
                        id: id,
                        name: data.name,
                        reason: data.reason || '',
                        description: data.description || '',
                        targetAmount: data.targetAmount,
                        currentAmount: data.currentAmount || 0,
                        type: data.type || '日常储蓄',
                        deadline: data.deadline,
                        creatorId: creator.userId,
                        status: data.status || 'active',
                        createdAt: data.createdAt || now,
                        updatedAt: now,
                        deleted: 0,
                        deletedAt: null,
                        color: data.color || groupSavingCacheService.getColorByType(data.type || '日常储蓄'),
                        icon: data.icon || groupSavingCacheService.getIconByType(data.type || '日常储蓄'),
                        // 构造成员数据时保留 deleted 字段
                        members: data.members && data.members.length > 0
                            ? data.members.map(member => ({
                                userId: member.userId,
                                memberName: member.name,
                                name: member.name,
                                amount: member.amount || 0,
                                isCreator: member.isCreator || member.userId === creator.userId,
                                avatar: member.avatar || this.getDefaultAvatar(member.name),
                                status: 'active',
                                joinTime: now,
                                deleted: member.deleted === 1 ? 1 : 0,
                                deletedAt: member.deleted === 1 ? (member.deletedAt || now) : null
                            }))
                            : []
                    };

                    // 先清除该计划的所有旧成员缓存
                    await groupSavingCacheService.clearPlanMembersCache(userId, id);

                    // 保存新的缓存数据
                    await groupSavingCacheService.saveData(userId, [planToCache], true);

                    notificationService.showNotification('更新成功', 'success');

                    return {
                        success: true,
                        code: 200,
                        data: planToCache,
                        message: '更新成功'
                    };
                }
            } else {
                console.error('【Service】更新失败: 响应为空');
                notificationService.showNotification('更新失败：服务器无响应', 'error');
                return {
                    success: false,
                    message: '更新失败：服务器无响应'
                };
            }
        } catch (error) {
            console.error('【Service】更新多人存钱计划异常:', error);

            // 处理网络错误
            if (this.isNetworkError(error)) {
                notificationService.showNotification('网络连接失败，请检查网络后重试', 'error');
                return {
                    success: false,
                    message: '网络连接失败，请检查网络后重试'
                };
            }

            // 其他错误 http-interceptor 已经处理并显示了通知
            return {
                success: false,
                message: error.message || '更新失败'
            };
        }
    }

    /**
     * 删除多人存钱计划
     * @param {number} id - 计划ID
     * @returns {Promise<Object>} 删除结果
     */
    async deleteGroupSavings(id) {
        // 1. 先检查网络状态
        if (!navigator.onLine) {
            console.warn('离线状态无法删除多人存钱计划');
            notificationService.showNotification('当前处于离线状态，无法删除多人存钱计划，请连接网络后重试', 'warning');
            return {
                success: false,
                message: '当前处于离线状态，无法删除多人存钱计划，请连接网络后重试'
            };
        }

        // 2. 获取当前用户ID
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id;
        if (!userId) {
            console.error('无法获取用户ID');
            notificationService.showNotification('用户未登录，请重新登录', 'error');
            return {
                success: false,
                message: '用户未登录，请重新登录'
            };
        }

        try {
            console.log('【Service】开始删除多人存钱计划，ID:', id);

            // 3. 调用后端接口（http-interceptor 会统一处理错误和通知）
            await savingApi.deleteGroupSaving(id);
            console.log('【Service】后端删除成功');

            // 4. 更新前端缓存：软删除计划数据
            const cacheUpdateSuccess = await groupSavingCacheService.softDeletePlan(userId, id);

            if (cacheUpdateSuccess) {
                console.log('【Service】前端缓存更新成功');
            } else {
                console.warn('【Service】前端缓存更新失败，但后端已删除成功');
            }

            // 5. 返回成功结果
            return {
                success: true,
                code: 200,
                message: '删除成功'
            };

        } catch (error) {
            console.error('【Service】删除多人存钱计划异常:', error);

            // 处理网络错误（http-interceptor 可能没有处理这种）
            if (this.isNetworkError(error)) {
                notificationService.showNotification('网络连接失败，请检查网络后重试', 'error');
                return {
                    success: false,
                    message: '网络连接失败，请检查网络后重试'
                };
            }

            // 其他错误 http-interceptor 已经处理并显示了通知
            return {
                success: false,
                message: error.message || '删除失败'
            };
        }
    }

    /**
     * 向多人存钱计划存钱
     * @param {number} planId - 计划ID
     * @param {Object} data - 存钱数据 { memberId, amount, note }
     * @returns {Promise<Object>} 存钱结果
     */
    async depositToGroupSaving(planId, data) {
        // 1. 先检查网络状态
        if (!navigator.onLine) {
            console.warn('离线状态无法存钱');
            notificationService.showNotification('当前处于离线状态，无法存钱，请连接网络后重试', 'warning');
            return {
                code: 500,
                message: '当前处于离线状态，无法存钱，请连接网络后重试'
            };
        }

        // 2. 获取当前用户ID
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id;
        if (!userId) {
            console.error('无法获取用户ID');
            notificationService.showNotification('用户未登录，请重新登录', 'error');
            return {
                code: 401,
                message: '用户未登录，请重新登录'
            };
        }

        // 3. 验证数据
        if (!planId) {
            console.error('计划ID不能为空');
            notificationService.showNotification('计划信息不存在', 'error');
            return {
                code: 400,
                message: '计划信息不存在'
            };
        }

        if (!data.memberId) {
            console.error('成员ID不能为空');
            notificationService.showNotification('请选择要存入的成员', 'warning');
            return {
                code: 400,
                message: '请选择要存入的成员'
            };
        }

        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) {
            console.error('金额无效:', data.amount);
            notificationService.showNotification('请输入有效的存入金额', 'warning');
            return {
                code: 400,
                message: '请输入有效的存入金额'
            };
        }

        try {
            console.log('【Service】开始存钱，计划ID:', planId, '数据:', data);

            // 4. 调用后端接口
            const response = await savingApi.depositToGroupSaving(planId, {
                memberId: data.memberId,
                amount: amount,
                note: data.note || ''
            });

            console.log('【Service】存钱响应:', response);

            // 5. 处理响应
            if (response) {
                // 6. 更新前端缓存（调用缓存服务的方法）
                const cacheUpdateSuccess = await groupSavingCacheService.updateCacheAfterDeposit(
                    userId,
                    planId,
                    response,
                    data.note || ''
                );

                if (cacheUpdateSuccess) {
                    console.log('【Service】前端缓存更新成功');
                } else {
                    console.warn('【Service】前端缓存更新失败，但后端已存钱成功');
                }

                // 7. 显示成功通知
                const successMessage = response.memberTotal
                    ? `成功存入 ¥${amount.toFixed(2)}，该成员累计已存 ¥${response.memberTotal.toFixed(2)}`
                    : `成功存入 ¥${amount.toFixed(2)}`;
                notificationService.showNotification(successMessage, 'success');

                // 8. 返回成功结果
                return {
                    code: 200,
                    message: '存钱成功',
                    data: response
                };
            } else {
                console.error('【Service】存钱失败: 响应数据为空');
                notificationService.showNotification('存钱失败，请重试', 'error');
                return {
                    code: 500,
                    message: '存钱失败，请重试'
                };
            }

        } catch (error) {
            console.error('【Service】存钱异常:', error);

            // 处理网络错误
            if (this.isNetworkError(error)) {
                notificationService.showNotification('网络连接失败，请检查网络后重试', 'error');
                return {
                    code: 500,
                    message: '网络连接失败，请检查网络后重试'
                };
            }

            // 处理业务错误
            const errorMsg = error.response?.data?.message || error.message || '存钱失败';

            // 检查是否是超出目标金额的错误
            if (errorMsg.includes('超出目标金额') || errorMsg.includes('最多可存')) {
                notificationService.showNotification(errorMsg, 'warning');
            } else {
                notificationService.showNotification(errorMsg, 'error');
            }

            return {
                code: error.response?.status || 500,
                message: errorMsg
            };
        }
    }

    /**
     * 退出多人存钱计划
     * @param {number} planId - 计划ID
     * @param {Object} data - 退出数据 { isCreator, newCreatorId }
     * @returns {Promise<Object>} 退出结果
     */
    async leaveGroupSavings(planId, data) {
        // 1. 先检查网络状态
        if (!navigator.onLine) {
            console.warn('离线状态无法退出多人存钱计划');
            notificationService.showNotification('当前处于离线状态，无法退出计划，请连接网络后重试', 'warning');
            return {
                success: false,
                message: '当前处于离线状态，无法退出计划，请连接网络后重试'
            };
        }

        // 2. 获取当前用户ID
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id;
        if (!userId) {
            console.error('无法获取用户ID');
            notificationService.showNotification('用户未登录，请重新登录', 'error');
            return {
                success: false,
                message: '用户未登录，请重新登录'
            };
        }

        // 3. 验证数据
        if (!planId) {
            console.error('计划ID不能为空');
            notificationService.showNotification('计划信息不存在', 'error');
            return {
                success: false,
                message: '计划信息不存在'
            };
        }

        try {
            console.log('【Service】开始退出多人存钱计划，计划ID:', planId, '数据:', data);

            // 4. 调用后端接口
            const response = await savingApi.leaveGroupSaving(planId, {
                isCreator: data.isCreator || false,
                newCreatorId: data.newCreatorId || null
            });

            console.log('【Service】退出计划响应:', response);

            // 5. 处理响应 - 后端返回 { code: 200, message: "退出计划成功", data: null }
            // http-interceptor 会拦截，如果 code === 200 返回 response.data（即 null），不会抛出异常
            console.log('【Service】退出计划成功，响应数据:', response);

            // 6. 更新前端缓存
            try {
                const cacheUpdateSuccess = await groupSavingCacheService.leaveGroupSaving(
                    userId,
                    planId,
                    {
                        isCreator: data.isCreator || false,
                        newCreatorId: data.newCreatorId || null
                    }
                );

                if (cacheUpdateSuccess) {
                    console.log('【Service】前端缓存更新成功');
                } else {
                    console.warn('【Service】前端缓存更新失败，但后端已退出成功');
                    // 缓存更新失败时，尝试清除该用户的所有缓存，强制下次从服务器获取
                    await groupSavingCacheService.clearUserCache(userId);
                    console.log('【Service】已清除用户缓存，下次将从服务器获取最新数据');
                }
            } catch (cacheError) {
                console.error('【Service】更新缓存时出错:', cacheError);
                // 出错时清除缓存
                await groupSavingCacheService.clearUserCache(userId);
            }

            // 7. 显示成功通知
            notificationService.showNotification('退出计划成功', 'success');

            // 8. 返回成功结果
            return {
                success: true,
                code: 200,
                message: '退出计划成功',
                data: null
            };

        } catch (error) {
            console.error('【Service】退出多人存钱计划异常:', error);

            // 处理网络错误
            if (this.isNetworkError(error)) {
                notificationService.showNotification('网络连接失败，请检查网络后重试', 'error');
                return {
                    success: false,
                    message: '网络连接失败，请检查网络后重试'
                };
            }

            // 处理业务错误
            const errorMsg = error.response?.data?.message || error.message || '退出失败';

            // 检查是否是特定错误
            if (errorMsg.includes('创建者') && errorMsg.includes('新创建者')) {
                notificationService.showNotification(errorMsg, 'warning');
            } else {
                notificationService.showNotification(errorMsg, 'error');
            }

            return {
                success: false,
                code: error.response?.status || 500,
                message: errorMsg
            };
        }
    }

    // ==================== 个人存钱计划（前端存储） ====================
    /**
     * 获取个人存钱计划列表
     * 从 IndexedDB 中获取数据
     */
    async getPersonalSavingsList(params = {}) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id
        if (!userId) {
            console.error('【Service】无法获取用户ID')
            return {
                code: 401,
                message: '用户未登录',
                data: []
            }
        }

        try {
            // 确保缓存服务已初始化
            await personalSavingCache.init(userId)

            const plans = await personalSavingCache.getAllPlans(userId)

            // 只返回未删除的计划
            const activePlans = plans.filter(plan => plan.deleted !== 1)

            console.log('【Service】获取个人存钱计划列表成功，共', activePlans.length, '条')

            return {
                code: 200,
                message: '获取成功',
                data: activePlans
            }
        } catch (error) {
            console.error('【Service】获取个人存钱计划列表失败:', error)
            return {
                code: 500,
                message: error.message || '获取失败',
                data: []
            }
        }
    }

    /**
     * 获取个人存钱计划详情
     * @param {string} id - 计划ID
     * @returns {Promise<Object>} 计划详情
     */
    async getPersonalSavingsDetail(id) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id
        if (!userId) {
            console.error('【Service】无法获取用户ID')
            return {
                code: 401,
                message: '用户未登录',
                data: null
            }
        }

        try {
            await personalSavingCache.init(userId)
            const plan = await personalSavingCache.getPlanById(userId, id)

            if (!plan) {
                return {
                    code: 404,
                    message: '计划不存在',
                    data: null
                }
            }

            return {
                code: 200,
                message: '获取成功',
                data: plan
            }
        } catch (error) {
            console.error('【Service】获取个人存钱计划详情失败:', error)
            return {
                code: 500,
                message: error.message || '获取失败',
                data: null
            }
        }
    }

    /**
     * 创建个人存钱计划
     * 保存到 IndexedDB 中
     */
    async createPersonalSavings(data) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id
        if (!userId) {
            console.error('【Service】无法获取用户ID')
            notificationService.showNotification('用户未登录，请重新登录', 'error')
            return {
                code: 401,
                message: '用户未登录，请重新登录',
                data: null
            }
        }

        // 验证数据
        if (!data.name || !data.name.trim()) {
            notificationService.showNotification('请输入存钱目标名称', 'warning')
            return {
                code: 400,
                message: '请输入存钱目标名称',
                data: null
            }
        }

        if (!data.targetAmount || data.targetAmount <= 0) {
            notificationService.showNotification('请输入有效的目标金额', 'warning')
            return {
                code: 400,
                message: '请输入有效的目标金额',
                data: null
            }
        }

        if (!data.deadline) {
            notificationService.showNotification('请选择截止日期', 'warning')
            return {
                code: 400,
                message: '请选择截止日期',
                data: null
            }
        }

        if (data.currentAmount && data.currentAmount > data.targetAmount) {
            notificationService.showNotification('已存金额不能大于目标金额', 'warning')
            return {
                code: 400,
                message: '已存金额不能大于目标金额',
                data: null
            }
        }

        try {
            await personalSavingCache.init(userId)

            const result = await personalSavingCache.createPlan(userId, data)

            if (result.success) {
                notificationService.showNotification('计划创建成功', 'success')
                return {
                    code: 200,
                    message: '创建成功',
                    data: result.data
                }
            } else {
                notificationService.showNotification(result.error || '创建失败', 'error')
                return {
                    code: 500,
                    message: result.error || '创建失败',
                    data: null
                }
            }
        } catch (error) {
            console.error('【Service】创建个人存钱计划失败:', error)
            notificationService.showNotification(error.message || '创建失败', 'error')
            return {
                code: 500,
                message: error.message || '创建失败',
                data: null
            }
        }
    }

    /**
     * 更新个人存钱计划
     * 更新 IndexedDB 中的数据
     */
    async updatePersonalSavings(id, data) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id
        if (!userId) {
            console.error('【Service】无法获取用户ID')
            notificationService.showNotification('用户未登录，请重新登录', 'error')
            return {
                code: 401,
                message: '用户未登录，请重新登录',
                data: null
            }
        }

        // 验证数据
        if (!data.name || !data.name.trim()) {
            notificationService.showNotification('请输入存钱目标名称', 'warning')
            return {
                code: 400,
                message: '请输入存钱目标名称',
                data: null
            }
        }

        if (!data.targetAmount || data.targetAmount <= 0) {
            notificationService.showNotification('请输入有效的目标金额', 'warning')
            return {
                code: 400,
                message: '请输入有效的目标金额',
                data: null
            }
        }

        if (data.currentAmount && data.currentAmount > data.targetAmount) {
            notificationService.showNotification('已存金额不能大于目标金额', 'warning')
            return {
                code: 400,
                message: '已存金额不能大于目标金额',
                data: null
            }
        }

        try {
            await personalSavingCache.init(userId)

            const result = await personalSavingCache.updatePlan(userId, id, data)

            if (result.success) {
                notificationService.showNotification('计划更新成功', 'success')
                return {
                    code: 200,
                    message: '更新成功',
                    data: result.data
                }
            } else {
                notificationService.showNotification(result.error || '更新失败', 'error')
                return {
                    code: 500,
                    message: result.error || '更新失败',
                    data: null
                }
            }
        } catch (error) {
            console.error('【Service】更新个人存钱计划失败:', error)
            notificationService.showNotification(error.message || '更新失败', 'error')
            return {
                code: 500,
                message: error.message || '更新失败',
                data: null
            }
        }
    }

    /**
     * 删除个人存钱计划
     * 从 IndexedDB 中软删除数据
     */
    async deletePersonalSavings(id) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id
        if (!userId) {
            console.error('【Service】无法获取用户ID')
            notificationService.showNotification('用户未登录，请重新登录', 'error')
            return {
                code: 401,
                message: '用户未登录，请重新登录',
                data: null
            }
        }

        try {
            await personalSavingCache.init(userId)

            const result = await personalSavingCache.deletePlan(userId, id)

            if (result.success) {
                notificationService.showNotification('删除成功', 'success')
                return {
                    code: 200,
                    message: '删除成功',
                    data: null
                }
            } else {
                notificationService.showNotification(result.error || '删除失败', 'error')
                return {
                    code: 500,
                    message: result.error || '删除失败',
                    data: null
                }
            }
        } catch (error) {
            console.error('【Service】删除个人存钱计划失败:', error)
            notificationService.showNotification(error.message || '删除失败', 'error')
            return {
                code: 500,
                message: error.message || '删除失败',
                data: null
            }
        }
    }

    /**
     * 个人存钱 - 存钱
     * 更新计划中的已存金额
     */
    async depositToPersonalSaving(planId, data) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id
        if (!userId) {
            console.error('【Service】无法获取用户ID')
            notificationService.showNotification('用户未登录，请重新登录', 'error')
            return {
                code: 401,
                message: '用户未登录，请重新登录',
                data: null
            }
        }

        // 验证金额
        const amount = parseFloat(data.amount)
        if (isNaN(amount) || amount <= 0) {
            notificationService.showNotification('请输入有效的存入金额', 'warning')
            return {
                code: 400,
                message: '请输入有效的存入金额',
                data: null
            }
        }

        try {
            await personalSavingCache.init(userId)

            const result = await personalSavingCache.deposit(userId, planId, {
                amount: amount,
                note: data.note || ''
            })

            if (result.success) {
                notificationService.showNotification(`成功存入 ¥${amount.toFixed(2)}`, 'success')
                return {
                    code: 200,
                    message: '存钱成功',
                    data: {
                        plan: result.data.plan,
                        record: result.data.record,
                        newAmount: result.data.newAmount,
                        progress: result.data.progress,
                        completed: result.data.completed
                    }
                }
            } else {
                if (result.maxAmount !== undefined) {
                    notificationService.showNotification(result.error, 'warning')
                } else {
                    notificationService.showNotification(result.error || '存钱失败', 'error')
                }
                return {
                    code: 500,
                    message: result.error || '存钱失败',
                    data: null
                }
            }
        } catch (error) {
            console.error('【Service】个人存钱失败:', error)
            notificationService.showNotification(error.message || '存钱失败', 'error')
            return {
                code: 500,
                message: error.message || '存钱失败',
                data: null
            }
        }
    }

    /**
     * 获取个人存钱计划的存钱记录
     * @param {string} planId - 计划ID
     * @param {Object} options - 分页参数 { page, size }
     * @returns {Promise<Object>} 存钱记录
     */
    async getPersonalSavingRecords(planId, options = { page: 1, size: 20 }) {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id
        if (!userId) {
            console.error('【Service】无法获取用户ID')
            return {
                code: 401,
                message: '用户未登录',
                data: { records: [], total: 0, page: 1, size: 20, pages: 0 }
            }
        }

        try {
            await personalSavingCache.init(userId)

            const records = await personalSavingCache.getDepositRecords(userId, planId, options)

            return {
                code: 200,
                message: '获取成功',
                data: records
            }
        } catch (error) {
            console.error('【Service】获取存钱记录失败:', error)
            return {
                code: 500,
                message: error.message || '获取失败',
                data: { records: [], total: 0, page: options.page, size: options.size, pages: 0 }
            }
        }
    }

    /**
     * 获取个人存钱计划统计信息
     * @returns {Promise<Object>} 统计信息
     */
    async getPersonalSavingsStats() {
        const userId = this.currentUserId || authHelperService.getCurrentUser()?.id
        if (!userId) {
            console.error('【Service】无法获取用户ID')
            return {
                code: 401,
                message: '用户未登录',
                data: null
            }
        }

        try {
            await personalSavingCache.init(userId)

            const stats = await personalSavingCache.getStats(userId)

            return {
                code: 200,
                message: '获取成功',
                data: stats
            }
        } catch (error) {
            console.error('【Service】获取统计信息失败:', error)
            return {
                code: 500,
                message: error.message || '获取失败',
                data: null
            }
        }
    }
}

export default new SavingService()