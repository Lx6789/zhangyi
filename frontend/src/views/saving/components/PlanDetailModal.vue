<template>
  <div class="plan-detail-modal" @click.self="$emit('close')">
    <div class="modal-content">
      <!-- 头部 - 改为不透明 -->
      <div class="modal-header" :style="{ borderBottomColor: selectedPlan?.color }">
        <div class="header-info">
          <div class="plan-icon" :style="{ backgroundColor: selectedPlan?.color }">
            <i :class="selectedPlan?.icon"></i>
          </div>
          <div class="plan-title">
            <h2>{{ selectedPlan?.name }}</h2>
            <p class="plan-reason">{{ selectedPlan?.reason }}</p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="modal-body">
        <!-- 计划概览 -->
        <div class="overview-section">
          <div class="overview-card">
            <div class="overview-item">
              <i class="fas fa-bullseye"></i>
              <div class="overview-text">
                <span class="label">目标金额</span>
                <span class="value">¥{{ formatNumber(selectedPlan?.targetAmount) }}</span>
              </div>
            </div>
            <div class="overview-item">
              <i class="fas fa-coins"></i>
              <div class="overview-text">
                <span class="label">已存金额</span>
                <span class="value">¥{{ formatNumber(selectedPlan?.currentAmount) }}</span>
              </div>
            </div>
            <div class="overview-item">
              <i class="fas fa-chart-line"></i>
              <div class="overview-text">
                <span class="label">完成进度</span>
                <span class="value">{{ selectedPlan?.progress || 0 }}%</span>
              </div>
            </div>
            <div class="overview-item">
              <i class="fas fa-calendar-alt"></i>
              <div class="overview-text">
                <span class="label">截止日期</span>
                <span class="value">{{ formatDate(selectedPlan?.deadline) }}</span>
              </div>
            </div>
          </div>
          <div class="progress-wrapper">
            <div class="progress-bar-large">
              <div class="progress-fill-large" :style="{ width: selectedPlan?.progress + '%', backgroundColor: selectedPlan?.color }"></div>
            </div>
            <div class="progress-status">
              <span v-if="selectedPlan?.progress >= 100" class="completed-badge">
                <i class="fas fa-check-circle"></i> 已完成
              </span>
              <span v-else-if="selectedPlan?.deadline && isExpired(selectedPlan.deadline)" class="expired-badge">
                <i class="fas fa-exclamation-circle"></i> 已过期
              </span>
              <span v-else class="active-badge">
                <i class="fas fa-hourglass-half"></i> 进行中
              </span>
            </div>
          </div>
        </div>

        <!-- 计划描述 -->
        <div v-if="selectedPlan?.description" class="description-section">
          <h3><i class="fas fa-align-left"></i> 计划描述</h3>
          <p>{{ selectedPlan.description }}</p>
        </div>

        <!-- 标签页切换 -->
        <div class="tabs">
          <button
              class="tab-btn"
              :class="{ active: activeRecordsTab === 'members' }"
              @click="$emit('update:active-records-tab', 'members')"
          >
            <i class="fas fa-users"></i>
            <span>成员列表 ({{ getActiveMembersCount() }})</span>
          </button>
          <button
              class="tab-btn"
              :class="{ active: activeRecordsTab === 'records' }"
              @click="$emit('update:active-records-tab', 'records')"
          >
            <i class="fas fa-history"></i>
            <span>存钱记录</span>
          </button>
        </div>

        <!-- 成员列表 -->
        <div v-if="activeRecordsTab === 'members'" class="members-section">
          <div class="members-header">
            <div class="members-stats">
              <span>共 {{ getActiveMembersCount() }} 位成员</span>
              <span class="total-amount">总存入: ¥{{ formatNumber(selectedPlan?.currentAmount) }}</span>
            </div>
            <button class="add-money-btn" @click="$emit('add-money', selectedPlan)">
              <i class="fas fa-plus-circle"></i>
              <span>存钱</span>
            </button>
          </div>

          <div class="members-list">
            <!-- 遍历每个成员 -->
            <div
                v-for="member in getSortedMembers()"
                :key="member.userId"
                class="member-wrapper"
            >
              <!-- 成员卡片 -->
              <div
                  class="member-card"
                  :class="{ 'creator': member.isCreator, 'deleted-member': member.deleted === 1 }"
              >
                <div class="member-avatar" :style="{ backgroundColor: getAvatarColor(member.userId) }">
                  {{ getAvatarText(member.name) }}
                </div>
                <div class="member-info">
                  <div class="member-name">
                    {{ member.name }}
                    <span v-if="member.isCreator" class="creator-badge">
                      <i class="fas fa-crown"></i> 创建者
                    </span>
                    <span v-if="member.deleted === 1" class="deleted-badge">
                      <i class="fas fa-sign-out-alt"></i> 已退出
                    </span>
                  </div>
                  <div class="member-amount">
                    已存: ¥{{ formatNumber(member.amount) }}
                    <span class="percentage">
                      ({{ getMemberPercentage(member.amount) }}%)
                    </span>
                  </div>
                  <div class="member-join-time">
                    加入时间: {{ formatDate(member.joinTime) }}
                  </div>
                </div>
                <button
                    class="view-records-btn"
                    @click="toggleMemberRecords(member)"
                    :title="expandedMemberId === member.userId ? '收起记录' : '查看存钱记录'"
                >
                  <i :class="expandedMemberId === member.userId ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                </button>
              </div>

              <!-- 该成员的存钱记录 - 直接显示在成员卡片下方 -->
              <div v-if="expandedMemberId === member.userId" class="member-records-container">
                <div class="member-records-header">
                  <i class="fas fa-history"></i>
                  <span>{{ member.name }} 的存钱记录</span>
                  <span v-if="memberRecords.length > 0" class="records-count">(共 {{ memberRecords.length }} 条)</span>
                </div>

                <!-- 加载状态 -->
                <div v-if="loadingMemberRecords" class="loading-records">
                  <i class="fas fa-spinner fa-spin"></i>
                  <span>加载中...</span>
                </div>

                <!-- 无记录状态 -->
                <div v-else-if="memberRecords.length === 0" class="empty-records-small">
                  <i class="fas fa-coins"></i>
                  <span>该成员暂无存钱记录</span>
                </div>

                <!-- 记录列表 -->
                <div v-else class="member-records-list">
                  <div
                      v-for="record in memberRecords"
                      :key="record.id"
                      class="record-item"
                      :class="{ 'record-deleted': record.deleted === 1 }"
                  >
                    <div class="record-info">
                      <div class="record-amount">
                        <span class="amount">+¥{{ formatNumber(record.amount) }}</span>
                      </div>
                      <div class="record-time">{{ formatDateTime(record.depositTime || record.createTime) }}</div>
                    </div>
                    <div v-if="record.note" class="record-note">
                      <i class="fas fa-comment"></i>
                      <span>{{ record.note }}</span>
                    </div>
                    <div v-if="record.deleted === 1" class="record-deleted-badge">
                      <i class="fas fa-trash-alt"></i>
                      <span>已删除</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 存钱记录列表 -->
        <div v-if="activeRecordsTab === 'records'" class="records-section">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <div class="filter-group">
              <label><i class="fas fa-user"></i> 成员</label>
              <select v-model="selectedMember" class="filter-select" @change="handleSearch">
                <option value="">全部成员</option>
                <option
                    v-for="member in getActiveMembers()"
                    :key="member.userId"
                    :value="member.userId"
                >
                  {{ member.name }} (¥{{ formatNumber(member.amount) }})
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label><i class="fas fa-calendar"></i> 开始日期</label>
              <input type="date" v-model="localDateRange.startTime" class="filter-input" @change="handleSearch">
            </div>
            <div class="filter-group">
              <label><i class="fas fa-calendar"></i> 结束日期</label>
              <input type="date" v-model="localDateRange.endTime" class="filter-input" @change="handleSearch">
            </div>
            <div class="filter-actions">
              <button class="search-btn" @click="handleSearch">
                <i class="fas fa-search"></i>
              </button>
              <button class="reset-btn" @click="handleReset">
                <i class="fas fa-undo-alt"></i>
              </button>
            </div>
          </div>

          <!-- 统计信息 -->
          <div class="records-stats" v-if="totalRecords > 0">
            <span>共 {{ totalRecords }} 条记录</span>
            <span class="normal-count">正常: {{ normalCount }}</span>
            <span v-if="deletedCount > 0" class="deleted-count">已删除: {{ deletedCount }}</span>
          </div>

          <!-- 记录列表 -->
          <div v-if="loadingAllRecords" class="loading-records">
            <i class="fas fa-spinner fa-spin"></i>
            <span>加载中...</span>
          </div>
          <div v-else-if="filteredRecords.length === 0" class="empty-records">
            <i class="fas fa-history"></i>
            <p>暂无存钱记录</p>
            <p class="hint-text">点击"存钱"按钮开始记录吧</p>
          </div>
          <div v-else class="records-list">
            <div
                v-for="record in filteredRecords"
                :key="record.id"
                class="record-card"
                :class="{ 'deleted-record': record.deleted === 1 }"
            >
              <div class="record-avatar" :style="{ backgroundColor: getAvatarColor(record.memberId) }">
                {{ getAvatarText(record.memberName) }}
              </div>
              <div class="record-content">
                <div class="record-header">
                  <span class="record-member">{{ record.memberName }}</span>
                  <span class="record-amount">+¥{{ formatNumber(record.amount) }}</span>
                </div>
                <div class="record-time">{{ formatDateTime(record.depositTime || record.createTime) }}</div>
                <div v-if="record.note" class="record-note">
                  <i class="fas fa-comment"></i>
                  <span>{{ record.note }}</span>
                </div>
                <div v-if="record.deleted === 1" class="record-deleted-info">
                  <i class="fas fa-trash-alt"></i>
                  <span>已删除</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="totalPages > 1" class="pagination">
            <button
                class="page-btn"
                :disabled="currentPage === 1"
                @click="handlePageChange(currentPage - 1)"
            >
              <i class="fas fa-chevron-left"></i>
            </button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <button
                class="page-btn"
                :disabled="currentPage === totalPages"
                @click="handlePageChange(currentPage + 1)"
            >
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <button class="btn-add-money" @click="$emit('add-money', selectedPlan)">
          <i class="fas fa-plus-circle"></i>
          <span>存入金额</span>
        </button>
        <button class="btn-close" @click="$emit('close')">
          <i class="fas fa-times"></i>
          <span>关闭</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, defineProps, defineEmits } from 'vue'

const props = defineProps({
  selectedPlan: {
    type: Object,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  currentUser: {
    type: Object,
    default: () => ({})
  },
  activeRecordsTab: {
    type: String,
    default: 'members'
  },
  selectedMemberForRecords: {
    type: String,
    default: ''
  },
  dateRange: {
    type: Object,
    default: () => ({ startTime: '', endTime: '' })
  },
  loadingAllRecords: {
    type: Boolean,
    default: false
  },
  filteredRecords: {
    type: Array,
    default: () => []
  },
  totalRecords: {
    type: Number,
    default: 0
  },
  currentPage: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 10
  },
  totalPages: {
    type: Number,
    default: 1
  },
  expandedMemberId: {
    type: Number,
    default: null
  },
  memberRecords: {
    type: Array,
    default: () => []
  },
  loadingMemberRecords: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'close',
  'add-money',
  'update:active-records-tab',
  'update:selected-member-for-records',
  'update:date-range',
  'search-records',
  'reset-date-filter',
  'change-page',
  'toggle-member-records'
])

// 本地状态
const selectedMember = ref(props.selectedMemberForRecords)
const localDateRange = reactive({
  startTime: props.dateRange.startTime,
  endTime: props.dateRange.endTime
})

// 计算正常和已删除的记录数
const normalCount = computed(() => {
  return props.filteredRecords.filter(r => r.deleted !== 1).length
})

const deletedCount = computed(() => {
  return props.filteredRecords.filter(r => r.deleted === 1).length
})

// 监听 props 变化，同步本地状态
watch(() => props.selectedMemberForRecords, (newVal) => {
  selectedMember.value = newVal
})

watch(() => props.dateRange, (newVal) => {
  localDateRange.startTime = newVal.startTime
  localDateRange.endTime = newVal.endTime
}, { deep: true })

// ========== 工具函数 ==========
/**
 * 格式化数字
 */
const formatNumber = (num) => {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('zh-CN')
}

/**
 * 格式化日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '未设置'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch (error) {
    console.error('格式化日期失败:', error)
    return dateStr
  }
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('格式化日期时间失败:', error)
    return dateStr
  }
}

/**
 * 获取活跃成员（过滤已删除）
 */
const getActiveMembers = () => {
  if (!props.selectedPlan?.members) return []
  return props.selectedPlan.members.filter(m => m.deleted !== 1)
}

/**
 * 获取活跃成员数量
 */
const getActiveMembersCount = () => {
  return getActiveMembers().length
}

/**
 * 获取排序后的成员列表（创建者优先，按金额排序）
 */
const getSortedMembers = () => {
  const members = [...(props.selectedPlan?.members || [])]
  return members.sort((a, b) => {
    // 创建者优先
    if (a.isCreator && !b.isCreator) return -1
    if (!a.isCreator && b.isCreator) return 1
    // 按金额降序
    return (b.amount || 0) - (a.amount || 0)
  })
}

/**
 * 获取成员占比百分比
 */
const getMemberPercentage = (amount) => {
  const total = props.selectedPlan?.currentAmount || 0
  if (total === 0) return 0
  return Math.round((amount / total) * 100)
}

/**
 * 获取头像文字
 */
const getAvatarText = (name) => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

/**
 * 获取头像颜色
 */
const getAvatarColor = (id) => {
  const colors = [
    '#2ecc71', '#3498db', '#9b59b6', '#e74c3c',
    '#f39c12', '#1abc9c', '#e67e22', '#34495e'
  ]
  const index = (id || 0) % colors.length
  return colors[index]
}

/**
 * 检查是否过期
 */
const isExpired = (deadline) => {
  if (!deadline) return false
  try {
    return new Date(deadline) < new Date()
  } catch (error) {
    console.error('检查过期失败:', error)
    return false
  }
}

// ========== 事件处理 ==========
/**
 * 处理搜索
 */
const handleSearch = () => {
  emit('update:selected-member-for-records', selectedMember.value)
  emit('update:date-range', {
    startTime: localDateRange.startTime,
    endTime: localDateRange.endTime
  })
  emit('search-records')
}

/**
 * 处理重置
 */
const handleReset = () => {
  selectedMember.value = ''
  localDateRange.startTime = ''
  localDateRange.endTime = ''
  emit('update:selected-member-for-records', '')
  emit('update:date-range', { startTime: '', endTime: '' })
  emit('reset-date-filter')
}

/**
 * 处理页码变化
 */
const handlePageChange = (page) => {
  emit('change-page', page)
}

/**
 * 切换成员记录
 */
const toggleMemberRecords = (member) => {
  emit('toggle-member-records', member)
}
</script>

<style scoped>
.plan-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background-color: var(--white);
  border-radius: 25px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

/* 头部样式 - 改为纯白色不透明背景 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 25px;
  border-bottom: 3px solid;
  border-radius: 25px 25px 0 0;
  position: sticky;
  top: 0;
  background-color: var(--white);
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-info {
  display: flex;
  gap: 15px;
  flex: 1;
}

.plan-icon {
  width: 60px;
  height: 60px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  flex-shrink: 0;
}

.plan-title {
  flex: 1;
}

.plan-title h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-dark);
  margin: 0 0 5px 0;
}

.plan-reason {
  font-size: 14px;
  color: var(--text-light);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-light);
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* 内容区域 */
.modal-body {
  padding: 25px;
}

/* 概览区域 */
.overview-section {
  margin-bottom: 25px;
}

.overview-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 12px;
}

.overview-item i {
  font-size: 28px;
  color: var(--accent-color);
}

.overview-text {
  display: flex;
  flex-direction: column;
}

.overview-text .label {
  font-size: 12px;
  color: var(--text-light);
}

.overview-text .value {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
}

.progress-wrapper {
  margin-top: 10px;
}

.progress-bar-large {
  height: 12px;
  background-color: rgba(128, 164, 146, 0.2);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill-large {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s;
}

.progress-status {
  text-align: center;
}

.completed-badge {
  color: var(--success-color);
  font-size: 14px;
  font-weight: 500;
}

.completed-badge i {
  margin-right: 5px;
}

.expired-badge {
  color: #e74c3c;
  font-size: 14px;
  font-weight: 500;
}

.expired-badge i {
  margin-right: 5px;
}

.active-badge {
  color: #f39c12;
  font-size: 14px;
  font-weight: 500;
}

.active-badge i {
  margin-right: 5px;
}

/* 描述区域 */
.description-section {
  margin-bottom: 25px;
  padding: 15px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 12px;
}

.description-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.description-section p {
  font-size: 14px;
  color: var(--text-dark);
  line-height: 1.5;
  margin: 0;
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--secondary-color);
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  font-size: 14px;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.tab-btn i {
  font-size: 16px;
}

.tab-btn.active {
  color: var(--accent-color);
  font-weight: 500;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--accent-color);
}

.tab-btn:hover:not(.active) {
  color: var(--accent-color);
}

/* 成员列表区域 */
.members-section {
  margin-top: 10px;
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.members-stats {
  display: flex;
  gap: 15px;
  font-size: 14px;
  color: var(--text-light);
}

.total-amount {
  font-weight: 600;
  color: var(--accent-color);
}

.add-money-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border: none;
  border-radius: 25px;
  padding: 8px 20px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.add-money-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(128, 164, 146, 0.3);
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 成员包装器 */
.member-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 成员卡片 */
.member-card {
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 15px;
  transition: all 0.3s;
  position: relative;
}

.member-card:hover {
  transform: translateX(5px);
  background-color: rgba(213, 235, 225, 0.2);
}

.member-card.creator {
  border-left: 3px solid #f39c12;
  background: linear-gradient(90deg, rgba(243, 156, 18, 0.05) 0%, rgba(213, 235, 225, 0.1) 100%);
}

.member-card.deleted-member {
  opacity: 0.6;
  background-color: #f8f9fa;
}

.member-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin-right: 15px;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.creator-badge {
  font-size: 12px;
  color: #f39c12;
  background-color: rgba(243, 156, 18, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.deleted-badge {
  font-size: 12px;
  color: #95a5a6;
  background-color: rgba(149, 165, 166, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.member-amount {
  font-size: 14px;
  color: var(--accent-color);
  font-weight: 500;
  margin-bottom: 3px;
}

.percentage {
  font-size: 12px;
  color: var(--text-light);
  font-weight: normal;
}

.member-join-time {
  font-size: 12px;
  color: var(--text-light);
}

.view-records-btn {
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  color: var(--text-light);
}

.view-records-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--accent-color);
}

/* 成员记录容器 - 显示在成员卡片下方 */
.member-records-container {
  margin-left: 65px;
  padding: 15px;
  background-color: rgba(213, 235, 225, 0.05);
  border-radius: 12px;
  border-left: 3px solid var(--accent-color);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.member-records-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent-color);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--secondary-color);
}

.records-count {
  font-size: 12px;
  color: var(--text-light);
  font-weight: normal;
}

/* 空记录小样式 */
.empty-records-small {
  text-align: center;
  padding: 20px;
  color: var(--text-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-records-small i {
  font-size: 32px;
  color: var(--secondary-color);
}

.empty-records-small span {
  font-size: 13px;
}

/* 成员记录列表 */
.member-records-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.record-item {
  padding: 12px;
  background-color: var(--white);
  border-radius: 10px;
  border: 1px solid var(--secondary-color);
  transition: all 0.2s;
}

.record-item.record-deleted {
  opacity: 0.6;
  background-color: #f8f9fa;
}

.record-item:hover {
  transform: translateX(3px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.record-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.record-amount .amount {
  font-size: 16px;
  font-weight: 600;
  color: var(--success-color);
}

.record-deleted .record-amount .amount {
  color: #95a5a6;
  text-decoration: line-through;
}

.record-time {
  font-size: 12px;
  color: var(--text-light);
}

.record-note {
  font-size: 13px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--secondary-color);
}

.record-note i {
  font-size: 12px;
  color: var(--accent-color);
}

.record-deleted-badge {
  font-size: 11px;
  color: #e74c3c;
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding-top: 5px;
}

/* 存钱记录区域 */
.records-section {
  margin-top: 10px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 12px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 120px;
}

.filter-group label {
  font-size: 12px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 5px;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid var(--secondary-color);
  border-radius: 8px;
  font-size: 13px;
  background-color: var(--white);
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.search-btn,
.reset-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 5px;
}

.search-btn {
  background-color: var(--accent-color);
  color: white;
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(128, 164, 146, 0.3);
}

.reset-btn {
  background-color: #f0f0f0;
  color: var(--text-light);
}

.reset-btn:hover {
  background-color: #e0e0e0;
}

.records-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  padding: 10px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 8px;
  font-size: 13px;
}

.normal-count {
  color: var(--success-color);
}

.deleted-count {
  color: #e74c3c;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.record-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: rgba(213, 235, 225, 0.05);
  border-radius: 12px;
  transition: all 0.3s;
}

.record-card:hover {
  background-color: rgba(213, 235, 225, 0.1);
  transform: translateX(3px);
}

.record-card.deleted-record {
  opacity: 0.6;
  background-color: #f8f9fa;
}

.record-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.record-content {
  flex: 1;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.record-member {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-dark);
}

.record-amount {
  font-size: 16px;
  font-weight: 600;
  color: var(--success-color);
}

.deleted-record .record-amount {
  color: #95a5a6;
  text-decoration: line-through;
}

.record-time {
  font-size: 11px;
  color: var(--text-light);
  margin-bottom: 5px;
}

.record-note {
  font-size: 12px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
}

.record-deleted-info {
  font-size: 11px;
  color: #e74c3c;
  margin-top: 5px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 加载和空状态 */
.loading-records {
  text-align: center;
  padding: 40px;
  color: var(--text-light);
}

.loading-records i {
  font-size: 30px;
  margin-bottom: 10px;
  display: block;
}

.empty-records {
  text-align: center;
  padding: 40px;
  color: var(--text-light);
}

.empty-records i {
  font-size: 48px;
  color: var(--secondary-color);
  margin-bottom: 15px;
  display: block;
}

.empty-records p {
  margin: 5px 0;
}

.hint-text {
  font-size: 12px;
  color: var(--text-light);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--secondary-color);
}

.page-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--secondary-color);
  border-radius: 50%;
  background: none;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled) {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: var(--text-light);
}

/* 底部按钮 */
.modal-footer {
  padding: 20px 25px;
  border-top: 1px solid var(--secondary-color);
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  position: sticky;
  bottom: 0;
  background-color: var(--white);
  border-radius: 0 0 25px 25px;
}

.btn-add-money {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border: none;
  border-radius: 25px;
  padding: 10px 25px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-add-money:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(128, 164, 146, 0.3);
}

.btn-close {
  background-color: #f0f0f0;
  border: none;
  border-radius: 25px;
  padding: 10px 25px;
  color: var(--text-light);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-close:hover {
  background-color: #e0e0e0;
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 响应式 */
@media (max-width: 600px) {
  .modal-content {
    max-width: 95%;
  }

  .overview-card {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }

  .filter-actions {
    justify-content: flex-end;
  }

  .members-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .member-card {
    flex-wrap: wrap;
  }

  .member-info {
    width: calc(100% - 65px);
  }

  .view-records-btn {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
  }

  .member-records-container {
    margin-left: 0;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-footer button {
    width: 100%;
  }
}
</style>