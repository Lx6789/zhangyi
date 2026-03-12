<template>
  <div class="plan-detail-modal" @click.self="$emit('close')">
    <div class="modal-content detail-modal">
      <!-- 头部 -->
      <div class="modal-header">
        <i class="fas fa-chart-line" style="color: #80A492;"></i>
        <h3>计划详情 - {{ selectedPlan?.name }}</h3>
        <button class="modal-close" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 离线提示（弹窗内） -->
      <div v-if="!isOnline" class="offline-banner small">
        <i class="fas fa-wifi-slash"></i>
        <span>当前处于离线模式，显示缓存数据</span>
      </div>

      <!-- 内容区域 -->
      <div class="modal-body">
        <!-- 日期范围显示 -->
        <div class="date-range-badge" v-if="selectedPlan?.deadline">
          <i class="fas fa-calendar-alt"></i>
          <span>截止日期: {{ formatDate(selectedPlan.deadline) }}</span>
        </div>

        <!-- 关键指标卡片 -->
        <div class="stats-grid">
          <div class="stat-card target">
            <div class="stat-icon">
              <i class="fas fa-bullseye"></i>
            </div>
            <div class="stat-info">
              <span class="stat-label">目标金额</span>
              <span class="stat-value">¥{{ formatNumber(selectedPlan?.targetAmount) }}</span>
            </div>
          </div>

          <div class="stat-card current">
            <div class="stat-icon">
              <i class="fas fa-piggy-bank"></i>
            </div>
            <div class="stat-info">
              <span class="stat-label">已存金额</span>
              <span class="stat-value">¥{{ formatNumber(selectedPlan?.currentAmount) }}</span>
            </div>
          </div>

          <div class="stat-card progress">
            <div class="stat-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <div class="stat-info">
              <span class="stat-label">完成进度</span>
              <span class="stat-value">{{ selectedPlan?.progress }}%</span>
            </div>
          </div>

          <div class="stat-card members">
            <div class="stat-icon">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-info">
              <span class="stat-label">参与成员</span>
              <span class="stat-value">{{ selectedPlan?.members?.length || 0 }}人</span>
            </div>
          </div>
        </div>

        <!-- 计划信息卡片 -->
        <div class="analysis-card">
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">计划名称</span>
                <span class="info-value">{{ selectedPlan?.name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">计划类型</span>
                <span class="info-value">
                  <span class="badge" :style="{ backgroundColor: selectedPlan?.color + '20', color: selectedPlan?.color }">
                    <i :class="selectedPlan?.icon"></i> {{ selectedPlan?.type }}
                  </span>
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">创建者</span>
                <span class="info-value">{{ selectedPlan?.creatorName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">创建时间</span>
                <span class="info-value">{{ formatDate(selectedPlan?.createTime) }}</span>
              </div>
            </div>

            <div class="info-item full-width">
              <span class="info-label">计划描述</span>
              <p class="info-description">{{ selectedPlan?.reason || '暂无描述' }}</p>
            </div>

            <!-- 进度条 -->
            <div class="progress-section">
              <div class="progress-label">
                <span>进度</span>
                <span>{{ selectedPlan?.progress }}%</span>
              </div>
              <div class="progress-track">
                <div
                    class="progress-fill"
                    :style="{
                      width: selectedPlan?.progress + '%',
                      backgroundColor: selectedPlan?.color || '#80A492'
                    }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 标签页导航 -->
        <div class="detail-tabs">
          <button
              class="tab-btn"
              :class="{ active: activeRecordsTab === 'members' }"
              @click="$emit('update:active-records-tab', 'members')"
          >
            <i class="fas fa-users"></i>
            <span>成员列表</span>
          </button>
          <button
              class="tab-btn"
              :class="{ active: activeRecordsTab === 'all' }"
              @click="$emit('update:active-records-tab', 'all')"
          >
            <i class="fas fa-history"></i>
            <span>存钱记录</span>
          </button>
        </div>

        <!-- 成员列表标签页 -->
        <div v-if="activeRecordsTab === 'members'" class="tab-content">
          <!-- 成员统计卡片 -->
          <div class="members-stats">
            <div class="stat-chip" v-for="stat in memberStats" :key="stat.label">
              <span class="chip-label">{{ stat.label }}</span>
              <span class="chip-value">{{ stat.value }}</span>
            </div>
          </div>

          <!-- 成员列表 -->
          <div class="members-list">
            <div
                v-for="member in selectedPlan?.members || []"
                :key="member.userId"
                class="member-card"
                :class="{ 'creator-card': member.isCreator }"
            >
              <div class="member-header">
                <div class="member-avatar-wrapper">
                  <div class="member-avatar" :style="{ backgroundColor: selectedPlan?.color + '20' }">
                    {{ member.avatar || member.name?.charAt(0) || '?' }}
                  </div>
                  <i v-if="member.isCreator" class="fas fa-crown creator-crown" style="color: #f39c12;"></i>
                </div>
                <div class="member-info">
                  <h4>{{ member.name }}</h4>
                  <p>{{ member.isCreator ? '创建者' : '成员' }}</p>
                </div>
              </div>

              <div class="member-stats">
                <div class="member-stat-item">
                  <span class="stat-label">已存金额</span>
                  <span class="stat-value amount">¥{{ formatNumber(member.amount) }}</span>
                </div>
                <div class="member-stat-item">
                  <span class="stat-label">占比</span>
                  <span class="stat-value percent">{{ calculateMemberPercentage(member.amount) }}%</span>
                </div>
              </div>

              <button
                  class="view-records-btn"
                  @click="$emit('toggle-member-records', member)"
                  :disabled="loadingMemberRecords && expandedMemberId === member.userId"
              >
                <i class="fas" :class="expandedMemberId === member.userId ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                <span>{{ expandedMemberId === member.userId ? '收起记录' : '查看存钱记录' }}</span>
              </button>

              <!-- 成员存钱记录（展开） -->
              <div v-if="expandedMemberId === member.userId" class="member-records">
                <div v-if="loadingMemberRecords" class="loading-state small">
                  <i class="fas fa-spinner fa-spin"></i>
                  <p>加载中...</p>
                </div>
                <div v-else-if="memberRecords.length === 0" class="empty-state small">
                  <i class="fas fa-coins"></i>
                  <p>暂无存钱记录</p>
                </div>
                <div v-else class="records-list">
                  <div v-for="record in memberRecords" :key="record.id" class="record-item">
                    <div class="record-time">
                      <i class="far fa-clock"></i>
                      {{ formatDateTime(record.createTime || record.depositTime) }}
                    </div>
                    <div class="record-amount">+¥{{ formatNumber(record.amount) }}</div>
                    <div v-if="record.note" class="record-note">{{ record.note }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 存钱记录标签页 -->
        <div v-if="activeRecordsTab === 'all'" class="tab-content">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <div class="member-filter">
              <select
                  :value="selectedMemberForRecords"
                  @change="$emit('update:selected-member-for-records', $event.target.value)"
                  class="filter-select"
              >
                <option value="">全部成员</option>
                <option
                    v-for="member in selectedPlan?.members || []"
                    :key="member.userId"
                    :value="member.userId"
                >
                  {{ member.name }}
                </option>
              </select>
            </div>

            <!-- 日期筛选 -->
            <div class="date-filter">
              <div class="date-input-group">
                <input
                    type="date"
                    :value="dateRange.startTime"
                    @input="$emit('update:date-range', { ...dateRange, startTime: $event.target.value })"
                    class="date-input"
                    :max="dateRange.endTime || getTodayDate()"
                    placeholder="开始日期"
                >
              </div>
              <span class="date-separator">至</span>
              <div class="date-input-group">
                <input
                    type="date"
                    :value="dateRange.endTime"
                    @input="$emit('update:date-range', { ...dateRange, endTime: $event.target.value })"
                    class="date-input"
                    :min="dateRange.startTime || ''"
                    :max="getTodayDate()"
                    placeholder="结束日期"
                >
              </div>
            </div>

            <div class="filter-actions">
              <button class="btn-search" @click="$emit('search-records')" :disabled="loadingAllRecords">
                <i class="fas fa-search"></i> 查询
              </button>
              <button
                  class="btn-reset"
                  @click="$emit('reset-date-filter')"
                  v-if="dateRange.startTime || dateRange.endTime"
              >
                <i class="fas fa-undo"></i>
              </button>
            </div>
          </div>

          <!-- 记录列表卡片 -->
          <div class="analysis-card">
            <div class="card-body">
              <div v-if="loadingAllRecords" class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载记录中...</p>
              </div>

              <div v-else-if="filteredRecords.length === 0" class="empty-state">
                <i class="fas fa-coins"></i>
                <p>暂无存钱记录</p>
              </div>

              <div v-else class="records-table">
                <table class="data-table">
                  <thead>
                  <tr>
                    <th>成员</th>
                    <th>存入时间</th>
                    <th>金额</th>
                    <th>备注</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="record in filteredRecords" :key="record.id">
                    <td>
                        <span class="member-badge" :style="{ backgroundColor: getMemberColor(record.memberId) + '20' }">
                          {{ record.memberName }}
                        </span>
                    </td>
                    <td>{{ formatDateTime(record.createTime || record.depositTime) }}</td>
                    <td class="amount-col">+¥{{ formatNumber(record.amount) }}</td>
                    <td class="note-col">{{ record.note || '-' }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>

              <!-- 分页 -->
              <div class="pagination" v-if="totalRecords > pageSize">
                <button
                    class="page-btn"
                    :disabled="currentPage === 1"
                    @click="$emit('change-page', currentPage - 1)"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
                <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
                <button
                    class="page-btn"
                    :disabled="currentPage === totalPages"
                    @click="$emit('change-page', currentPage + 1)"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <button class="btn-primary" @click="$emit('add-money', selectedPlan)">
          <i class="fas fa-plus-circle"></i> 我也要存钱
        </button>
        <button class="btn-secondary" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue'

const props = defineProps({
  selectedPlan: {
    type: Object,
    required: true
  },
  isOnline: {
    type: Boolean,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  },
  activeRecordsTab: {
    type: String,
    required: true
  },
  selectedMemberForRecords: {
    type: String,
    required: true
  },
  dateRange: {
    type: Object,
    required: true
  },
  loadingAllRecords: {
    type: Boolean,
    required: true
  },
  filteredRecords: {
    type: Array,
    required: true
  },
  totalRecords: {
    type: Number,
    required: true
  },
  currentPage: {
    type: Number,
    required: true
  },
  pageSize: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  expandedMemberId: {
    type: [String, Number, null],
    required: true
  },
  memberRecords: {
    type: Array,
    required: true
  },
  loadingMemberRecords: {
    type: Boolean,
    required: true
  }
})

defineEmits([
  'update:active-records-tab',
  'update:selected-member-for-records',
  'update:date-range',
  'search-records',
  'reset-date-filter',
  'change-page',
  'toggle-member-records',
  'add-money',
  'close'
])

// 成员统计
const memberStats = computed(() => {
  if (!props.selectedPlan?.members) return []

  const total = props.selectedPlan.members.length
  const creators = props.selectedPlan.members.filter(m => m.isCreator).length
  const totalAmount = props.selectedPlan.members.reduce((sum, m) => sum + (m.amount || 0), 0)

  return [
    { label: '总成员', value: total },
    { label: '创建者', value: creators },
    { label: '成员', value: total - creators },
    { label: '总存入', value: '¥' + formatNumber(totalAmount) }
  ]
})

// 计算成员占比
const calculateMemberPercentage = (amount) => {
  if (!props.selectedPlan?.currentAmount) return 0
  return ((amount / props.selectedPlan.currentAmount) * 100).toFixed(1)
}

// 获取成员颜色
const getMemberColor = (memberId) => {
  const colors = ['#2ecc71', '#3498db', '#9b59b6', '#f39c12', '#e74c3c', '#1abc9c']
  if (!memberId) return colors[0]
  const index = (memberId % colors.length)
  return colors[index]
}

const formatNumber = (num) => num !== undefined && num !== null ? num.toLocaleString('zh-CN') : '0'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getTodayDate = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
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

.detail-modal {
  max-width: 900px !important;
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

.modal-header i {
  font-size: 24px;
  margin-right: 10px;
  color: #80A492;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #80A492;
  flex: 1;
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

.modal-body {
  padding: 25px;
  max-height: calc(80vh - 120px);
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 20px 25px;
  border-top: 1px solid #D5EBE1;
  background: white;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.modal-footer .btn-primary,
.modal-footer .btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.modal-footer .btn-primary {
  background: linear-gradient(135deg, #80A492 0%, #99BCAC 100%);
  color: white;
}

.modal-footer .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(128, 164, 146, 0.3);
}

.modal-footer .btn-secondary {
  background-color: #f0f0f0;
  color: #666;
}

.modal-footer .btn-secondary:hover {
  background-color: #e0e0e0;
}

.offline-banner.small {
  padding: 8px 12px;
  margin: 10px 20px;
  font-size: 13px;
  background-color: #fff3cd;
  color: #856404;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-range-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #D5EBE1;
  color: #80A492;
  padding: 8px 16px;
  border-radius: 30px;
  font-size: 14px;
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 25px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  border: 1px solid #D5EBE1;
  transition: all 0.3s;
}

.stat-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
  transform: translateY(-2px);
}

.stat-card.target .stat-icon {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.stat-card.current .stat-icon {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.stat-card.progress .stat-icon {
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.stat-card.members .stat-icon {
  background: rgba(128, 164, 146, 0.1);
  color: #80A492;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.analysis-card {
  background: white;
  border-radius: 16px;
  margin-bottom: 25px;
  border: 1px solid #D5EBE1;
  overflow: hidden;
}

.card-body {
  padding: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item.full-width {
  grid-column: span 2;
}

.info-label {
  font-size: 12px;
  color: #999;
}

.info-value {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.info-description {
  margin: 0;
  padding: 12px;
  background: rgba(213, 235, 225, 0.2);
  border-radius: 12px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.progress-section {
  margin-top: 20px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.progress-track {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s;
}

.detail-tabs {
  display: flex;
  gap: 5px;
  margin: 25px 0 20px;
  background: white;
  padding: 5px;
  border-radius: 30px;
  border: 1px solid #D5EBE1;
}

.detail-tabs .tab-btn {
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

.detail-tabs .tab-btn.active {
  background: #D5EBE1;
  color: #80A492;
  font-weight: 500;
}

.members-stats {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-chip {
  background: white;
  border: 1px solid #D5EBE1;
  border-radius: 30px;
  padding: 8px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.chip-label {
  font-size: 12px;
  color: #999;
}

.chip-value {
  font-size: 14px;
  font-weight: 600;
  color: #80A492;
}

.member-card {
  background: white;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 15px;
  transition: all 0.3s;
}

.member-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
}

.member-card.creator-card {
  border-left: 4px solid #f39c12;
  background: rgba(243, 156, 18, 0.02);
}

.member-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.member-avatar-wrapper {
  position: relative;
}

.member-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #80A492;
  border: 2px solid #D5EBE1;
}

.creator-crown {
  position: absolute;
  top: -5px;
  right: -5px;
  font-size: 16px;
  background: white;
  border-radius: 50%;
  padding: 2px;
}

.member-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.member-info p {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.member-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(213, 235, 225, 0.1);
  border-radius: 12px;
}

.member-stat-item {
  flex: 1;
}

.member-stat-item .stat-label {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
  display: block;
}

.member-stat-item .stat-value {
  font-size: 15px;
  font-weight: 600;
}

.member-stat-item .stat-value.amount {
  color: #2ecc71;
}

.member-stat-item .stat-value.percent {
  color: #f39c12;
}

.view-records-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid #D5EBE1;
  border-radius: 8px;
  background: white;
  color: #80A492;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.view-records-btn:hover {
  background: #D5EBE1;
}

.member-records {
  margin-top: 15px;
  padding: 15px;
  background: rgba(213, 235, 225, 0.1);
  border-radius: 12px;
}

.record-item {
  padding: 10px;
  border-bottom: 1px solid #D5EBE1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.record-item:last-child {
  border-bottom: none;
}

.record-time {
  font-size: 12px;
  color: #999;
  min-width: 140px;
}

.record-amount {
  font-size: 14px;
  font-weight: 600;
  color: #2ecc71;
  margin-left: auto;
}

.record-note {
  width: 100%;
  font-size: 12px;
  color: #999;
  margin-top: 5px;
  padding-left: 20px;
}

.filter-bar {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.member-filter {
  flex: 1;
  min-width: 150px;
}

.filter-select {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 25px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  color: #333333;
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 2;
  min-width: 300px;
}

.date-input-group {
  flex: 1;
}

.date-input {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 25px;
  font-size: 14px;
}

.date-separator {
  color: #999;
  font-size: 14px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.btn-search,
.btn-reset {
  padding: 10px 20px;
  border: none;
  border-radius: 25px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-search {
  background: #80A492;
  color: white;
}

.btn-search:hover:not(:disabled) {
  background: #6b8a7a;
}

.btn-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-reset {
  background: #f0f0f0;
  color: #666;
  padding: 10px 15px;
}

.btn-reset:hover {
  background: #e0e0e0;
}

.records-table {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  background: rgba(213, 235, 225, 0.3);
  color: #80A492;
  font-weight: 600;
  padding: 12px 15px;
  text-align: left;
  font-size: 13px;
}

.data-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #D5EBE1;
  color: #333;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: rgba(213, 235, 225, 0.1);
}

.member-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.amount-col {
  color: #2ecc71;
  font-weight: 600;
}

.note-col {
  color: #999;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #D5EBE1;
}

.page-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #D5EBE1;
  border-radius: 50%;
  background: white;
  color: #80A492;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  background: #D5EBE1;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.loading-state i,
.empty-state i {
  font-size: 40px;
  color: var(--accent-color);
  margin-bottom: 15px;
}

.loading-state p,
.empty-state p {
  font-size: 14px;
}

.loading-state.small,
.empty-state.small {
  padding: 20px;
}

.loading-state.small i,
.empty-state.small i {
  font-size: 32px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-item.full-width {
    grid-column: span 1;
  }

  .filter-bar {
    flex-direction: column;
  }

  .date-filter {
    flex-direction: column;
    width: 100%;
  }

  .date-separator {
    display: none;
  }

  .filter-actions {
    width: 100%;
  }

  .btn-search,
  .btn-reset {
    flex: 1;
  }

  .member-stats {
    flex-direction: column;
  }
}

@media (max-width: 500px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-footer button {
    width: 100%;
  }

  .record-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .record-time {
    min-width: auto;
  }

  .record-amount {
    margin-left: 0;
  }
}
</style>