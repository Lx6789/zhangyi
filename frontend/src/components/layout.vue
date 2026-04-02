<template>
  <div class="layout">
    <!-- 固定头部 -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <img src="@/assets/zhangyi_logo.png" class="logo-img" alt="账易">
          <span>账易</span>
        </div>
        <div class="user-info">
          <div class="user-name">
            <i class="fas fa-user-circle"></i>
            <span>{{ userName }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <div class="main-container">
        <router-view />
      </div>
    </main>

    <!-- 固定底部导航 -->
    <nav class="bottom-nav">
      <div class="bottom-nav-content">
        <router-link
            to="/"
            class="nav-item"
            :class="{ active: $route.path === '/' }"
        >
          <div class="nav-icon"><i class="fas fa-home"></i></div>
          <span class="nav-text">首页</span>
        </router-link>

        <router-link
            to="/chart"
            class="nav-item"
            :class="{ active: $route.path === '/chart' }"
        >
          <div class="nav-icon"><i class="fas fa-chart-pie"></i></div>
          <span class="nav-text">图表</span>
        </router-link>

        <div class="nav-item menu-item" @click="toggleSidebar">
          <div class="nav-icon"><i class="fas fa-bars"></i></div>
          <span class="nav-text">菜单</span>
        </div>

        <router-link
            to="/saving"
            class="nav-item"
            :class="{ active: $route.path === '/saving' }"
        >
          <div class="nav-icon"><i class="fas fa-piggy-bank"></i></div>
          <span class="nav-text">存钱</span>
        </router-link>

        <router-link
            to="/business"
            class="nav-item"
            :class="{ active: $route.path === '/business' }"
        >
          <div class="nav-icon"><i class="fas fa-calculator"></i></div>
          <span class="nav-text">算盘</span>
        </router-link>
      </div>
    </nav>

    <!-- 侧边栏菜单 -->
    <div class="sidebar-overlay" :class="{ 'active': sidebarVisible }" @click="closeSidebar"></div>
    <aside class="sidebar" :class="{ 'active': sidebarVisible }">
      <div class="sidebar-content">
        <div class="sidebar-header">
          <button class="sidebar-close" @click="closeSidebar">
            <i class="fas fa-times"></i>
          </button>
          <div class="sidebar-title">菜单</div>
        </div>
        <ul class="sidebar-menu">
          <!-- 历史记录 -->
          <li>
            <a href="#" @click.prevent="showHistoryModal">
              <i class="fas fa-history"></i>
              <span>历史记录</span>
            </a>
          </li>

          <!-- 数据迁移（导入/导出合并） -->
          <li>
            <a href="#" @click.prevent="showDataTransferModal">
              <i class="fas fa-exchange-alt"></i>
              <span>数据迁移</span>
            </a>
          </li>

          <!-- 收支分析 -->
          <li>
            <a href="#" @click.prevent="showAnalysisModal">
              <i class="fas fa-chart-pie"></i>
              <span>收支分析</span>
            </a>
          </li>

          <!-- 我的好友 -->
          <li>
            <a href="#" @click.prevent="showFriendsModal">
              <i class="fas fa-user-friends"></i>
              <span>我的好友</span>
            </a>
          </li>

          <li>
            <a href="#" @click.prevent="showSavingRecordsModal">
              <i class="fas fa-piggy-bank"></i>
              <span>存钱记录</span>
            </a>
          </li>

          <!-- 云端备份 -->
          <li>
            <a href="#" @click.prevent="showCloudBackupModal">
              <i class="fas fa-cloud-upload-alt"></i>
              <span>云端备份</span>
            </a>
          </li>

          <!-- 分隔线 -->
          <li class="sidebar-divider"></li>

          <!-- 退出登录 -->
          <li>
            <a href="#" @click.prevent="handleLogout">
              <i class="fas fa-sign-out-alt"></i>
              <span>退出登录</span>
            </a>
          </li>
        </ul>
      </div>
    </aside>

    <!-- 弹框组件 -->
    <HistoryModal v-model:visible="historyModalVisible" @close="historyModalVisible = false" />
    <DataTransferModal v-model:visible="dataTransferModalVisible" @close="dataTransferModalVisible = false" />
    <AnalysisModal v-model:visible="analysisModalVisible" @close="analysisModalVisible = false" />
    <FriendsModal v-model:visible="friendsModalVisible" @close="friendsModalVisible = false" />
    <SavingRecordsModal v-model:visible="savingRecordsModalVisible" @close="savingRecordsModalVisible = false" />
    <CloudBackupModal v-model:visible="cloudBackupModalVisible" @close="cloudBackupModalVisible = false" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authHelperService } from '@/services/index.js'
import businessDataService from '@/services/cache/business-cache.service.js'
import notificationService from "@/services/utils/notification.service.js";
import friendsCacheService from '@/services/cache/friends-cache.service.js'
import indexedDBService from '@/services/db/indexed-db.service.js'
import SavingRecordsModal from '@/components/sidebar/SavingRecordsModal.vue'
import CloudBackupModal from '@/components/sidebar/CloudBackupModal.vue'

// 导入弹框组件
import HistoryModal from '@/components/sidebar/HistoryModal.vue'
import DataTransferModal from '@/components/sidebar/DataTransferModal.vue'
import AnalysisModal from '@/components/sidebar/AnalysisModal.vue'
import FriendsModal from '@/components/sidebar/FriendsModal.vue'

const router = useRouter()
const sidebarVisible = ref(false)

// 用户信息
const userName = ref('用户')

// 弹框显示状态
const historyModalVisible = ref(false)
const dataTransferModalVisible = ref(false)
const analysisModalVisible = ref(false)
const friendsModalVisible = ref(false)
const savingRecordsModalVisible = ref(false)
const cloudBackupModalVisible = ref(false)

// 获取用户信息
const getUserInfo = () => {
  const user = authHelperService.getCurrentUser()
  if (user) {
    // 优先使用昵称，如果没有则使用用户名或手机号
    if (user.nickname) {
      userName.value = user.nickname
    } else if (user.username) {
      userName.value = user.username
    } else if (user.phone) {
      // 手机号脱敏显示
      const phone = user.phone
      if (phone.length === 11) {
        userName.value = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      } else {
        userName.value = phone
      }
    } else {
      userName.value = '用户'
    }
  }
}

// layout.vue
onMounted(async () => {
  // 获取用户信息
  getUserInfo()

  // 检查认证状态
  if (!authHelperService.isAuthenticated()) {
    authHelperService.checkAuthAndRedirect(router)
  }

  // 初始化 businessDataService
  const currentUser = authHelperService.getCurrentUser()
  if (currentUser) {
    await businessDataService.init(currentUser.id)

    // 强制重新初始化 IndexedDB 确保表存在
    try {
      // 关闭现有连接
      indexedDBService.close()
      // 重新初始化
      await indexedDBService.init()
      console.log('IndexedDB 重新初始化成功')
    } catch (error) {
      console.error('IndexedDB 重新初始化失败:', error)
    }
  }
})

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const closeSidebar = () => {
  sidebarVisible.value = false
}

// 显示各个弹框
const showHistoryModal = () => {
  closeSidebar()
  historyModalVisible.value = true
}

const showDataTransferModal = () => {
  closeSidebar()
  dataTransferModalVisible.value = true
}

const showAnalysisModal = () => {
  closeSidebar()
  analysisModalVisible.value = true
}

const showFriendsModal = () => {
  closeSidebar()
  friendsModalVisible.value = true
}

const showSavingRecordsModal = () => {
  closeSidebar()
  savingRecordsModalVisible.value = true
}

// 显示云端备份弹框
const showCloudBackupModal = () => {
  closeSidebar()
  cloudBackupModalVisible.value = true
}

const handleLogout = async () => {
  try {
    const confirmLogout = await notificationService.confirm('确定要退出登录吗？')
    if (!confirmLogout) return

    // 清除好友缓存
    await friendsCacheService.clearUserCache()

    await authHelperService.handleLogout(router)
  } catch (error) {
    console.error('退出登录失败:', error)
  }
}
</script>

<style scoped>
/* 样式保持不变 */
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  max-width: var(--app-max-width);
  margin: 0 auto;
  width: 100%;
}

/* 头部样式 */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--white);
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: var(--app-max-width);
  margin: 0 auto;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  color: var(--accent-color);
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-img {
  width: auto;
  height: 40px;
  object-fit: contain;
  transition: all 0.3s ease;
}

/* 用户信息样式 - 不可点击 */
.user-info {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 20px;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent-color);
}

.user-name i {
  font-size: 20px;
}

/* 其他样式保持不变 */
.sidebar-toggle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.sidebar-toggle:hover {
  background-color: var(--primary-color);
}

.hamburger span {
  display: block;
  width: 20px;
  height: 2px;
  background-color: var(--accent-color);
  margin: 4px 0;
  border-radius: 2px;
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--gray-bg);
  width: 100%;
  padding-top: 60px;
  padding-bottom: 60px;
}

.main-container {
  max-width: var(--app-max-width);
  margin: 0 auto;
  width: 100%;
  padding: 0 20px;
}

/* 底部导航样式 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--white);
  border-top: 1px solid var(--primary-color);
  z-index: 100;
}

.bottom-nav-content {
  max-width: var(--app-max-width);
  margin: 0 auto;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--text-light);
  flex: 1;
  height: 100%;
  transition: all 0.3s;
  cursor: pointer;
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 10px;
}

.nav-item:hover {
  background-color: rgba(213, 235, 225, 0.2);
}

.nav-item.active {
  color: var(--accent-color);
  background-color: rgba(213, 235, 225, 0.3);
}

.nav-icon {
  font-size: 20px;
  margin-bottom: 5px;
  transition: transform 0.3s;
}

.nav-item.active .nav-icon {
  transform: translateY(-5px);
}

.nav-text {
  font-size: 0.75rem;
}

.menu-item {
  position: relative;
}

.menu-item .nav-icon {
  font-size: 22px;
}

/* 侧边栏样式 */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--overlay);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.sidebar-overlay.active {
  opacity: 1;
  visibility: visible;
}

.sidebar {
  position: fixed;
  top: 0;
  left: -300px;
  width: 280px;
  height: 100%;
  background-color: var(--white);
  z-index: 1001;
  transition: left 0.3s;
  box-shadow: 5px 0 15px var(--shadow);
}

.sidebar.active {
  left: 0;
}

.sidebar-content {
  padding: 20px;
  overflow-y: auto;
  height: 100%;
}

.sidebar-header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--primary-color);
}

.sidebar-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--accent-color);
  cursor: pointer;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.sidebar-close:hover {
  background-color: var(--primary-color);
}

.sidebar-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-color);
}

.sidebar-menu {
  list-style: none;
}

.sidebar-menu li {
  margin-bottom: 15px;
}

.sidebar-menu a {
  display: flex;
  align-items: center;
  padding: 15px;
  border-radius: 15px;
  text-decoration: none;
  color: var(--text-dark);
  transition: all 0.3s;
}

.sidebar-menu a:hover {
  background-color: var(--primary-color);
  color: var(--accent-color);
}

.sidebar-menu i {
  font-size: 20px;
  margin-right: 15px;
  width: 24px;
  text-align: center;
  color: var(--accent-color);
}

.sidebar-menu span {
  font-size: 16px;
  font-weight: 500;
}

/* 侧边栏分隔线样式 */
.sidebar-divider {
  height: 1px;
  background-color: var(--primary-color);
  margin: 20px 0;
  opacity: 0.5;
}

/* 退出登录按钮特殊样式 */
.sidebar-menu .sidebar-divider + li a {
  color: #f56c6c;
}

.sidebar-menu .sidebar-divider + li a i {
  color: #f56c6c;
}

.sidebar-menu .sidebar-divider + li a:hover {
  background-color: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

/* 响应式调整 - 根据屏幕大小缩放 logo */
@media (max-width: 768px) {
  .logo {
    font-size: 1.2rem;
  }

  .logo-img {
    height: 32px;
  }

  .user-name span {
    display: none;
  }

  .user-name {
    padding: 8px;
  }

  .user-name i {
    font-size: 24px;
    margin: 0;
  }
}

@media (max-width: 480px) {
  .layout {
    max-width: 100%;
  }

  .header-content,
  .bottom-nav-content,
  .main-container {
    padding: 0 15px;
  }

  .sidebar {
    width: 260px;
  }

  .logo {
    font-size: 1rem;
  }

  .logo-img {
    height: 28px;
  }

  .user-name span {
    display: none;
  }

  .user-name i {
    font-size: 22px;
  }
}

@media (max-width: 380px) {
  .logo {
    font-size: 0.9rem;
  }

  .logo-img {
    height: 24px;
  }

  .logo span {
    font-size: 0.9rem;
  }
}

@media (min-width: 769px) {
  body {
    background-color: var(--primary-color);
  }

  .layout {
    box-shadow: 0 0 20px var(--shadow);
    min-height: 100vh;
    height: auto;
  }

  .logo-img {
    height: 44px;
  }
}

@media (min-width: 1200px) {
  .logo-img {
    height: 48px;
  }

  .logo {
    font-size: 1.8rem;
  }
}
</style>