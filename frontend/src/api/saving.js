// src/api/saving.js

import request from "@/services/utils/http-interceptor.js";
import {API} from "@/api/constants.js";

// ==================== 多人存钱计划 ====================

/**
 * 获取多人存钱计划列表
 */
export async function getGroupSavingList() {
    console.log('【API】开始获取多人存钱计划列表');
    try {
        // 使用 API 常量
        const response = await request.get(API.SAVING.GROUP.LIST);
        console.log('【API】获取多人存钱计划列表响应:', response);
        return response;
    } catch (error) {
        console.error('【API】获取多人存钱计划列表失败:', error);
        throw error;
    }
}

/**
 * 创建多人存钱计划
 */
export async function createGroupSaving(data) {
    console.log('【API】创建多人存钱计划，请求数据:', data);
    try {
        // 使用 API 常量
        const response = await request.post(API.SAVING.GROUP.CREATE, data);
        console.log('【API】创建多人存钱计划响应:', response);
        return response;
    } catch (error) {
        console.error('【API】创建多人存钱计划失败:', error);
        throw error;
    }
}

/**
 * 获取多人存钱计划详情
 */
export async function getGroupSavingDetail(id) {
    // 使用 API 常量，替换路径中的 {id}
    const url = API.SAVING.GROUP.DETAIL.replace('{id}', id);
    return request.get(url);
}

/**
 * 更新多人存钱计划
 * @param {number} id - 计划ID
 * @param {Object} data - 更新的计划数据
 * @returns {Promise}
 */
export async function updateGroupSaving(id, data) {
    console.log('【API】更新多人存钱计划，ID:', id, '请求数据:', data);
    try {
        // 使用 API 常量，替换路径中的 {id}
        const url = API.SAVING.GROUP.UPDATE.replace('{id}', id);
        const response = await request.put(url, data);
        console.log('【API】更新多人存钱计划响应:', response);
        return response;
    } catch (error) {
        console.error('【API】更新多人存钱计划失败:', error);
        throw error;
    }
}

/**
 * 删除多人存钱计划
 */
export async function deleteGroupSaving(id) {
    // 使用 API 常量，替换路径中的 {id}
    const url = API.SAVING.GROUP.DELETE.replace('{id}', id);
    return request.delete(url);
}

/**
 * 加入多人存钱计划
 */
export async function joinGroupSaving(id, data) {
    // 使用 API 常量，替换路径中的 {id}
    const url = API.SAVING.GROUP.JOIN.replace('{id}', id);
    return request.post(url, data);
}

/**
 * 退出多人存钱计划
 */
export async function leaveGroupSaving(id, data) {
    // 使用 API 常量，替换路径中的 {id}
    const url = API.SAVING.GROUP.LEAVE.replace('{id}', id);
    return request.post(url, data);
}

/**
 * 多人存钱 - 存钱
 */
export async function depositToGroupSaving(id, data) {
    // 使用 API 常量，替换路径中的 {id}
    const url = API.SAVING.GROUP.DEPOSIT.replace('{id}', id);
    return request.post(url, data);
}

/**
 * 获取计划的所有存钱记录（POST方式，支持复杂查询）
 */
export async function getSavingRecordsByPost(id, data) {
    // 使用 API 常量，替换路径中的 {id}
    const url = API.SAVING.GROUP.RECORDS.replace('{id}', id);
    return request.post(url, data);
}

/**
 * 获取成员的存钱记录
 */
export async function getMemberSavingRecords(planId, memberId) {
    // 使用 API 常量，替换路径中的 {planId} 和 {memberId}
    const url = API.SAVING.GROUP.MEMBER_RECORDS
        .replace('{planId}', planId)
        .replace('{memberId}', memberId);
    return request.get(url);
}

/**
 * 获取某个计划的所有存款记录
 */
export async function getDepositRecords(planId) {
    // 使用 API 常量，替换路径中的 {planId}
    const url = API.SAVING.GROUP.DEPOSIT_RECORDS.replace('{planId}', planId);
    return request.get(url);
}

export async function getSavingRecordsByUserId(userId) {
    // 注意：这个路径在 API 常量中可能没有定义，保持原样但需要加上 /api 前缀
    // return request.get(`/api/savings/group/${userId}/records`);
    return request.get(`/savings/group/${userId}/records`);
}

/**
 * 更新成员存款金额
 */
export async function updateGroupSavingMember(planId, memberId, data) {
    // 使用 API 常量，替换路径中的 {planId} 和 {memberId}
    const url = API.SAVING.GROUP.UPDATE_MEMBER
        .replace('{planId}', planId)
        .replace('{memberId}', memberId);
    return request.put(url, data);
}

// ==================== 个人存钱计划 ====================

/**
 * 获取个人存钱计划列表
 */
export async function getPersonalSavingList(params) {
    // 使用 API 常量
    return request.get(API.SAVING.LIST, params);
}

/**
 * 创建个人存钱计划
 */
export async function createPersonalSaving(data) {
    // 使用 API 常量
    return request.post(API.SAVING.CREATE, data);
}

/**
 * 更新个人存钱计划
 */
export async function updatePersonalSaving(id, data) {
    // 构建路径
    return request.put(`/api/savings/personal/${id}`, data);
}

/**
 * 删除个人存钱计划
 */
export async function deletePersonalSaving(id) {
    // 构建路径
    return request.delete(`/api/savings/personal/${id}`);
}

/**
 * 个人存钱 - 存钱
 */
export async function depositToPersonalSaving(id, data) {
    // 构建路径
    return request.post(`/api/savings/personal/${id}/deposit`, data);
}