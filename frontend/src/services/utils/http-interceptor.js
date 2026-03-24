// src/utils/http-interceptor.js
import axios from 'axios'
import notificationService from './notification.service'
import router from '@/router'
import authHelperService from './auth-helper.service'

const API_BASE = ''

// 创建axios实例
const service = axios.create({
    baseURL: API_BASE,
    timeout: 15000 // 请求超时时间
})

// 请求拦截器
service.interceptors.request.use(
    config => {
        // 在发送请求之前做些什么
        const token = authHelperService.getToken()
        if (token) {
            // 让每个请求携带token
            config.headers['Authorization'] = `Bearer ${token}`
            console.log('请求添加token:', token.substring(0, 15) + '...')
        } else {
            console.log('请求未携带token')
        }

        // 可以在这里添加loading效果
        // 可以在这里添加请求日志
        return config
    },
    error => {
        // 对请求错误做些什么
        console.error('Request Error:', error)
        return Promise.reject(error)
    }
)

// 响应拦截器
service.interceptors.response.use(
    response => {
        const res = response.data
        if (res.code === 200) {
            return res.data
        } else {
            handleBusinessError(res)
            return Promise.reject(new Error(res.message || 'Error'))
        }
    },
    async error => {
        const originalRequest = error.config

        // 如果是401错误且不是刷新token的请求
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                // 尝试刷新token
                const refreshToken = authHelperService.getRefreshToken()
                if (refreshToken) {
                    const response = await axios.post('/auth/refresh', {
                        refreshToken: refreshToken
                    })

                    if (response.data.code === 200) {
                        // 保存新token
                        authHelperService.setToken(response.data.data.token)
                        // 重新发送原请求
                        originalRequest.headers['Authorization'] = `Bearer ${response.data.data.token}`
                        return service(originalRequest)
                    }
                }
            } catch (refreshError) {
                console.error('刷新token失败:', refreshError)
            }

            // 刷新失败，执行登出
            authHelperService.silentLogout()
            notificationService.showNotification('登录已过期，请重新登录', 'warning')
            router.push('/login')
            return Promise.reject(error)
        }

        return Promise.reject(error)
    }
)

// 业务错误处理函数
function handleBusinessError(res) {
    switch (res.code) {
        case 401:
            // 未授权，清除token并跳转到登录页
            authHelperService.silentLogout()
            notificationService.showNotification(res.message || '请重新登录', 'error')

            const currentPath = router.currentRoute.value.fullPath
            if (currentPath !== '/login') {
                localStorage.setItem('redirectAfterLogin', currentPath)
                router.push('/login')
            }
            break

        case 403:
            // 权限不足
            notificationService.showNotification(res.message || '您没有权限执行此操作', 'error')
            break

        case 404:
            notificationService.showNotification(res.message || '请求的资源不存在', 'error')
            break

        case 422:
            // 表单验证错误
            notificationService.showNotification(res.message || '请检查输入数据', 'warning')
            break

        case 429:
            // 请求过于频繁
            notificationService.showNotification(res.message || '请求过于频繁，请稍后再试', 'warning')
            break

        case 500:
            notificationService.showNotification(res.message || '服务器内部错误', 'error')
            break

        case 502:
            notificationService.showNotification(res.message || '网关错误', 'error')
            break

        case 503:
            notificationService.showNotification(res.message || '服务不可用，请稍后再试', 'warning')
            break

        case 504:
            notificationService.showNotification(res.message || '网关超时', 'error')
            break

        default:
            // 其他业务错误
            notificationService.showNotification(res.message || '未知错误', 'warning')
    }
}

// HTTP错误处理函数
function handleHttpError(status, data) {
    const errorMessages = {
        400: '请求参数错误',
        401: '未授权，请重新登录',
        403: '拒绝访问',
        404: '请求的资源不存在',
        405: '请求方法不允许',
        408: '请求超时',
        409: '请求冲突',
        413: '上传文件过大',
        415: '不支持的媒体类型',
        422: '请求格式错误',
        429: '请求过于频繁',
        500: '服务器内部错误',
        502: '网关错误',
        503: '服务不可用',
        504: '网关超时'
    }

    const message = data?.message || errorMessages[status] || `连接错误 ${status}`

    // 不显示401错误的通知，因为已经在上面处理了
    if (status !== 401) {
        notificationService.showNotification(message, 'error')
    }

    // 如果是401未授权，跳转到登录页
    if (status === 401) {
        authHelperService.silentLogout()
        const currentPath = router.currentRoute.value.fullPath
        if (currentPath !== '/login') {
            localStorage.setItem('redirectAfterLogin', currentPath)
            router.push('/login')
        }
    }
}

/**
 * 移除认证token
 * 用于退出登录时清除HTTP客户端的认证头
 */
export function removeAuthToken() {
    // 清除axios实例默认头中的Authorization
    if (service.defaults.headers.common['Authorization']) {
        delete service.defaults.headers.common['Authorization']
    }
    // 清除所有axios实例的默认头
    delete axios.defaults.headers.common['Authorization']

    // 清除authHelperService中的认证数据
    authHelperService.clearAuthData()

    console.log('HTTP客户端认证头已清除')
}

/**
 * 设置认证token
 * 用于登录成功后设置HTTP客户端的认证头
 */
export function setAuthToken(token) {
    if (token) {
        service.defaults.headers.common['Authorization'] = `Bearer ${token}`
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        console.log('HTTP客户端认证头已设置')
    }
}

// 导出封装的请求方法
export default {
    // GET请求
    get(url, params, config = {}) {
        return service.get(url, { params, ...config })
    },

    // POST请求
    post(url, data, config = {}) {
        return service.post(url, data, config)
    },

    // PUT请求
    put(url, data, config = {}) {
        return service.put(url, data, config)
    },

    // DELETE请求
    delete(url, params, config = {}) {
        return service.delete(url, { params, ...config })
    },

    // PATCH请求
    patch(url, data, config = {}) {
        return service.patch(url, data, config)
    },

    // 上传文件
    upload(url, file, name = 'file', config = {}) {
        const formData = new FormData()
        formData.append(name, file)

        return service.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            ...config
        })
    },

    // 下载文件
    download(url, params, filename, config = {}) {
        return service.get(url, {
            params,
            responseType: 'blob',
            ...config
        }).then(response => {
            // 创建下载链接
            const blob = new Blob([response])
            const link = document.createElement('a')
            link.href = window.URL.createObjectURL(blob)
            link.download = filename || 'download'
            link.click()
            window.URL.revokeObjectURL(link.href)

            // 显示下载成功通知
            notificationService.showNotification('下载成功', 'success')
        }).catch(error => {
            notificationService.showNotification('下载失败', 'error')
            return Promise.reject(error)
        })
    },

    // 批量请求
    all(requests) {
        return Promise.all(requests)
    },

    // 获取axios实例（用于特殊情况）
    getAxiosInstance() {
        return service
    },

    // 取消请求
    cancelToken() {
        return axios.CancelToken.source()
    }
}