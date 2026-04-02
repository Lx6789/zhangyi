<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content purchase-modal">
      <div class="modal-header purchase-header">
        <i class="fas fa-truck" style="color: #80A492;"></i>
        <h3>采购管理</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="purchase-management">
          <!-- 统计卡片 -->
          <div class="purchase-stats">
            <div class="stat-card total-card" @click="filterByStatus('all')">
              <div class="stat-value">{{ stats.totalOrders }}</div>
              <div class="stat-label">总采购单</div>
            </div>
            <div class="stat-card pending-card" @click="filterByStatus('pending')">
              <div class="stat-value">{{ stats.pendingOrders }}</div>
              <div class="stat-label">待处理</div>
            </div>
            <div class="stat-card completed-card" @click="filterByStatus('completed')">
              <div class="stat-value">{{ stats.completedOrders }}</div>
              <div class="stat-label">已完成</div>
            </div>
            <div class="stat-card amount-card">
              <div class="stat-value">¥{{ formatNumber(stats.totalAmount) }}</div>
              <div class="stat-label">采购总额</div>
            </div>
          </div>

          <!-- 标签切换 -->
          <div class="purchase-tabs">
            <button
                class="tab-btn"
                :class="{ active: activeTab === 'orders' }"
                @click="activeTab = 'orders'"
            >
              <i class="fas fa-file-invoice"></i> 采购订单
            </button>
            <button
                class="tab-btn"
                :class="{ active: activeTab === 'suppliers' }"
                @click="activeTab = 'suppliers'"
            >
              <i class="fas fa-truck"></i> 供应商管理
            </button>
            <button
                class="tab-btn"
                :class="{ active: activeTab === 'history' }"
                @click="activeTab = 'history'"
            >
              <i class="fas fa-history"></i> 采购历史
            </button>
          </div>

          <!-- ==================== 采购订单标签页 ==================== -->
          <div v-if="activeTab === 'orders'" class="orders-section">
            <div class="section-header">
              <h3><i class="fas fa-file-invoice"></i> 采购订单列表</h3>
              <div class="header-buttons">
                <button class="btn-small btn-secondary" @click="exportPurchaseOrders">
                  <i class="fas fa-download"></i> 导出订单
                </button>
                <button class="btn-small btn-primary" @click="openAddOrderModal">
                  <i class="fas fa-plus"></i> 新建采购单
                </button>
              </div>
            </div>

            <!-- 订单筛选 -->
            <div class="filter-bar">
              <div class="search-box">
                <i class="fas fa-search"></i>
                <input
                    v-model="orderSearchKeyword"
                    type="text"
                    class="search-input"
                    placeholder="搜索订单号、供应商..."
                >
              </div>
              <select v-model="orderStatusFilter" class="filter-select">
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>

            <!-- 订单列表 -->
            <div class="orders-list">
              <div v-if="loading.orders" class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
              </div>

              <div v-else-if="filteredOrders.length === 0" class="empty-state">
                <i class="fas fa-file-invoice"></i>
                <p>暂无采购订单</p>
                <button class="btn-small btn-primary" @click="openAddOrderModal">
                  新建第一个采购单
                </button>
              </div>

              <div v-else class="order-cards">
                <div v-for="order in paginatedOrders" :key="order.id" class="order-card">
                  <div class="order-header">
                    <div class="order-title">
                      <h4>订单号: {{ order.orderNo }}</h4>
                      <span class="order-status" :class="order.status">
                        {{ purchaseService.getOrderStatusText(order.status) }}
                      </span>
                    </div>
                    <div class="order-actions">
                      <button class="icon-btn edit" @click="editOrder(order)" title="编辑">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="icon-btn delete" @click="confirmDeleteOrder(order)" title="删除">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div class="order-info">
                    <div class="info-row">
                      <span class="info-label">供应商：</span>
                      <span class="info-value">{{ getSupplierName(order.supplierId) }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">采购日期：</span>
                      <span class="info-value">{{ formatDate(order.orderDate) }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">预计送达：</span>
                      <span class="info-value" :class="{ 'warning-text': purchaseService.isOrderDelayed(order.expectedDate) }">
                        {{ formatDate(order.expectedDate) }}
                        <span v-if="purchaseService.isOrderDelayed(order.expectedDate)" class="delayed-tag">已延迟</span>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">商品数量：</span>
                      <span class="info-value">{{ order.items?.length || 0 }} 种</span>
                    </div>
                    <div class="info-row total-row">
                      <span class="info-label">订单总额：</span>
                      <span class="info-value price">¥{{ formatNumber(order.totalAmount) }}</span>
                    </div>
                    <div class="info-row" v-if="order.note">
                      <span class="info-label">备注：</span>
                      <span class="info-value note">{{ order.note }}</span>
                    </div>
                  </div>

                  <!-- 商品预览 -->
                  <div class="items-preview" v-if="order.items?.length">
                    <div class="preview-title">采购商品：</div>
                    <div class="preview-list">
                      <div v-for="(item, index) in order.items.slice(0, 3)" :key="index" class="preview-item">
                        <span class="item-name">{{ item.productName }}</span>
                        <span class="item-qty">{{ item.quantity }}{{ item.unit }}</span>
                        <span class="item-price">¥{{ formatNumber(item.price) }}</span>
                      </div>
                      <div v-if="order.items.length > 3" class="more-items">
                        等{{ order.items.length }}种商品
                      </div>
                    </div>
                  </div>

                  <div class="order-footer">
                    <button class="action-btn receive" @click="receiveOrder(order)" v-if="order.status === 'pending'">
                      <i class="fas fa-check-circle"></i> 收货
                    </button>
                    <button class="action-btn view" @click="viewOrderDetail(order)">
                      <i class="fas fa-eye"></i> 查看详情
                    </button>
                  </div>
                </div>
              </div>

              <!-- 分页 -->
              <div v-if="totalOrderPages > 1" class="pagination">
                <button class="page-btn" :disabled="orderPage === 1" @click="orderPage--">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <span class="page-info">{{ orderPage }} / {{ totalOrderPages }}</span>
                <button class="page-btn" :disabled="orderPage === totalOrderPages" @click="orderPage++">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- ==================== 供应商管理标签页 ==================== -->
          <div v-if="activeTab === 'suppliers'" class="suppliers-section">
            <div class="section-header">
              <h3><i class="fas fa-truck"></i> 供应商列表</h3>
              <div class="header-buttons">
                <button class="btn-small btn-secondary" @click="exportSuppliers">
                  <i class="fas fa-download"></i> 导出供应商
                </button>
                <button class="btn-small btn-primary" @click="openAddSupplierModal">
                  <i class="fas fa-plus"></i> 新增供应商
                </button>
              </div>
            </div>

            <!-- 供应商搜索 -->
            <div class="search-section">
              <div class="search-box">
                <i class="fas fa-search"></i>
                <input
                    v-model="supplierSearchKeyword"
                    type="text"
                    class="search-input"
                    placeholder="搜索供应商名称、联系人、电话..."
                >
              </div>
            </div>

            <!-- 供应商列表 -->
            <div class="supplier-list">
              <div v-if="loading.suppliers" class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
              </div>

              <div v-else-if="filteredSuppliers.length === 0" class="empty-state">
                <i class="fas fa-truck"></i>
                <p>暂无供应商</p>
                <button class="btn-small btn-primary" @click="openAddSupplierModal">
                  添加第一个供应商
                </button>
              </div>

              <div v-else class="supplier-grid">
                <div v-for="supplier in filteredSuppliers" :key="supplier.id" class="supplier-card">
                  <div class="supplier-header">
                    <h4>{{ supplier.name }}</h4>
                    <div class="supplier-actions">
                      <button class="icon-btn edit" @click="editSupplier(supplier)" title="编辑">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="icon-btn delete" @click="confirmDeleteSupplier(supplier)" title="删除">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div class="supplier-info">
                    <div class="info-row" v-if="supplier.contactPerson">
                      <span class="info-label">联系人：</span>
                      <span class="info-value">{{ supplier.contactPerson }}</span>
                    </div>
                    <div class="info-row" v-if="supplier.phone">
                      <span class="info-label">电话：</span>
                      <span class="info-value">{{ supplier.phone }}</span>
                    </div>
                    <div class="info-row" v-if="supplier.category">
                      <span class="info-label">类别：</span>
                      <span class="info-value">{{ supplier.category }}</span>
                    </div>
                    <div class="info-row" v-if="supplier.address">
                      <span class="info-label">地址：</span>
                      <span class="info-value">{{ supplier.address }}</span>
                    </div>
                    <div class="info-row" v-if="supplier.paymentTerms">
                      <span class="info-label">结算方式：</span>
                      <span class="info-value">{{ supplier.paymentTerms }}</span>
                    </div>
                    <div class="info-row stats-row">
                      <span class="info-label">采购次数：</span>
                      <span class="info-value">{{ supplier.purchaseCount || 0 }} 次</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">采购总额：</span>
                      <span class="info-value price">¥{{ formatNumber(supplier.totalAmount || 0) }}</span>
                    </div>
                    <div class="info-row" v-if="supplier.note">
                      <span class="info-label">备注：</span>
                      <span class="info-value note">{{ supplier.note }}</span>
                    </div>
                  </div>

                  <div class="supplier-footer">
                    <button class="action-btn" @click="createPurchaseOrder(supplier)">
                      <i class="fas fa-file-invoice"></i> 新建采购单
                    </button>
                    <button class="action-btn" @click="viewSupplierHistory(supplier)">
                      <i class="fas fa-history"></i> 采购记录
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ==================== 采购历史标签页 ==================== -->
          <div v-if="activeTab === 'history'" class="history-section">
            <div class="section-header">
              <h3><i class="fas fa-history"></i> 采购历史记录</h3>
              <div class="header-buttons">
                <button class="btn-small btn-secondary" @click="exportPurchaseHistory">
                  <i class="fas fa-download"></i> 导出历史
                </button>
              </div>
            </div>

            <!-- 历史记录筛选 -->
            <div class="filter-bar">
              <div class="search-box">
                <i class="fas fa-search"></i>
                <input
                    v-model="historySearchKeyword"
                    type="text"
                    class="search-input"
                    placeholder="搜索商品名称、供应商..."
                >
              </div>
              <select v-model="historySupplierFilter" class="filter-select">
                <option value="all">全部供应商</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>

            <!-- 日期范围筛选 -->
            <div class="date-range-filter">
              <div class="date-input-wrapper" @click="openDateRangePicker('start')">
                <input
                    :value="historyStartDate"
                    type="text"
                    class="date-input"
                    readonly
                    placeholder="开始日期"
                >
                <i class="fas fa-calendar-alt date-icon"></i>
              </div>
              <span>至</span>
              <div class="date-input-wrapper" @click="openDateRangePicker('end')">
                <input
                    :value="historyEndDate"
                    type="text"
                    class="date-input"
                    readonly
                    placeholder="结束日期"
                >
                <i class="fas fa-calendar-alt date-icon"></i>
              </div>
            </div>

            <!-- 历史记录列表 -->
            <div class="history-list">
              <div v-if="loading.history" class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
              </div>

              <div v-else-if="filteredHistory.length === 0" class="empty-state">
                <i class="fas fa-history"></i>
                <p>暂无采购历史记录</p>
              </div>

              <div v-else class="history-table">
                <table class="data-table">
                  <thead>
                  <tr>
                    <th>采购日期</th>
                    <th>订单号</th>
                    <th>供应商</th>
                    <th>商品名称</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>总额</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="record in filteredHistory" :key="record.id">
                    <td>{{ formatDate(record.purchaseDate) }}</td>
                    <td>{{ record.orderNo }}</td>
                    <td>{{ getSupplierName(record.supplierId) }}</td>
                    <td>{{ record.productName }}</td>
                    <td>{{ record.quantity }}{{ record.unit }}</td>
                    <td>¥{{ formatNumber(record.price) }}</td>
                    <td class="price">¥{{ formatNumber(record.totalAmount) }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== 新增/编辑供应商模态框 ==================== -->
  <div class="modal" :class="{ active: supplierModalVisible }" @click="closeSupplierModalOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas" :class="editingSupplier ? 'fa-user-edit' : 'fa-user-plus'" style="color: #80A492;"></i>
        <h3>{{ editingSupplier ? '编辑供应商' : '新增供应商' }}</h3>
        <button class="modal-close" @click="supplierModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="saveSupplier">
          <!-- 基本信息 -->
          <div class="form-group">
            <label><i class="fas fa-store"></i> 供应商名称 <span class="required">*</span></label>
            <input
                v-model="supplierForm.name"
                type="text"
                class="form-input"
                placeholder="例如：本地农产品批发市场有限公司"
                required
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-tag"></i> 供应商类别</label>
              <select v-model="supplierForm.category" class="form-select">
                <option value="" disabled>选择类别</option>
                <option v-for="cat in supplierCategories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label><i class="fas fa-file-invoice"></i> 税务登记号</label>
              <input
                  v-model="supplierForm.taxId"
                  type="text"
                  class="form-input"
                  placeholder="例如：912345678901234567"
              >
            </div>
          </div>

          <!-- 联系信息 -->
          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-user-tie"></i> 联系人</label>
              <input
                  v-model="supplierForm.contactPerson"
                  type="text"
                  class="form-input"
                  placeholder="例如：张经理"
              >
            </div>

            <div class="form-group">
              <label><i class="fas fa-phone-alt"></i> 联系电话</label>
              <input
                  v-model="supplierForm.phone"
                  type="tel"
                  class="form-input"
                  placeholder="例如：13800138000"
              >
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-envelope"></i> 电子邮箱</label>
              <input
                  v-model="supplierForm.email"
                  type="email"
                  class="form-input"
                  placeholder="例如：contact@example.com"
              >
            </div>

            <div class="form-group">
              <label><i class="fas fa-fax"></i> 传真</label>
              <input
                  v-model="supplierForm.fax"
                  type="text"
                  class="form-input"
                  placeholder="例如：010-12345678"
              >
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-map-marker-alt"></i> 详细地址</label>
            <input
                v-model="supplierForm.address"
                type="text"
                class="form-input"
                placeholder="例如：XX省XX市XX区XX路XX号XX大厦X层"
            >
          </div>

          <!-- 结算信息 -->
          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-credit-card"></i> 结算方式</label>
              <select v-model="supplierForm.paymentTerms" class="form-select">
                <option value="" disabled>选择结算方式</option>
                <option v-for="term in paymentTerms" :key="term" :value="term">
                  {{ term }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label><i class="fas fa-hourglass-half"></i> 账期（天）</label>
              <input
                  v-model="supplierForm.paymentDays"
                  type="number"
                  class="form-input"
                  placeholder="例如：30"
                  min="0"
                  max="180"
              >
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-university"></i> 开户银行</label>
              <input
                  v-model="supplierForm.bankName"
                  type="text"
                  class="form-input"
                  placeholder="例如：中国工商银行XX支行"
              >
            </div>

            <div class="form-group">
              <label><i class="fas fa-credit-card"></i> 银行账号</label>
              <input
                  v-model="supplierForm.bankAccount"
                  type="text"
                  class="form-input"
                  placeholder="例如：1234 5678 9012 3456 789"
              >
            </div>
          </div>

          <!-- 备注 -->
          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注信息</label>
            <textarea
                v-model="supplierForm.note"
                class="form-input form-textarea"
                placeholder="可填写特殊要求、合作历史、信用评级等备注信息..."
                rows="3"
                maxlength="200"
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="supplierModalVisible = false">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> {{ editingSupplier ? '保存修改' : '添加供应商' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ==================== 新增/编辑采购订单模态框 ==================== -->
  <div class="modal" :class="{ active: orderModalVisible }" @click="closeOrderModalOnOverlay($event)">
    <div class="modal-content order-modal">
      <div class="modal-header">
        <i class="fas" :class="editingOrder ? 'fa-file-edit' : 'fa-file-invoice'" style="color: #80A492;"></i>
        <h3>{{ editingOrder ? '编辑采购订单' : '新建采购订单' }}</h3>
        <button class="modal-close" @click="orderModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="saveOrder">
          <!-- 基本信息卡片 -->
          <div class="form-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-clipboard-list"></i>
                <span>基础信息</span>
              </div>
            </div>

            <div class="card-body">
              <div class="form-grid">
                <!-- 订单号 -->
                <div class="form-group">
                  <label>订单号 <span class="required">*</span></label>
                  <div class="input-with-action">
                    <input
                        type="text"
                        class="form-input"
                        :value="orderForm.orderNo"
                        @input="e => orderForm.orderNo = e.target.value"
                        required
                    >
                    <button
                        type="button"
                        class="icon-btn small"
                        @click="orderForm.orderNo = purchaseService.generateOrderNo()"
                        title="重新生成"
                    >
                      <i class="fas fa-sync-alt"></i>
                    </button>
                  </div>
                </div>

                <!-- 供应商 -->
                <div class="form-group">
                  <label>供应商 <span class="required">*</span></label>
                  <div class="select-with-action">
                    <select v-model="orderForm.supplierId" class="form-select" required>
                      <option value="" disabled>请选择供应商</option>
                      <option v-for="s in suppliers" :key="s.id" :value="s.id">
                        {{ s.name }}
                      </option>
                    </select>
                    <button
                        type="button"
                        class="icon-btn small"
                        @click="openAddSupplierModalFromOrder"
                        title="快速添加供应商"
                    >
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>
                </div>

                <!-- 采购日期 -->
                <div class="form-group">
                  <label>采购日期</label>
                  <div class="date-input-wrapper" @click="openDatePicker('orderDate')">
                    <input
                        :value="orderForm.orderDate"
                        type="text"
                        class="form-input"
                        readonly
                        placeholder="请选择日期"
                    >
                    <i class="fas fa-calendar-alt date-icon"></i>
                  </div>
                </div>

                <!-- 预计送达 -->
                <div class="form-group">
                  <label>预计送达</label>
                  <div class="date-input-wrapper" @click="openDatePicker('expectedDate')">
                    <input
                        :value="orderForm.expectedDate"
                        type="text"
                        class="form-input"
                        readonly
                        placeholder="请选择日期"
                    >
                    <i class="fas fa-calendar-alt date-icon"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 商品清单卡片 -->
          <div class="form-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-boxes"></i>
                <span>采购商品清单</span>
              </div>
              <div class="header-actions">
                <span class="item-badge">{{ orderForm.items.length }} 项</span>
                <button type="button" class="btn-add-item" @click="addOrderItem">
                  <i class="fas fa-plus-circle"></i> 添加商品
                </button>
              </div>
            </div>

            <div class="card-body">
              <!-- 商品列表 -->
              <div class="items-list">
                <div v-if="orderForm.items.length === 0" class="items-empty-state">
                  <i class="fas fa-box-open"></i>
                  <p>还没有添加任何商品</p>
                  <button type="button" class="btn-add-first" @click="addOrderItem">
                    <i class="fas fa-plus"></i> 添加第一个商品
                  </button>
                </div>

                <div v-else class="items-container">
                  <div class="items-header">
                    <span class="col-index">#</span>
                    <span class="col-product">商品</span>
                    <span class="col-qty">数量</span>
                    <span class="col-price">单价(¥)</span>
                    <span class="col-unit">单位</span>
                    <span class="col-total">小计(¥)</span>
                    <span class="col-action"></span>
                  </div>

                  <div v-for="(item, index) in orderForm.items" :key="index" class="item-row">
                    <span class="item-index">{{ index + 1 }}</span>

                    <div class="item-field">
                      <select
                          v-model="item.productId"
                          class="form-select"
                          @change="onProductSelected(index)"
                          required
                      >
                        <option value="" disabled>选择商品</option>
                        <option v-for="p in props.products" :key="p.id" :value="p.id">
                          {{ p.name }}
                        </option>
                      </select>
                    </div>

                    <div class="item-field">
                      <input
                          v-model="item.quantity"
                          type="number"
                          class="form-input"
                          placeholder="数量"
                          min="0.01"
                          step="0.01"
                          required
                      >
                    </div>

                    <div class="item-field">
                      <div class="price-input">
                        <span class="currency">¥</span>
                        <input
                            v-model="item.price"
                            type="number"
                            class="form-input"
                            placeholder="单价"
                            min="0.01"
                            step="0.01"
                            required
                        >
                      </div>
                    </div>

                    <div class="item-field">
                      <input
                          v-model="item.unit"
                          type="text"
                          class="form-input"
                          readonly
                      >
                    </div>

                    <div class="item-field">
                      <span class="item-total">¥{{ formatNumber((item.quantity || 0) * (item.price || 0)) }}</span>
                    </div>

                    <div class="item-field">
                      <button
                          type="button"
                          class="item-remove-btn"
                          @click="removeOrderItem(index)"
                          v-if="orderForm.items.length > 1"
                          title="删除"
                      >
                        <i class="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 订单总计 -->
              <div class="order-total">
                <div class="total-stats">
                  <span>商品种类：{{ orderForm.items.length }}</span>
                  <span class="divider">|</span>
                  <span>商品总数：{{ calculateTotalQuantity }} {{ getMainUnit() }}</span>
                </div>
                <div class="total-amount">
                  <span class="total-label">订单总额：</span>
                  <span class="total-value">¥{{ formatNumber(calculateOrderTotal) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 备注卡片 -->
          <div class="form-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-pen"></i>
                <span>备注信息</span>
              </div>
            </div>
            <div class="card-body">
              <textarea
                  v-model="orderForm.note"
                  class="form-input form-textarea"
                  placeholder="可填写特殊要求、交货时间、付款方式等备注信息..."
                  rows="3"
              ></textarea>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="orderModalVisible = false">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> {{ editingOrder ? '保存修改' : '创建订单' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ==================== 订单详情模态框 ==================== -->
  <div class="modal" :class="{ active: detailModalVisible }" @click="closeDetailModalOnOverlay($event)">
    <div class="modal-content detail-modal">
      <div class="modal-header">
        <i class="fas fa-file-invoice" style="color: #80A492;"></i>
        <h3>订单详情 - {{ selectedOrder?.orderNo }}</h3>
        <button class="modal-close" @click="detailModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="order-detail" v-if="selectedOrder">
          <!-- 订单基本信息 -->
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">订单号：</span>
                <span class="value">{{ selectedOrder.orderNo }}</span>
              </div>
              <div class="detail-item">
                <span class="label">供应商：</span>
                <span class="value">{{ getSupplierName(selectedOrder.supplierId) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">采购日期：</span>
                <span class="value">{{ formatDate(selectedOrder.orderDate) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">预计送达：</span>
                <span class="value" :class="{ 'warning-text': purchaseService.isOrderDelayed(selectedOrder.expectedDate) }">
                  {{ formatDate(selectedOrder.expectedDate) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="label">订单状态：</span>
                <span class="value">
                  <span class="order-status" :class="selectedOrder.status">
                    {{ purchaseService.getOrderStatusText(selectedOrder.status) }}
                  </span>
                </span>
              </div>
              <div class="detail-item">
                <span class="label">收货日期：</span>
                <span class="value">{{ formatDate(selectedOrder.receiveDate) || '未收货' }}</span>
              </div>
            </div>
          </div>

          <!-- 采购商品列表 -->
          <div class="detail-section">
            <h4>采购商品</h4>
            <table class="detail-table">
              <thead>
              <tr>
                <th>商品名称</th>
                <th>数量</th>
                <th>单价</th>
                <th>小计</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="item in selectedOrder.items" :key="item.productId">
                <td>{{ item.productName }}</td>
                <td>{{ item.quantity }}{{ item.unit }}</td>
                <td>¥{{ formatNumber(item.price) }}</td>
                <td class="price">¥{{ formatNumber(item.price * item.quantity) }}</td>
              </tr>
              </tbody>
              <tfoot>
              <tr>
                <td colspan="3" class="total-label">合计：</td>
                <td class="total-value price">¥{{ formatNumber(selectedOrder.totalAmount) }}</td>
              </tr>
              </tfoot>
            </table>
          </div>

          <!-- 备注信息 -->
          <div class="detail-section" v-if="selectedOrder.note">
            <h4>备注信息</h4>
            <p class="note-text">{{ selectedOrder.note }}</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="detailModalVisible = false">
          关闭
        </button>
      </div>
    </div>
  </div>

  <!-- ==================== 收货确认模态框 ==================== -->
  <div class="modal" :class="{ active: receiveModalVisible }" @click="closeReceiveOnOverlay($event)">
    <div class="modal-content small">
      <div class="modal-header">
        <i class="fas fa-check-circle" style="color: #80A492;"></i>
        <h3>确认收货</h3>
        <button class="modal-close" @click="receiveModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p>确定要收货订单 <strong>{{ selectedOrder?.orderNo }}</strong> 吗？</p>
        <p class="info-text">收货后将自动更新库存并记录采购历史</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="receiveModalVisible = false">
          取消
        </button>
        <button class="btn btn-primary" @click="confirmReceive">
          <i class="fas fa-check"></i> 确认收货
        </button>
      </div>
    </div>
  </div>

  <!-- ==================== 删除确认模态框 ==================== -->
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
import { notificationService } from "@/services/index.js"
import purchaseService from "@/services/api/business/purchase.service.js"
import baseService from "@/services/api/business/base.service.js"
import supplierService from "@/services/api/business/supplier.service.js"
import expenseService from "@/services/api/business/expense.service.js"
import { Export } from '@/services/data_migration/export.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  products: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'update'])

// ==================== 状态 ====================
const activeTab = ref('orders')
const loading = ref({
  orders: false,
  suppliers: false,
  history: false
})

// 供应商数据
const suppliers = ref([])
const supplierSearchKeyword = ref('')
const filteredSuppliers = ref([])

// 采购订单数据
const orders = ref([])
const filteredOrders = ref([])
const orderSearchKeyword = ref('')
const orderStatusFilter = ref('all')
const orderPage = ref(1)
const pageSize = ref(10)

// 采购历史数据
const purchaseHistory = ref([])
const filteredHistory = ref([])
const historySearchKeyword = ref('')
const historySupplierFilter = ref('all')
const historyStartDate = ref('')
const historyEndDate = ref('')

// 模态框状态
const orderModalVisible = ref(false)
const supplierModalVisible = ref(false)
const detailModalVisible = ref(false)
const receiveModalVisible = ref(false)
const deleteConfirmVisible = ref(false)

// 选中数据
const editingOrder = ref(null)
const editingSupplier = ref(null)
const selectedOrder = ref(null)
const deleteConfirmMessage = ref('')
const deleteConfirmAction = ref(null)
const deleteConfirmData = ref(null)

// 订单表单
const orderForm = reactive({
  orderNo: '',
  supplierId: '',
  orderDate: dateHelper.getTodayString(),
  expectedDate: dateHelper.addDays(dateHelper.getTodayString(), 7),
  items: [],
  note: '',
  totalAmount: 0,
  status: 'pending'
})

// 供应商表单
const supplierForm = reactive({
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  fax: '',
  category: '',
  taxId: '',
  paymentTerms: '',
  paymentDays: '',
  bankName: '',
  bankAccount: '',
  address: '',
  note: ''
})

// 当前选择的日期范围字段
const currentDateRangeField = ref(null)

// ==================== 计算属性 ====================

// 统计数据（使用 service 方法）
const stats = computed(() => {
  return purchaseService.getPurchaseOrderStats(orders.value)
})

// 分页订单
const paginatedOrders = computed(() => {
  const start = (orderPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredOrders.value.slice(start, end)
})

// 总页数
const totalOrderPages = computed(() => {
  return Math.ceil(filteredOrders.value.length / pageSize.value)
})

// 计算订单总额（使用 service 方法）
const calculateOrderTotal = computed(() => {
  return purchaseService.calculateOrderTotal(orderForm.items)
})

// 计算商品总数量
const calculateTotalQuantity = computed(() => {
  return orderForm.items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0)
  }, 0)
})

// 供应商类别选项（使用 service 方法）
const supplierCategories = computed(() => {
  return supplierService.getSupplierCategories()
})

// 结算方式选项（使用 service 方法）
const paymentTerms = computed(() => {
  return purchaseService.getPaymentTerms()
})

// ==================== 辅助方法 ====================

// 重置订单表单（使用 service 方法）
const resetOrderForm = () => {
  orderForm.orderNo = purchaseService.generateOrderNo()
  orderForm.supplierId = ''
  orderForm.orderDate = dateHelper.getTodayString()
  orderForm.expectedDate = dateHelper.addDays(dateHelper.getTodayString(), 7)
  orderForm.items = [purchaseService.createEmptyOrderItem()]
  orderForm.note = ''
  orderForm.status = 'pending'
}

// 重置供应商表单
const resetSupplierForm = () => {
  Object.assign(supplierForm, {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    fax: '',
    category: '',
    taxId: '',
    paymentTerms: '',
    paymentDays: '',
    bankName: '',
    bankAccount: '',
    address: '',
    note: ''
  })
}

// 添加订单商品项（使用 service 方法）
const addOrderItem = () => {
  orderForm.items.push(purchaseService.createEmptyOrderItem())
}

// 移除订单商品项
const removeOrderItem = (index) => {
  orderForm.items.splice(index, 1)
}

// 商品选中回调
const onProductSelected = (index) => {
  const item = orderForm.items[index]
  if (!item.productId) return

  const product = props.products.find(p => p.id === item.productId)
  if (product) {
    item.productName = product.name
    item.unit = product.unit || '斤'
    item.category = product.category
  }
}

// 获取主要单位
const getMainUnit = () => {
  const firstItem = orderForm.items.find(item => item.unit)
  return firstItem?.unit || ''
}

// 获取供应商名称（使用 service 方法）
const getSupplierName = (supplierId) => {
  return purchaseService.getSupplierName(suppliers.value, supplierId)
}

// 格式化日期（使用 dateHelper）
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return dateHelper.formatDate(dateStr)
}

// 格式化数字（使用 baseService）
const formatNumber = (num) => {
  return baseService.formatNumber(num)
}

// ==================== 自定义日期选择器方法 ====================

/**
 * 打开日期选择器（用于订单表单）
 * @param {string} field - 字段名 'orderDate' 或 'expectedDate'
 */
const openDatePicker = async (field) => {
  let defaultDate = new Date()

  if (field === 'orderDate' && orderForm.orderDate) {
    defaultDate = new Date(orderForm.orderDate)
  } else if (field === 'expectedDate' && orderForm.expectedDate) {
    defaultDate = new Date(orderForm.expectedDate)
  }

  // 确保日期有效
  if (isNaN(defaultDate.getTime())) {
    defaultDate = new Date()
  }

  const selectedDate = await notificationService.datePicker({
    title: field === 'orderDate' ? '选择采购日期' : '选择预计送达日期',
    defaultDate: defaultDate,
    minDate: field === 'expectedDate' && orderForm.orderDate ? orderForm.orderDate : null,
    confirmText: '确定',
    cancelText: '取消'
  })

  if (selectedDate) {
    orderForm[field] = selectedDate
    // 如果预计送达日期早于采购日期，自动调整
    if (field === 'orderDate' && orderForm.expectedDate && orderForm.expectedDate < selectedDate) {
      orderForm.expectedDate = selectedDate
    }
  }
}

/**
 * 打开日期范围选择器（用于采购历史筛选）
 * @param {string} type - 'start' 或 'end'
 */
const openDateRangePicker = async (type) => {
  let defaultDate = new Date()
  let title = ''
  let minDate = null
  let maxDate = null

  if (type === 'start') {
    title = '选择开始日期'
    if (historyStartDate.value) {
      defaultDate = new Date(historyStartDate.value)
    }
    if (historyEndDate.value) {
      maxDate = historyEndDate.value
    }
  } else {
    title = '选择结束日期'
    if (historyEndDate.value) {
      defaultDate = new Date(historyEndDate.value)
    }
    if (historyStartDate.value) {
      minDate = historyStartDate.value
    }
    maxDate = new Date().toISOString().split('T')[0] // 不能超过今天
  }

  // 确保日期有效
  if (isNaN(defaultDate.getTime())) {
    defaultDate = new Date()
  }

  const selectedDate = await notificationService.datePicker({
    title: title,
    defaultDate: defaultDate,
    minDate: minDate,
    maxDate: maxDate,
    confirmText: '确定',
    cancelText: '取消'
  })

  if (selectedDate) {
    if (type === 'start') {
      historyStartDate.value = selectedDate
      // 如果开始日期大于结束日期，自动调整结束日期
      if (historyEndDate.value && historyStartDate.value > historyEndDate.value) {
        historyEndDate.value = historyStartDate.value
      }
    } else {
      historyEndDate.value = selectedDate
      // 如果结束日期小于开始日期，自动调整开始日期
      if (historyStartDate.value && historyEndDate.value < historyStartDate.value) {
        historyStartDate.value = historyEndDate.value
      }
    }
    filterHistory()
  }
}

// ==================== 导出功能 ====================

// 导出采购订单
const exportPurchaseOrders = async () => {
  try {
    const exportModule = Export()
    const data = await exportModule.exportPurchaseOrders()

    if (!data || data.length === 0) {
      notificationService.showNotification('没有可导出的采购订单', 'warning')
      return
    }

    const fileName = exportModule.generateFileName('采购订单')
    await exportModule.exportToExcel(data, fileName, '采购订单')
    notificationService.showNotification('导出成功', 'success')
  } catch (error) {
    console.error('导出采购订单失败:', error)
    notificationService.showNotification('导出失败', 'error')
  }
}

// 导出供应商
const exportSuppliers = async () => {
  try {
    const exportModule = Export()
    const data = await exportModule.exportSuppliers()

    if (!data || data.length === 0) {
      notificationService.showNotification('没有可导出的供应商', 'warning')
      return
    }

    const fileName = exportModule.generateFileName('供应商')
    await exportModule.exportToExcel(data, fileName, '供应商')
    notificationService.showNotification('导出成功', 'success')
  } catch (error) {
    console.error('导出供应商失败:', error)
    notificationService.showNotification('导出失败', 'error')
  }
}

// 导出采购历史
const exportPurchaseHistory = async () => {
  try {
    const exportModule = Export()
    const data = await exportModule.exportPurchaseHistory()

    if (!data || data.length === 0) {
      notificationService.showNotification('没有可导出的采购历史', 'warning')
      return
    }

    const fileName = exportModule.generateFileName('采购历史')
    await exportModule.exportToExcel(data, fileName, '采购历史')
    notificationService.showNotification('导出成功', 'success')
  } catch (error) {
    console.error('导出采购历史失败:', error)
    notificationService.showNotification('导出失败', 'error')
  }
}

// ==================== 数据加载方法 ====================

// 加载所有数据
const loadAllData = async () => {
  await Promise.all([
    loadSuppliers(),
    loadOrders(),
    loadPurchaseHistory()
  ])
}

// 加载供应商列表（使用 supplierService）
const loadSuppliers = async () => {
  loading.value.suppliers = true
  try {
    suppliers.value = await supplierService.getAllSuppliers()
    filterSuppliers()
  } catch (error) {
    console.error('加载供应商失败:', error)
    notificationService.showNotification('加载供应商失败', 'error')
  } finally {
    loading.value.suppliers = false
  }
}

// 加载采购订单（使用 purchaseService）
const loadOrders = async () => {
  loading.value.orders = true
  try {
    orders.value = await purchaseService.getAllPurchaseOrders()
    filterOrders()
  } catch (error) {
    console.error('加载采购订单失败:', error)
    notificationService.showNotification('加载采购订单失败', 'error')
  } finally {
    loading.value.orders = false
  }
}

// 加载采购历史（使用 purchaseService）
const loadPurchaseHistory = async () => {
  loading.value.history = true
  try {
    purchaseHistory.value = await purchaseService.getPurchaseHistory() || []
    filterHistory()
  } catch (error) {
    console.error('加载采购历史失败:', error)
    notificationService.showNotification('加载采购历史失败', 'error')
  } finally {
    loading.value.history = false
  }
}

// ==================== 筛选方法 ====================

// 筛选供应商（使用 supplierService）
const filterSuppliers = () => {
  filteredSuppliers.value = supplierService.filterSuppliers(suppliers.value, supplierSearchKeyword.value)
}

// 筛选订单（使用 purchaseService）
const filterOrders = () => {
  filteredOrders.value = purchaseService.filterPurchaseOrders(
      orders.value,
      {
        status: orderStatusFilter.value,
        keyword: orderSearchKeyword.value
      },
      getSupplierName
  )
  orderPage.value = 1
}

// 筛选历史记录（使用 purchaseService）
const filterHistory = () => {
  filteredHistory.value = purchaseService.filterPurchaseHistory(
      purchaseHistory.value,
      {
        supplierId: historySupplierFilter.value,
        startDate: historyStartDate.value,
        endDate: historyEndDate.value,
        keyword: historySearchKeyword.value
      },
      getSupplierName
  )
}

// 按状态筛选
const filterByStatus = (status) => {
  activeTab.value = 'orders'
  orderStatusFilter.value = status
  filterOrders()
}

// ==================== 订单操作方法 ====================

// 打开新增订单模态框
const openAddOrderModal = () => {
  editingOrder.value = null
  resetOrderForm()
  orderModalVisible.value = true
}

// 编辑订单
const editOrder = (order) => {
  editingOrder.value = order
  Object.assign(orderForm, {
    orderNo: order.orderNo,
    supplierId: order.supplierId,
    orderDate: order.orderDate,
    expectedDate: order.expectedDate,
    items: JSON.parse(JSON.stringify(order.items || [])),
    note: order.note || '',
    status: order.status
  })
  orderModalVisible.value = true
}

// 保存订单（使用 purchaseService）
const saveOrder = async () => {
  const validation = purchaseService.validateOrderForm(orderForm)
  if (!validation.valid) {
    notificationService.showNotification(validation.errors.join('，'), 'error')
    return
  }

  try {
    const orderData = {
      id: editingOrder.value?.id,
      orderNo: orderForm.orderNo,
      supplierId: orderForm.supplierId,
      orderDate: orderForm.orderDate,
      expectedDate: orderForm.expectedDate,
      items: orderForm.items.map(item => ({
        ...item,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price)
      })),
      note: orderForm.note || null,
      status: editingOrder.value?.status || 'pending',
      receiveDate: editingOrder.value?.receiveDate || null
    }

    if (editingOrder.value) {
      await purchaseService.updatePurchaseOrder(editingOrder.value.id, orderData)
      notificationService.showNotification('订单更新成功', 'success')
    } else {
      await purchaseService.addPurchaseOrder(orderData)
      notificationService.showNotification('订单创建成功', 'success')
    }

    await loadOrders()
    orderModalVisible.value = false
    emit('update')
  } catch (error) {
    console.error('保存订单失败:', error)
    notificationService.showNotification(error.message || '保存订单失败', 'error')
  }
}

// 收货
const receiveOrder = (order) => {
  selectedOrder.value = order
  receiveModalVisible.value = true
}

// 确认收货
const confirmReceive = async () => {
  if (!selectedOrder.value) return

  try {
    // 传入支出记录创建回调
    const result = await purchaseService.receivePurchaseOrder(
        selectedOrder.value,
        props.products,
        suppliers.value,
        async (expenseData) => {
          // 创建支出记录
          await expenseService.addExpenseRecord(expenseData)
        }
    )

    await Promise.all([
      loadOrders(),
      loadPurchaseHistory(),
      loadSuppliers()
    ])

    receiveModalVisible.value = false
    notificationService.showNotification(
        `收货成功，已更新 ${result.inventoryUpdated.length} 种商品库存，创建 ${result.expenseRecords.length} 条支出记录`,
        'success'
    )
  } catch (error) {
    console.error('收货失败:', error)
    notificationService.showNotification(error.message || '收货失败', 'error')
  }
}

// 查看订单详情
const viewOrderDetail = (order) => {
  selectedOrder.value = order
  detailModalVisible.value = true
}

// 确认删除订单
const confirmDeleteOrder = (order) => {
  deleteConfirmMessage.value = `确定要删除订单 "${order.orderNo}" 吗？`
  deleteConfirmAction.value = 'deleteOrder'
  deleteConfirmData.value = order
  deleteConfirmVisible.value = true
}

// ==================== 供应商操作方法 ====================

// 打开新增供应商模态框
const openAddSupplierModal = () => {
  editingSupplier.value = null
  resetSupplierForm()
  supplierModalVisible.value = true
}

// 从订单模态框打开新增供应商模态框
const openAddSupplierModalFromOrder = () => {
  orderModalVisible.value = false
  setTimeout(() => {
    editingSupplier.value = null
    resetSupplierForm()
    supplierModalVisible.value = true
  }, 50)
}

// 编辑供应商
const editSupplier = (supplier) => {
  editingSupplier.value = supplier
  Object.assign(supplierForm, {
    name: supplier.name || '',
    contactPerson: supplier.contactPerson || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    fax: supplier.fax || '',
    category: supplier.category || '',
    taxId: supplier.taxId || '',
    paymentTerms: supplier.paymentTerms || '',
    paymentDays: supplier.paymentDays || '',
    bankName: supplier.bankName || '',
    bankAccount: supplier.bankAccount || '',
    address: supplier.address || '',
    note: supplier.note || ''
  })
  supplierModalVisible.value = true
}

// 保存供应商（使用 supplierService）
const saveSupplier = async () => {
  const validation = supplierService.validateSupplierForm(supplierForm)
  if (!validation.valid) {
    notificationService.showNotification(validation.errors.join('，'), 'error')
    return
  }

  try {
    const supplierData = {
      id: editingSupplier.value?.id,
      name: supplierForm.name,
      contactPerson: supplierForm.contactPerson || null,
      phone: supplierForm.phone || null,
      email: supplierForm.email || null,
      fax: supplierForm.fax || null,
      category: supplierForm.category || null,
      taxId: supplierForm.taxId || null,
      paymentTerms: supplierForm.paymentTerms || null,
      paymentDays: supplierForm.paymentDays ? parseInt(supplierForm.paymentDays) : null,
      bankName: supplierForm.bankName || null,
      bankAccount: supplierForm.bankAccount || null,
      address: supplierForm.address || null,
      note: supplierForm.note || null,
      purchaseCount: editingSupplier.value?.purchaseCount || 0,
      totalAmount: editingSupplier.value?.totalAmount || 0
    }

    if (editingSupplier.value) {
      await supplierService.updateSupplier(editingSupplier.value.id, supplierData)
      notificationService.showNotification('供应商更新成功', 'success')
    } else {
      await supplierService.addSupplier(supplierData)
      notificationService.showNotification('供应商添加成功', 'success')
    }

    await loadSuppliers()
    supplierModalVisible.value = false
    emit('update')
  } catch (error) {
    console.error('保存供应商失败:', error)
    notificationService.showNotification(error.message || '保存供应商失败', 'error')
  }
}

// 确认删除供应商
const confirmDeleteSupplier = (supplier) => {
  deleteConfirmMessage.value = `确定要删除供应商 "${supplier.name}" 吗？`
  deleteConfirmAction.value = 'deleteSupplier'
  deleteConfirmData.value = supplier
  deleteConfirmVisible.value = true
}

// 从供应商创建采购单
const createPurchaseOrder = (supplier) => {
  activeTab.value = 'orders'
  openAddOrderModal()
  setTimeout(() => {
    orderForm.supplierId = supplier.id
  }, 100)
}

// 查看供应商采购历史
const viewSupplierHistory = (supplier) => {
  activeTab.value = 'history'
  historySupplierFilter.value = supplier.id
  filterHistory()
}

// ==================== 删除确认方法 ====================

// 执行删除
const confirmDelete = async () => {
  if (deleteConfirmAction.value === 'deleteOrder' && deleteConfirmData.value) {
    try {
      await purchaseService.deletePurchaseOrder(deleteConfirmData.value.id)
      await loadOrders()
      notificationService.showNotification('订单删除成功', 'success')
    } catch (error) {
      console.error('删除订单失败:', error)
      notificationService.showNotification(error.message || '删除订单失败', 'error')
    }
  } else if (deleteConfirmAction.value === 'deleteSupplier' && deleteConfirmData.value) {
    try {
      await supplierService.deleteSupplier(deleteConfirmData.value.id)
      await loadSuppliers()
      notificationService.showNotification('供应商删除成功', 'success')
    } catch (error) {
      console.error('删除供应商失败:', error)
      notificationService.showNotification(error.message || '删除供应商失败', 'error')
    }
  }
  deleteConfirmVisible.value = false
  deleteConfirmAction.value = null
  deleteConfirmData.value = null
}

// ==================== 关闭模态框方法 ====================

const close = () => {
  emit('update:visible', false)
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

const closeOrderModalOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    orderModalVisible.value = false
  }
}

const closeSupplierModalOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    supplierModalVisible.value = false
  }
}

const closeDetailModalOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    detailModalVisible.value = false
  }
}

const closeReceiveOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    receiveModalVisible.value = false
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
    loadAllData()
    orderPage.value = 1
    orderStatusFilter.value = 'all'
    orderSearchKeyword.value = ''
    supplierSearchKeyword.value = ''
    historySearchKeyword.value = ''
    historySupplierFilter.value = 'all'
    historyStartDate.value = ''
    historyEndDate.value = ''
  }
})

watch([orderStatusFilter, orderSearchKeyword], () => {
  filterOrders()
})

watch([supplierSearchKeyword], () => {
  filterSuppliers()
})

watch([historySearchKeyword, historySupplierFilter, historyStartDate, historyEndDate], () => {
  filterHistory()
})

// ==================== 初始化 ====================
onMounted(() => {
  if (props.visible) {
    loadAllData()

    // 检查是否有从支出记账传来的采购数据
    const pendingData = localStorage.getItem('pending_purchase_data')
    if (pendingData) {
      try {
        const data = JSON.parse(pendingData)
        setTimeout(() => {
          openAddOrderModal()

          if (data.supplier) {
            const supplier = suppliers.value.find(s => s.name === data.supplier || s.id === data.supplier)
            if (supplier) {
              orderForm.supplierId = supplier.id
            }
          }

          if (data.productId && data.productName) {
            orderForm.items = [{
              productId: data.productId,
              productName: data.productName,
              quantity: data.quantity || '',
              price: data.unitPrice || '',
              unit: data.unit || '斤',
              category: ''
            }]
            onProductSelected(0)
          }

          if (data.date) {
            orderForm.orderDate = data.date
            orderForm.expectedDate = dateHelper.addDays(data.date, 7)
          }

          localStorage.removeItem('pending_purchase_data')
        }, 200)
      } catch (error) {
        console.error('解析采购数据失败:', error)
        localStorage.removeItem('pending_purchase_data')
      }
    }
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

.modal-content.purchase-modal {
  max-width: 1200px;
  width: 95%;
}

.modal-content.order-modal {
  max-width: 800px;
}

.modal-content.detail-modal {
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

.purchase-header {
  border-radius: 20px 20px 0 0;
}

/* ==================== 模态框主体 ==================== */
.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

.modal-footer {
  padding: 20px 25px;
  border-top: 1px solid #D5EBE1;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

/* ==================== 按钮样式 ==================== */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:focus {
  outline: none;
  box-shadow: none;
}

.btn-primary {
  background-color: #D5EBE1;
  color: #80A492;
  border: none;
}

.btn-primary:hover {
  background-color: #B1D5C8;
}

.btn-primary:focus {
  outline: none;
  box-shadow: none;
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

.btn-secondary:focus {
  outline: none;
  box-shadow: none;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
  border: none;
}

.btn-danger:hover {
  background-color: #c0392b;
}

.btn-danger:focus {
  outline: none;
  box-shadow: none;
}

.btn-small {
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 8px;
  border: none;
  background-color: #D5EBE1;
  color: #80A492;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-small:hover {
  background-color: #B1D5C8;
}

.btn-small:focus {
  outline: none;
  box-shadow: none;
}

/* 确保采购管理中的按钮没有边框 */
.purchase-management .btn-primary,
.purchase-management .btn-small,
.purchase-management .action-btn {
  border: none;
  outline: none;
}

/* ==================== 头部按钮组 ==================== */
.header-buttons {
  display: flex;
  gap: 10px;
}

/* ==================== 统计卡片 ==================== */
.purchase-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
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

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.total-card .stat-value {
  color: #80A492;
}

.pending-card .stat-value {
  color: #f39c12;
}

.completed-card .stat-value {
  color: #2ecc71;
}

.amount-card .stat-value {
  color: #3498db;
}

/* ==================== 标签切换 ==================== */
.purchase-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
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
  gap: 8px;
}

.tab-btn i {
  color: #99BCAC;
  transition: all 0.3s;
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

/* ==================== 通用头部 ==================== */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

/* ==================== 筛选栏 ==================== */
.filter-bar {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.search-box {
  flex: 1;
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
  padding: 12px 15px 12px 45px;
  border: 1px solid #B1D5C8;
  border-radius: 30px;
  font-size: 14px;
  background: white;
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

.filter-select {
  width: 150px;
  padding: 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2380A492' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
}

.filter-select:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

/* ==================== 日期范围筛选 ==================== */
.date-range-filter {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
  background: #f8fafc;
  padding: 15px;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
}

.date-input-wrapper {
  flex: 1;
  position: relative;
  cursor: pointer;
}

.date-input {
  width: 100%;
  padding: 10px 35px 10px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  box-sizing: border-box;
}

.date-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.date-input-wrapper .date-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #80A492;
  pointer-events: none;
  font-size: 16px;
}

.date-range-filter span {
  color: #80A492;
  font-weight: 500;
}

/* ==================== 订单卡片 ==================== */
.order-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 5px;
}

.order-card {
  background: white;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  padding: 18px;
  transition: all 0.3s;
}

.order-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
  transform: translateY(-2px);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #D5EBE1;
}

.order-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.order-title h4 {
  font-size: 14px;
  font-weight: 600;
  color: #80A492;
  margin: 0;
}

.order-status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.order-status.pending {
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.order-status.completed {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.order-status.cancelled {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.order-actions {
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

.order-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-label {
  width: 80px;
  color: #999;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.info-value.warning-text {
  color: #e74c3c;
}

.info-value.price {
  color: #2ecc71;
  font-weight: 600;
}

.info-value.note {
  font-style: italic;
  color: #666;
}

.total-row {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #D5EBE1;
}

.delayed-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  border-radius: 12px;
  font-size: 10px;
}

/* ==================== 商品预览 ==================== */
.items-preview {
  margin: 12px 0;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
}

.preview-title {
  font-size: 12px;
  color: #80A492;
  margin-bottom: 6px;
  font-weight: 500;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 2px 0;
}

.item-name {
  flex: 1;
  color: #333;
}

.item-qty {
  width: 80px;
  color: #666;
  text-align: right;
}

.item-price {
  width: 80px;
  color: #2ecc71;
  font-weight: 500;
  text-align: right;
}

.more-items {
  font-size: 11px;
  color: #999;
  font-style: italic;
  margin-top: 4px;
}

.order-footer {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #D5EBE1;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 20px;
  background: white;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.action-btn.receive {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.action-btn.receive:hover {
  background: rgba(46, 204, 113, 0.2);
}

.action-btn.view:hover {
  background: #D5EBE1;
  color: #80A492;
}

/* ==================== 供应商卡片 ==================== */
.supplier-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 5px;
}

.supplier-card {
  background: white;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  padding: 18px;
  transition: all 0.3s;
}

.supplier-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
  transform: translateY(-2px);
}

.supplier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #D5EBE1;
}

.supplier-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #80A492;
  margin: 0;
}

.supplier-actions {
  display: flex;
  gap: 6px;
}

.supplier-info {
  margin-bottom: 12px;
}

.supplier-info .info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.supplier-info .info-label {
  width: 70px;
  color: #999;
}

.supplier-info .info-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.supplier-info .info-value.price {
  color: #2ecc71;
  font-weight: 600;
}

.supplier-info .info-value.note {
  font-style: italic;
  color: #666;
}

.supplier-info .stats-row {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #D5EBE1;
}

.supplier-footer {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #D5EBE1;
}

/* ==================== 历史表格 ==================== */
.history-table {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #D5EBE1;
  border-radius: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  position: sticky;
  top: 0;
  background: rgba(213, 235, 225, 0.3);
  color: #80A492;
  font-weight: 600;
  padding: 12px 15px;
  text-align: left;
  white-space: nowrap;
}

.data-table td {
  padding: 10px 15px;
  border-bottom: 1px solid #D5EBE1;
  color: #333;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: rgba(213, 235, 225, 0.1);
}

.data-table .price {
  color: #2ecc71;
  font-weight: 600;
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

/* ==================== 详情模态框 ==================== */
.order-detail {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.detail-section h4 {
  font-size: 16px;
  color: #80A492;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #D5EBE1;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.detail-item {
  display: flex;
}

.detail-item .label {
  width: 90px;
  color: #999;
  font-size: 13px;
}

.detail-item .value {
  flex: 1;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.detail-item .value.warning-text {
  color: #e74c3c;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}

.detail-table th {
  background: rgba(213, 235, 225, 0.3);
  color: #80A492;
  font-weight: 600;
  padding: 10px 15px;
  text-align: left;
  font-size: 13px;
}

.detail-table td {
  padding: 10px 15px;
  border-bottom: 1px solid #D5EBE1;
  font-size: 13px;
}

.detail-table tfoot td {
  border-bottom: none;
  padding-top: 15px;
}

.detail-table .total-label {
  text-align: right;
  font-weight: 500;
  color: #666;
}

.detail-table .total-value {
  font-weight: 700;
}

.note-text {
  padding: 15px;
  background: #f8fafc;
  border-radius: 12px;
  color: #666;
  line-height: 1.5;
  border: 1px solid #D5EBE1;
}

/* ==================== 表单卡片 ==================== */
.form-card {
  background: white;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  margin-bottom: 25px;
  overflow: hidden;
}

.form-card .card-header {
  padding: 15px 20px;
  border-bottom: 1px solid #D5EBE1;
  background: rgba(213, 235, 225, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-card .header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-card .header-title i {
  color: #80A492;
  font-size: 16px;
}

.form-card .header-title span {
  font-size: 15px;
  font-weight: 600;
  color: #80A492;
}

.form-card .card-body {
  padding: 20px;
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
  color: #666;
  border-color: #D5EBE1;
  cursor: pointer;
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

/* ==================== 日期输入包装器 ==================== */
.date-input-wrapper {
  position: relative;
  cursor: pointer;
}

.date-input-wrapper .form-input {
  cursor: pointer;
  background-color: white;
  padding-right: 35px;
}

.date-input-wrapper .date-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #80A492;
  pointer-events: none;
  font-size: 16px;
}

/* ==================== 输入组 ==================== */
.input-with-action,
.select-with-action {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-with-action .form-input,
.select-with-action .form-select {
  flex: 1;
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

/* ==================== 商品列表 ==================== */
.items-list {
  margin-bottom: 15px;
}

.items-header {
  display: grid;
  grid-template-columns: 40px 2.5fr 1fr 1fr 0.8fr 1.2fr 40px;
  gap: 10px;
  padding: 10px 0;
  font-size: 12px;
  font-weight: 600;
  color: #80A492;
  border-bottom: 1px solid #D5EBE1;
}

.items-container {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 5px;
}

.item-row {
  display: grid;
  grid-template-columns: 40px 2.5fr 1fr 1fr 0.8fr 1.2fr 40px;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(213, 235, 225, 0.5);
}

.item-row:hover {
  background: rgba(213, 235, 225, 0.1);
}

.item-index {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #80A492;
}

.item-field {
  min-width: 0;
}

.price-input {
  position: relative;
}

.currency {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #80A492;
  font-weight: 500;
  z-index: 1;
}

.price-input .form-input {
  padding-left: 28px;
}

.item-total {
  font-weight: 600;
  color: #2ecc71;
  display: block;
  padding: 0 5px;
}

.item-remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: none;
  color: #e74c3c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.item-remove-btn:hover {
  background: rgba(231, 76, 60, 0.1);
}

.items-empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.items-empty-state i {
  font-size: 48px;
  color: #99BCAC;
  margin-bottom: 10px;
}

.btn-add-first {
  background: #80A492;
  border: none;
  border-radius: 30px;
  padding: 10px 24px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  margin-top: 15px;
}

.btn-add-first:hover {
  background: #6b8f80;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(128, 164, 146, 0.3);
}

/* ==================== 订单总计 ==================== */
.order-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-top: 1px solid #D5EBE1;
  margin-top: 15px;
}

.total-stats {
  font-size: 14px;
  color: #666;
}

.total-stats .divider {
  margin: 0 10px;
  color: #D5EBE1;
}

.total-amount {
  font-size: 16px;
  font-weight: 600;
}

.total-label {
  color: #666;
  margin-right: 10px;
}

.total-value {
  color: #2ecc71;
  font-size: 20px;
}

.item-badge {
  background: #D5EBE1;
  color: #80A492;
  padding: 4px 12px;
  border-radius: 30px;
  font-size: 13px;
  font-weight: 600;
  margin-right: 10px;
}

.btn-add-item {
  background: none;
  border: 1px solid #80A492;
  border-radius: 30px;
  padding: 8px 16px;
  color: #80A492;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
}

.btn-add-item:hover {
  background: #80A492;
  color: white;
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

/* ==================== 确认模态框 ==================== */
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

.info-text {
  color: #666 !important;
  font-size: 14px !important;
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

/* ==================== 自定义滚动条 ==================== */
.modal-body::-webkit-scrollbar,
.order-cards::-webkit-scrollbar,
.supplier-grid::-webkit-scrollbar,
.history-table::-webkit-scrollbar,
.items-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.modal-body::-webkit-scrollbar-track,
.order-cards::-webkit-scrollbar-track,
.supplier-grid::-webkit-scrollbar-track,
.history-table::-webkit-scrollbar-track,
.items-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb,
.order-cards::-webkit-scrollbar-thumb,
.supplier-grid::-webkit-scrollbar-thumb,
.history-table::-webkit-scrollbar-thumb,
.items-container::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover,
.order-cards::-webkit-scrollbar-thumb:hover,
.supplier-grid::-webkit-scrollbar-thumb:hover,
.history-table::-webkit-scrollbar-thumb:hover,
.items-container::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .purchase-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
  }

  .order-cards,
  .supplier-grid {
    grid-template-columns: 1fr;
  }

  .date-range-filter {
    flex-direction: column;
  }

  .date-input {
    width: 100%;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .form-grid,
  .form-row {
    grid-template-columns: 1fr;
  }

  .items-header {
    display: none;
  }

  .item-row {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 15px;
    background: white;
    border-radius: 12px;
    margin-bottom: 10px;
    border: 1px solid #D5EBE1;
  }

  .order-total {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .header-buttons {
    flex-direction: column;
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

  .purchase-stats {
    grid-template-columns: 1fr;
  }

  .purchase-tabs {
    flex-direction: column;
  }

  .tab-btn {
    width: 100%;
  }

  .stat-value {
    font-size: 20px;
  }

  .pagination {
    gap: 10px;
  }

  .page-btn {
    width: 32px;
    height: 32px;
  }

  .confirm-actions {
    flex-direction: column;
  }

  .input-with-action,
  .select-with-action {
    flex-direction: column;
  }

  .input-with-action .form-input,
  .select-with-action .form-select {
    width: 100%;
  }

  .icon-btn.small {
    width: 100%;
  }

  .items-container {
    max-height: 200px;
  }

  .item-index {
    margin-bottom: 5px;
  }

  .item-remove-btn {
    margin-top: 5px;
  }
}
</style>