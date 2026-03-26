<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content credit-modal">
      <div class="modal-header credit-header">
        <i class="fas fa-hand-holding-usd" style="color: #80A492;"></i>
        <h3>赊账管理</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="credit-management">
          <!-- 加载状态 -->
          <div v-if="loading" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>加载赊账数据中...</p>
          </div>

          <template v-else>
            <!-- 统计卡片 -->
            <div class="credit-stats">
              <div class="stat-card total-card">
                <div class="stat-value">¥{{ formatNumber(creditStats.totalCredit) }}</div>
                <div class="stat-label">总赊账金额</div>
              </div>
              <div class="stat-card payable-card">
                <div class="stat-value">¥{{ formatNumber(creditStats.totalPayable) }}</div>
                <div class="stat-label">应付账款</div>
                <div class="stat-sub-label">支出赊账 (欠别人)</div>
              </div>
              <div class="stat-card receivable-card">
                <div class="stat-value">¥{{ formatNumber(creditStats.totalReceivable) }}</div>
                <div class="stat-label">应收账款</div>
                <div class="stat-sub-label">收入赊账 (别人欠)</div>
              </div>
              <div class="stat-card overdue-card">
                <div class="stat-value">{{ creditStats.overdueCount }}</div>
                <div class="stat-label">逾期笔数</div>
              </div>
            </div>

            <!-- 标签切换 -->
            <div class="credit-tabs">
              <button
                  class="tab-btn"
                  :class="{ active: activeTab === 'all' }"
                  @click="activeTab = 'all'"
              >
                <i class="fas fa-list"></i> 全部赊账
              </button>
              <button
                  class="tab-btn"
                  :class="{ active: activeTab === 'payable' }"
                  @click="activeTab = 'payable'"
              >
                <i class="fas fa-arrow-up"></i> 应付账款
              </button>
              <button
                  class="tab-btn"
                  :class="{ active: activeTab === 'receivable' }"
                  @click="activeTab = 'receivable'"
              >
                <i class="fas fa-arrow-down"></i> 应收账款
              </button>
              <button
                  class="tab-btn"
                  :class="{ active: activeTab === 'overdue' }"
                  @click="activeTab = 'overdue'"
              >
                <i class="fas fa-exclamation-triangle"></i> 逾期账款
              </button>
            </div>

            <!-- 搜索框 -->
            <div class="credit-search">
              <div class="search-box">
                <i class="fas fa-search"></i>
                <input
                    v-model="searchKeyword"
                    type="text"
                    class="search-input"
                    :placeholder="searchPlaceholder"
                >
              </div>
            </div>

            <!-- 全部赊账视图 - 按还款状态分组 -->
            <template v-if="activeTab === 'all'">
              <!-- 待处理组 -->
              <div class="credit-group" v-if="filteredAllCredits.pending.length > 0">
                <div class="group-header pending">
                  <i class="fas fa-clock"></i>
                  <h3>待处理 ({{ filteredAllCredits.pending.length }})</h3>
                  <span class="group-total">合计: ¥{{ formatNumber(filteredAllCredits.pendingTotal) }}</span>
                </div>
                <div class="credit-cards">
                  <div
                      v-for="credit in filteredAllCredits.pending"
                      :key="credit.id"
                      class="credit-card"
                      :class="[credit.creditType === 'payable' ? 'payable' : 'receivable']"
                  >
                    <div class="credit-header">
                      <div class="credit-title">
                        <span class="credit-type-badge" :class="credit.creditType">
                          <i :class="credit.creditType === 'payable' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                          {{ credit.creditType === 'payable' ? '应付' : '应收' }}
                        </span>
                        <h4>{{ credit.creditType === 'payable' ? (credit.category || '支出') : (credit.productName || credit.category || '商品') }}</h4>
                        <span class="credit-subtype" v-if="credit.creditType === 'payable' && credit.subtype">
                          {{ credit.subtype }}
                        </span>
                        <span class="credit-channel" v-if="credit.creditType === 'receivable' && credit.channel">
                          {{ credit.channel }}
                        </span>
                        <span class="credit-badge badge-pending">{{ credit.creditType === 'payable' ? '待还款' : '待收款' }}</span>
                      </div>
                      <div class="credit-amount" :class="credit.creditType === 'payable' ? 'warning-text' : 'success-text'">
                        ¥{{ formatNumber(credit.amount) }}
                      </div>
                    </div>

                    <div class="credit-info">
                      <div class="info-row">
                        <span class="info-label"><i class="fas fa-calendar"></i> 日期:</span>
                        <span class="info-value">{{ formatDate(credit.date) }}</span>
                      </div>
                      <div class="info-row" v-if="credit.expectedRepayDate">
                        <span class="info-label"><i class="fas fa-clock"></i> 预计{{ credit.creditType === 'payable' ? '还款' : '收款' }}:</span>
                        <span class="info-value">
                          {{ formatDate(credit.expectedRepayDate) }}
                        </span>
                      </div>
                      <div class="info-row" v-if="credit.creditType === 'payable' && credit.supplier">
                        <span class="info-label"><i class="fas fa-truck"></i> 供应商:</span>
                        <span class="info-value">{{ credit.supplier }}</span>
                      </div>
                      <div class="info-row" v-if="credit.creditType === 'receivable' && credit.customer">
                        <span class="info-label"><i class="fas fa-user"></i> 客户:</span>
                        <span class="info-value">{{ credit.customer }}</span>
                      </div>
                      <div class="info-row" v-if="credit.creditType === 'receivable' && credit.quantity">
                        <span class="info-label"><i class="fas fa-weight"></i> 数量:</span>
                        <span class="info-value">{{ credit.quantity }} {{ credit.unit }}</span>
                      </div>
                      <div class="info-row" v-if="credit.note">
                        <span class="info-label"><i class="fas fa-sticky-note"></i> 备注:</span>
                        <span class="info-value">{{ credit.note }}</span>
                      </div>
                    </div>

                    <div class="credit-actions">
                      <button
                          class="action-btn"
                          :class="credit.creditType === 'payable' ? 'repay' : 'collect'"
                          @click="credit.creditType === 'payable' ? openRepaymentModal(credit) : openCollectionModal(credit)"
                      >
                        <i class="fas fa-hand-holding-usd"></i>
                        {{ credit.creditType === 'payable' ? '还款' : '收款' }}
                      </button>
                      <button class="action-btn detail" @click="credit.creditType === 'payable' ? viewPayableDetail(credit) : viewReceivableDetail(credit)">
                        <i class="fas fa-info-circle"></i> 详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 逾期组 -->
              <div class="credit-group" v-if="filteredAllCredits.overdue.length > 0">
                <div class="group-header overdue">
                  <i class="fas fa-exclamation-triangle"></i>
                  <h3>逾期 ({{ filteredAllCredits.overdue.length }})</h3>
                  <span class="group-total">合计: ¥{{ formatNumber(filteredAllCredits.overdueTotal) }}</span>
                </div>
                <div class="credit-cards">
                  <div
                      v-for="credit in filteredAllCredits.overdue"
                      :key="credit.id"
                      class="credit-card credit-overdue"
                      :class="[credit.creditType === 'payable' ? 'payable' : 'receivable']"
                  >
                    <div class="credit-header">
                      <div class="credit-title">
                        <span class="credit-type-badge" :class="credit.creditType">
                          <i :class="credit.creditType === 'payable' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                          {{ credit.creditType === 'payable' ? '应付' : '应收' }}
                        </span>
                        <h4>{{ credit.creditType === 'payable' ? (credit.category || '支出') : (credit.productName || credit.category || '商品') }}</h4>
                        <span class="credit-badge badge-overdue">逾期</span>
                      </div>
                      <div class="credit-amount" :class="credit.creditType === 'payable' ? 'warning-text' : 'success-text'">
                        ¥{{ formatNumber(credit.amount) }}
                      </div>
                    </div>

                    <div class="credit-info">
                      <div class="info-row">
                        <span class="info-label"><i class="fas fa-calendar"></i> 日期:</span>
                        <span class="info-value">{{ formatDate(credit.date) }}</span>
                      </div>
                      <div class="info-row" v-if="credit.expectedRepayDate">
                        <span class="info-label"><i class="fas fa-clock"></i> 应{{ credit.creditType === 'payable' ? '还' : '收' }}日期:</span>
                        <span class="info-value warning-text">
                          {{ formatDate(credit.expectedRepayDate) }}
                        </span>
                      </div>
                      <div class="info-row" v-if="credit.creditType === 'payable' && credit.supplier">
                        <span class="info-label"><i class="fas fa-truck"></i> 供应商:</span>
                        <span class="info-value">{{ credit.supplier }}</span>
                      </div>
                      <div class="info-row" v-if="credit.creditType === 'receivable' && credit.customer">
                        <span class="info-label"><i class="fas fa-user"></i> 客户:</span>
                        <span class="info-value">{{ credit.customer }}</span>
                      </div>
                      <div class="info-row" v-if="credit.note">
                        <span class="info-label"><i class="fas fa-sticky-note"></i> 备注:</span>
                        <span class="info-value">{{ credit.note }}</span>
                      </div>
                    </div>

                    <div class="credit-actions">
                      <button
                          class="action-btn"
                          :class="credit.creditType === 'payable' ? 'repay' : 'collect'"
                          @click="credit.creditType === 'payable' ? openRepaymentModal(credit) : openCollectionModal(credit)"
                      >
                        <i class="fas fa-hand-holding-usd"></i>
                        {{ credit.creditType === 'payable' ? '立即还款' : '立即收款' }}
                      </button>
                      <button class="action-btn detail" @click="credit.creditType === 'payable' ? viewPayableDetail(credit) : viewReceivableDetail(credit)">
                        <i class="fas fa-info-circle"></i> 详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 已结清组（只有详情按钮，没有还款/收款按钮） -->
              <div class="credit-group" v-if="filteredAllCredits.paid.length > 0">
                <div class="group-header paid">
                  <i class="fas fa-check-circle"></i>
                  <h3>已结清 ({{ filteredAllCredits.paid.length }})</h3>
                  <span class="group-total">合计: ¥{{ formatNumber(filteredAllCredits.paidTotal) }}</span>
                </div>
                <div class="credit-cards">
                  <div
                      v-for="credit in filteredAllCredits.paid"
                      :key="credit.id"
                      class="credit-card paid-card"
                      :class="[credit.creditType === 'payable' ? 'payable' : 'receivable']"
                  >
                    <div class="credit-header">
                      <div class="credit-title">
                        <span class="credit-type-badge" :class="credit.creditType">
                          <i :class="credit.creditType === 'payable' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                          {{ credit.creditType === 'payable' ? '应付' : '应收' }}
                        </span>
                        <h4>{{ credit.creditType === 'payable' ? (credit.category || '支出') : (credit.productName || credit.category || '商品') }}</h4>
                        <span class="credit-badge badge-paid">{{ credit.creditType === 'payable' ? '已还清' : '已收清' }}</span>
                      </div>
                      <div class="credit-amount" :class="credit.creditType === 'payable' ? 'warning-text' : 'success-text'">
                        ¥{{ formatNumber(credit.originalAmount || credit.amount) }}
                      </div>
                    </div>

                    <div class="credit-info">
                      <div class="info-row">
                        <span class="info-label"><i class="fas fa-calendar"></i> 日期:</span>
                        <span class="info-value">{{ formatDate(credit.date) }}</span>
                      </div>
                      <div class="info-row" v-if="credit.lastRepayDate">
                        <span class="info-label"><i class="fas fa-check"></i> 结清日期:</span>
                        <span class="info-value">{{ formatDate(credit.lastRepayDate) }}</span>
                      </div>
                      <div class="info-row" v-if="credit.creditType === 'payable' && credit.supplier">
                        <span class="info-label"><i class="fas fa-truck"></i> 供应商:</span>
                        <span class="info-value">{{ credit.supplier }}</span>
                      </div>
                      <div class="info-row" v-if="credit.creditType === 'receivable' && credit.customer">
                        <span class="info-label"><i class="fas fa-user"></i> 客户:</span>
                        <span class="info-value">{{ credit.customer }}</span>
                      </div>
                    </div>

                    <!-- 已结清卡片只显示详情按钮，不显示还款/收款按钮 -->
                    <div class="credit-actions">
                      <button class="action-btn detail" @click="credit.creditType === 'payable' ? viewPayableDetail(credit) : viewReceivableDetail(credit)">
                        <i class="fas fa-info-circle"></i> 详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="filteredAllCredits.pending.length === 0 && filteredAllCredits.overdue.length === 0 && filteredAllCredits.paid.length === 0" class="empty-state">
                <i class="fas fa-credit-card"></i>
                <p>暂无赊账记录</p>
                <small>在收入记账或支出记账时选择"赊账"支付方式即可创建赊账记录</small>
              </div>
            </template>

            <!-- 应付账款视图（只显示未结清的应付账款） -->
            <div v-else-if="activeTab === 'payable'" class="credit-list">
              <div class="credit-section">
                <div class="section-header">
                  <h3><i class="fas fa-arrow-up"></i> 应付账款 - 支出赊账 (欠别人)</h3>
                  <span class="section-total">未结清总计: ¥{{ formatNumber(filteredPayableTotal) }}</span>
                </div>

                <div v-if="filteredPayableCredits.length === 0" class="empty-state">
                  <i class="fas fa-credit-card"></i>
                  <p>暂无未结清的应付账款</p>
                  <small>所有支出赊账都已还清</small>
                </div>

                <div v-else class="credit-cards">
                  <div
                      v-for="credit in filteredPayableCredits"
                      :key="credit.id"
                      class="credit-card payable"
                      :class="{ 'credit-overdue': isOverdue(credit.expectedRepayDate) }"
                  >
                    <div class="credit-header">
                      <div class="credit-title">
                        <h4>{{ credit.category || '支出' }}</h4>
                        <span class="credit-subtype">{{ credit.subtype || '其他' }}</span>
                        <span class="credit-badge" :class="getPayableBadgeClass(credit)">
                          {{ getPayableBadgeText(credit) }}
                        </span>
                      </div>
                      <div class="credit-amount warning-text">¥{{ formatNumber(credit.amount) }}</div>
                    </div>

                    <div class="credit-info">
                      <div class="info-row">
                        <span class="info-label"><i class="fas fa-calendar"></i> 支出日期:</span>
                        <span class="info-value">{{ formatDate(credit.date) }}</span>
                      </div>
                      <div class="info-row" v-if="credit.expectedRepayDate">
                        <span class="info-label"><i class="fas fa-clock"></i> 应还日期:</span>
                        <span class="info-value" :class="{ 'warning-text': isOverdue(credit.expectedRepayDate) }">
                          {{ formatDate(credit.expectedRepayDate) }}
                          <span v-if="isOverdue(credit.expectedRepayDate)" class="overdue-tag">逾期</span>
                        </span>
                      </div>
                      <div class="info-row" v-if="credit.supplier">
                        <span class="info-label"><i class="fas fa-truck"></i> 供应商:</span>
                        <span class="info-value">{{ credit.supplier }}</span>
                      </div>
                      <div class="info-row" v-if="credit.note">
                        <span class="info-label"><i class="fas fa-sticky-note"></i> 备注:</span>
                        <span class="info-value">{{ credit.note }}</span>
                      </div>
                    </div>

                    <div class="credit-actions">
                      <button class="action-btn repay" @click="openRepaymentModal(credit)">
                        <i class="fas fa-hand-holding-usd"></i> 还款
                      </button>
                      <button class="action-btn detail" @click="viewPayableDetail(credit)">
                        <i class="fas fa-info-circle"></i> 详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 应收账款视图（只显示未结清的应收账款） -->
            <div v-else-if="activeTab === 'receivable'" class="credit-list">
              <div class="credit-section">
                <div class="section-header">
                  <h3><i class="fas fa-arrow-down"></i> 应收账款 - 收入赊账 (别人欠)</h3>
                  <span class="section-total">未结清总计: ¥{{ formatNumber(filteredReceivableTotal) }}</span>
                </div>

                <div v-if="filteredReceivableCredits.length === 0" class="empty-state">
                  <i class="fas fa-users"></i>
                  <p>暂无未结清的应收账款</p>
                  <small>所有收入赊账都已收清</small>
                </div>

                <div v-else class="credit-cards">
                  <div
                      v-for="credit in filteredReceivableCredits"
                      :key="credit.id"
                      class="credit-card receivable"
                      :class="{ 'credit-overdue': isOverdue(credit.expectedRepayDate) }"
                  >
                    <div class="credit-header">
                      <div class="credit-title">
                        <h4>{{ credit.productName || credit.category || '商品' }}</h4>
                        <span class="credit-channel">{{ credit.channel || '零售' }}</span>
                        <span class="credit-badge" :class="getReceivableBadgeClass(credit)">
                          {{ getReceivableBadgeText(credit) }}
                        </span>
                      </div>
                      <div class="credit-amount success-text">¥{{ formatNumber(credit.amount) }}</div>
                    </div>

                    <div class="credit-info">
                      <div class="info-row">
                        <span class="info-label"><i class="fas fa-calendar"></i> 收入日期:</span>
                        <span class="info-value">{{ formatDate(credit.date) }}</span>
                      </div>
                      <div class="info-row" v-if="credit.expectedRepayDate">
                        <span class="info-label"><i class="fas fa-clock"></i> 预计收款:</span>
                        <span class="info-value" :class="{ 'warning-text': isOverdue(credit.expectedRepayDate) }">
                          {{ formatDate(credit.expectedRepayDate) }}
                          <span v-if="isOverdue(credit.expectedRepayDate)" class="overdue-tag">逾期</span>
                        </span>
                      </div>
                      <div class="info-row" v-if="credit.customer">
                        <span class="info-label"><i class="fas fa-user"></i> 客户:</span>
                        <span class="info-value">{{ credit.customer }}</span>
                      </div>
                      <div class="info-row" v-if="credit.quantity">
                        <span class="info-label"><i class="fas fa-weight"></i> 数量:</span>
                        <span class="info-value">{{ credit.quantity }} {{ credit.unit }}</span>
                      </div>
                      <div class="info-row" v-if="credit.note">
                        <span class="info-label"><i class="fas fa-sticky-note"></i> 备注:</span>
                        <span class="info-value">{{ credit.note }}</span>
                      </div>
                    </div>

                    <div class="credit-actions">
                      <button class="action-btn collect" @click="openCollectionModal(credit)">
                        <i class="fas fa-hand-holding-usd"></i> 收款
                      </button>
                      <button class="action-btn detail" @click="viewReceivableDetail(credit)">
                        <i class="fas fa-info-circle"></i> 详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 逾期账款视图（只显示未结清且逾期的） -->
            <div v-else-if="activeTab === 'overdue'" class="credit-list">
              <div class="credit-section">
                <div class="section-header">
                  <h3><i class="fas fa-exclamation-triangle"></i> 逾期账款</h3>
                  <span class="section-total">总计: ¥{{ formatNumber(filteredOverdueTotal) }}</span>
                </div>

                <div v-if="filteredOverdueCredits.length === 0" class="empty-state">
                  <i class="fas fa-check-circle"></i>
                  <p>暂无逾期账款</p>
                  <small>所有赊账都在期限内</small>
                </div>

                <div v-else class="credit-cards">
                  <div
                      v-for="credit in filteredOverdueCredits"
                      :key="credit.id"
                      class="credit-card credit-overdue"
                      :class="[credit.creditType === 'payable' ? 'payable' : 'receivable']"
                  >
                    <div class="credit-header">
                      <div class="credit-title">
                        <span class="credit-type-badge" :class="credit.creditType">
                          <i :class="credit.creditType === 'payable' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                          {{ credit.creditType === 'payable' ? '应付' : '应收' }}
                        </span>
                        <h4>{{ credit.creditType === 'payable' ? (credit.category || '支出') : (credit.productName || credit.category || '商品') }}</h4>
                        <span class="credit-badge badge-overdue">逾期</span>
                      </div>
                      <div class="credit-amount" :class="credit.creditType === 'payable' ? 'warning-text' : 'success-text'">
                        ¥{{ formatNumber(credit.amount) }}
                      </div>
                    </div>

                    <div class="credit-info">
                      <div class="info-row">
                        <span class="info-label"><i class="fas fa-calendar"></i> 日期:</span>
                        <span class="info-value">{{ formatDate(credit.date) }}</span>
                      </div>
                      <div class="info-row" v-if="credit.expectedRepayDate">
                        <span class="info-label"><i class="fas fa-clock"></i> 应{{ credit.creditType === 'payable' ? '还' : '收' }}日期:</span>
                        <span class="info-value warning-text">
                          {{ formatDate(credit.expectedRepayDate) }}
                        </span>
                      </div>
                      <div class="info-row" v-if="credit.creditType === 'payable' && credit.supplier">
                        <span class="info-label"><i class="fas fa-truck"></i> 供应商:</span>
                        <span class="info-value">{{ credit.supplier }}</span>
                      </div>
                      <div class="info-row" v-if="credit.creditType === 'receivable' && credit.customer">
                        <span class="info-label"><i class="fas fa-user"></i> 客户:</span>
                        <span class="info-value">{{ credit.customer }}</span>
                      </div>
                    </div>

                    <div class="credit-actions">
                      <button
                          class="action-btn"
                          :class="credit.creditType === 'payable' ? 'repay' : 'collect'"
                          @click="credit.creditType === 'payable' ? openRepaymentModal(credit) : openCollectionModal(credit)"
                      >
                        <i class="fas fa-hand-holding-usd"></i>
                        {{ credit.creditType === 'payable' ? '立即还款' : '立即收款' }}
                      </button>
                      <button class="action-btn detail" @click="credit.creditType === 'payable' ? viewPayableDetail(credit) : viewReceivableDetail(credit)">
                        <i class="fas fa-info-circle"></i> 详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- 还款模态框（应付账款 - 我还给别人） -->
  <div class="modal" :class="{ active: repaymentModalVisible }" @click="closeRepaymentOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas fa-hand-holding-usd" style="color: #80A492;"></i>
        <h3>还款 - 应付账款</h3>
        <button class="modal-close" @click="repaymentModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="submitRepayment">
          <div class="form-group" v-if="selectedPayable">
            <label>支出赊账信息</label>
            <div class="credit-info-panel">
              <div class="info-row">
                <span class="info-label">支出类型：</span>
                <span class="info-value">{{ selectedPayable.category }} - {{ selectedPayable.subtype }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">供应商：</span>
                <span class="info-value">{{ selectedPayable.supplier || '未知' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">赊账金额：</span>
                <span class="info-value warning-text">¥{{ formatNumber(selectedPayable.amount) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">支出日期：</span>
                <span class="info-value">{{ formatDate(selectedPayable.date) }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-yen-sign"></i> 还款金额 <span class="required">*</span></label>
            <div class="input-group">
              <span class="input-prefix">¥</span>
              <input
                  v-model="repaymentForm.amount"
                  type="number"
                  class="form-input"
                  placeholder="请输入还款金额"
                  :max="selectedPayable?.amount"
                  min="0.01"
                  step="0.01"
                  required
              >
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-calendar-alt"></i> 还款日期</label>
            <input v-model="repaymentForm.date" type="date" class="form-input" required>
          </div>

          <div class="form-group">
            <label><i class="fas fa-credit-card"></i> 支付方式</label>
            <select v-model="repaymentForm.paymentMethod" class="form-select">
              <option value="现金">现金</option>
              <option value="微信">微信</option>
              <option value="支付宝">支付宝</option>
              <option value="银行卡">银行卡</option>
            </select>
          </div>

          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注</label>
            <input v-model="repaymentForm.note" type="text" class="form-input" placeholder="例如：部分还款">
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="repaymentModalVisible = false">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> 确认还款
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 收款模态框（应收账款 - 别人还给我） -->
  <div class="modal" :class="{ active: collectionModalVisible }" @click="closeCollectionOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas fa-hand-holding-usd" style="color: #80A492;"></i>
        <h3>收款 - 应收账款</h3>
        <button class="modal-close" @click="collectionModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="submitCollection">
          <div class="form-group" v-if="selectedReceivable">
            <label>收入赊账信息</label>
            <div class="credit-info-panel">
              <div class="info-row">
                <span class="info-label">商品：</span>
                <span class="info-value">{{ selectedReceivable.productName || selectedReceivable.category }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">客户：</span>
                <span class="info-value">{{ selectedReceivable.customer || '散客' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">赊账金额：</span>
                <span class="info-value success-text">¥{{ formatNumber(selectedReceivable.amount) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">收入日期：</span>
                <span class="info-value">{{ formatDate(selectedReceivable.date) }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-yen-sign"></i> 收款金额 <span class="required">*</span></label>
            <div class="input-group">
              <span class="input-prefix">¥</span>
              <input
                  v-model="collectionForm.amount"
                  type="number"
                  class="form-input"
                  placeholder="请输入收款金额"
                  :max="selectedReceivable?.amount"
                  min="0.01"
                  step="0.01"
                  required
              >
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-calendar-alt"></i> 收款日期</label>
            <input v-model="collectionForm.date" type="date" class="form-input" required>
          </div>

          <div class="form-group">
            <label><i class="fas fa-credit-card"></i> 收款方式</label>
            <select v-model="collectionForm.paymentMethod" class="form-select">
              <option value="现金">现金</option>
              <option value="微信">微信</option>
              <option value="支付宝">支付宝</option>
              <option value="银行卡">银行卡</option>
            </select>
          </div>

          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注</label>
            <input v-model="collectionForm.note" type="text" class="form-input" placeholder="例如：收回欠款">
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="collectionModalVisible = false">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> 确认收款
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import dateHelper from '@/services/utils/date-helper.service.js'
import { notificationService } from "@/services/index.js"
import creditService from "@/services/api/business/credit.service.js";
import baseService from "@/services/api/business/base.service.js";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'update'])

// ==================== 状态 ====================
const loading = ref(false)
const payableCredits = ref([])
const receivableCredits = ref([])
const creditStats = ref({
  totalPayable: 0,
  totalReceivable: 0,
  totalCredit: 0,
  overdueCount: 0
})
const activeTab = ref('all')
const searchKeyword = ref('')

const selectedPayable = ref(null)
const selectedReceivable = ref(null)

const repaymentModalVisible = ref(false)
const collectionModalVisible = ref(false)

const repaymentForm = reactive({
  amount: '',
  date: dateHelper.getTodayString(),
  paymentMethod: '现金',
  note: ''
})

const collectionForm = reactive({
  amount: '',
  date: dateHelper.getTodayString(),
  paymentMethod: '现金',
  note: ''
})

// ==================== 计算属性 ====================

const searchPlaceholder = computed(() => {
  return creditService.getCreditSearchPlaceholder(activeTab.value)
})

// 合并所有赊账记录
const allCredits = computed(() => {
  const all = [
    ...payableCredits.value.map(c => ({ ...c, creditType: 'payable' })),
    ...receivableCredits.value.map(c => ({ ...c, creditType: 'receivable' }))
  ]

  if (searchKeyword.value.trim()) {
    return creditService.filterCreditRecords(all, {
      keyword: searchKeyword.value
    })
  }

  return all
})

// 按状态分组的全部赊账
const filteredAllCredits = computed(() => {
  const pending = []
  const overdue = []
  const paid = []

  allCredits.value.forEach(credit => {
    if (credit.isPaid) {
      paid.push(credit)
    } else if (creditService.isCreditOverdue(credit.expectedRepayDate)) {
      overdue.push(credit)
    } else {
      pending.push(credit)
    }
  })

  return {
    pending,
    overdue,
    paid,
    pendingTotal: pending.reduce((sum, c) => sum + (c.amount || 0), 0),
    overdueTotal: overdue.reduce((sum, c) => sum + (c.amount || 0), 0),
    paidTotal: paid.reduce((sum, c) => sum + (c.originalAmount || c.amount || 0), 0)
  }
})

// 过滤后的应付账款（只显示未结清的）
const filteredPayableCredits = computed(() => {
  let filtered = [...payableCredits.value]
  // 只显示未结清的
  filtered = filtered.filter(c => !c.isPaid)

  if (searchKeyword.value.trim()) {
    filtered = creditService.filterCreditRecords(filtered, {
      keyword: searchKeyword.value
    })
  }
  return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
})

const filteredPayableTotal = computed(() => {
  return filteredPayableCredits.value.reduce((sum, c) => sum + (c.amount || 0), 0)
})

// 过滤后的应收账款（只显示未结清的）
const filteredReceivableCredits = computed(() => {
  let filtered = [...receivableCredits.value]
  // 只显示未结清的
  filtered = filtered.filter(c => !c.isPaid)

  if (searchKeyword.value.trim()) {
    filtered = creditService.filterCreditRecords(filtered, {
      keyword: searchKeyword.value
    })
  }
  return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
})

const filteredReceivableTotal = computed(() => {
  return filteredReceivableCredits.value.reduce((sum, c) => sum + (c.amount || 0), 0)
})

// 过滤后的逾期账款（只显示未结清且逾期的）
const filteredOverdueCredits = computed(() => {
  const allOverdue = allCredits.value.filter(c =>
      !c.isPaid && creditService.isCreditOverdue(c.expectedRepayDate)
  )

  if (searchKeyword.value.trim()) {
    return creditService.filterCreditRecords(allOverdue, {
      keyword: searchKeyword.value
    })
  }

  return allOverdue
})

const filteredOverdueTotal = computed(() => {
  return filteredOverdueCredits.value.reduce((sum, c) => sum + (c.amount || 0), 0)
})

// ==================== 方法 ====================

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const creditData = await creditService.getAllCreditRecords()
    payableCredits.value = creditData.payableCredits
    receivableCredits.value = creditData.receivableCredits
    creditStats.value = await creditService.getCreditStats()
    console.log('应付账款:', payableCredits.value.length)
    console.log('应收账款:', receivableCredits.value.length)
  } catch (error) {
    console.error('加载赊账数据失败:', error)
    notificationService.showNotification('加载赊账数据失败', 'error')
    payableCredits.value = []
    receivableCredits.value = []
  } finally {
    loading.value = false
  }
}

// 逾期判断
const isOverdue = (expectedDate) => {
  return creditService.isCreditOverdue(expectedDate)
}

// 应付账款标签样式
const getPayableBadgeClass = (credit) => {
  return creditService.getPayableBadgeClass(credit)
}

const getPayableBadgeText = (credit) => {
  return creditService.getPayableBadgeText(credit)
}

// 应收账款标签样式
const getReceivableBadgeClass = (credit) => {
  return creditService.getReceivableBadgeClass(credit)
}

const getReceivableBadgeText = (credit) => {
  return creditService.getReceivableBadgeText(credit)
}

// 打开还款模态框
const openRepaymentModal = (credit) => {
  selectedPayable.value = credit
  repaymentForm.amount = ''
  repaymentForm.date = dateHelper.getTodayString()
  repaymentForm.paymentMethod = '现金'
  repaymentForm.note = ''
  repaymentModalVisible.value = true
}

// 打开收款模态框
const openCollectionModal = (credit) => {
  selectedReceivable.value = credit
  collectionForm.amount = ''
  collectionForm.date = dateHelper.getTodayString()
  collectionForm.paymentMethod = '现金'
  collectionForm.note = ''
  collectionModalVisible.value = true
}

// 查看应付账款详情
const viewPayableDetail = async (credit) => {
  try {
    const detail = await creditService.getCreditDetail(credit.id, 'expense')
    if (detail) {
      notificationService.showNotification(
          `应付账款详情\n\n支出类型: ${detail.category} - ${detail.subtype}\n供应商: ${detail.supplier || '未知'}\n金额: ¥${formatNumber(detail.amount)}\n支出日期: ${formatDate(detail.date)}\n应还日期: ${formatDate(detail.expectedRepayDate)}\n支付方式: ${detail.paymentMethod}\n备注: ${detail.note || '无'}`,
          'info'
      )
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    notificationService.showNotification('获取详情失败', 'error')
  }
}

// 查看应收账款详情
const viewReceivableDetail = async (credit) => {
  try {
    const detail = await creditService.getCreditDetail(credit.id, 'income')
    if (detail) {
      notificationService.showNotification(
          `应收账款详情\n\n商品: ${detail.productName || detail.category}\n客户: ${detail.customer || '散客'}\n金额: ¥${formatNumber(detail.amount)}\n数量: ${detail.quantity || 1} ${detail.unit || ''}\n收入日期: ${formatDate(detail.date)}\n预计收款: ${formatDate(detail.expectedRepayDate)}\n备注: ${detail.note || '无'}`,
          'info'
      )
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    notificationService.showNotification('获取详情失败', 'error')
  }
}

// 提交还款
const submitRepayment = async () => {
  if (!repaymentForm.amount || parseFloat(repaymentForm.amount) <= 0) {
    notificationService.showNotification('请输入有效的还款金额', 'error')
    return
  }

  if (parseFloat(repaymentForm.amount) > selectedPayable.value.amount) {
    notificationService.showNotification('还款金额不能大于当前欠款', 'error')
    return
  }

  try {
    await creditService.recordPayableRepayment(selectedPayable.value.id, {
      amount: repaymentForm.amount,
      date: repaymentForm.date,
      paymentMethod: repaymentForm.paymentMethod,
      note: repaymentForm.note
    })

    await loadData()
    emit('update')
    repaymentModalVisible.value = false
    notificationService.showNotification('还款记录成功', 'success')
  } catch (error) {
    console.error('提交还款失败:', error)
    notificationService.showNotification(error.message || '提交还款失败', 'error')
  }
}

// 提交收款
const submitCollection = async () => {
  if (!collectionForm.amount || parseFloat(collectionForm.amount) <= 0) {
    notificationService.showNotification('请输入有效的收款金额', 'error')
    return
  }

  if (parseFloat(collectionForm.amount) > selectedReceivable.value.amount) {
    notificationService.showNotification('收款金额不能大于赊账金额', 'error')
    return
  }

  try {
    await creditService.recordReceivableCollection(selectedReceivable.value.id, {
      amount: collectionForm.amount,
      date: collectionForm.date,
      paymentMethod: collectionForm.paymentMethod,
      note: collectionForm.note
    })

    await loadData()
    emit('update')
    collectionModalVisible.value = false
    notificationService.showNotification('收款记录成功', 'success')
  } catch (error) {
    console.error('提交收款失败:', error)
    notificationService.showNotification(error.message || '提交收款失败', 'error')
  }
}

const close = () => {
  emit('update:visible', false)
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

const closeRepaymentOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    repaymentModalVisible.value = false
  }
}

const closeCollectionOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    collectionModalVisible.value = false
  }
}

// ==================== 辅助函数 ====================

const formatNumber = (num) => {
  return baseService.formatNumber(num)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}.${month}.${day}`
}

// ==================== 监听器 ====================

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadData()
  }
})

// ==================== 初始化 ====================
onMounted(() => {
  if (props.visible) {
    loadData()
  }
})
</script>

<style scoped>
/* 样式保持不变，与之前相同 */
.credit-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.credit-type-badge.payable {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.credit-type-badge.receivable {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

/* 分组头部 */
.credit-group {
  margin-bottom: 30px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 15px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #80A492;
}

.group-header i {
  font-size: 18px;
  color: #80A492;
}

.group-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.group-total {
  margin-left: auto;
  font-size: 14px;
  font-weight: 600;
  color: #80A492;
}

.group-header.pending {
  border-left-color: #3498db;
}

.group-header.pending i {
  color: #3498db;
}

.group-header.overdue {
  border-left-color: #f39c12;
}

.group-header.overdue i {
  color: #f39c12;
}

.group-header.paid {
  border-left-color: #2ecc71;
}

.group-header.paid i {
  color: #2ecc71;
}

/* 已结清卡片样式 */
.paid-card {
  opacity: 0.85;
  background: rgba(46, 204, 113, 0.05);
}

.paid-card:hover {
  opacity: 1;
}

/* 逾期卡片加强样式 */
.credit-overdue {
  background: rgba(243, 156, 18, 0.05);
  border-left: 4px solid #f39c12 !important;
}

/* ==================== 基础样式 ==================== */
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
  max-width: 500px;
  border-radius: 20px;
  padding: 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-content.credit-modal {
  max-width: 1000px;
  width: 95%;
}

/* ==================== 加载状态 ==================== */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #80A492;
}

.loading-state i {
  font-size: 48px;
  margin-bottom: 16px;
}

.loading-state p {
  font-size: 16px;
}

/* ==================== 模态框头部 ==================== */
.modal-header {
  display: flex;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #D5EBE1;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: 20px 20px 0 0;
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

.credit-header {
  border-radius: 20px 20px 0 0;
}

/* ==================== 模态框主体 ==================== */
.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

.credit-management {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ==================== 统计卡片 ==================== */
.credit-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 5px;
}

.stat-card {
  padding: 20px 15px;
  border-radius: 16px;
  text-align: center;
  border: 1px solid #D5EBE1;
  background: white;
  transition: all 0.3s;
  position: relative;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 5px;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-sub-label {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.total-card .stat-value {
  color: #80A492;
}

.payable-card .stat-value {
  color: #e74c3c;
}

.receivable-card .stat-value {
  color: #2ecc71;
}

.overdue-card .stat-value {
  color: #f39c12;
}

/* ==================== 标签切换 ==================== */
.credit-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  background: white;
  border-radius: 12px;
}

.tab-btn {
  flex: 1;
  min-width: 110px;
  padding: 12px 10px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  background: none;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-btn i {
  color: #99BCAC;
  transition: all 0.3s;
}

.tab-badge {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 6px;
  border-radius: 12px;
  color: #80A492;
  margin-left: 4px;
}

.tab-btn:hover {
  background-color: #D5EBE1;
  color: #80A492;
}

.tab-btn:hover i {
  color: #80A492;
}

.tab-btn.active {
  background-color: #80A492;
  color: white;
  border-color: #80A492;
}

.tab-btn.active i {
  color: white;
}

.tab-btn.active .tab-badge {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* ==================== 搜索框 ==================== */
.credit-search {
  margin-bottom: 5px;
}

.search-box {
  position: relative;
}

.search-box i {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #99BCAC;
  z-index: 1;
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 14px 15px 14px 45px;
  border: 1px solid #B1D5C8;
  border-radius: 30px;
  font-size: 15px;
  background-color: white;
  box-sizing: border-box;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.search-input::placeholder {
  color: #999;
}

/* ==================== 赊账列表 ==================== */
.credit-list {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 5px;
}

.credit-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #D5EBE1;
}

.section-header h3 {
  font-size: 18px;
  color: #80A492;
  margin: 0;
}

.section-header h3 i {
  margin-right: 8px;
  color: #80A492;
}

.section-total {
  font-size: 16px;
  font-weight: 600;
  color: #80A492;
}

/* ==================== 赊账卡片 ==================== */
.credit-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.credit-card {
  background: white;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  padding: 18px;
  transition: all 0.3s;
}

.credit-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
  transform: translateY(-2px);
}

.credit-card.payable {
  border-left: 4px solid #e74c3c;
}

.credit-card.receivable {
  border-left: 4px solid #2ecc71;
}

.credit-card.credit-overdue {
  border-left: 4px solid #f39c12;
  background: rgba(243, 156, 18, 0.02);
}

.credit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.credit-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.credit-title h4 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.credit-subtype,
.credit-channel {
  padding: 4px 10px;
  background: #D5EBE1;
  border-radius: 20px;
  font-size: 11px;
  color: #80A492;
}

.credit-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.badge-pending {
  background: #D5EBE1;
  color: #80A492;
}

.badge-paid {
  background: #2ecc71;
  color: white;
}

.badge-overdue {
  background: #f39c12;
  color: white;
}

.credit-amount {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.credit-amount.warning-text {
  color: #e74c3c;
}

.credit-amount.success-text {
  color: #2ecc71;
}

/* ==================== 信用信息 ==================== */
.credit-info {
  margin-bottom: 15px;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-label {
  width: 85px;
  color: #999;
}

.info-label i {
  width: 16px;
  margin-right: 4px;
  color: #99BCAC;
}

.info-value {
  flex: 1;
  color: #333;
}

.info-value.warning-text {
  color: #e74c3c;
  font-weight: 500;
}

.warning-text {
  color: #e74c3c !important;
}

.success-text {
  color: #2ecc71 !important;
}

.overdue-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: #f39c12;
  color: white;
  border-radius: 12px;
  font-size: 10px;
}

/* ==================== 信用信息面板 ==================== */
.credit-info-panel {
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
}

.credit-info-panel .info-row {
  margin-bottom: 6px;
}

.credit-info-panel .info-row:last-child {
  margin-bottom: 0;
}

.credit-info-panel .warning-text {
  color: #e74c3c;
  font-weight: 600;
  font-size: 16px;
}

.credit-info-panel .success-text {
  color: #2ecc71;
  font-weight: 600;
  font-size: 16px;
}

/* ==================== 操作按钮 ==================== */
.credit-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #D5EBE1;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #B1D5C8;
  border-radius: 20px;
  background: white;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.action-btn.repay {
  background: #e74c3c;
  border-color: #e74c3c;
  color: white;
}

.action-btn.repay:hover {
  background: #c0392b;
}

.action-btn.collect {
  background: #2ecc71;
  border-color: #2ecc71;
  color: white;
}

.action-btn.collect:hover {
  background: #27ae60;
}

.action-btn.detail:hover {
  background: #D5EBE1;
  color: #80A492;
  border-color: #80A492;
}

/* ==================== 表单样式 ==================== */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #80A492;
  margin-bottom: 8px;
}

.form-group label i {
  margin-right: 8px;
  width: 20px;
  color: #99BCAC;
}

.required {
  color: #e74c3c;
  margin-left: 4px;
}

.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  color: #333;
  transition: all 0.3s;
  background-color: white;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-select {
  width: 100%;
  padding: 12px 35px 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  color: #333;
  background-color: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2380A492' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
}

.form-select:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.input-group {
  display: flex;
  align-items: center;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  overflow: hidden;
  background: white;
}

.input-prefix {
  padding: 0 15px;
  background: rgba(213, 235, 225, 0.3);
  color: #80A492;
  font-weight: 600;
  font-size: 14px;
  height: 46px;
  display: flex;
  align-items: center;
  border-right: 1px solid #B1D5C8;
}

.input-group .form-input {
  flex: 1;
  border: none;
  border-radius: 0;
}

.input-group .form-input:focus {
  box-shadow: none;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
  padding-top: 10px;
  border-top: 1px solid #D5EBE1;
}

.btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background-color: #D5EBE1;
  color: #80A492;
}

.btn-primary:hover {
  background-color: #B1D5C8;
}

.btn-secondary {
  background-color: white;
  color: #80A492;
  border: 1px solid #B1D5C8;
}

.btn-secondary:hover {
  background-color: #f8fafc;
  border-color: #80A492;
}

/* ==================== 空状态 ==================== */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state i {
  font-size: 56px;
  color: #99BCAC;
  margin-bottom: 16px;
}

.empty-state p {
  margin-bottom: 8px;
  font-size: 16px;
}

.empty-state small {
  font-size: 13px;
  color: #B1D5C8;
}

/* ==================== 自定义滚动条 ==================== */
.modal-body::-webkit-scrollbar,
.credit-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.modal-body::-webkit-scrollbar-track,
.credit-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb,
.credit-list::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover,
.credit-list::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .credit-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .credit-cards {
    grid-template-columns: 1fr;
  }

  .credit-tabs {
    flex-direction: column;
  }

  .tab-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .modal-header {
    padding: 15px 20px;
  }

  .modal-header h3 {
    font-size: 18px;
  }

  .modal-body {
    padding: 20px;
  }

  .credit-stats {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 24px;
  }

  .form-actions {
    flex-direction: column;
  }

  .info-row {
    flex-direction: column;
    gap: 4px;
  }

  .info-label {
    width: 100%;
  }

  .credit-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .credit-actions {
    flex-wrap: wrap;
  }

  .action-btn {
    flex: 1 1 calc(50% - 4px);
  }
}
</style>