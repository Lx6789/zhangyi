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
        // 使用 request.get 方法，而不是作为函数调用
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
        // 使用 request.post 方法
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
    return request.get(`/savings/group/${id}`);
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
        const response = await request.put(`/savings/group/${id}`, data);
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
    return request.delete(`/savings/group/${id}`);
}

/**
 * 加入多人存钱计划
 */
export async function joinGroupSaving(id, data) {
    return request.post(`/savings/group/${id}/join`, data);
}

/**
 * 退出多人存钱计划
 */
export async function leaveGroupSaving(id, data) {
    return request.post(`/savings/group/${id}/leave`, data);
}

/**
 * 多人存钱 - 存钱
 */
export async function depositToGroupSaving(id, data) {
    return request.post(`/savings/group/${id}/deposit`, data);
}

/**
 * 获取计划的所有存钱记录（POST方式，支持复杂查询）
 */
export async function getSavingRecordsByPost(id, data) {
    return request.post(`/savings/group/${id}/records`, data);
}

/**
 * 获取成员的存钱记录
 */
export async function getMemberSavingRecords(planId, memberId) {
    return request.get(`/savings/group/${planId}/member/${memberId}/records`);
}

/**
 * 更新成员存款金额
 */
export async function updateGroupSavingMember(planId, memberId, data) {
    return request.put(`/savings/group/${planId}/member/${memberId}`, data);
}

// ==================== 个人存钱计划 ====================

/**
 * 获取个人存钱计划列表
 */
export async function getPersonalSavingList(params) {
    return request.get('/savings/personal/list', params);
}

/**
 * 创建个人存钱计划
 */
export async function createPersonalSaving(data) {
    return request.post('/savings/personal/create', data);
}

/**
 * 更新个人存钱计划
 */
export async function updatePersonalSaving(id, data) {
    return request.put(`/savings/personal/${id}`, data);
}

/**
 * 删除个人存钱计划
 */
export async function deletePersonalSaving(id) {
    return request.delete(`/savings/personal/${id}`);
}

/**
 * 个人存钱 - 存钱
 */
export async function depositToPersonalSaving(id, data) {
    return request.post(`/savings/personal/${id}/deposit`, data);
}