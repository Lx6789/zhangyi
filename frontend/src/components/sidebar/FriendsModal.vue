<template>
  <!-- 添加 v-if="visible" 确保只有 visible 为 true 时才渲染 -->
  <div v-if="visible" class="modal" :class="{ active: visible }" @click="closeOnOverlay">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas fa-user-friends"></i>
        <h3>我的好友</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 标签页切换 + 刷新按钮 -->
      <div class="tab-header">
        <div class="tab-buttons">
          <button
              class="tab-btn"
              :class="{ active: currentTab === 'friends' }"
              @click="switchTab('friends')"
          >
            好友列表
          </button>
          <button
              class="tab-btn"
              :class="{ active: currentTab === 'requests' }"
              @click="switchTab('requests')"
          >
            好友申请
            <span v-if="pendingRequestsCount > 0" class="badge">{{ pendingRequestsCount }}</span>
          </button>
        </div>
        <button class="refresh-btn" @click="handleRefresh" :disabled="refreshing">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': refreshing }"></i>
          {{ refreshing ? '刷新中...' : '刷新' }}
        </button>
      </div>

      <div class="modal-body">
        <!-- 好友列表标签页 -->
        <div v-if="currentTab === 'friends'">
          <!-- 搜索和添加好友区域 -->
          <div class="friends-actions">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                  type="text"
                  v-model="searchKeyword"
                  placeholder="搜索好友..."
                  @input="handleSearch"
              >
            </div>
            <button class="add-friend-btn" @click="showAddFriendModal">
              <i class="fas fa-user-plus"></i>
              添加好友
            </button>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>加载中...</p>
          </div>

          <!-- 好友列表 -->
          <div v-else-if="filteredFriends.length > 0" class="friends-list">
            <div
                v-for="friend in filteredFriends"
                :key="friend.id"
                class="friend-item"
            >
              <div class="friend-avatar">
                <img :src="friend.avatar || defaultAvatar" alt="avatar">
              </div>
              <div class="friend-info">
                <div class="friend-name">{{ friend.nickname }}</div>
                <div class="friend-phone">{{ friend.phone }}</div>
                <div class="friend-time">添加于: {{ formatDate(friend.addTime) }}</div>
              </div>
              <div class="friend-actions">
                <button class="action-btn delete" @click="confirmDelete(friend)" title="删除好友">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="friends-empty">
            <i class="fas fa-user-friends"></i>
            <h4>暂无好友</h4>
            <p>点击上方按钮添加好友</p>
          </div>
        </div>

        <!-- 好友申请标签页 -->
        <div v-if="currentTab === 'requests'">
          <div class="requests-tabs">
            <button
                class="sub-tab-btn"
                :class="{ active: requestsTab === 'received' }"
                @click="requestsTab = 'received'"
            >
              收到的申请
            </button>
            <button
                class="sub-tab-btn"
                :class="{ active: requestsTab === 'sent' }"
                @click="requestsTab = 'sent'"
            >
              发出的申请
            </button>
          </div>

          <!-- 收到的申请 -->
          <div v-if="requestsTab === 'received'">
            <div v-if="loadingRequests" class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>加载中...</p>
            </div>
            <div v-else-if="receivedRequests.length > 0" class="requests-list">
              <div v-for="req in receivedRequests" :key="req.id" class="request-item">
                <div class="request-avatar">
                  <img :src="req.fromUserAvatar || defaultAvatar" alt="avatar">
                </div>
                <div class="request-info">
                  <div class="request-name">{{ req.fromUserNickname }}</div>
                  <div class="request-phone">{{ req.fromUserPhone }}</div>
                  <div v-if="req.message" class="request-message">留言：{{ req.message }}</div>
                  <div class="request-time">{{ formatDate(req.createdAt) }}</div>
                </div>
                <div class="request-actions">
                  <button class="request-btn accept" @click="acceptRequest(req.id)" title="同意">
                    <i class="fas fa-check"></i>
                  </button>
                  <button class="request-btn reject" @click="rejectRequest(req.id)" title="拒绝">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <i class="fas fa-inbox"></i>
              <p>暂无收到的好友申请</p>
            </div>
          </div>

          <!-- 发出的申请 -->
          <div v-if="requestsTab === 'sent'">
            <div v-if="loadingRequests" class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>加载中...</p>
            </div>
            <div v-else-if="sentRequests.length > 0" class="requests-list">
              <div v-for="req in sentRequests" :key="req.id" class="request-item">
                <div class="request-avatar">
                  <img :src="req.toUserAvatar || defaultAvatar" alt="avatar">
                </div>
                <div class="request-info">
                  <div class="request-name">{{ req.toUserNickname }}</div>
                  <div class="request-phone">{{ req.toUserPhone }}</div>
                  <div v-if="req.message" class="request-message">留言：{{ req.message }}</div>
                  <div class="request-time">{{ formatDate(req.createdAt) }}</div>
                </div>
                <div class="request-status">
                  <span :class="getStatusClass(req.status)">{{ getStatusText(req.status) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <i class="fas fa-paper-plane"></i>
              <p>暂无发出的好友申请</p>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn modal-cancel" @click="close">
          关闭
        </button>
      </div>
    </div>

    <!-- 发送申请弹窗 -->
    <div v-if="showSendRequestModal" class="sub-modal" :class="{ active: showSendRequestModal }" @click="closeSubModalOnOverlay">
      <div class="sub-modal-content">
        <div class="sub-modal-header">
          <h4>发送好友申请</h4>
          <button class="sub-modal-close" @click="showSendRequestModal = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="sub-modal-body">
          <div class="form-group">
            <label>对方手机号</label>
            <input
                type="text"
                v-model="targetPhone"
                placeholder="输入对方手机号"
            >
          </div>
          <div class="form-group">
            <label>留言（可选）</label>
            <textarea
                v-model="requestMessage"
                placeholder="输入申请留言..."
                rows="3"
            ></textarea>
          </div>
        </div>
        <div class="sub-modal-footer">
          <button class="sub-modal-btn cancel" @click="showSendRequestModal = false">取消</button>
          <button
              class="sub-modal-btn confirm"
              @click="handleSendRequest"
              :disabled="!targetPhone || sendingRequest"
          >
            <i v-if="sendingRequest" class="fas fa-spinner fa-spin"></i>
            {{ sendingRequest ? '发送中...' : '发送申请' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import notificationService from '@/services/utils/notification.service.js'
import { friendsService } from '@/services/index.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

// 默认头像
const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%23D5EBE1\'/%3E%3Ctext x=\'50\' y=\'70\' font-size=\'40\' text-anchor=\'middle\' fill=\'%232C3E50\'%3E👤%3C/text%3E%3C/svg%3E'

// 标签页状态
const currentTab = ref('friends')
const requestsTab = ref('received')

// 数据加载标志 - 控制是否已加载过
const friendsLoaded = ref(false)
const receivedLoaded = ref(false)
const sentLoaded = ref(false)

// 刷新状态
const refreshing = ref(false)

// 好友列表数据
const friends = ref([])
const searchKeyword = ref('')
const loading = ref(false)

// 申请数据
const receivedRequests = ref([])
const sentRequests = ref([])
const loadingRequests = ref(false)

// 发送申请弹窗
const showSendRequestModal = ref(false)
const targetPhone = ref('')
const requestMessage = ref('')
const sendingRequest = ref(false)

// 计算待处理的申请数量
const pendingRequestsCount = computed(() => {
  return receivedRequests.value.filter(req => req.status === 0).length
})

// 过滤后的好友列表
const filteredFriends = computed(() => {
  if (!searchKeyword.value) return friends.value
  const keyword = searchKeyword.value.toLowerCase()
  return friends.value.filter(friend =>
      friend.nickname?.toLowerCase().includes(keyword) ||
      friend.phone?.includes(keyword)
  )
})

// 切换标签页
const switchTab = (tab) => {
  currentTab.value = tab
}

// 加载好友列表
const loadFriends = async (force = false) => {
  // 如果已经加载过且不是强制刷新，则跳过
  if (friendsLoaded.value && !force) {
    console.log('好友列表已加载，跳过请求')
    return
  }

  loading.value = true
  try {
    // 使用修改后的 service，传入 force 参数
    const data = await friendsService.getFriendsList(force)
    friends.value = data || []
    friendsLoaded.value = true
    console.log('好友列表加载完成')
  } catch (error) {
    console.error('加载好友列表失败:', error)
    // 错误时尝试从缓存获取（service 已经处理了，这里不用再处理）
  } finally {
    loading.value = false
  }
}

// 加载收到的申请
const loadReceivedRequests = async (force = false) => {
  // 如果已经加载过且不是强制刷新，则跳过
  if (receivedLoaded.value && !force) {
    console.log('收到的申请已加载，跳过请求')
    return
  }

  try {
    const data = await friendsService.getReceivedRequests()
    receivedRequests.value = data || []
    receivedLoaded.value = true
    console.log('收到的申请加载完成')
  } catch (error) {
    console.error('加载收到的申请失败:', error)
  }
}

// 加载发出的申请
const loadSentRequests = async (force = false) => {
  // 如果已经加载过且不是强制刷新，则跳过
  if (sentLoaded.value && !force) {
    console.log('发出的申请已加载，跳过请求')
    return
  }

  try {
    const data = await friendsService.getSentRequests()
    sentRequests.value = data || []
    sentLoaded.value = true
    console.log('发出的申请加载完成')
  } catch (error) {
    console.error('加载发出的申请失败:', error)
  }
}

// 加载所有申请数据
const loadAllRequests = async (force = false) => {
  loadingRequests.value = true
  try {
    await Promise.all([
      loadReceivedRequests(force),
      loadSentRequests(force)
    ])
  } finally {
    loadingRequests.value = false
  }
}

// 刷新所有数据（强制发送新请求）
const handleRefresh = async () => {
  refreshing.value = true
  console.log('手动刷新所有数据')

  try {
    // 根据当前标签页刷新对应数据
    if (currentTab.value === 'friends') {
      await loadFriends(true)
    } else {
      await loadAllRequests(true)
    }
    notificationService.showNotification('数据已刷新', 'success')
  } catch (error) {
    console.error('刷新失败:', error)
    notificationService.showNotification('刷新失败', 'error')
  } finally {
    refreshing.value = false
  }
}

// 搜索处理
const handleSearch = () => {}

// 显示发送申请弹窗
const showAddFriendModal = () => {
  targetPhone.value = ''
  requestMessage.value = ''
  showSendRequestModal.value = true
}

// 发送申请
const handleSendRequest = async () => {
  if (!targetPhone.value) {
    notificationService.showNotification('请输入对方手机号', 'warning')
    return
  }

  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(targetPhone.value)) {
    notificationService.showNotification('请输入正确的手机号', 'warning')
    return
  }

  sendingRequest.value = true
  try {
    await friendsService.sendFriendRequest(targetPhone.value, requestMessage.value)
    showSendRequestModal.value = false

    // 发送成功后，强制重新加载发出的申请
    await loadSentRequests(true)

    // 切换到申请列表标签页
    currentTab.value = 'requests'
    requestsTab.value = 'sent'

    notificationService.showNotification('好友申请已发送', 'success')
  } catch (error) {
    console.error('发送申请失败:', error)
  } finally {
    sendingRequest.value = false
  }
}

// 同意申请
const acceptRequest = async (requestId) => {
  try {
    await friendsService.acceptFriendRequest(requestId)

    // 同意后，强制重新加载收到的申请和好友列表
    await Promise.all([
      loadReceivedRequests(true),
      loadFriends(true)
    ])

    notificationService.showNotification('已同意好友申请', 'success')
  } catch (error) {
    console.error('同意申请失败:', error)
  }
}

// 拒绝申请
const rejectRequest = async (requestId) => {
  try {
    await friendsService.rejectFriendRequest(requestId)

    // 拒绝后，强制重新加载收到的申请
    await loadReceivedRequests(true)

    notificationService.showNotification('已拒绝好友申请', 'success')
  } catch (error) {
    console.error('拒绝申请失败:', error)
  }
}

// 确认删除
const confirmDelete = (friend) => {
  if (confirm(`确定要删除好友 ${friend.nickname} 吗？`)) {
    handleDeleteFriend(friend)
  }
}

// 删除好友
const handleDeleteFriend = async (friend) => {
  try {
    await friendsService.deleteFriend(friend.friendId)

    // 删除后，强制重新加载好友列表
    await loadFriends(true)

    notificationService.showNotification('删除好友成功', 'success')
  } catch (error) {
    console.error('删除好友失败:', error)
  }
}

// 获取状态文本
const getStatusText = (status) => {
  const map = {
    0: '待处理',
    1: '已同意',
    2: '已拒绝',
    3: '已忽略'
  }
  return map[status] || '未知'
}

// 获取状态样式
const getStatusClass = (status) => {
  const map = {
    0: 'status-pending',
    1: 'status-accepted',
    2: 'status-rejected',
    3: 'status-ignored'
  }
  return map[status] || ''
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 关闭主弹窗
const close = () => {
  emit('update:visible', false)
  emit('close')
}

// 点击遮罩关闭
const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

// 点击子弹窗遮罩关闭
const closeSubModalOnOverlay = (event) => {
  if (event.target.classList.contains('sub-modal')) {
    showSendRequestModal.value = false
  }
}

// 监听visible变化 - 只在首次打开时加载数据
watch(() => props.visible, (newVal) => {
  console.log('FriendsModal visible changed:', newVal)
  if (newVal) {
    console.log('首次打开，加载数据')
    // 首次打开时加载所有数据（只加载未加载过的）
    if (!friendsLoaded.value) loadFriends()
    if (!receivedLoaded.value || !sentLoaded.value) loadAllRequests()
  }
}, { immediate: true })

onMounted(() => {
  if (props.visible) {
    console.log('组件挂载时可见，加载数据')
    // 首次打开时加载所有数据（只加载未加载过的）
    if (!friendsLoaded.value) loadFriends()
    if (!receivedLoaded.value || !sentLoaded.value) loadAllRequests()
  }
})
</script>

<style scoped>
/* ===== 基础模态框样式 ===== */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.modal.active {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background-color: white;
  width: 90%;
  max-width: 600px;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #D5EBE1;
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 10;
}

.modal-header i {
  font-size: 24px;
  margin-right: 10px;
  color: #2C3E50;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #2C3E50;
  flex: 1;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.modal-close:hover {
  background-color: #D5EBE1;
  color: #2C3E50;
}

.modal-body {
  margin-bottom: 20px;
  max-height: calc(80vh - 150px);
  overflow-y: auto;
  padding-right: 5px;
}

.modal-footer {
  display: flex;
  justify-content: center;
  padding-top: 15px;
  border-top: 1px solid #D5EBE1;
  position: sticky;
  bottom: 0;
  background-color: white;
}

.modal-btn {
  padding: 12px 30px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.modal-cancel {
  background-color: #D5EBE1;
  color: #2C3E50;
}

.modal-cancel:hover {
  background-color: #80A492;
}

/* ===== 标签页样式 ===== */
.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #D5EBE1;
  padding-bottom: 10px;
}

.tab-buttons {
  display: flex;
  gap: 10px;
  flex: 1;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: none;
  font-size: 16px;
  font-weight: 500;
  color: #999;
  cursor: pointer;
  position: relative;
  border-radius: 8px;
  transition: all 0.3s;
}

.tab-btn.active {
  color: #2C3E50;
  background-color: #D5EBE1;
}

.refresh-btn {
  padding: 8px 15px;
  background-color: #2C3E50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s;
  white-space: nowrap;
  margin-left: 10px;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #1a2632;
}

.refresh-btn:disabled {
  background-color: #D5EBE1;
  color: #999;
  cursor: not-allowed;
}

.refresh-btn i {
  font-size: 14px;
}

.badge {
  position: absolute;
  top: -5px;
  right: 20px;
  background-color: #f56c6c;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
}

/* ===== 好友操作区域 ===== */
.friends-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-box {
  flex: 1;
  position: relative;
}

.search-box i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  font-size: 14px;
}

.search-box input {
  width: 100%;
  padding: 10px 10px 10px 35px;
  border: 1px solid #D5EBE1;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.search-box input:focus {
  border-color: #2C3E50;
  box-shadow: 0 0 0 2px rgba(44, 62, 80, 0.1);
}

.add-friend-btn {
  padding: 10px 20px;
  background-color: #2C3E50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  white-space: nowrap;
}

.add-friend-btn:hover {
  background-color: #1a2632;
}

.add-friend-btn i {
  font-size: 14px;
}

/* ===== 加载状态 ===== */
.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.loading-state i {
  font-size: 30px;
  margin-bottom: 10px;
  color: #2C3E50;
}

.loading-state p {
  margin: 0;
  font-size: 14px;
}

/* ===== 好友列表 ===== */
.friends-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 12px;
  transition: all 0.3s;
}

.friend-item:hover {
  transform: translateX(5px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.friend-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 15px;
  border: 2px solid #D5EBE1;
}

.friend-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.friend-info {
  flex: 1;
}

.friend-name {
  font-weight: 600;
  color: #2C3E50;
  margin-bottom: 4px;
}

.friend-phone {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.friend-time {
  font-size: 11px;
  color: #999;
  opacity: 0.8;
}

.friend-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: white;
}

.action-btn.delete {
  background-color: #f56c6c;
}

.action-btn.delete:hover {
  background-color: #f78989;
  transform: scale(1.1);
}

/* ===== 空状态 ===== */
.friends-empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.friends-empty i {
  font-size: 80px;
  color: #D5EBE1;
  margin-bottom: 20px;
}

.friends-empty h4 {
  font-size: 20px;
  font-weight: 600;
  color: #2C3E50;
  margin: 0 0 10px 0;
}

.friends-empty p {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* ===== 申请相关样式 ===== */
.requests-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.sub-tab-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #D5EBE1;
  background: none;
  border-radius: 6px;
  color: #999;
  cursor: pointer;
  transition: all 0.3s;
}

.sub-tab-btn.active {
  background-color: #2C3E50;
  color: white;
  border-color: #2C3E50;
}

.requests-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.request-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 10px;
}

.request-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
}

.request-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.request-info {
  flex: 1;
}

.request-name {
  font-weight: 600;
  color: #2C3E50;
  margin-bottom: 2px;
}

.request-phone {
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.request-message {
  font-size: 12px;
  color: #666;
  background-color: rgba(213, 235, 225, 0.3);
  padding: 4px 8px;
  border-radius: 4px;
  margin: 4px 0;
}

.request-time {
  font-size: 11px;
  color: #999;
}

.request-actions {
  display: flex;
  gap: 8px;
}

.request-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: white;
  transition: all 0.3s;
}

.request-btn.accept {
  background-color: #67c23a;
}

.request-btn.accept:hover {
  background-color: #85ce61;
}

.request-btn.reject {
  background-color: #f56c6c;
}

.request-btn.reject:hover {
  background-color: #f78989;
}

.request-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.status-pending {
  background-color: #e6a23c;
  color: white;
}

.status-accepted {
  background-color: #67c23a;
  color: white;
}

.status-rejected {
  background-color: #f56c6c;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state i {
  font-size: 48px;
  color: #D5EBE1;
  margin-bottom: 10px;
}

/* ===== 子弹窗样式（发送申请弹窗） ===== */
.sub-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.sub-modal.active {
  opacity: 1;
  visibility: visible;
}

.sub-modal-content {
  background-color: white;
  width: 90%;
  max-width: 400px;
  border-radius: 15px;
  padding: 20px;
}

.sub-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #D5EBE1;
}

.sub-modal-header h4 {
  font-size: 18px;
  font-weight: 600;
  color: #2C3E50;
  margin: 0;
}

.sub-modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.sub-modal-close:hover {
  background-color: #D5EBE1;
  color: #2C3E50;
}

.sub-modal-body {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #D5EBE1;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #2C3E50;
  box-shadow: 0 0 0 2px rgba(44, 62, 80, 0.1);
}

.sub-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.sub-modal-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.sub-modal-btn.cancel {
  background-color: #f0f0f0;
  color: #333;
}

.sub-modal-btn.cancel:hover {
  background-color: #e0e0e0;
}

.sub-modal-btn.confirm {
  background-color: #2C3E50;
  color: white;
}

.sub-modal-btn.confirm:hover {
  background-color: #1a2632;
}

.sub-modal-btn.confirm:disabled {
  background-color: #D5EBE1;
  color: #999;
  cursor: not-allowed;
}

.sub-modal-btn.confirm i {
  margin-right: 5px;
}

/* ===== 滚动条样式 ===== */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #D5EBE1;
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* ===== 响应式调整 ===== */
@media (max-width: 480px) {
  .modal-content {
    width: 95%;
    padding: 15px;
  }

  .tab-header {
    flex-direction: column;
    gap: 10px;
  }

  .refresh-btn {
    width: 100%;
    margin-left: 0;
    justify-content: center;
  }

  .friends-actions {
    flex-direction: column;
  }

  .add-friend-btn {
    width: 100%;
    justify-content: center;
  }

  .friend-item {
    flex-wrap: wrap;
  }

  .friend-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 10px;
  }

  .request-item {
    flex-wrap: wrap;
  }

  .request-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 10px;
  }
}
</style>