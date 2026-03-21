// services/cache/group-saving-cache.service.js

import indexedDBService from '@/services/db/indexed-db.service.js'
import { notificationService } from '@/services'

/**
 * 多人存钱计划缓存服务
 */
class GroupSavingCacheService {
    /**
     * 检查多人存钱计划缓存表是否有数据
     * 可以指定用户ID来检查特定用户的数据
     * @param {string} [userId] - 可选的用户ID，用于检查特定用户的数据
     * @returns {Promise<boolean>} 有数据返回 true，否则返回 false
     */
    async checkGroupSavingsExist(userId = null) {
        try {
            await indexedDBService.ensureInitialized()

            // 检查表是否存在
            if (!indexedDBService.db.objectStoreNames.contains('group_savings_cache')) {
                console.warn('group_savings_cache 表不存在')
                return false
            }

            // 如果没有指定userId，返回false
            if (!userId) {
                return false
            }

            // 根据userId查询是否有相应的数据（排除已删除的）
            const userData = await indexedDBService.query('group_savings_cache', 'userId', userId)
            // 过滤掉已删除的计划
            const activeData = userData.filter(item => item.deleted !== 1)
            const hasData = activeData && activeData.length > 0
            console.log(`用户 ${userId} 在 group_savings_cache 表 ${hasData ? '有' : '无'} 活跃数据`)
            return hasData

        } catch (error) {
            console.error('检查数据异常:', error)
            return false
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
            const results = await indexedDBService.query(tableName, idName, id);

            // 如果不包含已删除的，则过滤掉 deleted=1 的数据
            if (!includeDeleted) {
                return results.filter(item => item.deleted !== 1);
            }
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

            plansData.forEach(plan => {
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
                if (members && members.length > 0) {
                    members.forEach(member => {
                        const memberUserId = member.userId;
                        if (!memberUserId) {
                            console.warn('成员数据缺少userId:', member);
                            return;
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
                    });
                }
            });

            // 批量保存到IndexedDB
            if (groupSavingsCache.length > 0) {
                await indexedDBService.bulkAdd('group_savings_cache', groupSavingsCache);
                console.log(`已缓存 ${groupSavingsCache.length} 条计划数据`);
            }

            if (savingsMembersCache.length > 0) {
                await indexedDBService.bulkAdd('savings_members_cache', savingsMembersCache);
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