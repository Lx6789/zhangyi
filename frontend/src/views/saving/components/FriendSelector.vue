<template>
  <div v-if="visible" class="friend-selector-modal" :class="{ active: visible }" @click.self="handleClose">
    <div class="friend-selector-content">
      <div class="friend-selector-header">
        <h3>选择好友</h3>
        <div class="header-actions">
          <button
              class="refresh-btn"
              :disabled="loadingFriends || refreshing"
              :title="refreshing ? '刷新中...' : '刷新列表'"
              @click="handleRefresh"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingFriends || refreshing }"></i>
            <span v-if="refreshing" class="refresh-text">刷新中...</span>
          </button>
          <button class="close-btn" @click="handleClose">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div class="friend-selector-search">
        <i class="fas fa-search"></i>
        <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索好友..."
            @input="handleSearch"
        >
      </div>

      <!-- 离线提示 -->
      <div v-if="!isOnline" class="offline-banner">
        <i class="fas fa-wifi-slash"></i>
        <span>当前处于离线模式，显示缓存数据</span>
      </div>

      <!-- 错误提示 -->
      <div v-if="loadError" class="error-banner">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ loadError }}</span>
        <button class="retry-btn" @click="handleRefresh">重试</button>
      </div>

      <div class="friend-selector-list">
        <div v-if="loadingFriends" class="loading-friends">
          <i class="fas fa-spinner fa-spin"></i>
          <span>加载好友列表...</span>
        </div>

        <div v-else-if="filteredFriends.length === 0" class="no-friends">
          <i class="fas fa-user-friends"></i>
          <p v-if="!isOnline && hasCachedData">暂无好友缓存数据</p>
          <p v-else-if="loadError">加载失败，请重试</p>
          <p v-else>暂无好友可添加</p>
        </div>

        <div
            v-for="friend in filteredFriends"
            :key="friend.friendId"
            class="friend-selector-item"
            :class="{ selected: isFriendSelected(friend) }"
            @click="toggleSelect(friend)"
        >
          <div class="friend-avatar">
            <img :src="friend.avatar || defaultAvatar" alt="avatar">
          </div>
          <div class="friend-info">
            <div class="friend-name">{{ friend.nickname || friend.name || `用户${friend.userId}` }}</div>
            <div class="friend-phone">{{ friend.phone }}</div>
          </div>
          <div class="friend-checkbox">
            <i :class="isFriendSelected(friend) ? 'fas fa-check-circle' : 'far fa-circle'"></i>
          </div>
        </div>
      </div>

      <div class="friend-selector-footer">
        <div class="selected-count">已选择 {{ selectedFriends.length }} 位好友</div>
        <div class="footer-buttons">
          <button class="btn-cancel" @click="handleClose">取消</button>
          <button
              class="btn-confirm"
              :disabled="selectedFriends.length === 0"
              @click="handleConfirm"
          >
            确认添加 ({{ selectedFriends.length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { friendsService } from '@/services/index.js'

const props = defineProps({
  /**
   * 是否显示弹窗
   */
  visible: {
    type: Boolean,
    default: false
  },
  /**
   * 初始选中的好友列表
   * 用于编辑模式时回显已选中的好友
   */
  initialSelected: {
    type: Array,
    default: () => []
  },
  /**
   * 是否在组件挂载时自动加载好友列表
   */
  autoLoad: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'update:visible',
  'confirm',  // 确认选择时触发，返回选中的好友列表
  'close'     // 关闭弹窗时触发
])

const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%23D5EBE1\'/%3E%3Ctext x=\'50\' y=\'70\' font-size=\'40\' text-anchor=\'middle\' fill=\'%232C3E50\'%3E👤%3C/text%3E%3C/svg%3E'

// ========== 状态 ==========
const friendsList = ref([])          // 好友列表数据
const loadingFriends = ref(false)     // 加载状态
const loadError = ref('')             // 加载错误信息
const searchKeyword = ref('')         // 搜索关键词
const selectedFriends = ref([])       // 已选中的好友
const isOnline = ref(navigator.onLine) // 网络状态
const hasCachedData = ref(false)      // 是否有缓存数据
const friendsLoaded = ref(false)      // 数据加载标志
const refreshing = ref(false)         // 刷新状态

// ========== 计算属性 ==========
/**
 * 根据搜索关键词过滤好友列表
 */
const filteredFriends = computed(() => {
  if (!searchKeyword.value) return friendsList.value

  const keyword = searchKeyword.value.toLowerCase().trim()
  if (!keyword) return friendsList.value

  return friendsList.value.filter(friend => {
    const name = (friend.nickname || friend.name || '').toLowerCase()
    const phone = (friend.phone || '').toLowerCase()
    return name.includes(keyword) || phone.includes(keyword)
  })
})

// ========== 网络状态监听 ==========
const handleOnline = () => {
  isOnline.value = true
  // 网络恢复时，如果有错误，自动刷新
  if (loadError.value) {
    loadFriends(true)
  }
}

const handleOffline = () => {
  isOnline.value = false
}

// ========== 数据加载方法 ==========
/**
 * 加载好友列表
 * @param {boolean} force 是否强制刷新（从API获取）
 */
const loadFriends = async (force = false) => {
  // 如果已经加载过且不是强制刷新且没有错误，则跳过
  if (friendsLoaded.value && !force && !loadError.value) {
    console.log('好友列表已加载，跳过请求')
    return
  }

  loadingFriends.value = true
  loadError.value = ''

  try {
    // 调用 service 获取好友列表
    const data = await friendsService.getFriendsList(force)
    friendsList.value = data || []

    // 检查是否有缓存数据（用于离线提示）
    hasCachedData.value = friendsList.value.length > 0

    // 如果是强制刷新且成功，标记为已加载
    if (force) {
      friendsLoaded.value = true
    } else if (!friendsLoaded.value && friendsList.value.length > 0) {
      // 如果是首次加载且有数据，标记为已加载
      friendsLoaded.value = true
    }

    console.log('好友列表加载完成，共', friendsList.value.length, '条')
  } catch (error) {
    console.error('加载好友列表失败:', error)
    loadError.value = error.message || '加载失败，请重试'

    // 尝试从缓存获取（service 已经处理了，但我们可以再检查一下）
    if (friendsList.value.length === 0) {
      hasCachedData.value = false
    }
  } finally {
    loadingFriends.value = false
  }
}

/**
 * 刷新好友列表（强制从API获取）
 */
const handleRefresh = async () => {
  if (refreshing.value) return

  refreshing.value = true
  loadError.value = ''

  try {
    await loadFriends(true)
    // 刷新成功后，清空搜索关键词
    searchKeyword.value = ''
  } catch (error) {
    console.error('刷新失败:', error)
  } finally {
    refreshing.value = false
  }
}

// ========== 选中状态管理 ==========
/**
 * 初始化选中的好友
 * 根据 initialSelected 设置 selectedFriends
 */
const initSelectedFriends = () => {
  if (props.initialSelected && props.initialSelected.length > 0) {
    // 这里需要根据实际数据结构进行匹配
    // 假设 initialSelected 传入的是好友ID数组或好友对象数组
    selectedFriends.value = props.initialSelected.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item
      }
      // 如果是ID，则从 friendsList 中查找
      return friendsList.value.find(f => f.friendId === item || f.userId === item)
    }).filter(Boolean)
  } else {
    selectedFriends.value = []
  }
}

/**
 * 判断好友是否被选中
 */
const isFriendSelected = (friend) => {
  return selectedFriends.value.some(f => f.friendId === friend.friendId)
}

/**
 * 切换选中状态
 */
const toggleSelect = (friend) => {
  const index = selectedFriends.value.findIndex(f => f.friendId === friend.friendId)

  if (index === -1) {
    // 未选中，添加
    selectedFriends.value.push(friend)
  } else {
    // 已选中，移除
    selectedFriends.value.splice(index, 1)
  }
}

// ========== 搜索方法 ==========
/**
 * 搜索输入处理
 * 可以添加防抖，但这里简单处理
 */
const handleSearch = () => {
  // 计算属性会自动更新 filteredFriends
}

// ========== 弹窗操作 ==========
/**
 * 确认选择
 */
const handleConfirm = () => {
  if (selectedFriends.value.length > 0) {
    emit('confirm', selectedFriends.value)
    handleClose()
  }
}

/**
 * 关闭弹窗
 */
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

/**
 * 重置加载状态
 */
const resetLoadState = () => {
  friendsLoaded.value = false
  loadError.value = ''
  friendsList.value = []
}

// ========== 生命周期和监听 ==========
// 监听 visible 变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    console.log('FriendSelector 打开，加载数据')
    // 重置错误状态
    loadError.value = ''

    // 根据 autoLoad 决定是否加载
    if (props.autoLoad) {
      loadFriends()
    }

    // 初始化选中的好友
    // 需要等 friendsList 加载完成后才能正确匹配
    // 如果 friendsList 还没加载，先清空 selected
    if (friendsList.value.length > 0) {
      initSelectedFriends()
    } else {
      selectedFriends.value = []
    }
  } else {
    // 关闭时清空搜索关键词
    searchKeyword.value = ''
  }
})

// 监听 friendsList 变化，当列表加载完成后初始化选中
watch(friendsList, (newList) => {
  if (newList.length > 0 && props.visible && props.initialSelected.length > 0) {
    initSelectedFriends()
  }
}, {immediate: true})

// 监听网络状态
onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // 如果组件挂载时可见，且 autoLoad 为 true，加载数据
  if (props.visible && props.autoLoad) {
    loadFriends()
  }
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})

// 暴露方法给父组件
defineExpose({
  resetLoadState,
  loadFriends,
  refreshFriends: handleRefresh
})
</script>

<style scoped>
.friend-selector-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.friend-selector-modal.active {
  opacity: 1;
  visibility: visible;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.friend-selector-content {
  background-color: var(--white);
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.friend-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--primary-color);
  background: linear-gradient(135deg, var(--primary-color) 0%, white 100%);
  border-radius: 20px 20px 0 0;
}

.friend-selector-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.refresh-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-light);
  cursor: pointer;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background-color: var(--primary-color);
  color: var(--accent-color);
  transform: rotate(30deg);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-text {
  margin-left: 5px;
  font-size: 12px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-light);
  cursor: pointer;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.close-btn:hover {
  background-color: var(--primary-color);
  color: var(--accent-color);
}

/* 离线提示 */
.offline-banner {
  background-color: #fff3cd;
  color: #856404;
  padding: 8px 12px;
  margin: 10px 20px 0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  border: 1px solid #ffeeba;
}

.offline-banner i {
  font-size: 14px;
}

/* 错误提示 */
.error-banner {
  background-color: #fee;
  color: #e74c3c;
  padding: 8px 12px;
  margin: 10px 20px 0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  border: 1px solid #fcc;
}

.error-banner i {
  font-size: 14px;
}

.retry-btn {
  margin-left: auto;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 15px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.retry-btn:hover {
  background-color: #c0392b;
}

.friend-selector-search {
  padding: 15px 20px;
  position: relative;
}

.friend-selector-search i {
  position: absolute;
  left: 35px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
  font-size: 14px;
}

.friend-selector-search input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid var(--secondary-color);
  border-radius: 25px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
  background-color: rgba(213, 235, 225, 0.1);
}

.friend-selector-search input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.friend-selector-search input::placeholder {
  color: var(--text-light);
  opacity: 0.7;
}

.friend-selector-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.loading-friends {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.loading-friends i {
  font-size: 30px;
  color: var(--accent-color);
  margin-bottom: 10px;
}

.loading-friends span {
  display: block;
  font-size: 14px;
}

.no-friends {
  text-align: center;
  padding: 40px 20px;
}

.no-friends i {
  font-size: 50px;
  color: var(--secondary-color);
  margin-bottom: 10px;
}

.no-friends p {
  color: var(--text-light);
  margin-bottom: 15px;
  font-size: 14px;
}

.btn-add-friend {
  padding: 10px 20px;
  background-color: var(--primary-color);
  border: none;
  border-radius: 20px;
  color: var(--accent-color);
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-add-friend:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
}

.btn-add-friend i {
  font-size: 14px;
}

.friend-selector-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background-color: rgba(213, 235, 225, 0.1);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.friend-selector-item:hover {
  background-color: rgba(213, 235, 225, 0.3);
  transform: translateY(-2px);
}

.friend-selector-item.selected {
  background-color: rgba(128, 164, 146, 0.1);
  border-color: var(--accent-color);
}

.friend-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  border: 2px solid var(--primary-color);
  flex-shrink: 0;
}

.friend-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 3px;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-phone {
  font-size: 12px;
  color: var(--text-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-checkbox {
  font-size: 20px;
  color: var(--accent-color);
  margin-left: 10px;
  flex-shrink: 0;
}

.fa-check-circle {
  color: var(--accent-color);
  animation: popIn 0.2s ease;
}

@keyframes popIn {
  0% {
    transform: scale(0);
  }
  80% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.fa-circle {
  color: var(--secondary-color);
}

.friend-selector-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--primary-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  border-radius: 0 0 20px 20px;
}

.selected-count {
  font-size: 14px;
  color: var(--text-light);
  font-weight: 500;
}

.footer-buttons {
  display: flex;
  gap: 10px;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.btn-cancel {
  background-color: #f0f0f0;
  color: var(--text-light);
}

.btn-cancel:hover {
  background-color: #e0e0e0;
  transform: translateY(-2px);
}

.btn-confirm {
  background-color: var(--accent-color);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background-color: #6b8a7a;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(128, 164, 146, 0.3);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 滚动条样式 */
.friend-selector-list::-webkit-scrollbar {
  width: 6px;
}

.friend-selector-list::-webkit-scrollbar-track {
  background: rgba(213, 235, 225, 0.1);
  border-radius: 3px;
}

.friend-selector-list::-webkit-scrollbar-thumb {
  background: var(--secondary-color);
  border-radius: 3px;
}

.friend-selector-list::-webkit-scrollbar-thumb:hover {
  background: var(--accent-color);
}

@media (max-width: 500px) {
  .friend-selector-content {
    max-width: 95%;
    max-height: 90vh;
  }

  .friend-selector-footer {
    flex-direction: column;
    gap: 10px;
  }

  .selected-count {
    text-align: center;
  }

  .footer-buttons {
    width: 100%;
  }

  .btn-cancel,
  .btn-confirm {
    flex: 1;
    text-align: center;
  }

  .friend-selector-item {
    padding: 10px;
  }

  .friend-avatar {
    width: 40px;
    height: 40px;
  }

  .friend-name {
    font-size: 14px;
  }
}

@media (max-width: 360px) {
  .friend-selector-header h3 {
    font-size: 16px;
  }

  .refresh-btn,
  .close-btn {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }

  .friend-selector-search input {
    padding: 10px 10px 10px 35px;
    font-size: 13px;
  }

  .friend-selector-search i {
    left: 30px;
    font-size: 12px;
  }

  .btn-cancel,
  .btn-confirm {
    padding: 8px 12px;
    font-size: 13px;
  }
}
</style>