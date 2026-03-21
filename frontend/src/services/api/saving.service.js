// src/services/api/saving.service.js

import http from '@/services/utils/http-interceptor'
import * as savingApi from '@/api/saving'
import {authHelperService, notificationService} from '@/services'
import businessDataService from '@/services/business-data.service'
import groupSavingCache from '@/services/cache/group-saving-cache.service'
import groupSavingCacheService from "@/services/cache/group-saving-cache.service";
import indexedDBService from '@/services/db/indexed-db.service.js'

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
     * 从 localStorage 初始化
     */
    initFromStorage() {
        try {
            const savedUserId = localStorage.getItem('userId')
            if (savedUserId) {
                this.currentUserId = parseInt(savedUserId)
                console.log('【SavingService】从 localStorage 初始化用户ID:', this.currentUserId)

                // 初始化缓存服务
                if (groupSavingCache && groupSavingCache.init) {
                    groupSavingCache.init(this.currentUserId).catch(console.warn)
                }
                // 初始化业务数据服务
                businessDataService.init(this.currentUserId).catch(console.warn)
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
        if (groupSavingCache && groupSavingCache.init) {
            groupSavingCache.init(userId).catch(console.warn)
        }
        // 初始化业务数据服务
        businessDataService.init(userId).catch(console.warn)

        // 保存到 localStorage
        localStorage.setItem('userId', userId)
        console.log('【SavingService】用户ID已设置:', userId)
    }

    // ==================== 多人存钱计划（后端API） ====================

    /**
     * 获取多人存钱计划列表
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

                    // 🔥 关键修改：在后端返回的数据中过滤掉已删除的计划和成员
                    const filteredData = this.filterDeletedPlansAndMembers(responseData);
                    console.log('【Service】过滤后活跃计划数:', filteredData.length);

                    // 清除旧缓存
                    await groupSavingCacheService.clearUserCache(userId);

                    // 保存新数据到缓存（保存过滤后的数据）
                    const saveSuccess = await groupSavingCacheService.saveData(userId, filteredData, true);

                    if (saveSuccess) {
                        console.log('【Service】前端数据库更新成功');
                    } else {
                        console.warn('【Service】前端数据库更新失败，但后端数据获取成功');
                    }

                    // 返回过滤后的数据
                    return {
                        code: 200,
                        message: '获取成功',
                        data: filteredData
                    };
                }
                // 如果后端返回的是包含 code 和 data 的对象（兼容处理）
                else if (responseData && responseData.code === 200 && responseData.data) {
                    console.log('【Service】后端数据获取成功（包装格式），开始更新前端数据库');

                    // 🔥 关键修改：在后端返回的数据中过滤掉已删除的计划和成员
                    const filteredData = this.filterDeletedPlansAndMembers(responseData.data);
                    console.log('【Service】过滤后活跃计划数:', filteredData.length);

                    await groupSavingCacheService.clearUserCache(userId);
                    await groupSavingCacheService.saveData(userId, filteredData, true);

                    return {
                        code: 200,
                        message: responseData.message || '获取成功',
                        data: filteredData
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
                // 查询成员表，获取当前用户参与的所有计划（包含已删除的）
                const allMembersCache = await indexedDBService.query('savings_members_cache', 'memberId', parseInt(userId));

                console.log('【Service】缓存中查询到的所有成员记录数:', allMembersCache.length);

                // 🔥 关键修改：只保留当前用户未删除的成员记录（deleted !== 1）
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

                // 查询计划表，获取所有计划详情（包含deleted字段）
                const allGroupSavings = await groupSavingCacheService.getTableDataById('userId', userId, 'group_savings_cache', true);

                // 🔥 关键修改：过滤出用户参与的计划，且计划未被删除（plan.deleted !== 1）
                const activeGroups = allGroupSavings.filter(group =>
                    userPlanIds.includes(group.id) && group.deleted !== 1
                );

                console.log('【Service】缓存中找到活跃计划:', activeGroups.length);

                if (activeGroups.length === 0) {
                    return {
                        code: 200,
                        message: '获取成功（缓存无活跃计划）',
                        data: []
                    };
                }

                // 🔥 关键修改：获取所有成员缓存，用于组装数据
                const allMembers = await indexedDBService.query('savings_members_cache', 'userId', userId);

                // 将成员信息按计划ID分组，🔥 只包含未删除的成员（member.deleted !== 1）
                const membersByPlanId = {};
                allMembers.forEach(member => {
                    // 只添加未删除的成员 (deleted !== 1) 且 成员属于活跃计划
                    if (member.deleted !== 1 && userPlanIds.includes(member.groupSavingId)) {
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
                });

                // 组装每个计划的数据
                const assembledData = activeGroups.map(group => {
                    const members = membersByPlanId[group.id] || [];

                    // 🔥 重要：如果计划没有任何活跃成员，则跳过该计划（不显示）
                    if (members.length === 0) {
                        console.log('【Service】计划', group.id, '没有活跃成员，跳过');
                        return null;
                    }

                    const totalAmount = members.reduce((sum, member) => sum + (member.amount || 0), 0);
                    const targetAmount = group.targetAmount || 0;
                    const progress = targetAmount > 0
                        ? Math.min(Math.round((totalAmount / targetAmount) * 100), 100)
                        : 0;

                    return {
                        id: group.id,
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
                }).filter(plan => plan !== null); // 🔥 过滤掉没有活跃成员的计划

                // 按更新时间排序（最新的在前）
                assembledData.sort((a, b) => {
                    const timeA = new Date(a.updatedAt || 0).getTime();
                    const timeB = new Date(b.updatedAt || 0).getTime();
                    return timeB - timeA;
                });

                console.log('【Service】从缓存返回组装后的计划数:', assembledData.length);

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
     * 过滤已删除的计划和成员
     * @param {Array} plansData - 计划数据数组
     * @returns {Array} 过滤后的计划数据
     */
    filterDeletedPlansAndMembers(plansData) {
        if (!plansData || !Array.isArray(plansData)) {
            return [];
        }

        return plansData
            .filter(plan => {
                // 1. 过滤掉已删除的计划
                if (plan.deleted === 1) {
                    console.log(`【Service】过滤掉已删除的计划: ${plan.name} (ID: ${plan.id})`);
                    return false;
                }

                // 2. 过滤掉没有活跃成员的计划
                if (!plan.members || plan.members.length === 0) {
                    console.log(`【Service】过滤掉无成员的计划: ${plan.name} (ID: ${plan.id})`);
                    return false;
                }

                // 3. 检查是否有活跃成员（deleted !== 1）
                const hasActiveMembers = plan.members.some(member => member.deleted !== 1);
                if (!hasActiveMembers) {
                    console.log(`【Service】过滤掉无活跃成员的计划: ${plan.name} (ID: ${plan.id})`);
                    return false;
                }

                return true;
            })
            .map(plan => {
                // 4. 过滤掉成员中的已删除成员
                const activeMembers = plan.members.filter(member => member.deleted !== 1);

                // 5. 重新计算计划的总金额和进度
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
     * 获取多人存钱计划详情
     */
    async getGroupSavingsDetail(id, forceRefresh = false) {
        // TODO 获取多人存钱计划详情
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

    /**
     * 获取计划的存钱记录
     */
    async getPlanSavingRecordsByPost(planId, params = {}, forceRefresh = false) {
        // TODO 获取计划的存钱记录
    }

    /**
     * 获取成员的存钱记录
     */
    async getMemberSavingRecords(planId, memberId, forceRefresh = false) {
        // TODO 获取成员的存钱记录
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