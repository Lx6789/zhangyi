// services/friends-cache.service.js
import indexedDBService from './db/indexed-db.service.js'
import userDataService from './user-data.service.js'

/**
 * 好友缓存服务
 * 用于离线存储好友列表数据
 */
class FriendsCacheService {
    constructor() {
        this.cacheStore = 'friends_cache'
    }

    /**
     * 获取当前用户ID
     */
    getCurrentUserId() {
        return userDataService.getCurrentUserId() || 'anonymous'
    }

    /**
     * 保存好友列表到缓存
     * @param {Array} friendsList - 好友列表数据
     */
    async saveFriendsList(friendsList) {
        try {
            const currentUserId = this.getCurrentUserId()
            const updateTime = new Date().toISOString()

            // 先删除该用户的所有旧缓存
            await this.clearUserCache(currentUserId)

            // 准备缓存数据，每条记录添加当前用户ID标识用于区分不同用户的缓存
            const cacheData = friendsList.map(friend => {
                // 确保原始数据中的字段被保留
                return {
                    // 保留原始好友的所有字段
                    ...friend,
                    // 添加一个字段来标识这个缓存属于哪个用户（当前登录用户）
                    ownerUserId: currentUserId,
                    // 缓存更新时间
                    updateTime: updateTime,
                    // 使用 friendId 作为主键，但加上用户前缀避免冲突
                    id: `friend_${currentUserId}_${friend.friendId}`
                }
            })

            console.log('准备缓存的好友数据:', cacheData.map(f => ({
                id: f.id,
                userId: f.userId,           // 好友的用户ID（从friendId映射而来）
                friendId: f.friendId,        // 好友关系ID
                ownerUserId: f.ownerUserId,  // 当前登录用户ID
                name: f.name,
                nickname: f.nickname,
                phone: f.phone
            })))

            // 批量保存到 IndexedDB
            if (cacheData.length > 0) {
                await indexedDBService.bulkAdd(this.cacheStore, cacheData)
            }

            console.log(`好友列表缓存成功，共 ${cacheData.length} 条`)
            return true
        } catch (error) {
            console.error('保存好友列表缓存失败:', error)
            return false
        }
    }

    /**
     * 获取缓存的好友列表
     * @returns {Array} 好友列表数据
     */
    async getFriendsList() {
        try {
            const currentUserId = this.getCurrentUserId()
            const allCache = await indexedDBService.getAll(this.cacheStore)

            console.log(`从缓存读取所有数据，共 ${allCache.length} 条`)

            // 过滤出当前用户的好友（使用 ownerUserId 字段）
            const userFriends = allCache.filter(item => item.ownerUserId === currentUserId)

            // 按更新时间排序，最新的在前
            userFriends.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime))

            console.log(`从缓存获取好友列表，共 ${userFriends.length} 条`)

            // 返回时移除内部使用的字段，保持数据干净
            return userFriends.map(item => {
                const { ownerUserId, updateTime, ...friend } = item
                return friend
            })
        } catch (error) {
            console.error('获取好友列表缓存失败:', error)
            return []
        }
    }

    /**
     * 清空当前用户的缓存
     * @param {string} userId - 可选，指定要清空的用户ID
     */
    async clearUserCache(userId = null) {
        try {
            const targetUserId = userId || this.getCurrentUserId()
            const allCache = await indexedDBService.getAll(this.cacheStore)

            // 使用 ownerUserId 字段来过滤
            const userCacheItems = allCache.filter(item => item.ownerUserId === targetUserId)

            for (const item of userCacheItems) {
                await indexedDBService.delete(this.cacheStore, item.id)
            }

            console.log(`清空用户 ${targetUserId} 的好友缓存成功，共删除 ${userCacheItems.length} 条`)
            return true
        } catch (error) {
            console.error('清空好友缓存失败:', error)
            return false
        }
    }

    /**
     * 检查缓存是否存在且有数据
     */
    async hasCache() {
        try {
            const friends = await this.getFriendsList()
            return friends.length > 0
        } catch {
            return false
        }
    }

    /**
     * 删除单个好友（当删除好友时）
     * @param {number} friendId - 好友关系ID
     */
    async removeFriend(friendId) {
        try {
            const currentUserId = this.getCurrentUserId()
            const allCache = await indexedDBService.getAll(this.cacheStore)

            // 使用 ownerUserId 字段查找
            const targetItem = allCache.find(item =>
                item.ownerUserId === currentUserId && item.friendId === friendId
            )

            if (targetItem) {
                await indexedDBService.delete(this.cacheStore, targetItem.id)
                console.log(`从缓存删除好友 ${friendId} 成功`)
                return true
            }
            return false
        } catch (error) {
            console.error('删除好友缓存失败:', error)
            return false
        }
    }

    /**
     * 更新单个好友信息
     * @param {Object} friend - 更新的好友数据
     */
    async updateFriend(friend) {
        try {
            const currentUserId = this.getCurrentUserId()
            const allCache = await indexedDBService.getAll(this.cacheStore)

            // 查找要更新的好友
            const targetItem = allCache.find(item =>
                item.ownerUserId === currentUserId && item.friendId === friend.friendId
            )

            if (targetItem) {
                const updatedItem = {
                    ...targetItem,
                    ...friend,
                    updateTime: new Date().toISOString()
                }
                await indexedDBService.update(this.cacheStore, updatedItem)
                console.log(`更新缓存好友 ${friend.friendId} 成功`)
                return true
            }
            return false
        } catch (error) {
            console.error('更新好友缓存失败:', error)
            return false
        }
    }

    /**
     * 批量更新好友缓存
     * @param {Array} friendsList - 新的好友列表
     */
    async refreshCache(friendsList) {
        try {
            // 直接调用 saveFriendsList 会先清空再保存
            return await this.saveFriendsList(friendsList)
        } catch (error) {
            console.error('刷新好友缓存失败:', error)
            return false
        }
    }

    /**
     * 获取缓存统计信息
     */
    async getCacheStats() {
        try {
            const allCache = await indexedDBService.getAll(this.cacheStore)
            const currentUserId = this.getCurrentUserId()

            const userCache = allCache.filter(item => item.ownerUserId === currentUserId)

            return {
                totalItems: allCache.length,
                userItems: userCache.length,
                lastUpdate: userCache.length > 0
                    ? new Date(Math.max(...userCache.map(i => new Date(i.updateTime))))
                    : null,
                users: [...new Set(allCache.map(i => i.ownerUserId))]
            }
        } catch (error) {
            console.error('获取缓存统计失败:', error)
            return null
        }
    }
}

export default new FriendsCacheService()