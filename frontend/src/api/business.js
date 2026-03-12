/**
 * 业务相关接口定义
 */
import { API } from './constants';

export const getBusinessList = (params) => {
    return {
        url: API.BUSINESS.LIST,
        method: 'get',
        params
    }
}

export const getBusinessDetail = (id) => {
    return {
        url: API.BUSINESS.DETAIL,
        method: 'get',
        params: { id }
    }
}

export const createBusiness = (data) => {
    return {
        url: API.BUSINESS.CREATE,
        method: 'post',
        data
    }
}

export const updateBusiness = (id, data) => {
    return {
        url: API.BUSINESS.UPDATE,
        method: 'put',
        data: { id, ...data }
    }
}

export const deleteBusiness = (id) => {
    return {
        url: API.BUSINESS.DELETE,
        method: 'delete',
        params: { id }
    }
}