// services/cache/group-saving-cache.service.js

import indexedDBService from '@/services/db/indexed-db.service.js'
import { notificationService } from '@/services'
import idGenerator from '@/services/id-generator.service.js'

/**
 * 多人存钱计划缓存服务
 */
class GroupSavingCacheService {

    /**
     * 初始化缓存服务
     * @param {string|number} userId - 用户ID
     * @returns {Promise<void>}
     */
    async init(userId) {
        try {
            await indexedDBService.ensureInitialized();
            this.currentUserId = userId;
            console.log('【GroupSavingCache】服务已初始化，用户ID:', userId);
        } catch (error) {
            console.error('【GroupSavingCache】初始化失败:', error);
        }
    }

    /**
     * 检查多人存钱计划缓存表是否有数据
     * 正确逻辑：检查当前用户是否有参与任何计划（成员表中存在且未删除的记录）
     * @param {string} userId - 用户ID
     * @returns {Promise<boolean>} 有数据返回 true，否则返回 false
     */
    async checkGroupSavingsExist(userId = null) {
        try {
            await indexedDBService.ensureInitialized();

            if (!userId) {
                return false;
            }

            if (!indexedDBService.db.objectStoreNames.contains('savings_members_cache')) {
                console.warn('savings_members_cache 表不存在');
                return false;
            }

            const userMembers = await indexedDBService.query('savings_members_cache', 'memberId', parseInt(userId));

            console.log(`【checkExist】用户 ${userId} 的成员记录数: ${userMembers.length}`);

            const activeMembers = userMembers.filter(member => member.deleted !== 1);

            console.log(`【checkExist】用户 ${userId} 的活跃成员记录: ${activeMembers.length}`);
            console.log(`【checkExist】已退出的成员: ${userMembers.filter(m => m.deleted === 1).length}`);

            if (activeMembers.length === 0) {
                console.log(`用户 ${userId} 没有参与任何活跃计划（已退出）`);
                return false;
            }

            const userPlanIds = [...new Set(activeMembers.map(member => member.groupSavingId))];

            if (!indexedDBService.db.objectStoreNames.contains('group_savings_cache')) {
                console.warn('group_savings_cache 表不存在');
                return false;
            }

            const allPlans = await indexedDBService.query('group_savings_cache', 'userId', userId);
            const activePlans = allPlans.filter(plan =>
                userPlanIds.includes(plan.originalId || plan.id) && plan.deleted !== 1
            );

            const hasData = activePlans.length > 0;
            console.log(`用户 ${userId} 在 group_savings_cache 表 ${hasData ? '有' : '无'} 活跃数据，参与计划数: ${activePlans.length}`);
            return hasData;

        } catch (error) {
            console.error('检查数据异常:', error);
            return false;
        }
    }

    /**
     * 根据Id查询指定表中的数据（可指定是否包含已删除的）
     * @param {string} idName - 索引名称
     * @param {any} id - 索引值
     * @param {string} tableName - 表名
     * @param {boolean} includeDeleted - 是否包含已删除的数据
     * @returns {Promise<Array>} 查询结果
     */
    async getTableDataById(idName, id, tableName, includeDeleted = false) {
        try {
            await indexedDBService.ensureInitialized();

            if (!indexedDBService.db.objectStoreNames.contains(tableName)) {
                console.warn('表 ', tableName, ' 不存在');
                return [];
            }

            console.log(`根据 ${idName} 查询 ${tableName}:`, id);

            let queryId = id;
            if (tableName === 'savings_members_cache' && idName === 'memberId') {
                queryId = parseInt(id);
            }

            const results = await indexedDBService.query(tableName, idName, queryId);

            if (!includeDeleted) {
                const filtered = results.filter(item => item.deleted !== 1);
                console.log(`查询 ${tableName} 返回 ${filtered.length}/${results.length} 条（已过滤删除）`);
                return filtered;
            }

            console.log(`查询 ${tableName} 返回 ${results.length} 条（包含删除）`);
            return results;

        } catch (error) {
            console.error('获取', tableName, '缓存失败:', error);
            return [];
        }
    }

    /**
     * 清除指定用户的所有缓存数据（包括软删除标记）
     * 🔥 修改：只清除计划相关的表，不清除存钱记录表（因为存钱记录是独立管理的）
     * @param {string} userId - 用户ID
     * @returns {Promise<boolean>} 清除成功返回true
     */
    async clearUserCache(userId) {
        try {
            await indexedDBService.ensureInitialized();

            // 🔥 只清除计划相关的表，不清除 saving_deposit_records_cache
            const tables = [
                'group_savings_cache',
                'savings_members_cache'
                // 移除 'saving_deposit_records_cache'
            ];

            for (const tableName of tables) {
                if (indexedDBService.db.objectStoreNames.contains(tableName)) {
                    const userData = await indexedDBService.query(tableName, 'userId', userId);

                    for (const data of userData) {
                        await indexedDBService.delete(tableName, data.id);
                    }

                    console.log(`已清除用户 ${userId} 在表 ${tableName} 中的 ${userData.length} 条数据`);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 50));

            return true;
        } catch (error) {
            console.error('清除用户缓存失败:', error);
            return false;
        }
    }

    /**
     * 清除指定计划的所有成员缓存
     * @param {string} userId - 用户ID
     * @param {number|string} planId - 计划ID
     * @returns {Promise<boolean>}
     */
    async clearPlanMembersCache(userId, planId) {
        try {
            await indexedDBService.ensureInitialized();

            const members = await indexedDBService.query(
                'savings_members_cache',
                'groupSavingId',
                planId
            );

            for (const member of members) {
                if (member.userId === userId) {
                    await indexedDBService.delete('savings_members_cache', member.id);
                }
            }

            console.log(`已清除计划 ${planId} 的成员缓存`);
            return true;
        } catch (error) {
            console.error('清除计划成员缓存失败:', error);
            return false;
        }
    }

    /**
     * 将获取的数据存到前端缓存中
     * @param {string} userId - 用户ID
     * @param {Array} plansData - 从后端获取的计划数据
     * @param {boolean} skipClear - 是否跳过清除步骤（默认false，即执行清除）
     * @returns {Promise<boolean>} 保存成功返回true
     */
    async saveData(userId, plansData, skipClear = false) {
        try {
            await indexedDBService.ensureInitialized();

            if (!skipClear) {
                await this.clearUserCache(userId);
            }

            if (!plansData || plansData.length === 0) {
                console.log('没有数据需要缓存');
                return true;
            }

            console.log('开始保存多人存钱计划数据到缓存，计划数:', plansData.length);

            const groupSavingsCache = [];
            const savingsMembersCache = [];

            const now = new Date().toISOString();

            for (const plan of plansData) {
                // 使用ID生成服务生成计划ID
                const planCacheId = idGenerator.generateGroupSavingId(userId, plan.id);

                groupSavingsCache.push({
                    id: planCacheId,
                    originalId: plan.id,
                    userId: userId,
                    planName: plan.name || plan.planName,
                    reason: plan.reason || '',
                    description: plan.description || '',
                    targetAmount: plan.targetAmount || 0,
                    currentAmount: plan.currentAmount || 0,
                    type: plan.type || '日常储蓄',
                    color: plan.color || this.getColorByType(plan.type),
                    icon: plan.icon || this.getIconByType(plan.type),
                    creatorId: plan.creatorId,
                    status: plan.status || 'active',
                    deadline: plan.deadline || '',
                    createdAt: plan.createdAt || plan.createTime || now,
                    updatedAt: plan.updatedAt || plan.updateTime || now,
                    deleted: plan.deleted || 0,
                    deletedAt: plan.deletedAt || null,
                    cacheTime: now
                });

                const members = plan.members || [];
                for (const member of members) {
                    const memberUserId = member.userId;
                    if (!memberUserId) {
                        console.warn('成员数据缺少userId:', member);
                        continue;
                    }

                    // 使用ID生成服务生成成员ID
                    const memberCacheId = idGenerator.generateMemberId(userId, plan.id, memberUserId);

                    savingsMembersCache.push({
                        id: memberCacheId,
                        originalId: member.id,
                        userId: userId,
                        groupSavingId: plan.id,
                        memberId: memberUserId,
                        memberName: member.memberName || member.name || `用户${memberUserId}`,
                        avatar: member.avatar || '',
                        amount: member.amount || 0,
                        isCreator: member.isCreator || memberUserId === plan.creatorId,
                        status: member.status || 'active',
                        joinTime: member.joinTime || member.joinTime || now,
                        deleted: member.deleted || 0,
                        deletedAt: member.deleted === 1 ? (member.deletedAt || now) : null,
                        updateTime: now,
                        cacheTime: now
                    });
                }
            }

            if (groupSavingsCache.length > 0) {
                await indexedDBService.bulkPut('group_savings_cache', groupSavingsCache);
                console.log(`已缓存 ${groupSavingsCache.length} 条计划数据`);
            }

            if (savingsMembersCache.length > 0) {
                await indexedDBService.bulkPut('savings_members_cache', savingsMembersCache);
                console.log(`已缓存 ${savingsMembersCache.length} 条成员数据`);
            }

            return true;
        } catch (error) {
            console.error('保存多人存钱计划缓存失败:', error);
            return false;
        }
    }

    /**
     * 🔥 新增：保存按用户ID获取的存钱记录到缓存
     * @param {string} currentUserId - 当前登录用户ID（用于缓存隔离）
     * @param {number} targetUserId - 目标用户ID（查询的用户ID）
     * @param {Array} records - 存钱记录列表
     * @returns {Promise<boolean>} 保存成功返回true
     */
    async saveUserDepositRecords(currentUserId, targetUserId, records) {
        try {
            await indexedDBService.ensureInitialized();

            if (!records || records.length === 0) {
                console.log('没有存钱记录需要保存');
                return true;
            }

            console.log('【缓存】开始保存用户存钱记录到缓存，当前用户ID:', currentUserId, '目标用户ID:', targetUserId, '记录数:', records.length);
            console.log('【缓存】记录详情:', records);

            const now = new Date().toISOString();
            const cacheRecords = [];

            for (const record of records) {
                // 生成缓存记录ID
                const recordId = idGenerator.generateDepositRecordId(
                    currentUserId,
                    record.id || `${targetUserId}_${record.memberId}_${Date.now()}`
                );

                cacheRecords.push({
                    id: recordId,
                    originalId: record.id,
                    userId: currentUserId,                    // 当前登录用户的ID（用于缓存隔离）
                    targetUserId: targetUserId,                // 查询的用户ID
                    groupSavingId: record.groupSavingId,      // 计划ID
                    memberId: record.memberId,                 // 成员记录ID（外键关联 savings_members_cache）
                    memberName: record.memberName,             // 成员名称
                    amount: record.amount,                     // 金额
                    note: record.note || '',                   // 备注
                    depositTime: record.depositTime || record.createTime || now,  // 存钱时间
                    beforeAmount: record.beforeAmount || 0,    // 存钱前该成员的总金额
                    afterAmount: record.afterAmount || 0,      // 存钱后该成员的总金额
                    planBeforeAmount: record.planBeforeAmount || 0,  // 存钱前计划总金额
                    planAfterAmount: record.planAfterAmount || 0,    // 存钱后计划总金额
                    deleted: record.deleted || 0,              // 是否删除
                    deletedAt: record.deletedAt || null,       // 删除时间
                    cacheTime: now,                            // 缓存时间
                    isUserRecords: true                        // 标记这是按用户查询的记录
                });
            }

            // 批量保存到缓存
            if (cacheRecords.length > 0) {
                await indexedDBService.bulkPut('saving_deposit_records_cache', cacheRecords);
                console.log('【缓存】成功保存', cacheRecords.length, '条用户存钱记录到缓存');
                console.log('【缓存】保存的记录示例:', cacheRecords[0]);
            }

            return true;

        } catch (error) {
            console.error('【缓存】保存用户存钱记录失败:', error);
            return false;
        }
    }

    /**
     * 🔥 新增：清除指定用户的存钱记录缓存
     * @param {string} currentUserId - 当前登录用户ID
     * @param {number} targetUserId - 目标用户ID（查询的用户ID）
     * @returns {Promise<boolean>}
     */
    async clearUserDepositRecordsCache(currentUserId, targetUserId) {
        try {
            await indexedDBService.ensureInitialized();

            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.log('【缓存】saving_deposit_records_cache 表不存在，跳过清除');
                return true;
            }

            // 查询当前用户的所有记录
            const allRecords = await indexedDBService.query('saving_deposit_records_cache', 'userId', currentUserId);

            // 过滤出目标用户的记录（通过 targetUserId 匹配）
            const targetUserRecords = allRecords.filter(record => record.targetUserId === targetUserId);

            console.log(`【缓存】找到 ${targetUserRecords.length} 条需要清除的记录（目标用户ID: ${targetUserId}）`);

            // 删除这些记录
            for (const record of targetUserRecords) {
                await indexedDBService.delete('saving_deposit_records_cache', record.id);
            }

            console.log('【缓存】已清除用户', targetUserId, '的', targetUserRecords.length, '条存钱记录缓存');
            return true;

        } catch (error) {
            console.error('【缓存】清除用户存钱记录缓存失败:', error);
            return false;
        }
    }

    /**
     * 🔥 新增：从缓存获取用户的存钱记录
     * @param {string} currentUserId - 当前登录用户ID
     * @param {number} targetUserId - 目标用户ID（查询的用户ID）
     * @returns {Promise<Array>} 存钱记录列表
     */
    async getUserDepositRecordsFromCache(currentUserId, targetUserId) {
        try {
            await indexedDBService.ensureInitialized();

            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.warn('【缓存】saving_deposit_records_cache 表不存在');
                return [];
            }

            // 查询当前用户的所有缓存记录
            const allRecords = await indexedDBService.query('saving_deposit_records_cache', 'userId', currentUserId);

            // 过滤出目标用户的记录（通过 targetUserId 匹配）
            const targetUserRecords = allRecords.filter(record => record.targetUserId === targetUserId);

            console.log(`【缓存】从缓存中找到 ${targetUserRecords.length} 条用户 ${targetUserId} 的记录`);

            // 按存钱时间倒序排序
            targetUserRecords.sort((a, b) => {
                const timeA = new Date(a.depositTime || 0).getTime();
                const timeB = new Date(b.depositTime || 0).getTime();
                return timeB - timeA;
            });

            // 转换为返回格式（与后端返回格式一致）
            const formattedRecords = targetUserRecords.map(record => ({
                id: record.originalId || record.id,
                groupSavingId: record.groupSavingId,
                memberId: record.memberId,              // 成员记录ID
                userId: record.targetUserId,            // 用户ID（目标用户ID）
                memberName: record.memberName,
                amount: record.amount,
                note: record.note,
                depositTime: record.depositTime,
                createTime: record.depositTime,
                beforeAmount: record.beforeAmount,
                afterAmount: record.afterAmount,
                planBeforeAmount: record.planBeforeAmount,
                planAfterAmount: record.planAfterAmount,
                deleted: record.deleted || 0,
                deletedAt: record.deletedAt || null
            }));

            console.log('【缓存】格式化后的记录数:', formattedRecords.length);
            if (formattedRecords.length > 0) {
                console.log('【缓存】记录示例:', formattedRecords[0]);
            }

            return formattedRecords;

        } catch (error) {
            console.error('【缓存】从缓存获取用户存钱记录失败:', error);
            return [];
        }
    }

    /**
     * 获取成员的总金额（从存钱记录表计算）
     * @param {number|string} planId - 计划ID
     * @param {number} memberUserId - 成员用户ID
     * @returns {Promise<number>} 成员总金额
     */
    async getMemberTotalAmount(planId, memberUserId) {
        try {
            await indexedDBService.ensureInitialized();

            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.warn('saving_deposit_records_cache 表不存在');
                return 0;
            }

            const depositRecords = await indexedDBService.query(
                'saving_deposit_records_cache',
                'memberId',
                memberUserId
            );

            const planRecords = depositRecords.filter(record => record.groupSavingId === planId);

            const totalAmount = planRecords.reduce((sum, record) => sum + (record.amount || 0), 0);

            console.log(`成员 ${memberUserId} 在计划 ${planId} 中的总金额: ${totalAmount}`);
            return totalAmount;
        } catch (error) {
            console.error('获取成员总金额失败:', error);
            return 0;
        }
    }

    /**
     * 恢复成员的存钱记录（将 deleted=1 的记录恢复为 deleted=0）
     * @param {number|string} planId - 计划ID
     * @param {number} memberUserId - 成员用户ID
     * @returns {Promise<boolean>}
     */
    async restoreMemberDepositRecords(planId, memberUserId) {
        try {
            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.warn('saving_deposit_records_cache 表不存在');
                return false;
            }

            const depositRecords = await indexedDBService.query(
                'saving_deposit_records_cache',
                'memberId',
                memberUserId
            );

            const recordsToRestore = depositRecords.filter(record =>
                record.groupSavingId === planId && record.deleted === 1
            );

            for (const record of recordsToRestore) {
                record.deleted = 0;
                record.deletedAt = null;
                await indexedDBService.update('saving_deposit_records_cache', record);
            }

            console.log(`已恢复成员 ${memberUserId} 的 ${recordsToRestore.length} 条存钱记录`);
            return true;
        } catch (error) {
            console.error('恢复成员存钱记录失败:', error);
            return false;
        }
    }

    /**
     * 软删除成员的存钱记录
     * @param {number|string} planId - 计划ID
     * @param {number} memberUserId - 成员用户ID
     * @param {string} deletedAt - 删除时间
     * @returns {Promise<boolean>}
     */
    async softDeleteMemberDepositRecords(planId, memberUserId, deletedAt) {
        try {
            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.warn('saving_deposit_records_cache 表不存在');
                return false;
            }

            const depositRecords = await indexedDBService.query(
                'saving_deposit_records_cache',
                'memberId',
                memberUserId
            );

            const recordsToDelete = depositRecords.filter(record =>
                record.groupSavingId === planId && record.deleted !== 1
            );

            for (const record of recordsToDelete) {
                record.deleted = 1;
                record.deletedAt = deletedAt;
                await indexedDBService.update('saving_deposit_records_cache', record);
            }

            console.log(`已软删除成员 ${memberUserId} 的 ${recordsToDelete.length} 条存钱记录`);
            return true;
        } catch (error) {
            console.error('软删除成员存钱记录失败:', error);
            return false;
        }
    }

    /**
     * 软删除指定计划的成员（只修改 deleted 和 deletedAt，不修改 amount）
     * @param {string} userId - 用户ID
     * @param {number|string} planId - 计划ID
     * @param {number} memberUserId - 成员用户ID
     * @returns {Promise<boolean>}
     */
    async softDeleteMember(userId, planId, memberUserId) {
        try {
            await indexedDBService.ensureInitialized();

            const now = new Date().toISOString();

            const memberId = idGenerator.generateMemberId(userId, planId, memberUserId);
            const member = await indexedDBService.get('savings_members_cache', memberId);

            if (member) {
                member.deleted = 1;
                member.deletedAt = now;
                member.updateTime = now;

                await indexedDBService.update('savings_members_cache', member);
                console.log(`已软删除成员 ${memberUserId} 从计划 ${planId}，金额保持不变: ${member.amount}`);

                await this.softDeleteMemberDepositRecords(planId, memberUserId, now);
            }

            return true;
        } catch (error) {
            console.error('软删除成员失败:', error);
            return false;
        }
    }

    /**
     * 恢复指定计划的成员（只修改 deleted 和 deletedAt，amount 保持不变）
     * @param {string} userId - 用户ID
     * @param {number|string} planId - 计划ID
     * @param {number} memberUserId - 成员用户ID
     * @returns {Promise<boolean>}
     */
    async restoreMember(userId, planId, memberUserId) {
        try {
            await indexedDBService.ensureInitialized();

            const now = new Date().toISOString();

            const memberId = idGenerator.generateMemberId(userId, planId, memberUserId);
            const member = await indexedDBService.get('savings_members_cache', memberId);

            if (member && member.deleted === 1) {
                member.deleted = 0;
                member.deletedAt = null;
                member.updateTime = now;

                await indexedDBService.update('savings_members_cache', member);
                console.log(`已恢复成员 ${memberUserId} 到计划 ${planId}，金额保持不变: ${member.amount}`);

                await this.restoreMemberDepositRecords(planId, memberUserId);
            }

            return true;
        } catch (error) {
            console.error('恢复成员失败:', error);
            return false;
        }
    }

    /**
     * 获取成员金额（直接从 saving_members_cache 获取）
     * @param {string} userId - 用户ID
     * @param {number|string} planId - 计划ID
     * @param {number} memberUserId - 成员用户ID
     * @returns {Promise<number>}
     */
    async getMemberAmount(userId, planId, memberUserId) {
        try {
            await indexedDBService.ensureInitialized();

            const memberId = idGenerator.generateMemberId(userId, planId, memberUserId);
            const member = await indexedDBService.get('savings_members_cache', memberId);

            if (member) {
                return member.amount || 0;
            }
            return 0;
        } catch (error) {
            console.error('获取成员金额失败:', error);
            return 0;
        }
    }

    /**
     * 软删除指定计划（标记为已删除）
     * @param {string} userId - 用户ID
     * @param {number|string} planId - 计划ID
     * @returns {Promise<boolean>} 删除成功返回true
     */
    async softDeletePlan(userId, planId) {
        try {
            await indexedDBService.ensureInitialized();

            const now = new Date().toISOString();

            const planIdGenerated = idGenerator.generateGroupSavingId(userId, planId);
            const planToUpdate = await indexedDBService.get('group_savings_cache', planIdGenerated);

            if (!planToUpdate) {
                console.warn('未找到要删除的计划数据，ID:', planId);
                return false;
            }

            planToUpdate.deleted = 1;
            planToUpdate.deletedAt = now;
            planToUpdate.updatedAt = now;

            await indexedDBService.update('group_savings_cache', planToUpdate);
            console.log('已软删除计划缓存，ID:', planId, 'deletedAt:', now);

            const members = await indexedDBService.query('savings_members_cache', 'groupSavingId', planId);
            for (const member of members) {
                if (member.userId === userId) {
                    member.deleted = 1;
                    member.deletedAt = now;
                    member.updateTime = now;
                    await indexedDBService.update('savings_members_cache', member);

                    await this.softDeleteMemberDepositRecords(planId, member.memberId, now);
                }
            }
            console.log(`已软删除计划 ${planId} 的相关成员缓存和对应的存钱记录`);

            return true;

        } catch (error) {
            console.error('软删除计划缓存失败:', error);
            return false;
        }
    }

    /**
     * 存钱后更新缓存
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @param {Object} depositData - 存钱返回的数据 { memberId, amount, memberTotal, planTotal, progress }
     * @param {string} note - 备注
     * @returns {Promise<boolean>} 更新成功返回true
     */
    async updateCacheAfterDeposit(userId, planId, depositData, note = '') {
        try {
            await indexedDBService.ensureInitialized();

            const now = new Date().toISOString();

            const planIdGenerated = idGenerator.generateGroupSavingId(userId, planId);
            const planToUpdate = await indexedDBService.get('group_savings_cache', planIdGenerated);

            if (!planToUpdate) {
                console.warn('未找到计划缓存数据，ID:', planId);
                return false;
            }

            planToUpdate.currentAmount = depositData.planTotal;
            planToUpdate.updatedAt = now;

            await indexedDBService.update('group_savings_cache', planToUpdate);
            console.log('已更新计划缓存，新总金额:', depositData.planTotal, '进度:', depositData.progress);

            const members = await indexedDBService.query('savings_members_cache', 'groupSavingId', planId);
            const memberToUpdate = members.find(m => m.memberId === depositData.memberId && m.userId === userId);

            let oldAmount = 0;
            if (memberToUpdate) {
                oldAmount = memberToUpdate.amount;
                memberToUpdate.amount = depositData.memberTotal;
                memberToUpdate.updateTime = now;
                await indexedDBService.update('savings_members_cache', memberToUpdate);
                console.log('已更新成员缓存，成员ID:', depositData.memberId, '旧金额:', oldAmount, '新金额:', depositData.memberTotal);
            } else {
                console.warn('未找到成员缓存数据，memberId:', depositData.memberId);
            }

            if (indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                const depositRecordId = idGenerator.generateDepositRecordId(userId, `${planId}_${depositData.memberId}_${Date.now()}`);

                const depositRecord = {
                    id: depositRecordId,
                    userId: userId,
                    groupSavingId: planId,
                    memberId: depositData.memberId,
                    memberName: memberToUpdate?.memberName || '',
                    amount: depositData.amount,
                    note: note,
                    depositTime: now,
                    beforeAmount: oldAmount,
                    afterAmount: depositData.memberTotal,
                    planBeforeAmount: depositData.planTotal - depositData.amount,
                    planAfterAmount: depositData.planTotal,
                    deleted: 0,
                    deletedAt: null
                };

                await indexedDBService.add('saving_deposit_records_cache', depositRecord);
                console.log('已添加存钱记录到缓存');
            }

            return true;

        } catch (error) {
            console.error('更新存钱后缓存失败:', error);
            return false;
        }
    }

    /**
     * 退出多人存钱计划（更新缓存）
     * @param {string} userId - 用户ID
     * @param {number|string} planId - 计划ID
     * @param {Object} leaveData - 退出数据 { isCreator, newCreatorId }
     * @returns {Promise<boolean>} 更新成功返回true
     */
    async leaveGroupSaving(userId, planId, leaveData) {
        try {
            await indexedDBService.ensureInitialized();

            const now = new Date().toISOString();

            console.log('【缓存】开始处理退出计划:', { userId, planId, leaveData });

            const planIdGenerated = idGenerator.generateGroupSavingId(userId, planId);
            const planToUpdate = await indexedDBService.get('group_savings_cache', planIdGenerated);

            if (!planToUpdate) {
                console.warn('【缓存】未找到计划缓存数据，ID:', planId);
                return false;
            }

            console.log('【缓存】找到计划:', planToUpdate.planName, '创建者:', planToUpdate.creatorId);

            const memberId = idGenerator.generateMemberId(userId, planId, userId);
            const member = await indexedDBService.get('savings_members_cache', memberId);

            if (!member) {
                console.warn('【缓存】未找到成员缓存数据，userId:', userId, 'planId:', planId);
                return false;
            }

            console.log('【缓存】找到成员:', member.memberName, '当前金额:', member.amount);

            if (leaveData.isCreator && leaveData.newCreatorId) {
                const newCreatorMemberId = idGenerator.generateMemberId(userId, planId, leaveData.newCreatorId);
                const newCreatorMember = await indexedDBService.get('savings_members_cache', newCreatorMemberId);

                if (newCreatorMember) {
                    newCreatorMember.isCreator = true;
                    newCreatorMember.updateTime = now;
                    await indexedDBService.update('savings_members_cache', newCreatorMember);
                    console.log(`【缓存】已更新新创建者 ${leaveData.newCreatorId} 的权限`);

                    planToUpdate.creatorId = leaveData.newCreatorId;
                    planToUpdate.updatedAt = now;
                    await indexedDBService.update('group_savings_cache', planToUpdate);
                    console.log(`【缓存】已更新计划 ${planId} 的创建者为 ${leaveData.newCreatorId}`);
                }
            }

            member.deleted = 1;
            member.deletedAt = now;
            member.updateTime = now;
            await indexedDBService.update('savings_members_cache', member);
            console.log(`【缓存】已软删除成员 ${userId} 从计划 ${planId}，金额保持不变: ${member.amount}`);

            await this.softDeleteMemberDepositRecords(planId, parseInt(userId), now);

            if (leaveData.isCreator && !leaveData.newCreatorId) {
                planToUpdate.deleted = 1;
                planToUpdate.deletedAt = now;
                planToUpdate.updatedAt = now;
                await indexedDBService.update('group_savings_cache', planToUpdate);
                console.log(`【缓存】创建者退出且无新创建者，计划 ${planId} 已软删除`);
            }

            console.log('【缓存】退出计划缓存更新完成');
            return true;

        } catch (error) {
            console.error('【缓存】退出计划缓存更新失败:', error);
            return false;
        }
    }

    /**
     * 保存计划详情到缓存
     * @param {string} userId - 用户ID
     * @param {Object} planDetail - 计划详情
     * @returns {Promise<boolean>}
     */
    async savePlanDetail(userId, planDetail) {
        try {
            await indexedDBService.ensureInitialized();

            if (!planDetail) {
                return false;
            }

            const now = new Date().toISOString();

            const planCacheId = idGenerator.generateGroupSavingId(userId, planDetail.id);

            const planCache = {
                id: planCacheId,
                originalId: planDetail.id,
                userId: userId,
                planName: planDetail.name,
                reason: planDetail.reason || '',
                description: planDetail.description || '',
                targetAmount: planDetail.targetAmount || 0,
                currentAmount: planDetail.currentAmount || 0,
                type: planDetail.type || '日常储蓄',
                color: planDetail.color || this.getColorByType(planDetail.type),
                icon: planDetail.icon || this.getIconByType(planDetail.type),
                creatorId: planDetail.creatorId,
                status: planDetail.status || 'active',
                deadline: planDetail.deadline || '',
                createdAt: planDetail.createdAt || now,
                updatedAt: planDetail.updatedAt || now,
                deleted: planDetail.deleted || 0,
                deletedAt: planDetail.deletedAt || null,
                progress: planDetail.progress || 0,
                completed: planDetail.completed || false,
                memberCount: planDetail.memberCount || 0,
                cacheTime: now,
                isDetail: true
            };

            await indexedDBService.bulkPut('group_savings_cache', [planCache]);

            if (planDetail.members && planDetail.members.length > 0) {
                const membersCache = planDetail.members.map(member => {
                    const memberCacheId = idGenerator.generateMemberId(userId, planDetail.id, member.userId);
                    return {
                        id: memberCacheId,
                        originalId: member.id,
                        userId: userId,
                        groupSavingId: planDetail.id,
                        memberId: member.userId,
                        memberName: member.memberName || member.name || `用户${member.userId}`,
                        avatar: member.avatar || '',
                        amount: member.amount || 0,
                        isCreator: member.isCreator || member.userId === planDetail.creatorId,
                        status: member.status || 'active',
                        joinTime: member.joinTime || now,
                        deleted: member.deleted || 0,
                        deletedAt: member.deletedAt || null,
                        updateTime: now,
                        cacheTime: now
                    };
                });

                await indexedDBService.bulkPut('savings_members_cache', membersCache);
            }

            console.log('【缓存】计划详情保存成功:', planDetail.name);
            return true;

        } catch (error) {
            console.error('【缓存】保存计划详情失败:', error);
            return false;
        }
    }

    /**
     * 获取计划详情
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @returns {Promise<Object|null>}
     */
    async getPlanDetail(userId, planId) {
        try {
            await indexedDBService.ensureInitialized();

            const planIdGenerated = idGenerator.generateGroupSavingId(userId, planId);
            const plan = await indexedDBService.get('group_savings_cache', planIdGenerated);

            if (!plan) {
                console.log('【缓存】未找到计划详情:', planId);
                return null;
            }

            const members = await indexedDBService.query('savings_members_cache', 'groupSavingId', planId);
            const userMembers = members.filter(m => m.userId === userId);

            return {
                id: plan.originalId || plan.id,
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
                progress: plan.progress || (plan.targetAmount > 0
                    ? Math.min(Math.round((plan.currentAmount / plan.targetAmount) * 100), 100)
                    : 0),
                completed: plan.currentAmount >= plan.targetAmount,
                color: plan.color,
                icon: plan.icon,
                members: members.map(m => ({
                    id: m.id,
                    userId: m.memberId,
                    memberName: m.memberName,
                    name: m.memberName,
                    amount: m.amount,
                    isCreator: m.isCreator || m.memberId === plan.creatorId,
                    joinTime: m.joinTime,
                    deleted: m.deleted,
                    deletedAt: m.deletedAt,
                    avatar: m.avatar
                })),
                memberCount: members.filter(m => m.deleted !== 1).length,
                isMember: userMembers.length > 0,
                userMember: userMembers[0] || null
            };

        } catch (error) {
            console.error('【缓存】获取计划详情失败:', error);
            return null;
        }
    }

    /**
     * 清除指定计划的缓存
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @returns {Promise<boolean>}
     */
    async clearPlanCache(userId, planId) {
        try {
            await indexedDBService.ensureInitialized();

            const planIdGenerated = idGenerator.generateGroupSavingId(userId, planId);
            await indexedDBService.delete('group_savings_cache', planIdGenerated);

            const members = await indexedDBService.query('savings_members_cache', 'groupSavingId', planId);
            for (const member of members) {
                if (member.userId === userId) {
                    await indexedDBService.delete('savings_members_cache', member.id);
                }
            }

            const records = await indexedDBService.query('saving_deposit_records_cache', 'groupSavingId', planId);
            for (const record of records) {
                if (record.userId === userId) {
                    await indexedDBService.delete('saving_deposit_records_cache', record.id);
                }
            }

            console.log('【缓存】已清除计划缓存:', planId);
            return true;

        } catch (error) {
            console.error('【缓存】清除计划缓存失败:', error);
            return false;
        }
    }

    /**
     * 保存存钱记录到缓存
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @param {Array} records - 存钱记录列表
     * @param {Object} queryParams - 查询参数
     * @returns {Promise<boolean>}
     */
    async saveDepositRecords(userId, planId, records, queryParams = {}) {
        try {
            await indexedDBService.ensureInitialized();

            const now = new Date().toISOString();

            for (const record of records) {
                const recordId = idGenerator.generateDepositRecordId(userId, record.id || `${planId}_${record.memberId}_${Date.now()}`);
                const recordCache = {
                    id: recordId,
                    originalId: record.id,
                    userId: userId,
                    groupSavingId: planId,
                    memberId: record.memberId,
                    memberName: record.memberName,
                    amount: record.amount,
                    note: record.note || '',
                    depositTime: record.depositTime || record.createTime || now,
                    beforeAmount: record.beforeAmount || 0,
                    afterAmount: record.afterAmount || 0,
                    planBeforeAmount: record.planBeforeAmount || 0,
                    planAfterAmount: record.planAfterAmount || 0,
                    deleted: record.deleted || 0,
                    deletedAt: record.deletedAt || null,
                    cacheTime: now
                };

                await indexedDBService.bulkPut('saving_deposit_records_cache', [recordCache]);
            }

            console.log('【缓存】存钱记录保存成功:', records.length);
            return true;

        } catch (error) {
            console.error('【缓存】保存存钱记录失败:', error);
            return false;
        }
    }

    /**
     * 获取存钱记录（分页）
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @param {Object} queryParams - 查询参数 { page, size, memberId, startTime, endTime }
     * @returns {Promise<Object|null>}
     */
    async getDepositRecords(userId, planId, queryParams = {}) {
        try {
            await indexedDBService.ensureInitialized();

            const page = queryParams.page || 1;
            const size = queryParams.size || 10;

            const allRecords = await indexedDBService.query('saving_deposit_records_cache', 'groupSavingId', planId);

            let filtered = allRecords.filter(r => r.userId === userId);

            if (queryParams.memberId) {
                filtered = filtered.filter(r => r.memberId === queryParams.memberId);
            }

            if (queryParams.startTime) {
                filtered = filtered.filter(r => new Date(r.depositTime) >= new Date(queryParams.startTime));
            }
            if (queryParams.endTime) {
                filtered = filtered.filter(r => new Date(r.depositTime) <= new Date(queryParams.endTime + ' 23:59:59'));
            }

            filtered.sort((a, b) => new Date(b.depositTime) - new Date(a.depositTime));

            const normalCount = filtered.filter(r => r.deleted !== 1).length;
            const deletedCount = filtered.filter(r => r.deleted === 1).length;

            const start = (page - 1) * size;
            const end = start + size;
            const pagedRecords = filtered.slice(start, end);

            const records = pagedRecords.map(r => ({
                id: r.originalId || r.id,
                memberId: r.memberId,
                memberName: r.memberName,
                amount: r.amount,
                note: r.note,
                createTime: r.depositTime,
                depositTime: r.depositTime,
                deleted: r.deleted,
                deletedAt: r.deletedAt
            }));

            return {
                records: records,
                total: filtered.length,
                page: page,
                size: size,
                pages: Math.ceil(filtered.length / size),
                stats: { normalCount, deletedCount }
            };

        } catch (error) {
            console.error('【缓存】获取存钱记录失败:', error);
            return null;
        }
    }

    /**
     * 保存成员存钱记录
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @param {number} memberId - 成员用户ID
     * @param {Array} records - 存钱记录
     * @returns {Promise<boolean>}
     */
    async saveMemberDepositRecords(userId, planId, memberId, records) {
        try {
            await indexedDBService.ensureInitialized();

            if (!records || records.length === 0) {
                console.log('【缓存】没有成员记录需要保存');
                return true;
            }

            const now = new Date().toISOString();

            await this.clearMemberDepositRecords(userId, planId, memberId);

            for (const record of records) {
                const recordId = idGenerator.generateDepositRecordId(userId, record.id || `${planId}_${memberId}_${Date.now()}`);

                const recordCache = {
                    id: recordId,
                    originalId: record.id,
                    userId: userId,
                    groupSavingId: planId,
                    memberId: memberId,
                    memberName: record.memberName || '',
                    amount: record.amount || 0,
                    note: record.note || '',
                    depositTime: record.depositTime || record.createTime || now,
                    createTime: record.createTime || now,
                    beforeAmount: record.beforeAmount || 0,
                    afterAmount: record.afterAmount || 0,
                    planBeforeAmount: record.planBeforeAmount || 0,
                    planAfterAmount: record.planAfterAmount || 0,
                    deleted: record.deleted || 0,
                    deletedAt: record.deletedAt || null,
                    isMemberRecord: true,
                    cacheTime: now
                };

                await indexedDBService.bulkPut('saving_deposit_records_cache', [recordCache]);
            }

            console.log('【缓存】成员存钱记录保存成功:', memberId, records.length);
            return true;

        } catch (error) {
            console.error('【缓存】保存成员存钱记录失败:', error);
            return false;
        }
    }

    /**
     * 清除成员存钱记录缓存
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @param {number} memberId - 成员用户ID
     * @returns {Promise<boolean>}
     */
    async clearMemberDepositRecords(userId, planId, memberId) {
        try {
            await indexedDBService.ensureInitialized();

            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.log('【缓存】saving_deposit_records_cache 表不存在');
                return true;
            }

            const allRecords = await indexedDBService.query('saving_deposit_records_cache', 'groupSavingId', planId);

            const memberRecords = allRecords.filter(r =>
                r.userId === userId &&
                r.memberId === memberId
            );

            for (const record of memberRecords) {
                await indexedDBService.delete('saving_deposit_records_cache', record.id);
            }

            console.log('【缓存】已清除成员', memberId, '的', memberRecords.length, '条记录');
            return true;

        } catch (error) {
            console.error('【缓存】清除成员存钱记录失败:', error);
            return false;
        }
    }

    /**
     * 获取成员存钱记录
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @param {number} memberId - 成员用户ID
     * @returns {Promise<Array>}
     */
    async getMemberDepositRecords(userId, planId, memberId) {
        try {
            await indexedDBService.ensureInitialized();

            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.warn('【缓存】saving_deposit_records_cache 表不存在');
                return [];
            }

            const allRecords = await indexedDBService.query('saving_deposit_records_cache', 'groupSavingId', planId);

            const memberRecords = allRecords.filter(r =>
                r.userId === userId &&
                r.memberId === memberId
            );

            memberRecords.sort((a, b) => {
                const timeA = new Date(a.depositTime || a.createTime || 0).getTime();
                const timeB = new Date(b.depositTime || b.createTime || 0).getTime();
                return timeB - timeA;
            });

            const formattedRecords = memberRecords.map(r => ({
                id: r.originalId || r.id,
                amount: r.amount,
                note: r.note,
                createTime: r.depositTime || r.createTime,
                depositTime: r.depositTime || r.createTime,
                deleted: r.deleted,
                deletedAt: r.deletedAt,
                memberName: r.memberName
            }));

            console.log('【缓存】获取成员存钱记录成功:', memberId, formattedRecords.length);
            return formattedRecords;

        } catch (error) {
            console.error('【缓存】获取成员存钱记录失败:', error);
            return [];
        }
    }

    /**
     * 保存存钱记录统计信息
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @param {Object} stats - 统计信息
     * @returns {Promise<boolean>}
     */
    async saveRecordsStats(userId, planId, stats) {
        try {
            await indexedDBService.ensureInitialized();

            const statsKey = idGenerator.generateRecordsMetaId(userId, planId);
            const statsCache = {
                id: statsKey,
                userId: userId,
                planId: planId,
                total: stats.total,
                normalCount: stats.normalCount,
                deletedCount: stats.deletedCount,
                updateTime: new Date().toISOString()
            };

            if (indexedDBService.db.objectStoreNames.contains('records_stats_cache')) {
                await indexedDBService.bulkPut('records_stats_cache', [statsCache]);
            }

            return true;

        } catch (error) {
            console.error('【缓存】保存统计信息失败:', error);
            return false;
        }
    }

    /**
     * 清除指定计划的所有存钱记录缓存
     * @param {string} userId - 用户ID
     * @param {number} planId - 计划ID
     * @returns {Promise<boolean>}
     */
    async clearPlanDepositRecordsCache(userId, planId) {
        try {
            await indexedDBService.ensureInitialized();

            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.log('【缓存】saving_deposit_records_cache 表不存在');
                return true;
            }

            const allRecords = await indexedDBService.query('saving_deposit_records_cache', 'groupSavingId', planId);

            const userRecords = allRecords.filter(r => r.userId === userId);

            for (const record of userRecords) {
                await indexedDBService.delete('saving_deposit_records_cache', record.id);
            }

            console.log(`【缓存】已清除计划 ${planId} 的 ${userRecords.length} 条存钱记录缓存`);
            return true;

        } catch (error) {
            console.error('【缓存】清除计划存钱记录缓存失败:', error);
            return false;
        }
    }

    /**
     * 根据类型获取图标
     * @param {string} type - 计划类型
     * @returns {string} 图标类名
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
        };
        return icons[type] || 'fas fa-piggy-bank';
    }

    /**
     * 根据类型获取颜色
     * @param {string} type - 计划类型
     * @returns {string} 颜色代码
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
        };
        return colors[type] || '#80A492';
    }
}

export default new GroupSavingCacheService()