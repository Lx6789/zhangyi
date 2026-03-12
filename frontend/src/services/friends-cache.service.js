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
            const userId = this.getCurrentUserId()
            const updateTime = new Date().toISOString()

            // 先删除该用户的所有旧缓存
            await this.clearUserCache(userId)

            // 准备缓存数据，每条记录添加用户ID标识
            const cacheData = friendsList.map(friend => ({
                ...friend,
                userId: userId,
                updateTime: updateTime,
                // 使用 friendId 作为主键，但加上用户前缀避免冲突
                id: `friend_${userId}_${friend.friendId}`
            }))

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
            const userId = this.getCurrentUserId()
            const allCache = await indexedDBService.getAll(this.cacheStore)

            // 过滤出当前用户的好友
            const userFriends = allCache.filter(item => item.userId === userId)

            // 按更新时间排序，最新的在前
            userFriends.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime))

            console.log(`从缓存获取好友列表，共 ${userFriends.length} 条`)
            return userFriends
        } catch (error) {
            console.error('获取好友列表缓存失败:', error)
            return []
        }
    }

    /**
     * 清空当前用户的缓存
     */
    async clearUserCache(userId = null) {
        try {
            const targetUserId = userId || this.getCurrentUserId()
            const allCache = await indexedDBService.getAll(this.cacheStore)

            const userCacheItems = allCache.filter(item => item.userId === targetUserId)

            for (const item of userCacheItems) {
                await indexedDBService.delete(this.cacheStore, item.id)
            }

            console.log(`清空用户 ${targetUserId} 的好友缓存成功`)
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
     */
    async removeFriend(friendId) {
        try {
            const userId = this.getCurrentUserId()
            const allCache = await indexedDBService.getAll(this.cacheStore)

            const targetItem = allCache.find(item =>
                item.userId === userId && item.friendId === friendId
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
}

export default new FriendsCacheService()