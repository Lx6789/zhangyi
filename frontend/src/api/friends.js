import request from '@/services/utils/http-interceptor.js'
import { API_FLAT } from './constants'

/**
 * 获取好友列表
 */
export function getFriendsList() {
    return request.get(API_FLAT.FRIEND_LIST)
}

/**
 * 发送好友申请
 * @param {string} phone 对方手机号
 * @param {string} message 申请留言（可选）
 */
export function sendFriendRequest(phone, message = '') {
    return request.post(API_FLAT.FRIEND_REQUEST_SEND, null, {
        params: { phone, message }
    })
}

/**
 * 获取收到的好友申请
 */
export function getReceivedRequests() {
    return request.get(API_FLAT.FRIEND_REQUEST_RECEIVED)
}

/**
 * 获取发送的好友申请
 */
export function getSentRequests() {
    return request.get(API_FLAT.FRIEND_REQUEST_SENT)
}

/**
 * 同意好友申请
 * @param {number} requestId 申请ID
 */
export function acceptFriendRequest(requestId) {
    return request.post(API_FLAT.FRIEND_REQUEST_ACCEPT.replace('{requestId}', requestId))
}

/**
 * 拒绝好友申请
 * @param {number} requestId 申请ID
 */
export function rejectFriendRequest(requestId) {
    return request.post(API_FLAT.FRIEND_REQUEST_REJECT.replace('{requestId}', requestId))
}

/**
 * 删除好友
 * @param {number} friendId 好友ID
 */
export function deleteFriend(friendId) {
    const url = API_FLAT.FRIEND_DELETE.replace('{friendId}', friendId)
    return request.delete(url)
}