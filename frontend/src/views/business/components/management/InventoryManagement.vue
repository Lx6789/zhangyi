<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content inventory-modal">
      <div class="modal-header inventory-header">
        <i class="fas fa-boxes" style="color: #80A492;"></i>
        <h3>库存管理</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="inventory-management">
          <!-- 统计卡片 -->
          <div class="inventory-stats">
            <div class="stat-card total-card" @click="filterByStatus('all')">
              <div class="stat-value">{{ inventoryStats.total }}</div>
              <div class="stat-label">总商品数</div>
            </div>
            <div class="stat-card low-card" @click="filterByStatus('low')">
              <div class="stat-value">{{ inventoryStats.lowStock }}</div>
              <div class="stat-label">低库存</div>
            </div>
            <div class="stat-card expiring-card" @click="filterByStatus('expiring')">
              <div class="stat-value">{{ inventoryStats.expiring }}</div>
              <div class="stat-label">临期(7天)</div>
            </div>
            <div class="stat-card expired-card" @click="filterByStatus('expired')">
              <div class="stat-value">{{ inventoryStats.expired }}</div>
              <div class="stat-label">已过期</div>
            </div>
          </div>

          <!-- 搜索和操作栏 -->
          <div class="search-section">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                  v-model="searchKeyword"
                  type="text"
                  class="search-input"
                  placeholder="搜索商品名称、分类、供应商..."
                  @input="searchInventory"
              >
            </div>
          </div>

          <div class="action-buttons">
            <button class="btn btn-secondary" @click="showFilters = !showFilters">
              <i class="fas fa-filter"></i> 筛选
            </button>
            <button class="btn btn-primary" @click="openAddInventoryModal">
              <i class="fas fa-plus"></i> 新增库存
            </button>
            <button class="btn btn-secondary" @click="exportInventoryData">
              <i class="fas fa-download"></i> 导出
            </button>
          </div>

          <!-- 筛选选项 -->
          <div v-if="showFilters" class="filter-panel">
            <div class="filter-row">
              <!-- 分类选择 -->
              <div class="filter-select" @click="openCategoryFilter" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <span>{{ filters.category || '全部分类' }}</span>
                <i class="fas fa-chevron-down" style="font-size: 12px; opacity: 0.6;"></i>
              </div>
              <!-- 供应商选择 -->
              <div class="filter-select" @click="openSupplierFilter" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <span>{{ filters.supplier || '全部供应商' }}</span>
                <i class="fas fa-chevron-down" style="font-size: 12px; opacity: 0.6;"></i>
              </div>
              <!-- 位置选择 -->
              <div class="filter-select" @click="openLocationFilter" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <span>{{ filters.location || '全部存放位置' }}</span>
                <i class="fas fa-chevron-down" style="font-size: 12px; opacity: 0.6;"></i>
              </div>
            </div>
            <div class="filter-actions">
              <button class="btn btn-small btn-secondary" @click="resetFilters">重置</button>
              <button class="btn btn-small btn-primary" @click="applyFilters">应用</button>
            </div>
          </div>

          <!-- 库存列表 -->
          <div class="inventory-list">
            <div v-if="loading" class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>加载中...</p>
            </div>

            <div v-else-if="paginatedInventory.length === 0" class="empty-state">
              <i class="fas fa-box-open"></i>
              <p>暂无库存数据</p>
              <button class="btn btn-primary" @click="openAddInventoryModal">
                添加第一个库存
              </button>
            </div>

            <div v-else class="inventory-grid">
              <div v-for="item in paginatedInventory" :key="item.id" class="inventory-card"
                   :class="{
                     'low-stock': isLowStock(item),
                     'expiring': isExpiring(item.expiryDate),
                     'expired': isExpired(item.expiryDate)
                   }">
                <div class="inventory-header">
                  <div class="inventory-title">
                    <h4>{{ item.productName }}</h4>
                    <span class="inventory-category">{{ item.category }}</span>
                  </div>
                  <div class="inventory-actions">
                    <button class="icon-btn edit" @click="editInventory(item)" title="编辑">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" @click="confirmDeleteInventory(item)" title="删除">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div class="inventory-details">
                  <div class="detail-row">
                    <div class="detail-item">
                      <span class="detail-label">库存量：</span>
                      <span class="detail-value quantity" :class="{ 'warning': isLowStock(item) }">
                        {{ item.quantity }} {{ item.unit }}
                      </span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">最低库存：</span>
                      <span class="detail-value">{{ item.minStock || 0 }} {{ item.unit }}</span>
                    </div>
                  </div>

                  <div class="detail-row">
                    <div class="detail-item">
                      <span class="detail-label">成本价：</span>
                      <span class="detail-value">¥{{ formatNumber(item.costPrice || 0) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">售价：</span>
                      <span class="detail-value price">¥{{ formatNumber(item.sellingPrice || 0) }}</span>
                    </div>
                  </div>

                  <div class="detail-row" v-if="item.supplier">
                    <div class="detail-item">
                      <span class="detail-label">供应商：</span>
                      <span class="detail-value">{{ item.supplier }}</span>
                    </div>
                    <div class="detail-item" v-if="item.location">
                      <span class="detail-label">位置：</span>
                      <span class="detail-value">{{ item.location }}</span>
                    </div>
                  </div>

                  <div class="detail-row" v-if="item.expiryDate">
                    <div class="detail-item full-width">
                      <span class="detail-label">保质期：</span>
                      <span class="detail-value" :class="{
                        'warning': isExpiring(item.expiryDate),
                        'expired': isExpired(item.expiryDate)
                      }">
                        {{ formatDate(item.expiryDate) }}
                        <span v-if="isExpiring(item.expiryDate)" class="badge warning-badge">即将过期</span>
                        <span v-if="isExpired(item.expiryDate)" class="badge expired-badge">已过期</span>
                      </span>
                    </div>
                  </div>

                  <div class="detail-row" v-if="item.note">
                    <div class="detail-item full-width">
                      <span class="detail-label">备注：</span>
                      <span class="detail-value note">{{ item.note }}</span>
                    </div>
                  </div>

                  <!-- 快捷操作 -->
                  <div class="inventory-footer">
                    <button class="quick-action-btn" @click="adjustStock(item, 'in')">
                      <i class="fas fa-plus-circle"></i> 入库
                    </button>
                    <button class="quick-action-btn" @click="adjustStock(item, 'out')">
                      <i class="fas fa-minus-circle"></i> 出库
                    </button>
                    <button class="quick-action-btn" @click="viewHistory(item)">
                      <i class="fas fa-history"></i> 记录
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 分页 -->
            <div v-if="totalPages > 1" class="pagination">
              <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
                <i class="fas fa-chevron-left"></i>
              </button>
              <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
              <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 新增/编辑库存模态框 - 优化为先选分类再选商品 -->
  <div class="modal" :class="{ active: addEditModalVisible }" @click="closeAddEditOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas" :class="editingId ? 'fa-edit' : 'fa-plus-circle'" style="color: #80A492;"></i>
        <h3>{{ editingId ? '编辑库存' : '新增库存' }}</h3>
        <button class="modal-close" @click="closeAddEditModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="saveInventory">
          <!-- 先选择分类 -->
          <div class="form-group">
            <label><i class="fas fa-tags"></i> 商品分类 <span class="required">*</span></label>
            <div class="category-select-wrapper">
              <div
                  class="form-select"
                  required
                  @click="openCategorySelect"
                  style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;"
              >
                <span>{{ form.selectedCategory || '请选择分类' }}</span>
                <i class="fas fa-chevron-down" style="font-size: 12px; opacity: 0.6;"></i>
              </div>
              <button
                  type="button"
                  class="icon-btn small"
                  @click="openCategoryManagement"
                  title="管理分类"
              >
                <i class="fas fa-cog"></i>
              </button>
            </div>
            <div v-if="sortedCategories.length === 0" class="form-hint">
              暂无分类，请先
              <button type="button" class="text-link" @click="openCategoryManagement">添加分类</button>
            </div>
          </div>

          <!-- 再选择该分类下的商品 -->
          <div class="form-group" v-if="form.selectedCategory">
            <label><i class="fas fa-box"></i> 选择商品 <span class="required">*</span></label>
            <div class="product-select-wrapper">
              <div
                  class="form-select"
                  required
                  @click="openProductSelect"
                  :disabled="filteredProductsByCategory.length === 0"
                  style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;"
              >
                <span>{{ form.productId ? selectedProductLabel : '请选择商品' }}</span>
                <i class="fas fa-chevron-down" style="font-size: 12px; opacity: 0.6;"></i>
              </div>
              <button
                  v-if="filteredProductsByCategory.length === 0"
                  type="button"
                  class="quick-add-btn"
                  @click="openQuickAddProduct"
                  title="快速新增商品"
              >
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <div v-if="filteredProductsByCategory.length === 0" class="form-hint">
              该分类下暂无商品，请先
              <button type="button" class="text-link" @click="openQuickAddProduct">添加商品</button>
            </div>
          </div>

          <!-- 商品信息卡片（自动填充） -->
          <div v-if="form.productId" class="product-info-card">
            <div class="info-header">
              <i class="fas fa-info-circle"></i>
              <span>商品信息</span>
            </div>
            <div class="info-row">
              <span class="info-label">商品名称：</span>
              <span class="info-value">{{ form.productName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">分类：</span>
              <span class="info-value">{{ form.category }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">单位：</span>
              <span class="info-value">{{ form.unit }}</span>
            </div>
            <div class="info-row" v-if="form.sellingPrice">
              <span class="info-label">参考售价：</span>
              <span class="info-value price">¥{{ formatNumber(form.sellingPrice) }}</span>
            </div>
          </div>

          <!-- 库存数量 -->
          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-weight"></i> 数量 <span class="required">*</span></label>
              <input
                  v-model="form.quantity"
                  type="number"
                  class="form-input"
                  placeholder="例如：100"
                  min="0"
                  step="0.01"
                  required
              >
            </div>
            <div class="form-group">
              <label><i class="fas fa-balance-scale"></i> 单位</label>
              <input
                  v-model="form.unit"
                  type="text"
                  class="form-input"
                  readonly
              >
            </div>
          </div>

          <!-- 价格信息 -->
          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-yen-sign"></i> 成本价 (元)</label>
              <div class="input-group">
                <span class="input-prefix">¥</span>
                <input
                    v-model="form.costPrice"
                    type="number"
                    class="form-input"
                    placeholder="例如：2.5"
                    min="0"
                    step="0.01"
                >
              </div>
            </div>
            <div class="form-group">
              <label><i class="fas fa-yen-sign"></i> 售价 (元)</label>
              <div class="input-group">
                <span class="input-prefix">¥</span>
                <input
                    v-model="form.sellingPrice"
                    type="number"
                    class="form-input"
                    placeholder="例如：3.5"
                    min="0"
                    step="0.01"
                >
              </div>
            </div>
          </div>

          <!-- 供应商和位置 -->
          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-truck"></i> 供应商</label>
              <input
                  v-model="form.supplier"
                  type="text"
                  class="form-input"
                  placeholder="例如：本地菜农"
                  list="supplier-list"
              >
              <datalist id="supplier-list">
                <option v-for="sup in uniqueSuppliers" :key="sup" :value="sup"></option>
              </datalist>
            </div>
            <div class="form-group">
              <label><i class="fas fa-map-marker-alt"></i> 存放位置</label>
              <input
                  v-model="form.location"
                  type="text"
                  class="form-input"
                  placeholder="例如：冷库A区"
                  list="location-list"
              >
              <datalist id="location-list">
                <option v-for="loc in uniqueLocations" :key="loc" :value="loc"></option>
              </datalist>
            </div>
          </div>

          <!-- 预警和保质期 -->
          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-exclamation-triangle"></i> 最低库存预警</label>
              <input
                  v-model="form.minStock"
                  type="number"
                  class="form-input"
                  placeholder="例如：10"
                  min="0"
                  step="1"
              >
            </div>
            <div class="form-group">
              <label><i class="fas fa-calendar-alt"></i> 保质期</label>
              <div class="date-input-wrapper" @click="openExpiryDatePicker">
                <input
                    v-model="form.expiryDate"
                    type="text"
                    class="form-input"
                    placeholder="点击选择保质期"
                    readonly
                >
                <i class="fas fa-calendar-alt date-icon"></i>
              </div>
            </div>
          </div>

          <!-- 备注 -->
          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注</label>
            <textarea
                v-model="form.note"
                class="form-input form-textarea"
                placeholder="其他需要记录的信息..."
                rows="3"
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeAddEditModal">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> {{ editingId ? '保存修改' : '添加库存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 库存调整模态框 - 修改版：添加出库数量检查 -->
  <div class="modal" :class="{ active: adjustModalVisible }" @click="closeAdjustOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas" :class="adjustType === 'in' ? 'fa-plus-circle' : 'fa-minus-circle'" style="color: #80A492;"></i>
        <h3>{{ adjustType === 'in' ? '入库' : '出库' }} - {{ selectedItem?.productName }}</h3>
        <button class="modal-close" @click="adjustModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="submitAdjust">
          <div class="form-group">
            <label><i class="fas fa-weight"></i> 调整数量 <span class="required">*</span></label>
            <div class="input-group">
              <span class="input-prefix">{{ adjustType === 'in' ? '+' : '-' }}</span>
              <input
                  v-model="adjustForm.quantity"
                  type="number"
                  class="form-input"
                  :placeholder="adjustType === 'in' ? '入库数量' : '出库数量'"
                  min="0.01"
                  step="0.01"
                  :max="adjustType === 'out' ? selectedItem?.quantity : undefined"
                  required
              >
            </div>
            <!-- 添加当前库存提示和最大数量限制 -->
            <div class="stock-info" v-if="adjustType === 'out' && selectedItem">
              <span class="stock-hint">当前库存：{{ selectedItem.quantity }} {{ selectedItem.unit }}</span>
              <span class="stock-warning" v-if="parseFloat(adjustForm.quantity) > selectedItem.quantity">
                <i class="fas fa-exclamation-triangle"></i> 出库数量不能大于当前库存
              </span>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-calendar-alt"></i> 日期</label>
            <div class="date-input-wrapper" @click="openAdjustDatePicker">
              <input
                  v-model="adjustForm.date"
                  type="text"
                  class="form-input"
                  placeholder="点击选择日期"
                  readonly
              >
              <i class="fas fa-calendar-alt date-icon"></i>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-tag"></i> 类型</label>
            <div
                class="form-select"
                @click="openAdjustTypeSelect"
                style="cursor: pointer; display: flex; align-items: center; justify-content: space-between;"
            >
              <span>{{ adjustForm.type }}</span>
              <i class="fas fa-chevron-down" style="font-size: 12px; opacity: 0.6;"></i>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注</label>
            <input v-model="adjustForm.note" type="text" class="form-input" placeholder="例如：批次号、原因等">
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="adjustModalVisible = false">
              取消
            </button>
            <button
                type="submit"
                class="btn btn-primary"
                :disabled="isAdjustSubmitDisabled"
            >
              <i class="fas fa-check"></i> 确认调整
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 库存历史模态框 -->
  <div class="modal" :class="{ active: historyModalVisible }" @click="closeHistoryOnOverlay($event)">
    <div class="modal-content history-modal">
      <div class="modal-header">
        <i class="fas fa-history" style="color: #80A492;"></i>
        <h3>{{ selectedItem?.productName }} - 库存记录</h3>
        <button class="modal-close" @click="historyModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="inventory-history">
          <!-- 当前库存摘要 -->
          <div class="current-stats">
            <div class="stat-item">
              <span class="stat-label">当前库存</span>
              <span class="stat-value">{{ selectedItem?.quantity }} {{ selectedItem?.unit }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">成本均价</span>
              <span class="stat-value">¥{{ formatNumber(selectedItem?.costPrice || 0) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">库存总值</span>
              <span class="stat-value">¥{{ formatNumber((selectedItem?.quantity || 0) * (selectedItem?.costPrice || 0)) }}</span>
            </div>
          </div>

          <!-- 记录列表 -->
          <div class="history-list">
            <div v-if="historyLoading" class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>加载中...</p>
            </div>

            <div v-else-if="history.length === 0" class="empty-state">
              <i class="fas fa-history"></i>
              <p>暂无历史记录</p>
            </div>

            <div v-else class="history-items">
              <div v-for="record in history" :key="record.id" class="history-item"
                   :class="record.type === 'in' ? 'history-in' : 'history-out'">
                <div class="history-icon">
                  <i :class="record.type === 'in' ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
                </div>
                <div class="history-content">
                  <div class="history-header">
                    <span class="history-type">{{ record.adjustType || (record.type === 'in' ? '入库' : '出库') }}</span>
                    <span class="history-date">{{ formatDateTime(record.date) }}</span>
                  </div>
                  <div class="history-detail">
                    <span class="history-quantity" :class="record.type === 'in' ? 'text-success' : 'text-danger'">
                      {{ record.type === 'in' ? '+' : '-' }}{{ record.quantity }} {{ selectedItem?.unit }}
                    </span>
                    <span class="history-before">{{ record.beforeQuantity }} → {{ record.afterQuantity }}</span>
                  </div>
                  <div v-if="record.note" class="history-note">{{ record.note }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 快速新增商品模态框 -->
  <QuickAddProductModal
      v-model:visible="quickAddProductVisible"
      :categories="categories"
      @success="handleQuickAddProductSuccess"
      @open-category="openCategoryManagement"
  />

  <!-- 删除确认模态框 -->
  <div class="modal confirm-modal" :class="{ active: deleteConfirmVisible }" @click="closeConfirmOnOverlay($event)">
    <div class="modal-content small">
      <div class="confirm-header">
        <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
        <h3>确认删除</h3>
        <button class="modal-close" @click="deleteConfirmVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="confirm-body">
        <p>{{ deleteConfirmMessage }}</p>
        <p class="warning-text">此操作不可恢复！</p>
      </div>
      <div class="confirm-actions">
        <button class="btn btn-secondary" @click="deleteConfirmVisible = false">
          取消
        </button>
        <button class="btn btn-danger" @click="confirmDelete">
          <i class="fas fa-trash"></i> 确认删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import dateHelper from '@/services/utils/date-helper.service.js'
import QuickAddProductModal from '../modals/QuickAddProductModal.vue'
import { notificationService } from "@/services/index.js"
import inventoryService from "@/services/api/business/inventory.service.js";
import baseService from "@/services/api/business/base.service.js";
import businessCacheService from "@/services/cache/business-cache.service.js";
import { Export } from '@/services/data_migration/export.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  products: {
    type: Array,
    default: () => []
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'update', 'open-category'])

// ==================== 状态 ====================
const inventory = ref([])
const filteredInventory = ref([])
const searchKeyword = ref('')
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(12)
const showFilters = ref(false)

// 筛选条件
const filters = reactive({
  category: '',
  supplier: '',
  location: '',
  status: 'all'
})

// 新增/编辑相关
const addEditModalVisible = ref(false)
const editingId = ref('')
const quickAddProductVisible = ref(false)
const form = reactive({
  selectedCategory: '',
  productId: '',
  productName: '',
  category: '',
  quantity: 0,
  unit: '斤',
  costPrice: null,
  sellingPrice: null,
  supplier: '',
  location: '',
  minStock: null,
  expiryDate: '',
  note: ''
})
const selectedProductLabel = ref('')

// 调整相关
const adjustModalVisible = ref(false)
const adjustType = ref('in')
const selectedItem = ref(null)
const adjustForm = reactive({
  quantity: '',
  date: dateHelper.getTodayString(),
  type: '采购入库',
  note: ''
})

// 历史记录相关
const historyModalVisible = ref(false)
const history = ref([])
const historyLoading = ref(false)

// 删除确认相关
const deleteConfirmVisible = ref(false)
const deleteConfirmMessage = ref('')
const deleteConfirmItem = ref(null)

// ==================== 计算属性 ====================

// 分类名称（排序后）
const sortedCategories = computed(() => {
  return [...props.categories].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return (a.sortOrder || 999) - (b.sortOrder || 999)
  })
})

// 根据选择的分类筛选商品
const filteredProductsByCategory = computed(() => {
  if (!form.selectedCategory) return []
  return props.products.filter(p => p.category === form.selectedCategory)
})

// 分类名称列表（用于筛选）
const categoryNames = computed(() => {
  return props.categories.map(c => c.name).sort()
})

// 库存统计 - 使用业务服务
const inventoryStats = computed(() => {
  return inventoryService.getInventoryStats(inventory.value)
})

// 唯一供应商列表 - 使用业务服务
const uniqueSuppliers = computed(() => {
  return inventoryService.getUniqueSuppliers(inventory.value)
})

// 唯一存放位置列表 - 使用业务服务
const uniqueLocations = computed(() => {
  return inventoryService.getUniqueLocations(inventory.value)
})

// 分页数据
const paginatedInventory = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredInventory.value.slice(start, end)
})

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredInventory.value.length / pageSize.value)
})

// 计算属性：判断提交按钮是否禁用
const isAdjustSubmitDisabled = computed(() => {
  if (!selectedItem.value) return true
  if (!adjustForm.quantity || parseFloat(adjustForm.quantity) <= 0) return true

  if (adjustType.value === 'out') {
    const currentQuantity = selectedItem.value.quantity || 0
    const adjustQuantity = parseFloat(adjustForm.quantity) || 0
    return adjustQuantity > currentQuantity
  }

  return false
})

// ==================== 自定义日期选择器方法 ====================

/**
 * 打开保质期日期选择器（新增/编辑表单）
 */
const openExpiryDatePicker = async () => {
  const date = await notificationService.datePicker({
    title: '选择保质期',
    defaultDate: form.expiryDate || new Date(),
    minDate: new Date().toISOString().split('T')[0] // 不能选今天之前的日期
  })
  if (date) {
    form.expiryDate = date
  }
}

/**
 * 打开调整日期选择器
 */
const openAdjustDatePicker = async () => {
  const date = await notificationService.datePicker({
    title: '选择调整日期',
    defaultDate: adjustForm.date || new Date()
  })
  if (date) {
    adjustForm.date = date
  }
}

// ==================== 辅助函数（使用业务服务） ====================

const isLowStock = (item) => {
  return inventoryService.isLowStock(item)
}

const isExpiring = (expiryDate) => {
  return inventoryService.isExpiring(expiryDate)
}

const isExpired = (expiryDate) => {
  return inventoryService.isExpired(expiryDate)
}

const formatNumber = (num) => {
  return baseService.formatNumber(num)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateTime = (dateStr) => {
  return baseService.formatDateTime(dateStr)
}

// ==================== 自定义选择器方法 ====================

// 筛选面板 - 分类选择
const openCategoryFilter = async () => {
  const items = [
    { label: '全部分类', value: '' },
    ...categoryNames.value.map(cat => ({ label: cat, value: cat }))
  ]
  const result = await notificationService.selectList({
    title: '选择分类',
    items
  })
  if (result !== null) {
    filters.category = result
    applyFilters()
  }
}

// 筛选面板 - 供应商选择
const openSupplierFilter = async () => {
  const items = [
    { label: '全部供应商', value: '' },
    ...uniqueSuppliers.value.map(sup => ({ label: sup, value: sup }))
  ]
  const result = await notificationService.selectList({
    title: '选择供应商',
    items
  })
  if (result !== null) {
    filters.supplier = result
    applyFilters()
  }
}

// 筛选面板 - 位置选择
const openLocationFilter = async () => {
  const items = [
    { label: '全部存放位置', value: '' },
    ...uniqueLocations.value.map(loc => ({ label: loc, value: loc }))
  ]
  const result = await notificationService.selectList({
    title: '选择存放位置',
    items
  })
  if (result !== null) {
    filters.location = result
    applyFilters()
  }
}

// 新增/编辑 - 分类选择
const openCategorySelect = async () => {
  if (sortedCategories.value.length === 0) {
    notificationService.showNotification('暂无分类，请先添加分类', 'warning')
    return
  }
  const items = sortedCategories.value.map(cat => ({
    label: cat.name,
    value: cat.name
  }))
  const result = await notificationService.selectList({
    title: '选择商品分类',
    items
  })
  if (result !== null) {
    form.selectedCategory = result
    onCategorySelected()
  }
}

// 新增/编辑 - 商品选择
const openProductSelect = async () => {
  if (filteredProductsByCategory.value.length === 0) {
    notificationService.showNotification('该分类下暂无商品', 'warning')
    return
  }
  const items = filteredProductsByCategory.value.map(p => ({
    label: `${p.name} (${p.unit})`,
    value: p.id
  }))
  const result = await notificationService.selectList({
    title: '选择商品',
    items
  })
  if (result !== null) {
    form.productId = result
    selectedProductLabel.value = items.find(item => item.value === result)?.label || ''
    onProductSelected()
  }
}

// 库存调整 - 类型选择
const openAdjustTypeSelect = async () => {
  const items = [
    { label: '采购入库', value: '采购入库' },
    { label: '销售出库', value: '销售出库' },
    { label: '盘点调整', value: '盘点调整' },
    { label: '报损出库', value: '报损出库' },
    { label: '退货入库', value: '退货入库' }
  ]
  const result = await notificationService.selectList({
    title: '选择调整类型',
    items
  })
  if (result !== null) {
    adjustForm.type = result
  }
}

// ==================== 方法 ====================

// 加载库存数据
const loadInventory = async () => {
  loading.value = true
  try {
    inventory.value = await inventoryService.getAllInventory()
    applyFilters()
  } catch (error) {
    console.error('加载库存失败:', error)
    notificationService.showNotification('加载库存失败', 'error')
  } finally {
    loading.value = false
  }
}

// 应用筛选条件 - 使用业务服务
const applyFilters = () => {
  filteredInventory.value = inventoryService.filterInventory(inventory.value, {
    keyword: searchKeyword.value,
    category: filters.category,
    supplier: filters.supplier,
    location: filters.location,
    status: filters.status
  })
  currentPage.value = 1
}

// 搜索库存
const searchInventory = () => {
  applyFilters()
}

// 按状态筛选
const filterByStatus = (status) => {
  filters.status = status
  applyFilters()
}

// 重置筛选
const resetFilters = () => {
  filters.category = ''
  filters.supplier = ''
  filters.location = ''
  filters.status = 'all'
  searchKeyword.value = ''
  applyFilters()
}

// 打开分类管理
const openCategoryManagement = () => {
  emit('open-category')
}

// 打开快速新增商品
const openQuickAddProduct = () => {
  quickAddProductVisible.value = true
}

// 快速新增商品成功
const handleQuickAddProductSuccess = async () => {
  quickAddProductVisible.value = false
  emit('update')
  await new Promise(resolve => setTimeout(resolve, 500))
  if (form.selectedCategory && filteredProductsByCategory.value.length > 0) {
    form.productId = filteredProductsByCategory.value[filteredProductsByCategory.value.length - 1].id
    selectedProductLabel.value = `${filteredProductsByCategory.value[filteredProductsByCategory.value.length - 1].name} (${filteredProductsByCategory.value[filteredProductsByCategory.value.length - 1].unit})`
    onProductSelected()
  }
}

// 选择分类
const onCategorySelected = () => {
  form.productId = ''
  selectedProductLabel.value = ''
  form.productName = ''
  form.category = form.selectedCategory
  form.unit = '斤'
  form.sellingPrice = null
}

// 选择商品
const onProductSelected = () => {
  if (!form.productId) {
    form.productName = ''
    form.unit = '斤'
    form.sellingPrice = null
    return
  }

  const product = props.products.find(p => p.id === form.productId)
  if (product) {
    form.productName = product.name
    form.category = product.category
    form.unit = product.unit || '斤'
    form.sellingPrice = product.defaultPrice || null

    if (!editingId.value) {
      const existingInventory = inventory.value.find(i => i.productId === product.id)
      if (existingInventory) {
        form.costPrice = existingInventory.costPrice
      }
    }
  }
}

// 打开新增库存模态框
const openAddInventoryModal = () => {
  editingId.value = ''
  resetForm()
  addEditModalVisible.value = true
}

// 重置表单
const resetForm = () => {
  form.selectedCategory = ''
  form.productId = ''
  selectedProductLabel.value = ''
  form.productName = ''
  form.category = ''
  form.quantity = 0
  form.unit = '斤'
  form.costPrice = null
  form.sellingPrice = null
  form.supplier = ''
  form.location = ''
  form.minStock = null
  form.expiryDate = ''
  form.note = ''
}

// 编辑库存
const editInventory = (item) => {
  editingId.value = item.id
  const product = props.products.find(p => p.id === item.productId)
  form.selectedCategory = product?.category || item.category
  form.productId = item.productId
  selectedProductLabel.value = product ? `${product.name} (${product.unit})` : ''
  form.productName = item.productName
  form.category = item.category
  form.quantity = item.quantity
  form.unit = item.unit
  form.costPrice = item.costPrice
  form.sellingPrice = item.sellingPrice
  form.supplier = item.supplier
  form.location = item.location
  form.minStock = item.minStock
  form.expiryDate = item.expiryDate || ''
  form.note = item.note
  addEditModalVisible.value = true
}

// 保存库存 - 使用业务服务
const saveInventory = async () => {
  if (!form.selectedCategory) {
    notificationService.showNotification('请选择商品分类', 'error')
    return
  }

  if (!form.productId) {
    notificationService.showNotification('请选择商品', 'error')
    return
  }

  if (!form.quantity && form.quantity !== 0) {
    notificationService.showNotification('请输入数量', 'error')
    return
  }

  try {
    const inventoryData = {
      productId: form.productId,
      productName: form.productName,
      category: form.category,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit || '斤',
      costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
      sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : null,
      supplier: form.supplier || null,
      location: form.location || null,
      minStock: form.minStock ? parseInt(form.minStock) : null,
      expiryDate: form.expiryDate || null,
      note: form.note || null
    }

    if (editingId.value) {
      await businessCacheService.updateInventoryItem(editingId.value, inventoryData)
      notificationService.showNotification('库存更新成功', 'success')
    } else {
      await inventoryService.addInventoryItem(inventoryData)
      notificationService.showNotification('库存添加成功', 'success')
    }

    await loadInventory()
    emit('update')
    closeAddEditModal()
  } catch (error) {
    console.error('保存库存失败:', error)
    notificationService.showNotification(error.message || '保存库存失败', 'error')
  }
}

// 打开库存调整模态框
const adjustStock = (item, type) => {
  selectedItem.value = item
  adjustType.value = type
  adjustForm.quantity = ''
  adjustForm.date = dateHelper.getTodayString()
  adjustForm.type = type === 'in' ? '采购入库' : '销售出库'
  adjustForm.note = ''
  adjustModalVisible.value = true
}

// 提交库存调整 - 使用业务服务
const submitAdjust = async () => {
  if (!selectedItem.value) return

  const validation = inventoryService.validateAdjustQuantity(
      selectedItem.value,
      adjustType.value,
      adjustForm.quantity
  )

  if (!validation.valid) {
    notificationService.showNotification(validation.message, 'error')
    return
  }

  try {
    await inventoryService.adjustInventory(
        selectedItem.value,
        adjustType.value,
        adjustForm.quantity,
        {
          adjustType: adjustForm.type,
          date: adjustForm.date,
          note: adjustForm.note
        }
    )

    await loadInventory()
    adjustModalVisible.value = false
    notificationService.showNotification('库存调整成功', 'success')
  } catch (error) {
    console.error('库存调整失败:', error)
    notificationService.showNotification(error.message || '库存调整失败', 'error')
  }
}

// 查看历史记录 - 使用业务服务
const viewHistory = async (item) => {
  selectedItem.value = item
  historyLoading.value = true
  try {
    history.value = await inventoryService.getInventoryHistory(item.id)
    historyModalVisible.value = true
  } catch (error) {
    console.error('加载历史记录失败:', error)
    notificationService.showNotification('加载历史记录失败', 'error')
  } finally {
    historyLoading.value = false
  }
}

// 确认删除库存
const confirmDeleteInventory = (item) => {
  deleteConfirmMessage.value = `确定要删除库存项 "${item.productName}" 吗？`
  deleteConfirmItem.value = item
  deleteConfirmVisible.value = true
}

// 执行删除 - 使用业务服务
const confirmDelete = async () => {
  if (!deleteConfirmItem.value) return

  try {
    await businessCacheService.deleteInventoryItem(deleteConfirmItem.value.id)
    await loadInventory()
    emit('update')
    notificationService.showNotification('删除成功', 'success')
  } catch (error) {
    console.error('删除失败:', error)
    notificationService.showNotification('删除失败', 'error')
  } finally {
    deleteConfirmVisible.value = false
    deleteConfirmItem.value = null
  }
}

// 导出库存数据 - 使用业务服务
const exportInventoryData = async () => {
  try {
    const exportModule = Export()
    const data = await exportModule.exportInventory()

    if (!data || data.length === 0) {
      notificationService.showNotification('没有可导出的数据', 'warning')
      return
    }

    const fileName = exportModule.generateFileName('库存报表')
    await exportModule.exportToExcel(data, fileName, '库存数据')
    notificationService.showNotification('导出成功', 'success')
  } catch (error) {
    console.error('导出失败:', error)
    notificationService.showNotification('导出失败', 'error')
  }
}

// 关闭模态框
const close = () => {
  emit('update:visible', false)
}

const closeAddEditModal = () => {
  addEditModalVisible.value = false
  editingId.value = ''
  resetForm()
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

const closeAddEditOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    closeAddEditModal()
  }
}

const closeAdjustOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    adjustModalVisible.value = false
  }
}

const closeHistoryOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    historyModalVisible.value = false
  }
}

const closeConfirmOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    deleteConfirmVisible.value = false
  }
}

// ==================== 监听器 ====================

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadInventory()
    currentPage.value = 1
  }
})

watch([filters, searchKeyword], () => {
  applyFilters()
})

watch(currentPage, () => {
  const grid = document.querySelector('.inventory-grid')
  if (grid) grid.scrollTop = 0
})

watch(() => props.categories, (newVal) => {
  console.log('InventoryManagement 接收到分类:', newVal)
}, { immediate: true, deep: true })

// ==================== 初始化 ====================
onMounted(() => {
  if (props.visible) {
    loadInventory()
  }
})
</script>

<style scoped>
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

.modal-content.inventory-modal {
  max-width: 1000px;
  width: 95%;
}

.modal-content.history-modal {
  max-width: 700px;
}

.modal-content.small {
  max-width: 400px;
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

.inventory-header {
  border-radius: 20px 20px 0 0;
}

/* ==================== 模态框主体 ==================== */
.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

.inventory-management {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ==================== 统计卡片 ==================== */
.inventory-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 5px;
}

.stat-card {
  padding: 20px 15px;
  border-radius: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #D5EBE1;
  background: white;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
}

.total-card .stat-value {
  color: #3498db;
}

.low-card .stat-value {
  color: #f39c12;
}

.expiring-card .stat-value {
  color: #f1c40f;
}

.expired-card .stat-value {
  color: #e74c3c;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

/* ==================== 搜索区域 ==================== */
.search-section {
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

/* ==================== 操作按钮 ==================== */
.action-buttons {
  display: flex;
  gap: 15px;
  margin-bottom: 5px;
}

.btn {
  padding: 14px 20px;
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

.btn-small {
  padding: 8px 16px;
  font-size: 13px;
  flex: none;
}

/* ==================== 筛选面板 ==================== */
.filter-panel {
  background-color: #f8fafc;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 10px;
  border: 1px solid #D5EBE1;
}

.filter-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.filter-select {
  flex: 1;
  min-width: 180px;
  padding: 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  background-color: white;
}

.filter-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* ==================== 库存网格 ==================== */
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 5px;
}

.inventory-card {
  background-color: white;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  padding: 18px;
  transition: all 0.3s;
  position: relative;
}

.inventory-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
  transform: translateY(-2px);
}

.inventory-card.low-stock {
  border-left: 4px solid #f39c12;
}

.inventory-card.expiring {
  border-left: 4px solid #f1c40f;
}

.inventory-card.expired {
  border-left: 4px solid #e74c3c;
}

.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #D5EBE1;
}

.inventory-title h4 {
  font-size: 16px;
  font-weight: 600;
  color: #80A492;
  margin: 0 0 4px 0;
}

.inventory-category {
  font-size: 12px;
  color: #666;
  background-color: #D5EBE1;
  padding: 4px 10px;
  border-radius: 20px;
}

.inventory-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
}

.icon-btn.edit {
  color: #3498db;
}

.icon-btn.edit:hover {
  background-color: rgba(52, 152, 219, 0.1);
}

.icon-btn.delete {
  color: #e74c3c;
}

.icon-btn.delete:hover {
  background-color: rgba(231, 76, 60, 0.1);
}

.inventory-details {
  font-size: 13px;
}

.detail-row {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
}

.detail-item {
  flex: 1;
  display: flex;
  align-items: center;
}

.detail-item.full-width {
  flex: 0 0 100%;
}

.detail-label {
  color: #999;
  width: 70px;
  flex-shrink: 0;
  font-size: 12px;
}

.detail-value {
  color: #333;
  flex: 1;
  font-weight: 500;
}

.detail-value.price {
  color: #2ecc71;
  font-weight: 600;
}

.detail-value.quantity.warning {
  color: #f39c12;
  font-weight: 600;
}

.detail-value.warning {
  color: #f39c12;
  font-weight: 600;
}

.detail-value.expired {
  color: #e74c3c;
  font-weight: 600;
}

.detail-value .badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 10px;
  margin-left: 8px;
  color: white;
}

.warning-badge {
  background-color: #f39c12;
}

.expired-badge {
  background-color: #e74c3c;
}

.detail-value.note {
  font-style: italic;
  color: #666;
  word-break: break-word;
}

/* ==================== 库存底部操作 ==================== */
.inventory-footer {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #D5EBE1;
}

.quick-action-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #B1D5C8;
  border-radius: 20px;
  background: none;
  color: #80A492;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.quick-action-btn:hover {
  background-color: #D5EBE1;
}

/* ==================== 分页 ==================== */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
}

.page-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #B1D5C8;
  border-radius: 8px;
  background: white;
  color: #80A492;
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  background-color: #D5EBE1;
  border-color: #80A492;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}

/* ==================== 新增/编辑模态框样式 ==================== */
.category-select-wrapper,
.product-select-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.category-select-wrapper .form-select,
.product-select-wrapper .form-select {
  flex: 1;
}

.quick-add-btn {
  width: 42px;
  height: 42px;
  border: 1px dashed #80A492;
  border-radius: 12px;
  background: white;
  color: #80A492;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
}

.quick-add-btn:hover {
  background: #D5EBE1;
  border-style: solid;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.text-link {
  background: none;
  border: none;
  color: #80A492;
  text-decoration: underline;
  cursor: pointer;
  padding: 0 4px;
  font-size: 12px;
  font-weight: 500;
}

.text-link:hover {
  color: #608070;
}

.product-info-card {
  margin: 15px 0;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #D5EBE1;
  color: #80A492;
  font-weight: 500;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-label {
  width: 80px;
  color: #999;
}

.info-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.info-value.price {
  color: #2ecc71;
  font-weight: 600;
}

.icon-btn.small {
  width: 42px;
  height: 42px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  background: white;
  color: #80A492;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
}

.icon-btn.small:hover {
  background: #D5EBE1;
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

.form-input[readonly] {
  background-color: #f8fafc;
  cursor: pointer;
  color: #333;
  border-color: #D5EBE1;
}

.form-input[readonly]:hover {
  border-color: #80A492;
  background-color: rgba(128, 164, 146, 0.05);
}

.form-select {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  color: #333;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.form-select:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-select:hover {
  border-color: #80A492;
  background-color: #f8fafc;
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 0;
}

.form-row .form-group {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
  padding-top: 10px;
  border-top: 1px solid #D5EBE1;
}

/* ==================== 自定义日期选择器输入框样式 ==================== */
.date-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.date-input-wrapper .form-input {
  padding-right: 40px;
  cursor: pointer;
}

.date-input-wrapper .date-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #80A492;
  font-size: 16px;
  pointer-events: none;
  opacity: 0.7;
}

.date-input-wrapper .form-input[readonly] {
  cursor: pointer;
}

.date-input-wrapper .form-input[readonly]:hover + .date-icon,
.date-input-wrapper:hover .date-icon {
  opacity: 1;
}

/* ==================== 输入组样式 ==================== */
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

/* ==================== 新增样式：库存提示 ==================== */
.stock-info {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.stock-hint {
  color: #80A492;
  background: rgba(128, 164, 146, 0.1);
  padding: 4px 10px;
  border-radius: 16px;
}

.stock-warning {
  color: #e74c3c;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stock-warning i {
  font-size: 14px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #D5EBE1;
  color: #99BCAC;
}

.btn-primary:disabled:hover {
  background-color: #D5EBE1;
  transform: none;
  box-shadow: none;
}

/* 输入框超出最大值时的样式 */
.form-input:out-of-range {
  border-color: #e74c3c;
}

.form-input:out-of-range:focus {
  box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
}

/* ==================== 库存历史样式 ==================== */
.inventory-history {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.current-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 5px;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
}

.current-stats .stat-item {
  text-align: center;
}

.current-stats .stat-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.current-stats .stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #80A492;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  gap: 12px;
  padding: 15px;
  background-color: white;
  border-radius: 12px;
  border-left: 4px solid transparent;
  border: 1px solid #D5EBE1;
}

.history-in {
  border-left-color: #2ecc71;
}

.history-out {
  border-left-color: #e74c3c;
}

.history-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.history-in .history-icon {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.history-out .history-icon {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.history-content {
  flex: 1;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.history-type {
  font-size: 14px;
  font-weight: 600;
  color: #80A492;
}

.history-date {
  font-size: 12px;
  color: #999;
}

.history-detail {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.history-quantity {
  font-size: 14px;
  font-weight: 600;
}

.text-success {
  color: #2ecc71;
}

.text-danger {
  color: #e74c3c;
}

.history-before {
  font-size: 12px;
  color: #999;
}

.history-note {
  font-size: 12px;
  color: #666;
  font-style: italic;
}

/* ==================== 空状态和加载状态 ==================== */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state i {
  font-size: 56px;
  color: #99BCAC;
  margin-bottom: 16px;
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 16px;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.loading-state i {
  font-size: 48px;
  color: #80A492;
  margin-bottom: 16px;
}

.loading-state p {
  font-size: 16px;
}

/* ==================== 确认模态框样式 ==================== */
.confirm-modal .modal-content {
  text-align: center;
}

.confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 25px;
  border-bottom: 1px solid #D5EBE1;
}

.confirm-header i {
  font-size: 28px;
  color: #e74c3c;
}

.confirm-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
}

.confirm-body {
  padding: 25px;
}

.confirm-body p {
  font-size: 16px;
  color: #333;
  margin-bottom: 10px;
}

.warning-text {
  color: #e74c3c !important;
  font-size: 14px !important;
  font-weight: 500;
}

.confirm-actions {
  display: flex;
  gap: 15px;
  padding: 0 25px 25px;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
}

/* ==================== 自定义滚动条 ==================== */
.modal-body::-webkit-scrollbar,
.inventory-grid::-webkit-scrollbar,
.history-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.modal-body::-webkit-scrollbar-track,
.inventory-grid::-webkit-scrollbar-track,
.history-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb,
.inventory-grid::-webkit-scrollbar-thumb,
.history-list::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover,
.inventory-grid::-webkit-scrollbar-thumb:hover,
.history-list::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .inventory-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-buttons {
    flex-direction: column;
  }

  .filter-row {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
  }

  .inventory-grid {
    grid-template-columns: 1fr;
  }

  .detail-row {
    flex-direction: column;
    gap: 8px;
  }

  .inventory-footer {
    flex-wrap: wrap;
  }

  .current-stats {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .form-row {
    flex-direction: column;
    gap: 10px;
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

  .inventory-stats {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 24px;
  }

  .pagination {
    gap: 10px;
  }

  .page-btn {
    width: 32px;
    height: 32px;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .history-icon {
    align-self: center;
  }

  .history-detail {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .category-select-wrapper,
  .product-select-wrapper {
    flex-direction: column;
  }

  .category-select-wrapper .form-select,
  .product-select-wrapper .form-select {
    width: 100%;
  }

  .quick-add-btn,
  .icon-btn.small {
    width: 100%;
  }

  .confirm-actions {
    flex-direction: column;
  }
}
</style>