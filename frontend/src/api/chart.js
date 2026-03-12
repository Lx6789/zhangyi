/**
 * 图表相关接口定义
 */
import { API } from './constants';

export const getChartData = (params) => {
    return {
        url: API.CHART.DATA,
        method: 'get',
        params
    }
}

export const getChartTrend = (params) => {
    return {
        url: API.CHART.TREND,
        method: 'get',
        params
    }
}

export const getChartStatistics = (params) => {
    return {
        url: API.CHART.STATISTICS,
        method: 'get',
        params
    }
}