// services/friends.service.js
import notificationService from '@/services/utils/notification.service.js'
import * as friendsApi from '@/api/friends'
import friendsCacheService from '@/services/friends-cache.service.js'  // 导入缓存服务

class FriendsService {
    /**
     * 获取好友列表 - 优先从缓存获取，失败时从API获取
     * @param {boolean} forceRefresh 是否强制刷新（从API获取并更新缓存）
     */
    async getFriendsList(forceRefresh = false) {
        try {
            // 如果不是强制刷新，先尝试从缓存获取
            if (!forceRefresh) {
                const cachedFriends = await friendsCacheService.getFriendsList()
                if (cachedFriends && cachedFriends.length > 0) {
                    console.log('使用缓存的好友列表')
                    return cachedFriends
                }
            }

            // 从 API 获取
            console.log('从 API 获取好友列表')
            const data = await friendsApi.getFriendsList()
            const friendsList = data || []

            // 保存到缓存
            if (friendsList.length > 0) {
                await friendsCacheService.saveFriendsList(friendsList)
            }

            return friendsList
        } catch (error) {
            console.error('获取好友列表失败:', error)

            // API 失败时，尝试从缓存获取
            const cachedFriends = await friendsCacheService.getFriendsList()
            if (cachedFriends && cachedFriends.length > 0) {
                console.log('API 失败，使用缓存数据')
                notificationService.showNotification('使用离线数据', 'info')
                return cachedFriends
            }

            notificationService.showNotification(error.message || '获取好友列表失败', 'error')
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
            const data = await friendsApi.getReceivedRequests()
            return data || []
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
            const data = await friendsApi.getSentRequests()
            return data || []
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
     * @param {number} friendId 好友ID
     */
    async deleteFriend(friendId) {
        try {
            const data = await friendsApi.deleteFriend(friendId)

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
}

export default new FriendsService()