// services/friends.service.js
import notificationService from '@/services/utils/notification.service.js'
import * as friendsApi from '@/api/friends'
import friendsCacheService from '@/services/cache/friends-cache.service.js'

class FriendsService {
    /**
     * 获取好友列表 - 优先从缓存获取，失败时从API获取
     * @param {boolean} forceRefresh 是否强制刷新（从API获取并更新缓存）
     */
    async getFriendsList(forceRefresh = false) {
        try {
            if (!forceRefresh) {
                const cachedFriends = await friendsCacheService.getFriendsList()
                if (cachedFriends && cachedFriends.length > 0) {
                    console.log('使用缓存的好友列表')
                    return cachedFriends
                }
            }

            console.log('从 API 获取好友列表')
            // 注意：http-interceptor 已经返回了 res.data，所以这里 response 直接就是数据
            const response = await friendsApi.getFriendsList()

            // 处理数据（http-interceptor 已经处理了 code=200 的情况，所以这里 data 就是好友列表）
            let friendsList = []

            // 兼容多种返回格式
            if (Array.isArray(response)) {
                friendsList = response
            } else if (response && Array.isArray(response.data)) {
                friendsList = response.data
            } else if (response && response.list && Array.isArray(response.list)) {
                friendsList = response.list
            } else if (response && response.data && response.data.list) {
                friendsList = response.data.list
            }

            console.log('好友列表原始数据:', friendsList)

            // 根据后端 FriendsVO 映射字段
            const processedList = friendsList.map(friend => ({
                // 后端返回的原始字段
                id: friend.id,                    // 好友关系ID
                friendId: friend.friendId,        // 好友的用户ID（重要！）
                phone: friend.phone,              // 手机号
                nickname: friend.nickname,        // 昵称
                avatar: friend.avatar,
                addTime: friend.addTime,

                // 前端使用的字段（兼容性处理）
                userId: friend.friendId,           // 将 friendId 映射为 userId（用户ID）
                name: friend.nickname || friend.phone, // 显示名称

                // 保留原始数据
                ...friend
            }))

            console.log('处理后的好友列表:', processedList.map(f => ({
                id: f.id,
                userId: f.userId,
                friendId: f.friendId,
                nickname: f.nickname,
                phone: f.phone
            })))

            // 保存到缓存
            if (processedList.length > 0) {
                await friendsCacheService.saveFriendsList(processedList)
            }

            return processedList
        } catch (error) {
            console.error('获取好友列表失败:', error)

            // 尝试从缓存获取
            try {
                const cachedFriends = await friendsCacheService.getFriendsList()
                if (cachedFriends && cachedFriends.length > 0) {
                    console.log('使用缓存的好友列表（API失败）')
                    return cachedFriends
                }
            } catch (cacheError) {
                console.error('读取缓存失败:', cacheError)
            }

            return []
        }
    }

    /**
     * 强制刷新好友列表
     */
    async refreshFriendsList() {
        return this.getFriendsList(true)
    }

    /**
     * 发送好友申请
     * @param {string} phone 对方手机号
     * @param {string} message 申请留言
     */
    async sendFriendRequest(phone, message = '') {
        try {
            const data = await friendsApi.sendFriendRequest(phone, message)
            notificationService.showNotification('好友申请已发送', 'success')
            return data
        } catch (error) {
            console.error('发送好友申请失败:', error)
            notificationService.showNotification(error.message || '发送好友申请失败', 'error')
            throw error
        }
    }

    /**
     * 获取收到的好友申请
     */
    async getReceivedRequests() {
        try {
            const response = await friendsApi.getReceivedRequests()
            console.log('getReceivedRequests API返回:', response)

            // 处理不同的数据格式
            let requests = []

            // 兼容多种返回格式
            if (Array.isArray(response)) {
                requests = response
            } else if (response && Array.isArray(response.data)) {
                requests = response.data
            } else if (response && response.list && Array.isArray(response.list)) {
                requests = response.list
            } else if (response && response.data && response.data.list) {
                requests = response.data.list
            }

            console.log('处理后的收到申请列表:', requests)
            return requests
        } catch (error) {
            console.error('获取收到的申请失败:', error)
            notificationService.showNotification(error.message || '获取好友申请失败', 'error')
            return []
        }
    }

    /**
     * 获取发送的好友申请
     */
    async getSentRequests() {
        try {
            const response = await friendsApi.getSentRequests()
            console.log('getSentRequests API返回:', response)

            // 处理不同的数据格式
            let requests = []

            // 兼容多种返回格式
            if (Array.isArray(response)) {
                requests = response
            } else if (response && Array.isArray(response.data)) {
                requests = response.data
            } else if (response && response.list && Array.isArray(response.list)) {
                requests = response.list
            } else if (response && response.data && response.data.list) {
                requests = response.data.list
            }

            console.log('处理后的发出申请列表:', requests)
            return requests
        } catch (error) {
            console.error('获取发送的申请失败:', error)
            notificationService.showNotification(error.message || '获取好友申请失败', 'error')
            return []
        }
    }

    /**
     * 同意好友申请
     * @param {number} requestId 申请ID
     */
    async acceptFriendRequest(requestId) {
        try {
            const data = await friendsApi.acceptFriendRequest(requestId)
            console.log('同意好友申请成功:', data)

            // 同意成功后，刷新好友列表缓存
            await this.refreshFriendsList()

            notificationService.showNotification('已同意好友申请', 'success')
            return data
        } catch (error) {
            console.error('同意好友申请失败:', error)
            notificationService.showNotification(error.message || '操作失败', 'error')
            throw error
        }
    }

    /**
     * 拒绝好友申请
     * @param {number} requestId 申请ID
     */
    async rejectFriendRequest(requestId) {
        try {
            const data = await friendsApi.rejectFriendRequest(requestId)
            console.log('拒绝好友申请成功:', data)
            notificationService.showNotification('已拒绝好友申请', 'success')
            return data
        } catch (error) {
            console.error('拒绝好友申请失败:', error)
            notificationService.showNotification(error.message || '操作失败', 'error')
            throw error
        }
    }

    /**
     * 删除好友
     * @param {number} friendId 好友关系ID
     */
    async deleteFriend(friendId) {
        try {
            const data = await friendsApi.deleteFriend(friendId)
            console.log('删除好友成功:', data)

            // 删除成功后，从缓存中移除
            await friendsCacheService.removeFriend(friendId)

            notificationService.showNotification('删除好友成功', 'success')
            return data
        } catch (error) {
            console.error('删除好友失败:', error)
            notificationService.showNotification(error.message || '删除好友失败', 'error')
            throw error
        }
    }

    /**
     * 清除所有缓存
     */
    async clearCache() {
        try {
            await friendsCacheService.clearUserCache()
            console.log('好友缓存已清除')
        } catch (error) {
            console.error('清除缓存失败:', error)
        }
    }
}

export default new FriendsService()