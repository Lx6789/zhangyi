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

            console.log(`根据 `, idName, `查询`, tableName, `:`, id);
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
                    deleted: plan.deleted || 0,           // 添加软删除字段
                    deletedAt: plan.deletedAt || null,    // 添加删除时间字段
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
     * 软删除指定计划的成员（标记为已删除）
     * @param {string} userId - 用户ID
     * @param {number|string} planId - 计划ID
     * @param {number} memberUserId - 成员用户ID
     * @returns {Promise<boolean>}
     */
    async softDeleteMember(userId, planId, memberUserId) {
        try {
            await indexedDBService.ensureInitialized();

            // 查询该成员
            const memberId = `${planId}_${memberUserId}`;
            const member = await indexedDBService.get('savings_members_cache', memberId);

            if (member) {
                // 更新为已删除状态
                member.deleted = 1;
                member.deletedAt = new Date().toISOString();
                member.updateTime = new Date().toISOString();

                await indexedDBService.update('savings_members_cache', member);
                console.log(`已软删除成员 ${memberUserId} 从计划 ${planId}`);
            }

            return true;
        } catch (error) {
            console.error('软删除成员失败:', error);
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