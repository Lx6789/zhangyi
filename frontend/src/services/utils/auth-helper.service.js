/**
 * 认证辅助服务 - 处理前端认证相关逻辑（无HTTP请求）
 */
class AuthHelperService {
    /**
     * 保存认证数据到本地存储
     */
    saveAuthData(token, user) {
        try {
            if (!token) {
                console.error('无法保存: token为空')
                return false
            }

            localStorage.setItem('auth_token', token)
            localStorage.setItem('currentUser', JSON.stringify(user))
            return true
        } catch (error) {
            console.error('保存认证信息失败:', error)
            return false
        }
    }

    /**
     * 清除认证数据
     */
    clearAuthData() {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('currentUser')
        localStorage.removeItem('rememberedEmail')
    }

    /**
     * 获取当前用户的 token
     */
    getToken() {
        return localStorage.getItem('auth_token')
    }

    /**
     * 获取当前用户信息
     */
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser')
            return userStr ? JSON.parse(userStr) : null
        } catch (error) {
            console.error('解析用户信息失败:', error)
            return null
        }
    }

    /**
     * 检查是否已登录
     */
    isAuthenticated() {
        return !!this.getToken()
    }

    /**
     * 检查是否在登录页面
     */
    isLoginPage() {
        return window.location.pathname.includes('/login')
    }



    /**
     * 检查认证状态并重定向（通用方法）
     * @param {Object} router - Vue Router 实例
     * @returns {boolean} 是否已认证
     */
    checkAuthAndRedirect(router = null) {
        const currentPath = window.location.pathname + window.location.search
        const isAuthenticated = this.isAuthenticated()
        const isLoginPage = this.isLoginPage()

        console.log('checkAuthAndRedirect检查:', {
            currentPath,
            isAuthenticated,
            isLoginPage,
            hasRouter: !!router
        })

        // 如果已经认证且在登录页，重定向到首页
        if (isAuthenticated && isLoginPage) {
            console.log('已认证且在登录页，跳转到首页')
            this.redirectToHome(router)
            return true
        }

        // 如果未认证且不在登录页，重定向到登录页
        if (!isAuthenticated && !isLoginPage) {
            console.log('未认证且不在登录页，跳转到登录页')
            this.redirectToLogin(router, currentPath)
            return false
        }

        console.log('无需重定向')
        return isAuthenticated
    }

    /**
     * 重定向到登录页
     * @param {Object} router - Vue Router 实例
     * @param {string} redirectPath - 重定向路径
     */
    redirectToLogin(router = null, redirectPath = '') {
        const redirect = redirectPath
            ? encodeURIComponent(redirectPath)
            : encodeURIComponent(window.location.pathname + window.location.search)

        console.log('跳转到登录页，携带重定向参数:', redirect)

        if (router) {
            router.push(`/login?redirect=${redirect}`)
                .then(() => {
                    console.log('Vue Router 跳转成功')
                })
                .catch(error => {
                    console.error('Vue Router 跳转失败，使用原生跳转:', error)
                    window.location.href = `/login?redirect=${redirect}`
                })
        } else {
            window.location.href = `/login?redirect=${redirect}`
        }
    }

    /**
     * 重定向到首页
     * @param {Object} router - Vue Router 实例
     */
    redirectToHome(router = null) {
        console.log('跳转到首页')

        if (router) {
            router.push({ name: 'Home' })
                .then(() => {
                    console.log('Vue Router 跳转到首页成功')
                })
                .catch(error => {
                    console.error('Vue Router 跳转失败，使用原生跳转:', error)
                    window.location.href = '/'
                })
        } else {
            window.location.href = '/'
        }
    }

    /**
     * 检查登录状态并执行相应操作
     * @param {Object} router - Vue Router 实例
     * @param {Object} options - 配置选项
     * @returns {boolean} 是否已认证
     */
    checkAuthState(router = null, options = {}) {
        const {
            autoRedirect = true,      // 是否自动重定向
            onAuthenticated = null,   // 认证后的回调
            onUnauthenticated = null  // 未认证的回调
        } = options

        const isAuthenticated = this.isAuthenticated()

        console.log('checkAuthState检查:', {
            isAuthenticated,
            autoRedirect,
            hasRouter: !!router
        })

        if (isAuthenticated) {
            // 已认证
            if (onAuthenticated) {
                onAuthenticated()
            }

            // 如果已在登录页，自动跳转到首页
            if (autoRedirect && this.isLoginPage()) {
                console.log('已认证且在登录页，自动跳转首页')
                this.redirectToHome(router)
            }
        } else {
            // 未认证
            if (onUnauthenticated) {
                onUnauthenticated()
            }

            // 如果不在登录页，自动跳转到登录页
            if (autoRedirect && !this.isLoginPage()) {
                console.log('未认证且不在登录页，自动跳转登录页')
                this.redirectToLogin(router)
            }
        }

        return isAuthenticated
    }

    /**
     * 处理退出登录
     * @param {Object} router - Vue Router 实例
     * @param {boolean} callApi - 是否调用后端API退出登录
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async handleLogout(router = null, callApi = true) {
        try {
            console.log('开始退出登录流程...')

            // 1. 调用后端API退出登录
            if (callApi) {
                try {
                    // 动态导入避免循环依赖
                    const { authApiService } = await import('@/services/index.js')
                    await authApiService.logout()
                    console.log('后端退出登录API调用成功')
                } catch (apiError) {
                    console.warn('后端退出登录API调用失败，继续本地清理:', apiError)
                    // 即使后端调用失败，也继续本地清理
                }
            }

            // 2. 清除本地认证数据
            this.clearAuthData()
            console.log('本地认证数据已清除')

            // 3. 清除 HTTP 客户端的认证头（如果需要）
            try {
                const { removeAuthToken } = await import('./http-interceptor.js')
                removeAuthToken()
                console.log('HTTP客户端认证头已清除')
            } catch (httpError) {
                console.warn('清除HTTP客户端认证头失败:', httpError)
            }

            // 4. 显示退出成功消息
            const notificationService = await import('./notification.service.js')
            notificationService.default.showNotification('退出登录成功', 'success')

            // 5. 重定向到登录页
            console.log('重定向到登录页...')
            setTimeout(() => {
                this.redirectToLogin(router)
            }, 500)

            return {
                success: true,
                message: '退出登录成功'
            }

        } catch (error) {
            console.error('退出登录失败:', error)

            // 即使出错，也尝试清除本地数据并重定向
            try {
                this.clearAuthData()
                this.redirectToLogin(router)
            } catch (fallbackError) {
                console.error('退出登录回退方案也失败:', fallbackError)
                // 最后手段：强制刷新到登录页
                window.location.href = '/login'
            }

            return {
                success: false,
                message: '退出登录失败: ' + (error.message || '未知错误')
            }
        }
    }

    /**
     * 静默退出（不显示通知，不重定向）
     * 适用于token过期等场景
     */
    async silentLogout() {
        try {
            console.log('执行静默退出...')

            // 清除本地认证数据
            this.clearAuthData()

            // 清除 HTTP 客户端认证头
            try {
                const { removeAuthToken } = await import('./http-interceptor.js')
                removeAuthToken()
            } catch (error) {
                console.warn('清除HTTP客户端认证头失败:', error)
            }

            console.log('静默退出完成')
            return { success: true }

        } catch (error) {
            console.error('静默退出失败:', error)
            return { success: false, message: error.message }
        }
    }
}

export default new AuthHelperService()