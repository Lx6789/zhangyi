// services/cache/group-saving-cache.service.js

import indexedDBService from '@/services/db/indexed-db.service.js'
import { notificationService } from '@/services'

/**
 * 多人存钱计划缓存服务
 */
class GroupSavingCacheService {

    /**
     * 检查多人存钱计划缓存表是否有数据
     * 正确逻辑：检查当前用户是否有参与任何计划（成员表中存在且未删除的记录）
     * @param {string} userId - 用户ID
     * @returns {Promise<boolean>} 有数据返回 true，否则返回 false
     */
    async checkGroupSavingsExist(userId = null) {
        try {
            await indexedDBService.ensureInitialized();

            // 如果没有指定userId，返回false
            if (!userId) {
                return false;
            }

            // 检查成员表是否存在
            if (!indexedDBService.db.objectStoreNames.contains('savings_members_cache')) {
                console.warn('savings_members_cache 表不存在');
                return false;
            }

            // 查询成员表时使用 'memberId' 索引
            const userMembers = await indexedDBService.query('savings_members_cache', 'memberId', parseInt(userId));

            console.log(`【checkExist】用户 ${userId} 的成员记录数: ${userMembers.length}`);

            // 只统计未删除的成员记录（deleted !== 1）
            const activeMembers = userMembers.filter(member => member.deleted !== 1);

            console.log(`【checkExist】用户 ${userId} 的活跃成员记录: ${activeMembers.length}`);
            console.log(`【checkExist】已退出的成员: ${userMembers.filter(m => m.deleted === 1).length}`);

            if (activeMembers.length === 0) {
                console.log(`用户 ${userId} 没有参与任何活跃计划（已退出）`);
                return false;
            }

            // 获取用户参与的计划ID列表
            const userPlanIds = [...new Set(activeMembers.map(member => member.groupSavingId))];

            // 检查计划表是否存在
            if (!indexedDBService.db.objectStoreNames.contains('group_savings_cache')) {
                console.warn('group_savings_cache 表不存在');
                return false;
            }

            // 查询计划表，确认这些计划存在且未删除
            const allPlans = await indexedDBService.query('group_savings_cache', 'userId', userId);
            const activePlans = allPlans.filter(plan =>
                userPlanIds.includes(plan.id) && plan.deleted !== 1
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

            // 特殊处理：如果是查询 savings_members_cache 且 idName 是 'memberId'，需要确保 id 是整数
            let queryId = id;
            if (tableName === 'savings_members_cache' && idName === 'memberId') {
                queryId = parseInt(id);
            }

            const results = await indexedDBService.query(tableName, idName, queryId);

            // 🔥 如果不包含已删除的，则过滤掉 deleted=1 的数据
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
     * @param {string} userId - 用户ID
     * @returns {Promise<boolean>} 清除成功返回true
     */
    async clearUserCache(userId) {
        try {
            await indexedDBService.ensureInitialized();

            // 获取所有需要清除的表
            const tables = [
                'group_savings_cache',
                'savings_members_cache',
                'saving_deposit_records_cache'
            ];

            for (const tableName of tables) {
                if (indexedDBService.db.objectStoreNames.contains(tableName)) {
                    const userData = await indexedDBService.query(tableName, 'userId', userId);

                    // 删除该用户的所有数据
                    for (const data of userData) {
                        await indexedDBService.delete(tableName, data.id);
                    }

                    console.log(`已清除用户 ${userId} 在表 ${tableName} 中的 ${userData.length} 条数据`);
                }
            }

            // 等待一小段时间确保删除完成
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

            // 查询该计划的所有成员
            const members = await indexedDBService.query(
                'savings_members_cache',
                'groupSavingId',
                planId
            );

            // 删除这些成员
            for (const member of members) {
                await indexedDBService.delete('savings_members_cache', member.id);
            }

            console.log(`已清除计划 ${planId} 的 ${members.length} 条成员缓存`);
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
                // 先清除该用户的旧缓存
                await this.clearUserCache(userId);
            }

            if (!plansData || plansData.length === 0) {
                console.log('没有数据需要缓存');
                return true;
            }

            console.log('开始保存多人存钱计划数据到缓存，计划数:', plansData.length);

            // 准备计划缓存数据
            const groupSavingsCache = [];
            // 准备成员缓存数据
            const savingsMembersCache = [];

            const now = new Date().toISOString();

            for (const plan of plansData) {
                // 添加计划缓存（包含deleted字段）
                groupSavingsCache.push({
                    id: plan.id,
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

                // 添加成员缓存 - 只添加当前计划的最新成员（包含deleted字段）
                const members = plan.members || [];
                for (const member of members) {
                    const memberUserId = member.userId;
                    if (!memberUserId) {
                        console.warn('成员数据缺少userId:', member);
                        continue;
                    }

                    savingsMembersCache.push({
                        id: `${plan.id}_${memberUserId}`,
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

            // 批量保存到IndexedDB - 使用 bulkPut 避免主键冲突
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
     * 获取成员的总金额（从存钱记录表计算）
     * @param {number|string} planId - 计划ID
     * @param {number} memberUserId - 成员用户ID
     * @returns {Promise<number>} 成员总金额
     */
    async getMemberTotalAmount(planId, memberUserId) {
        try {
            await indexedDBService.ensureInitialized();

            // 检查存钱记录表是否存在
            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.warn('saving_deposit_records_cache 表不存在');
                return 0;
            }

            // 查询该成员的所有存钱记录（包括已删除的）
            const depositRecords = await indexedDBService.query(
                'saving_deposit_records_cache',
                'memberId',
                memberUserId
            );

            // 过滤出属于该计划的记录
            const planRecords = depositRecords.filter(record => record.groupSavingId === planId);

            // 计算总金额
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
            // 检查存钱记录表是否存在
            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.warn('saving_deposit_records_cache 表不存在');
                return false;
            }

            // 查询该成员的所有存钱记录
            const depositRecords = await indexedDBService.query(
                'saving_deposit_records_cache',
                'memberId',
                memberUserId
            );

            // 过滤出属于该计划的已删除记录
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
            // 检查存钱记录表是否存在
            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.warn('saving_deposit_records_cache 表不存在');
                return false;
            }

            // 查询该成员的所有存钱记录
            const depositRecords = await indexedDBService.query(
                'saving_deposit_records_cache',
                'memberId',
                memberUserId
            );

            // 过滤出属于该计划的未删除记录
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

            // 1. 查询该成员
            const memberId = `${planId}_${memberUserId}`;
            const member = await indexedDBService.get('savings_members_cache', memberId);

            if (member) {
                // 2. 更新成员为已删除状态（只修改 deleted 和 deletedAt，不修改 amount）
                member.deleted = 1;
                member.deletedAt = now;
                member.updateTime = now;

                await indexedDBService.update('savings_members_cache', member);
                console.log(`已软删除成员 ${memberUserId} 从计划 ${planId}，金额保持不变: ${member.amount}`);

                // 3. 更新该成员的所有存钱记录为已删除
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

            // 1. 查询该成员
            const memberId = `${planId}_${memberUserId}`;
            const member = await indexedDBService.get('savings_members_cache', memberId);

            if (member && member.deleted === 1) {
                // 2. 更新成员为未删除状态（只修改 deleted 和 deletedAt，amount 保持不变）
                member.deleted = 0;
                member.deletedAt = null;
                // amount 保持不变，不重新计算
                member.updateTime = now;

                await indexedDBService.update('savings_members_cache', member);
                console.log(`已恢复成员 ${memberUserId} 到计划 ${planId}，金额保持不变: ${member.amount}`);

                // 3. 恢复该成员的所有存钱记录
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

            const memberId = `${planId}_${memberUserId}`;
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

            // 1. 获取当前计划数据
            const plans = await this.getTableDataById('userId', userId, 'group_savings_cache', true);
            const planToUpdate = plans.find(p => p.id === planId);

            if (!planToUpdate) {
                console.warn('未找到要删除的计划数据，ID:', planId);
                return false;
            }

            // 2. 更新计划数据（软删除）
            planToUpdate.deleted = 1;
            planToUpdate.deletedAt = now;
            planToUpdate.updatedAt = now;

            await indexedDBService.update('group_savings_cache', planToUpdate);
            console.log('已软删除计划缓存，ID:', planId, 'deletedAt:', now);

            // 3. 也软删除该计划下的所有成员（保持缓存一致）
            const members = await this.getTableDataById('groupSavingId', planId, 'savings_members_cache', true);
            for (const member of members) {
                member.deleted = 1;
                member.deletedAt = now;
                member.updateTime = now;
                await indexedDBService.update('savings_members_cache', member);

                // 4. 软删除该成员的所有存钱记录
                await this.softDeleteMemberDepositRecords(planId, member.memberId, now);
            }
            console.log(`已软删除计划 ${planId} 的 ${members.length} 条成员缓存和对应的存钱记录`);

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

            // 1. 获取当前计划数据
            const plans = await this.getTableDataById('userId', userId, 'group_savings_cache', true);
            const planToUpdate = plans.find(p => p.id === planId);

            if (!planToUpdate) {
                console.warn('未找到计划缓存数据，ID:', planId);
                return false;
            }

            // 2. 更新计划的总金额和进度
            planToUpdate.currentAmount = depositData.planTotal;
            planToUpdate.updatedAt = now;

            await indexedDBService.update('group_savings_cache', planToUpdate);
            console.log('已更新计划缓存，新总金额:', depositData.planTotal, '进度:', depositData.progress);

            // 3. 获取并更新成员金额
            const members = await this.getTableDataById('groupSavingId', planId, 'savings_members_cache', true);
            const memberToUpdate = members.find(m => m.memberId === depositData.memberId);

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

            // 4. 添加存钱记录到缓存（用于存钱记录列表）
            if (indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                const depositRecord = {
                    id: `${planId}_${depositData.memberId}_${Date.now()}`,
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

            // 1. 获取计划数据（通过 userId 查询，因为计划表用 userId 做用户隔离）
            const plans = await indexedDBService.query('group_savings_cache', 'userId', userId);
            const planToUpdate = plans.find(p => p.id === planId);

            if (!planToUpdate) {
                console.warn('【缓存】未找到计划缓存数据，ID:', planId);
                return false;
            }

            console.log('【缓存】找到计划:', planToUpdate.planName, '创建者:', planToUpdate.creatorId);

            // 2. 获取当前退出成员的信息 - 注意：用 memberId 查询
            const members = await indexedDBService.query('savings_members_cache', 'memberId', parseInt(userId));
            const member = members.find(m => m.groupSavingId === planId);

            if (!member) {
                console.warn('【缓存】未找到成员缓存数据，userId:', userId, 'planId:', planId);
                return false;
            }

            console.log('【缓存】找到成员:', member.memberName, '当前金额:', member.amount);

            // 3. 如果是创建者退出且指定了新创建者，需要更新创建者信息
            if (leaveData.isCreator && leaveData.newCreatorId) {
                // 3.1 更新新创建者的 isCreator 状态
                const newCreatorMembers = await indexedDBService.query('savings_members_cache', 'memberId', parseInt(leaveData.newCreatorId));
                const newCreatorMember = newCreatorMembers.find(m => m.groupSavingId === planId);

                if (newCreatorMember) {
                    newCreatorMember.isCreator = true;
                    newCreatorMember.updateTime = now;
                    await indexedDBService.update('savings_members_cache', newCreatorMember);
                    console.log(`【缓存】已更新新创建者 ${leaveData.newCreatorId} 的权限`);

                    // 3.2 更新计划表中的创建者ID
                    planToUpdate.creatorId = leaveData.newCreatorId;
                    planToUpdate.updatedAt = now;
                    await indexedDBService.update('group_savings_cache', planToUpdate);
                    console.log(`【缓存】已更新计划 ${planId} 的创建者为 ${leaveData.newCreatorId}`);
                }
            }

            // 4. 软删除当前成员（只修改 deleted 和 deletedAt，不修改 amount）
            member.deleted = 1;
            member.deletedAt = now;
            member.updateTime = now;
            await indexedDBService.update('savings_members_cache', member);
            console.log(`【缓存】已软删除成员 ${userId} 从计划 ${planId}，金额保持不变: ${member.amount}`);

            // 5. 软删除该成员的所有存钱记录
            await this.softDeleteMemberDepositRecords(planId, parseInt(userId), now);

            // 6. 如果是创建者退出且没有新创建者，计划也应该被软删除
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

    // services/cache/group-saving-cache.service.js

// 在 GroupSavingCacheService 类中添加以下方法

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

            // 保存计划详情
            const planCache = {
                id: planDetail.id,
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
                isDetail: true  // 标记为详情数据
            };

            await indexedDBService.bulkPut('group_savings_cache', [planCache]);

            // 保存成员数据
            if (planDetail.members && planDetail.members.length > 0) {
                const membersCache = planDetail.members.map(member => ({
                    id: `${planDetail.id}_${member.userId}`,
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
                }));

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

            // 查询计划详情
            const plans = await indexedDBService.query('group_savings_cache', 'userId', userId);
            const plan = plans.find(p => p.id === planId);

            if (!plan) {
                console.log('【缓存】未找到计划详情:', planId);
                return null;
            }

            // 查询成员数据
            const members = await indexedDBService.query('savings_members_cache', 'groupSavingId', planId);
            const userMembers = members.filter(m => m.userId === userId);

            // 构建返回数据
            return {
                id: plan.id,
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
                // 标记当前用户是否在计划中
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

            // 删除计划缓存
            const plans = await indexedDBService.query('group_savings_cache', 'userId', userId);
            const planToDelete = plans.find(p => p.id === planId);
            if (planToDelete) {
                await indexedDBService.delete('group_savings_cache', planToDelete.id);
            }

            // 删除成员缓存
            const members = await indexedDBService.query('savings_members_cache', 'groupSavingId', planId);
            for (const member of members) {
                await indexedDBService.delete('savings_members_cache', member.id);
            }

            // 删除存钱记录缓存
            const records = await indexedDBService.query('saving_deposit_records_cache', 'groupSavingId', planId);
            for (const record of records) {
                await indexedDBService.delete('saving_deposit_records_cache', record.id);
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

            // 保存每条记录
            for (const record of records) {
                const recordId = record.id || `${planId}_${record.memberId}_${Date.now()}`;
                const recordCache = {
                    id: recordId,
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

            // 保存分页信息到元数据
            const metaKey = `records_meta_${planId}`;
            const metaData = {
                id: metaKey,
                userId: userId,
                planId: planId,
                total: records.length,
                queryParams: queryParams,
                updateTime: now
            };

            // 使用单独的表或存储元数据
            if (indexedDBService.db.objectStoreNames.contains('records_meta_cache')) {
                await indexedDBService.bulkPut('records_meta_cache', [metaData]);
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

            // 查询所有存钱记录
            const allRecords = await indexedDBService.query('saving_deposit_records_cache', 'groupSavingId', planId);

            // 过滤用户相关记录
            let filtered = allRecords.filter(r => r.userId === userId);

            // 按成员过滤
            if (queryParams.memberId) {
                filtered = filtered.filter(r => r.memberId === queryParams.memberId);
            }

            // 按时间范围过滤
            if (queryParams.startTime) {
                filtered = filtered.filter(r => new Date(r.depositTime) >= new Date(queryParams.startTime));
            }
            if (queryParams.endTime) {
                filtered = filtered.filter(r => new Date(r.depositTime) <= new Date(queryParams.endTime + ' 23:59:59'));
            }

            // 按时间倒序排序
            filtered.sort((a, b) => new Date(b.depositTime) - new Date(a.depositTime));

            // 统计
            const normalCount = filtered.filter(r => r.deleted !== 1).length;
            const deletedCount = filtered.filter(r => r.deleted === 1).length;

            // 分页
            const start = (page - 1) * size;
            const end = start + size;
            const pagedRecords = filtered.slice(start, end);

            // 转换为前端需要的格式
            const records = pagedRecords.map(r => ({
                id: r.id,
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

            // 先清除该成员旧的记录缓存
            await this.clearMemberDepositRecords(userId, planId, memberId);

            // 保存每条新记录
            for (const record of records) {
                // 生成唯一ID，使用后端返回的 id 如果存在
                const recordId = record.id ? `record_${record.id}` : `member_${planId}_${memberId}_${Date.now()}_${Math.random()}`;

                const recordCache = {
                    id: recordId,
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
                    cacheTime: now,
                    // 保留原始记录ID
                    originalId: record.id
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

            // 检查表是否存在
            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.log('【缓存】saving_deposit_records_cache 表不存在');
                return true;
            }

            // 查询该成员的所有存钱记录
            const allRecords = await indexedDBService.query('saving_deposit_records_cache', 'groupSavingId', planId);

            const memberRecords = allRecords.filter(r =>
                r.userId === userId &&
                r.memberId === memberId
            );

            // 删除这些记录
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

            // 检查表是否存在
            if (!indexedDBService.db.objectStoreNames.contains('saving_deposit_records_cache')) {
                console.warn('【缓存】saving_deposit_records_cache 表不存在');
                return [];
            }

            // 查询所有记录
            const allRecords = await indexedDBService.query('saving_deposit_records_cache', 'groupSavingId', planId);

            // 过滤出该成员的记录
            const memberRecords = allRecords.filter(r =>
                r.userId === userId &&
                r.memberId === memberId
            );

            // 按时间倒序排序
            memberRecords.sort((a, b) => {
                const timeA = new Date(a.depositTime || a.createTime || 0).getTime();
                const timeB = new Date(b.depositTime || b.createTime || 0).getTime();
                return timeB - timeA;
            });

            // 转换为前端需要的格式
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

            const statsKey = `stats_${planId}`;
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