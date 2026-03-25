// main.js (Vue 3 版本)
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/css/global.css'
import businessDataService from './services/cache/business-cache.service.js'
import authHelperService from './services/utils/auth-helper.service' // 导入
import indexedDBService from '@/services/db/indexed-db.service.js'

businessDataService.init().catch(console.error)

// 创建 Vue 应用
const app = createApp(App)

const initServices = async () => {
    try {
        await indexedDBService.init()
        console.log('IndexedDB 初始化成功')

        // 检查是否有用户已登录
        const user = authHelperService.getCurrentUser()
        if (user) {
            await businessDataService.init(user.id)
            console.log('业务数据服务初始化成功')
        }
    } catch (error) {
        console.error('服务初始化失败:', error)
        // 可以显示一个友好的错误提示
    }
}

initServices()

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app')

// 路由准备就绪后检查认证状态
router.isReady().then(() => {
    const currentPath = window.location.pathname

    // 使用 authHelperService 检查认证状态
    const isAuthenticated = authHelperService.isAuthenticated()
    const token = authHelperService.getToken()

    console.log('应用启动完成，当前路径:', currentPath)
    console.log('认证状态:', isAuthenticated ? '已登录' : '未登录')
    console.log('token存在:', !!token)
    if (token) {
        console.log('token前缀:', token.substring(0, 15) + '...')
    }

    // 如果当前在登录页但已登录，重定向到首页
    if (currentPath.includes('/login') && isAuthenticated) {
        console.log('已在登录页但已登录，执行重定向')
        const redirect = localStorage.getItem('redirectAfterLogin') || '/'
        localStorage.removeItem('redirectAfterLogin')
        router.replace(redirect)
    }
})