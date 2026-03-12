import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/components/layout.vue'
import Login from '@/views/Login.vue'
import Home from '@/views/Home.vue'
import Chart from '@/views/Chart.vue'
import Business from '@/views/business/Business.vue'
import Saving from '@/views/saving/Saving.vue'
import NotFound from '@/views/NotFound.vue'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: { requiresAuth: false }
    },
    {
        path: '/',
        component: Layout,  // 使用Layout作为父容器
        meta: { requiresAuth: true },
        children: [
            {
                path: '/',
                name: 'Home',
                component: Home,
                alias: '/home'  // 添加/home别名
            },
            {
                path: '/chart',
                name: 'Chart',
                component: Chart
            },
            {
                path: '/business',
                name: 'Business',
                component: Business
            },
            {
                path: '/saving',
                name: 'Saving',
                component: Saving
            }
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: NotFound,
        meta: { requiresAuth: false }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 添加路由守卫
router.beforeEach((to, from, next) => {
    console.log('路由导航:', from.path, '->', to.path)

    // 从localStorage获取token
    const token = localStorage.getItem('auth_token')
    console.log('当前token状态:', token ? '已存在' : '不存在')

    // 检查是否需要认证
    if (to.meta.requiresAuth) {
        if (!token) {
            console.log('未认证，跳转到登录页，携带重定向参数:', to.fullPath)
            // 保存当前路径到query参数，而不是localStorage
            next({
                path: '/login',
                query: { redirect: to.fullPath }
            })
            return
        }
    }

    // 如果已经登录但访问登录页，跳转到首页
    if (to.path === '/login' && token) {
        console.log('已登录，跳转到首页')
        // 检查是否有重定向参数
        const redirect = to.query.redirect || '/'
        next(redirect)
        return
    }

    next()
})

export default router