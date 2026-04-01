<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content saving-records-modal">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="header-left">
          <i class="fas fa-piggy-bank" style="color: #80A492;"></i>
          <h3>存钱记录</h3>
        </div>
        <button class="modal-close" @click="handleClose">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 标签页切换 -->
      <div class="record-tabs">
        <button
            class="tab-btn"
            :class="{ active: activeTab === 'personal' }"
            @click="switchTab('personal')"
        >
          <i class="fas fa-user"></i>
          <span>个人存钱</span>
          <span class="tab-count" v-if="personalPlans.length > 0">{{ personalPlans.length }}</span>
        </button>
        <button
            class="tab-btn"
            :class="{ active: activeTab === 'group' }"
            @click="switchTab('group')"
        >
          <i class="fas fa-users"></i>
          <span>多人存钱</span>
          <span class="tab-count" v-if="groupPlans.length > 0">{{ groupPlans.length }}</span>
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>加载记录中...</p>
      </div>

      <!-- 个人存钱计划列表 -->
      <div v-else-if="activeTab === 'personal'" class="plans-container">
        <div v-if="personalPlans.length === 0" class="empty-state">
          <i class="fas fa-coins"></i>
          <p>暂无个人存钱计划</p>
          <p class="hint-text">点击"新增计划"开始存钱吧</p>
        </div>
        <div v-else class="plans-list">
          <div
              v-for="plan in personalPlans"
              :key="plan.id"
              class="plan-card"
              :class="{
                expanded: expandedPersonalPlanId === plan.id,
                'deleted-plan': plan.deleted === 1
              }"
          >
            <!-- 计划卡片头部 - 点击展开/收起 -->
            <div class="plan-header" @click="togglePersonalPlan(plan.id)">
              <div class="plan-header-left">
                <div class="plan-icon" :style="{ backgroundColor: plan.color || '#2ecc71', opacity: plan.deleted === 1 ? 0.6 : 1 }">
                  <i :class="plan.icon || getIconByType(plan.type)"></i>
                </div>
                <div class="plan-info">
                  <div class="plan-name">
                    {{ plan.name }}
                    <span v-if="plan.deleted === 1" class="deleted-badge">已删除</span>
                  </div>
                  <div class="plan-meta">
                    <span class="plan-type">{{ plan.type || '日常储蓄' }}</span>
                    <span class="plan-deadline" v-if="plan.deadline">
                      <i class="far fa-calendar-alt"></i>
                      {{ formatDate(plan.deadline) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="plan-header-right">
                <div class="plan-progress-info">
                  <span class="progress-text">{{ plan.progress || 0 }}%</span>
                  <div class="progress-bar-small">
                    <div class="progress-fill-small" :style="{ width: (plan.progress || 0) + '%', backgroundColor: plan.color || '#2ecc71', opacity: plan.deleted === 1 ? 0.6 : 1 }"></div>
                  </div>
                </div>
                <div class="plan-amount">
                  <span class="amount-current">¥{{ formatNumber(plan.currentAmount) }}</span>
                  <span class="amount-separator">/</span>
                  <span class="amount-target">¥{{ formatNumber(plan.targetAmount) }}</span>
                </div>
                <i class="expand-icon" :class="expandedPersonalPlanId === plan.id ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
              </div>
            </div>

            <!-- 展开的存钱记录列表 -->
            <div v-if="expandedPersonalPlanId === plan.id" class="plan-records-wrapper">
              <div v-if="plan.recordsLoading" class="records-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>加载记录中...</span>
              </div>
              <div v-else-if="plan.records && plan.records.length === 0" class="no-records">
                <i class="fas fa-coins"></i>
                <span>暂无存钱记录</span>
                <span class="hint-small">点击"存钱"按钮开始记录</span>
              </div>
              <div v-else class="records-scroll-area">
                <div class="records-list">
                  <div
                      v-for="record in plan.records"
                      :key="record.id"
                      class="record-item"
                      :class="{ 'record-deleted': record.deleted === 1 }"
                      @click.stop="showRecordDetail(record, plan)"
                  >
                    <div class="record-time">
                      <i class="far fa-clock"></i>
                      {{ formatDateTime(record.depositTime) }}
                    </div>
                    <div class="record-amount" :class="{ 'positive': record.deleted !== 1, 'deleted-amount': record.deleted === 1 }">
                      {{ record.deleted === 1 ? '已删除' : '+¥' + formatNumber(record.amount) }}
                    </div>
                    <div v-if="record.note" class="record-note">
                      <i class="fas fa-comment"></i>
                      {{ record.note.length > 30 ? record.note.slice(0, 30) + '...' : record.note }}
                    </div>
                    <div class="record-balance">
                      余额: ¥{{ formatNumber(record.afterAmount) }}
                    </div>
                    <i class="fas fa-chevron-right record-detail-icon"></i>
                  </div>
                </div>
                <div class="records-footer" v-if="plan.records && plan.records.length > 0">
                  <span class="records-count">共 {{ plan.records.length }} 条记录</span>
                  <span class="records-total">累计存入 ¥{{ formatNumber(plan.totalDeposited) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 多人存钱计划列表 -->
      <div v-else-if="activeTab === 'group'" class="plans-container">
        <div v-if="groupPlans.length === 0" class="empty-state">
          <i class="fas fa-users"></i>
          <p>暂无多人存钱计划</p>
          <p class="hint-text">创建一个多人计划邀请好友一起存钱吧</p>
        </div>
        <div v-else class="plans-list">
          <div
              v-for="plan in groupPlans"
              :key="plan.id"
              class="plan-card group-plan-card"
              :class="{
                expanded: expandedGroupPlanId === plan.id,
                'deleted-plan': plan.deleted === 1,
                'current-user-exited': plan.currentUserDeleted === true
              }"
          >
            <!-- 计划卡片头部 - 点击展开/收起 -->
            <div class="plan-header" @click="toggleGroupPlan(plan.id)">
              <div class="plan-header-left">
                <div class="plan-icon" :style="{ backgroundColor: plan.color || '#3498db', opacity: (plan.deleted === 1 || plan.currentUserDeleted === true) ? 0.6 : 1 }">
                  <i :class="plan.icon || getIconByType(plan.type)"></i>
                </div>
                <div class="plan-info">
                  <div class="plan-name">
                    {{ plan.name }}
                    <span v-if="plan.deleted === 1" class="deleted-badge">已删除</span>
                    <span v-else-if="plan.currentUserDeleted === true" class="exited-badge">已退出</span>
                  </div>
                  <div class="plan-meta">
                    <span class="plan-type">{{ plan.type || '日常储蓄' }}</span>
                    <span class="plan-member-count">
                      <i class="fas fa-users"></i>
                      {{ getActiveMemberCount(plan.members) }}/{{ plan.members?.length || 0 }}人
                    </span>
                    <span class="plan-deadline" v-if="plan.deadline">
                      <i class="far fa-calendar-alt"></i>
                      {{ formatDate(plan.deadline) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="plan-header-right">
                <div class="plan-progress-info">
                  <span class="progress-text">{{ plan.progress || 0 }}%</span>
                  <div class="progress-bar-small">
                    <div class="progress-fill-small" :style="{ width: (plan.progress || 0) + '%', backgroundColor: plan.color || '#3498db', opacity: (plan.deleted === 1 || plan.currentUserDeleted === true) ? 0.6 : 1 }"></div>
                  </div>
                </div>
                <div class="plan-amount">
                  <span class="amount-current">¥{{ formatNumber(plan.currentAmount) }}</span>
                  <span class="amount-separator">/</span>
                  <span class="amount-target">¥{{ formatNumber(plan.targetAmount) }}</span>
                </div>
                <i class="expand-icon" :class="expandedGroupPlanId === plan.id ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
              </div>
            </div>

            <!-- 展开的存钱记录列表 - 固定高度滚动区域 -->
            <div v-if="expandedGroupPlanId === plan.id" class="plan-records-wrapper">
              <div v-if="plan.recordsLoading" class="records-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>加载记录中...</span>
              </div>
              <div v-else-if="plan.records && plan.records.length === 0" class="no-records">
                <i class="fas fa-coins"></i>
                <span>{{ plan.currentUserDeleted === true ? '您已退出此计划，暂无存钱记录' : '暂无存钱记录' }}</span>
                <span class="hint-small" v-if="!plan.currentUserDeleted">成员存入后会显示在这里</span>
              </div>
              <div v-else class="records-scroll-area">
                <div class="records-list group-records-list">
                  <div
                      v-for="record in plan.records"
                      :key="record.id"
                      class="record-item group-record"
                      :class="{ 'record-deleted': record.deleted === 1 }"
                      @click.stop="showRecordDetail(record, plan)"
                  >
                    <div class="record-member">
                      <span class="member-avatar" :style="{ backgroundColor: getMemberColor(record.memberId) + '20', color: getMemberColor(record.memberId), opacity: record.deleted === 1 ? 0.6 : 1 }">
                        {{ (record.memberName || '用户').charAt(0).toUpperCase() }}
                      </span>
                      <span class="member-name" :class="{ 'deleted-text': record.deleted === 1 }">{{ record.memberName }}</span>
                      <span v-if="record.deleted === 1" class="deleted-badge-small">已退出</span>
                    </div>
                    <div class="record-time">
                      <i class="far fa-clock"></i>
                      {{ formatDateTime(record.depositTime) }}
                    </div>
                    <div class="record-amount" :class="{ 'positive': record.deleted !== 1, 'deleted-amount': record.deleted === 1 }">
                      {{ record.deleted === 1 ? '已删除' : '+¥' + formatNumber(record.amount) }}
                    </div>
                    <div v-if="record.note" class="record-note">
                      <i class="fas fa-comment"></i>
                      {{ record.note.length > 30 ? record.note.slice(0, 30) + '...' : record.note }}
                    </div>
                    <div class="record-balance">
                      累计: ¥{{ formatNumber(record.afterAmount) }}
                    </div>
                    <i class="fas fa-chevron-right record-detail-icon"></i>
                  </div>
                </div>
                <div class="records-footer" v-if="plan.records && plan.records.length > 0">
                  <span class="records-count">共 {{ plan.records.length }} 条记录</span>
                  <span class="records-total">累计存入 ¥{{ formatNumber(plan.totalDeposited) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 记录详情弹窗 -->
    <div v-if="showDetailModal" class="detail-modal-overlay" @click.self="closeDetailModal">
      <div class="detail-modal-content" :class="[currentDetailPlan?.type === 'personal' ? 'personal-detail' : 'group-detail', { 'deleted-detail': selectedRecord?.deleted === 1 }]">
        <div class="detail-header">
          <div class="detail-header-left">
            <div class="detail-plan-icon" :style="{ backgroundColor: currentDetailPlan?.color || (currentDetailPlan?.type === 'personal' ? '#2ecc71' : '#3498db'), opacity: selectedRecord?.deleted === 1 ? 0.6 : 1 }">
              <i :class="currentDetailPlan?.icon || getIconByType(currentDetailPlan?.type)"></i>
            </div>
            <div>
              <h3>{{ currentDetailPlan?.name }}</h3>
              <p class="detail-plan-type">{{ currentDetailPlan?.type || '日常储蓄' }}</p>
            </div>
          </div>
          <button class="detail-close" @click="closeDetailModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="detail-body" v-if="selectedRecord">
          <!-- 状态提示 -->
          <div v-if="selectedRecord.deleted === 1" class="deleted-status-card">
            <i class="fas fa-trash-alt"></i>
            <span>此记录已被删除/退出</span>
          </div>

          <!-- 存入信息 -->
          <div class="detail-amount-card" :class="{ 'deleted-card': selectedRecord.deleted === 1 }">
            <span class="amount-label">{{ selectedRecord.deleted === 1 ? '删除金额' : '存入金额' }}</span>
            <span class="amount-value" :class="selectedRecord.deleted === 1 ? 'deleted-amount' : 'positive'">
              {{ selectedRecord.deleted === 1 ? '已删除' : '+¥' + formatNumber(selectedRecord.amount) }}
            </span>
            <span class="amount-time">{{ formatFullDateTime(selectedRecord.depositTime) }}</span>
          </div>

          <!-- 成员信息（多人） -->
          <div class="detail-info-row" v-if="selectedRecord.memberName">
            <div class="info-icon">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="info-content">
              <span class="info-label">存入成员</span>
              <span class="info-value" :class="{ 'deleted-text': selectedRecord.deleted === 1 }">{{ selectedRecord.memberName }}</span>
              <span v-if="selectedRecord.deleted === 1" class="deleted-badge-small">已退出</span>
            </div>
          </div>

          <!-- 金额变化 -->
          <div class="detail-compare-row" :class="{ 'deleted-row': selectedRecord.deleted === 1 }">
            <div class="compare-item">
              <span class="compare-label">存前金额</span>
              <span class="compare-value">¥{{ formatNumber(selectedRecord.beforeAmount || 0) }}</span>
            </div>
            <div class="compare-arrow">
              <i class="fas fa-arrow-right"></i>
            </div>
            <div class="compare-item">
              <span class="compare-label">存后金额</span>
              <span class="compare-value highlight">¥{{ formatNumber(selectedRecord.afterAmount) }}</span>
            </div>
          </div>

          <!-- 备注 -->
          <div class="detail-info-row full-width" v-if="selectedRecord.note">
            <div class="info-icon">
              <i class="fas fa-comment"></i>
            </div>
            <div class="info-content">
              <span class="info-label">备注</span>
              <span class="info-value note-text">{{ selectedRecord.note }}</span>
            </div>
          </div>
        </div>

        <div class="detail-footer">
          <button class="detail-btn" @click="closeDetailModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
  savingService,
  personalSavingCache,
  groupSavingCache,
  authHelperService,
  notificationService
} from '@/services'

import indexedDBService from '@/services/db/indexed-db.service.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close', 'view-plan'])

// ==================== 状态 ====================
const currentUser = ref(null)
const activeTab = ref('personal')
const loading = ref(false)

// 个人计划数据（带记录）
const personalPlans = ref([])
const expandedPersonalPlanId = ref(null)

// 多人计划数据（带记录）
const groupPlans = ref([])
const expandedGroupPlanId = ref(null)

// 详情弹窗
const showDetailModal = ref(false)
const selectedRecord = ref(null)
const currentDetailPlan = ref(null)

// ==================== 工具函数 ====================
const getIconByType = (type) => {
  const icons = {
    '日常储蓄': 'fas fa-coins',
    '旅行基金': 'fas fa-plane',
    '教育基金': 'fas fa-graduation-cap',
    '购房基金': 'fas fa-home',
    '购车基金': 'fas fa-car',
    '应急资金': 'fas fa-first-aid',
    '其他': 'fas fa-star'
  }
  return icons[type] || 'fas fa-piggy-bank'
}

const getColorByType = (type) => {
  const colors = {
    '日常储蓄': '#2ecc71',
    '旅行基金': '#3498DB',
    '教育基金': '#9B59B6',
    '购房基金': '#E74C3C',
    '购车基金': '#F39C12',
    '应急资金': '#E67E22',
    '其他': '#80A492'
  }
  return colors[type] || '#80A492'
}

const getMemberColor = (memberId) => {
  const colors = ['#2ecc71', '#3498db', '#9b59b6', '#f39c12', '#e74c3c', '#1abc9c', '#e67e22', '#95a5a6']
  if (!memberId) return colors[0]
  const index = String(memberId).length % colors.length
  return colors[index]
}

const formatNumber = (num) => {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return dateTimeStr
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatFullDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  if (isNaN(date.getTime())) return dateTimeStr
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * 获取活跃成员数量（未删除的）
 */
const getActiveMemberCount = (members) => {
  if (!members) return 0
  return members.filter(m => m.deleted !== 1).length
}

// ==================== 获取当前用户 ====================
const fetchCurrentUser = async () => {
  const token = authHelperService.getToken()
  const userFromStorage = authHelperService.getCurrentUser()

  if (userFromStorage && userFromStorage.id) {
    currentUser.value = {
      id: userFromStorage.id,
      username: userFromStorage.username || userFromStorage.nickname || '用户',
      avatar: userFromStorage.avatar || '👤'
    }
    savingService.setCurrentUser(currentUser.value.id)
    console.log('【SavingRecords】当前用户:', currentUser.value.id)
    return
  }

  const savedUserId = localStorage.getItem('userId')
  if (savedUserId) {
    currentUser.value = {
      id: parseInt(savedUserId),
      username: '用户',
      avatar: '👤'
    }
    savingService.setCurrentUser(currentUser.value.id)
    console.log('【SavingRecords】从localStorage获取用户:', currentUser.value.id)
  }
}

// ==================== 加载个人计划及记录（包含已删除的计划） ====================
const loadPersonalPlansWithRecords = async () => {
  if (!currentUser.value?.id) return []

  try {
    await personalSavingCache.init(currentUser.value.id)
    // 🔥 获取所有计划，不过滤 deleted
    const allPlans = await personalSavingCache.getAllPlans(currentUser.value.id)
    // 包括已删除的计划
    const plans = allPlans

    const plansWithRecords = []
    for (const plan of plans) {
      // 🔥 直接使用 plan.records，不再调用 getDepositRecords
      const allRecords = plan.records || []

      const records = allRecords
      const totalDeposited = records.reduce((sum, r) => sum + (r.amount || 0), 0)

      plansWithRecords.push({
        ...plan,
        progress: plan.targetAmount > 0 ? Math.round((plan.currentAmount / plan.targetAmount) * 100) : 0,
        icon: plan.icon || getIconByType(plan.type),
        color: plan.color || getColorByType(plan.type),
        records: records.map(r => ({
          ...r,
          depositTime: r.depositTime || r.createdAt,
          afterAmount: r.afterAmount,
          beforeAmount: r.beforeAmount,
          deleted: r.deleted || 0
        })),
        recordsLoading: false,
        totalDeposited: totalDeposited,
        type: 'personal',
        deleted: plan.deleted || 0
      })
    }

    console.log('个人计划加载成功:', plansWithRecords.length)
    return plansWithRecords
  } catch (error) {
    console.error('加载个人计划失败:', error)
    return []
  }
}

// ==================== 加载多人计划及记录（包含已删除的计划和成员） ====================
const loadGroupPlansWithRecords = async () => {
  if (!currentUser.value?.id) return []

  try {
    // 初始化多人存钱缓存服务
    await groupSavingCache.init(currentUser.value.id)

    // 🔥 获取多人计划列表（包含已删除的）
    const response = await savingService.getGroupSavingsList({}, false)
    const plans = response.code === 200 ? (response.data || []) : []

    console.log('多人计划数量:', plans.length)

    const plansWithRecords = []
    for (const plan of plans) {
      // 获取该计划的存钱记录
      const allRecords = await indexedDBService.getAll('saving_deposit_records_cache')
      const planRecords = allRecords.filter(r => r.groupSavingId === plan.id)

      // 🔥 获取当前用户在该计划中的成员状态
      const currentUserMember = plan.members?.find(m => m.userId === currentUser.value?.id)
      const currentUserDeleted = currentUserMember?.deleted === 1
      const currentUserAmount = currentUserMember?.amount || 0

      // 🔥 过滤记录：如果用户已退出，只显示自己的存钱记录
      let filteredRecords = planRecords
      if (currentUserDeleted) {
        // 用户已退出，只显示自己的存钱记录
        filteredRecords = planRecords.filter(r => r.memberId === currentUser.value?.id)
        console.log(`用户已退出计划 ${plan.name}，只显示自己的 ${filteredRecords.length} 条记录`)
      }

      const records = filteredRecords.map(r => ({
        id: r.originalId || r.id,
        memberId: r.memberId,
        memberName: r.memberName,
        amount: r.amount,
        note: r.note,
        createTime: r.depositTime,
        depositTime: r.depositTime,
        afterAmount: r.afterAmount,
        beforeAmount: r.beforeAmount,
        deleted: r.deleted || 0,
        deletedAt: r.deletedAt
      }))

      const totalDeposited = records.reduce((sum, r) => sum + (r.amount || 0), 0)

      // 🔥 获取成员列表（包含已删除的成员）
      const allMembers = await groupSavingCache.getTableDataById('groupSavingId', plan.id, 'savings_members_cache', true)

      // 🔥 标记当前用户是否已退出
      const isUserExited = currentUserDeleted

      plansWithRecords.push({
        ...plan,
        progress: plan.targetAmount > 0 ? Math.round((plan.currentAmount / plan.targetAmount) * 100) : 0,
        icon: plan.icon || getIconByType(plan.type),
        color: plan.color || getColorByType(plan.type),
        records: records,
        members: allMembers,
        recordsLoading: false,
        totalDeposited: totalDeposited,
        type: 'group',
        deleted: plan.deleted || 0,
        currentUserDeleted: isUserExited,  // 🔥 新增：标记当前用户是否已退出
        currentUserAmount: currentUserAmount  // 🔥 新增：当前用户的已存金额
      })
    }

    console.log('多人计划加载成功:', plansWithRecords.length)
    return plansWithRecords
  } catch (error) {
    console.error('加载多人计划失败:', error)
    return []
  }
}

// ==================== 单独加载多人计划记录 ====================
const loadGroupPlanRecords = async (plan) => {
  if (!plan) return

  plan.recordsLoading = true
  try {
    await groupSavingCache.init(currentUser.value.id)
    const result = await groupSavingCache.getDepositRecords(
        currentUser.value.id,
        plan.id,
        {page: 1, size: 500}
    )

    const allRecords = (result && result.records) ? result.records : []
    // 🔥 包含已删除的记录
    plan.records = allRecords.map(r => ({
      ...r,
      depositTime: r.depositTime || r.createTime,
      afterAmount: r.afterAmount,
      beforeAmount: r.beforeAmount,
      memberName: r.memberName,
      deleted: r.deleted || 0
    }))
    plan.totalDeposited = plan.records.reduce((sum, r) => sum + (r.amount || 0), 0)
    console.log(`加载计划 ${plan.name} 的记录: ${plan.records.length}条`)
  } catch (error) {
    console.error('加载多人计划记录失败:', error)
    plan.records = []
  } finally {
    plan.recordsLoading = false
  }
}

// ==================== 加载所有数据 ====================
const loadAllData = async () => {
  if (!currentUser.value?.id) return

  loading.value = true
  try {
    const [personalData, groupData] = await Promise.all([
      loadPersonalPlansWithRecords(),
      loadGroupPlansWithRecords()
    ])

    personalPlans.value = personalData
    groupPlans.value = groupData

    console.log(`个人计划: ${personalData.length}个, 多人计划: ${groupData.length}个`)
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// ==================== 切换标签页 ====================
const switchTab = async (tab) => {
  activeTab.value = tab
  // 重置展开状态
  if (tab === 'personal') {
    expandedGroupPlanId.value = null
  } else {
    expandedPersonalPlanId.value = null
  }
}

// ==================== 展开/收起个人计划 ====================
const togglePersonalPlan = async (planId) => {
  if (expandedPersonalPlanId.value === planId) {
    expandedPersonalPlanId.value = null
  } else {
    expandedPersonalPlanId.value = planId
  }
}

// ==================== 展开/收起多人计划 ====================
const toggleGroupPlan = async (planId) => {
  if (expandedGroupPlanId.value === planId) {
    expandedGroupPlanId.value = null
  } else {
    expandedGroupPlanId.value = planId
    const plan = groupPlans.value.find(p => p.id === planId)
    // 如果记录还没加载，加载记录
    if (plan && (!plan.records || plan.records.length === 0) && !plan.recordsLoading) {
      await loadGroupPlanRecords(plan)
    }
  }
}

// ==================== 显示记录详情 ====================
const showRecordDetail = (record, plan) => {
  selectedRecord.value = record
  currentDetailPlan.value = plan
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
  currentDetailPlan.value = null
}

// ==================== 关闭弹框 ====================
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// ==================== 监听 ====================
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await fetchCurrentUser()
    if (currentUser.value?.id) {
      await loadAllData()
    }
  }
})
</script>

<style scoped>
.modal-overlay {
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
}

.modal-content {
  background-color: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.saving-records-modal {
  max-width: 800px !important;
  width: 95%;
  padding: 0 !important;
  overflow: hidden !important;
  background-color: #f8fafc;
  border-radius: 20px;
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #D5EBE1;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.header-left i {
  font-size: 24px;
  color: #80A492;
}

.header-left h3 {
  font-size: 20px;
  font-weight: 600;
  color: #80A492;
  margin: 0;
}

.modal-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 24px;
  color: #99BCAC;
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
  color: #80A492;
}

/* 标签页样式 */
.record-tabs {
  display: flex;
  gap: 5px;
  margin: 20px 25px;
  background: white;
  padding: 5px;
  border-radius: 30px;
  border: 1px solid #D5EBE1;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 25px;
  background: transparent;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn.active {
  background: #D5EBE1;
  color: #80A492;
  font-weight: 500;
}

.tab-count {
  background: #e0e0e0;
  color: #666;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 20px;
}

.tab-btn.active .tab-count {
  background: #80A492;
  color: white;
}

/* 计划列表容器 */
.plans-container {
  margin: 0 20px 20px;
  max-height: calc(90vh - 140px);
  overflow-y: auto;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 计划卡片 */
.plan-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.plan-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.group-plan-card {
  border-left: 3px solid #3498db;
}

/* 计划头部 */
.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.plan-header:hover {
  background: rgba(213, 235, 225, 0.3);
}

.plan-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.plan-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  flex-shrink: 0;
}

.plan-info {
  flex: 1;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.plan-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #999;
  flex-wrap: wrap;
}

.plan-type {
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 12px;
}

.plan-member-count i,
.plan-deadline i {
  margin-right: 3px;
}

.plan-header-right {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 180px;
}

.plan-progress-info {
  text-align: center;
  min-width: 55px;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.progress-bar-small {
  width: 50px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.progress-fill-small {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.plan-amount {
  text-align: right;
  font-size: 14px;
  font-weight: 500;
}

.amount-current {
  color: #2ecc71;
  font-weight: 600;
}

.group-plan-card .amount-current {
  color: #3498db;
}

.amount-separator {
  color: #ccc;
  margin: 0 2px;
}

.amount-target {
  color: #999;
}

.expand-icon {
  color: #ccc;
  font-size: 14px;
  transition: transform 0.3s;
}

/* 记录区域 - 固定高度滚动 */
.plan-records-wrapper {
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.records-scroll-area {
  max-height: 320px;
  overflow-y: auto;
  padding: 12px 16px;
}

.records-scroll-area::-webkit-scrollbar {
  width: 6px;
}

.records-scroll-area::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.records-scroll-area::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border-radius: 3px;
}

.records-scroll-area::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.records-loading,
.no-records {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.records-loading i,
.no-records i {
  font-size: 32px;
  color: #B1D5C8;
}

.hint-small {
  font-size: 11px;
  color: #ccc;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.record-item:hover {
  background: #f5f5f5;
  transform: translateX(4px);
}

.group-record {
  flex-wrap: wrap;
}

.record-member {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
}

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.member-name {
  font-size: 13px;
  font-weight: 500;
  color: #666;
}

.record-time {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 100px;
}

.record-amount {
  font-size: 16px;
  font-weight: 700;
  min-width: 100px;
}

.record-amount.positive {
  color: #2ecc71;
}

.record-note {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.record-balance {
  font-size: 11px;
  color: #80A492;
  min-width: 80px;
  text-align: right;
}

.record-detail-icon {
  color: #ccc;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.record-item:hover .record-detail-icon {
  opacity: 1;
}

.records-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #999;
}

.records-total {
  color: #2ecc71;
  font-weight: 500;
}

.group-plan-card .records-total {
  color: #3498db;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.loading-state i {
  font-size: 40px;
  color: #80A492;
  margin-bottom: 15px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state i {
  font-size: 60px;
  color: #B1D5C8;
  margin-bottom: 15px;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

.hint-text {
  font-size: 12px;
  color: #B1D5C8;
  margin-top: 5px !important;
}

/* 详情弹窗 - 淡色风格 */
.detail-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 3100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.detail-modal-content {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 380px;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.detail-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-plan-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.detail-header-left h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #333;
}

.detail-plan-type {
  font-size: 11px;
  color: #999;
  margin: 0;
}

.detail-close {
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.detail-close:hover {
  background: rgba(0, 0, 0, 0.05);
}

.detail-body {
  padding: 20px;
}

.detail-amount-card {
  text-align: center;
  padding: 20px;
  background: rgba(46, 204, 113, 0.05);
  border-radius: 16px;
  margin-bottom: 20px;
}

.personal-detail .detail-amount-card {
  background: rgba(46, 204, 113, 0.05);
}

.group-detail .detail-amount-card {
  background: rgba(52, 152, 219, 0.05);
}

.amount-label {
  font-size: 12px;
  color: #999;
  display: block;
  margin-bottom: 8px;
}

.amount-value {
  font-size: 28px;
  font-weight: 700;
  display: block;
  margin-bottom: 8px;
}

.amount-value.positive {
  color: #2ecc71;
}

.amount-time {
  font-size: 11px;
  color: #999;
}

.detail-info-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-info-row.full-width {
  flex-direction: column;
}

.info-icon {
  width: 32px;
  color: #999;
  font-size: 16px;
  text-align: center;
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 11px;
  color: #999;
  display: block;
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.note-text {
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 8px;
  line-height: 1.4;
  word-break: break-word;
}

.detail-compare-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 12px;
  margin: 15px 0;
}

.compare-item {
  text-align: center;
  flex: 1;
}

.compare-label {
  font-size: 11px;
  color: #999;
  display: block;
  margin-bottom: 5px;
}

.compare-value {
  font-size: 16px;
  font-weight: 600;
  color: #555;
}

.compare-value.highlight {
  color: #2ecc71;
  font-weight: 700;
}

.group-detail .compare-value.highlight {
  color: #3498db;
}

.compare-arrow {
  color: #ccc;
  padding: 0 10px;
}

.detail-footer {
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;
}

.detail-btn {
  padding: 10px 30px;
  background: #f5f5f5;
  border: none;
  border-radius: 25px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

.detail-btn:hover {
  background: #e8e8e8;
}

/* 已删除计划的样式 */
.deleted-plan {
  opacity: 0.8;
  background: #f8f9fa;
}

.deleted-plan .plan-header {
  background: #f8f9fa;
}

.deleted-badge {
  display: inline-block;
  background: #e74c3c;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
  vertical-align: middle;
}

.deleted-badge-small {
  display: inline-block;
  background: #e74c3c;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
}

/* 已退出计划的样式 */
.current-user-exited {
  opacity: 0.8;
  background: #fff8e8;
  border-left: 5px solid #f39c12;
}

.current-user-exited .plan-header {
  background: #fff8e8;
}

.current-user-exited .plan-icon {
  filter: grayscale(0.3);
}

.exited-badge {
  display: inline-block;
  background: #f39c12;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
  vertical-align: middle;
}

/* 已退出计划的记录显示 */
.current-user-exited .records-scroll-area {
  background: #fffaf0;
}

.current-user-exited .record-item {
  background: #ffffff;
  border-left: 3px solid #f39c12;
}

/* 已删除记录的样式 */
.record-item.record-deleted {
  background: #f8f9fa;
  opacity: 0.7;
}

.record-item.record-deleted:hover {
  background: #f0f0f0;
}

.record-deleted .record-amount {
  color: #999;
  font-style: italic;
}

.record-deleted .record-amount.positive {
  color: #999;
}

.deleted-amount {
  color: #999 !important;
  text-decoration: line-through;
}

.deleted-text {
  color: #999;
  text-decoration: line-through;
}

/* 已删除记录详情样式 */
.deleted-status-card {
  background: #fff3cd;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #856404;
  font-size: 14px;
}

.deleted-status-card i {
  font-size: 18px;
}

.deleted-card {
  background: #f8f9fa !important;
  border: 1px solid #e0e0e0;
}

.deleted-row {
  background: #f8f9fa;
}

.deleted-detail .detail-amount-card {
  background: #f8f9fa;
}

.deleted-detail .detail-amount-card .amount-value {
  color: #999;
  text-decoration: line-through;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .plan-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .plan-header-right {
    width: 100%;
    justify-content: space-between;
  }

  .record-item {
    flex-wrap: wrap;
  }

  .record-time,
  .record-amount,
  .record-balance {
    width: auto;
  }

  .record-note {
    width: 100%;
    order: 1;
    margin-top: 8px;
  }

  .records-scroll-area {
    max-height: 280px;
  }
}
</style>