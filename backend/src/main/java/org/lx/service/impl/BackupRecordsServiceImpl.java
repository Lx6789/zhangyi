package org.lx.service.impl;

import com.alibaba.fastjson.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.lx.config.UserUtil;
import org.lx.mapper.*;
import org.lx.pojo.*;
import org.lx.pojo.dto.BackupDTO;
import org.lx.pojo.dto.BackupDataDTO;
import org.lx.service.IBackupRecordsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * <p>
 * 备份记录表 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-03-27
 */
@Slf4j
@Service
public class BackupRecordsServiceImpl extends ServiceImpl<BackupRecordsMapper, BackupRecords> implements IBackupRecordsService {

    // 定义支持的数据类型
    private static final Set<String> SUPPORTED_DATA_TYPES = new HashSet<>(Arrays.asList(
            "personal",              // 个人记账
            "business",              // 生意记账
            "personal_saving",       // 个人存钱计划
            "customer",              // 客户管理
            "product",               // 商品管理
            "inventory",             // 库存管理
            "category",              // 商品分类
            "supplier",              // 供应商管理
            "purchase_order",        // 采购订单
            "purchase_history",      // 采购历史
            "expense",               // 支出记录
            "income",                // 收入记录
            "expense_repayment",     // 支出还款记录
            "income_collection",     // 收入收款记录
            "customer_repayment"     // 客户还款记录
    ));

    // 备份数量限制
    private static final int MAX_BACKUP_COUNT = 10;

    @Autowired
    private BackupRecordsMapper backupRecordsMapper;

    @Autowired
    private BackupDailyRecordsMapper backupDailyRecordsMapper;

    @Autowired
    private BackupBusinessRecordsMapper backupBusinessRecordsMapper;

    @Autowired
    private BackupPersonalSavingsMapper backupPersonalSavingsMapper;

    @Autowired
    private BackupPersonalSavingRecordsMapper backupPersonalSavingRecordsMapper;

    @Autowired
    private BackupCustomersMapper backupCustomersMapper;

    @Autowired
    private BackupCustomerRepaymentsMapper backupCustomerRepaymentsMapper;

    @Autowired
    private BackupProductsMapper backupProductsMapper;

    @Autowired
    private BackupProductCategoriesMapper backupProductCategoriesMapper;

    @Autowired
    private BackupSuppliersMapper backupSuppliersMapper;

    @Autowired
    private BackupInventoryMapper backupInventoryMapper;

    @Autowired
    private BackupPurchaseOrdersMapper backupPurchaseOrdersMapper;

    @Autowired
    private BackupPurchaseHistoryMapper backupPurchaseHistoryMapper;

    @Autowired
    private BackupExpenseRecordsMapper backupExpenseRecordsMapper;

    @Autowired
    private BackupIncomeRecordsMapper backupIncomeRecordsMapper;

    @Autowired
    private BackupExpenseRepaymentsMapper backupExpenseRepaymentsMapper;

    @Autowired
    private BackupIncomeCollectionsMapper backupIncomeCollectionsMapper;

    @Autowired
    private UserUtil userUtil;

    /**
     * 上传备份数据
     * @param backupDTO
     * @return
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public RespBean upload(BackupDTO backupDTO) {
        // 1. 验证基础数据
        if (backupDTO == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "数据不存在");
        }

        if (backupDTO.getUserId() == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "用户ID不能为空");
        }

        // 2. 验证数据类型
        List<String> dataTypes = backupDTO.getDataTypes();
        if (dataTypes == null || dataTypes.isEmpty()) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "数据类型不能为空");
        }

        // 验证每个数据类型是否支持
        for (String dataType : dataTypes) {
            if (!SUPPORTED_DATA_TYPES.contains(dataType)) {
                return RespBean.error(RespCode.DATA_NOT_FOUND,
                        String.format("不支持的数据类型: %s，支持的类型有: %s",
                                dataType, String.join(", ", SUPPORTED_DATA_TYPES)));
            }
        }

        // 3. 验证备份数据内容
        BackupDataDTO data = backupDTO.getData();
        if (data == null) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "备份数据内容不能为空");
        }

        // 4. 检查备份数量限制（如果超过10条，删除最早的备份）
        long backupCount = getBackupCount(backupDTO.getUserId());
        if (backupCount >= MAX_BACKUP_COUNT) {
            log.warn("用户 {} 备份数量已达到 {} 条，将删除最早的备份", backupDTO.getUserId(), backupCount);
            deleteOldestBackup(backupDTO.getUserId());
        }

        // 5. 统计并验证各类型数据
        Map<String, Integer> dataCountMap = getDataCountMap(data, dataTypes);

        // 6. 检查是否有实际数据
        int totalCount = dataCountMap.values().stream().mapToInt(Integer::intValue).sum();
        if (totalCount == 0) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "所有数据类型都为空，无法备份");
        }

        // 7. 记录日志，打印各类型数据统计
        log.info("备份数据统计: userId={}, 总条数={}", backupDTO.getUserId(), totalCount);
        for (Map.Entry<String, Integer> entry : dataCountMap.entrySet()) {
            if (entry.getValue() > 0) {
                log.info("  - {}: {} 条", entry.getKey(), entry.getValue());
            }
        }

        // 8. 生成备份ID
        String backupId = generateBackupId(backupDTO.getUserId(), backupDTO.getBackupTime());

        // 9. 保存备份记录
        BackupRecords backupRecord = new BackupRecords();
        backupRecord.setBackupId(backupId);
        backupRecord.setUserId(backupDTO.getUserId());
        backupRecord.setBackupTime(parseBackupTime(backupDTO.getBackupTime()));
        backupRecord.setBackupType("full");
        backupRecord.setDataSize(backupDTO.getDataSize() != null ? backupDTO.getDataSize().longValue() : 0);
        backupRecord.setDataCount(totalCount);
        backupRecord.setDataTypes(JSON.toJSONString(dataTypes));
        backupRecord.setNote(backupDTO.getNote());
        backupRecord.setStatus(1);
        backupRecord.setCreatedAt(LocalDateTime.now());
        backupRecord.setUpdatedAt(LocalDateTime.now());

        boolean saved = this.save(backupRecord);
        if (!saved) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "保存备份记录失败");
        }

        // 10. 保存各类型数据（只保存有数据的类型）
        try {
            saveBackupData(backupId, backupDTO.getUserId(), data, dataCountMap);
        } catch (Exception e) {
            log.error("保存备份数据失败", e);
            throw new RuntimeException("保存备份数据失败: " + e.getMessage());
        }

        log.info("备份成功: backupId={}, userId={}, 总条数={}", backupId, backupDTO.getUserId(), totalCount);

        return RespBean.success(RespCode.SUCCESS, "备份成功", backupId);
    }

    /**
     * 删除指定备份数据
     * 由于数据库设置了 ON DELETE CASCADE，只需删除主表记录，所有关联的子表数据会自动删除
     * @param backupId 备份记录ID（主键）
     * @return 删除结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public RespBean delete(Integer backupId) {
        try {
            // 1. 判断备份是否存在
            BackupRecords backupRecords = backupRecordsMapper.selectById(backupId);
            if (backupRecords == null) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "备份不存在");
            }

            // 2. 验证用户权限
            Integer userId = userUtil.getUserFromSecurityContext().getId();
            if (!backupRecords.getUserId().equals(userId.longValue())) {
                return RespBean.error(RespCode.UNAUTHORIZED, "无权删除此备份");
            }

            // 3. 删除备份主记录（由于数据库设置了 ON DELETE CASCADE，所有关联的子表数据会自动删除）
            int result = backupRecordsMapper.deleteById(backupId);

            if (result > 0) {
                log.info("删除备份成功: backupId={}, userId={}", backupId, userId);
                return RespBean.success(RespCode.SUCCESS, "删除成功");
            } else {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "删除失败");
            }
        } catch (Exception e) {
            log.error("删除备份失败: backupId={}", backupId, e);
            return RespBean.error(RespCode.DATA_NOT_FOUND, "删除失败: " + e.getMessage());
        }
    }

    /**
     * 恢复指定备份数据
     * @param backupId 备份记录ID（主键）
     * @return 返回备份数据，供前端恢复
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public RespBean restore(Integer backupId) {
        try {
            // 1. 验证用户权限
            Integer currentUserId = userUtil.getUserFromSecurityContext().getId();

            // 2. 查询备份记录是否存在
            BackupRecords backupRecord = backupRecordsMapper.selectById(backupId);
            if (backupRecord == null) {
                return RespBean.error(RespCode.DATA_NOT_FOUND, "备份不存在");
            }

            // 3. 验证用户权限：只能恢复自己的备份
            if (!backupRecord.getUserId().equals(currentUserId.longValue())) {
                return RespBean.error(RespCode.UNAUTHORIZED, "无权恢复此备份");
            }

            // 4. 获取备份ID（关联标识）
            String backupIdentifier = backupRecord.getBackupId();
            log.info("开始恢复备份: backupId={}, backupIdentifier={}, userId={}",
                    backupId, backupIdentifier, currentUserId);

            // 5. 组装备份数据
            BackupDataDTO backupData = new BackupDataDTO();

            // 解析备份中包含的数据类型
            List<String> dataTypes = JSON.parseArray(backupRecord.getDataTypes(), String.class);
            if (dataTypes == null) {
                dataTypes = new ArrayList<>();
            }
            log.info("备份包含的数据类型: {}", dataTypes);

            // 6. 根据数据类型查询对应的备份数据
            for (String dataType : dataTypes) {
                switch (dataType) {
                    case "personal":
                        List<BackupDailyRecords> personalRecords = backupDailyRecordsMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setPersonal(personalRecords);
                        log.info("加载个人记账备份数据: {} 条", personalRecords != null ? personalRecords.size() : 0);
                        break;

                    case "business":
                        List<BackupBusinessRecords> businessRecords = backupBusinessRecordsMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setBusiness(businessRecords);
                        log.info("加载生意记账备份数据: {} 条", businessRecords != null ? businessRecords.size() : 0);
                        break;

                    case "personal_saving":
                        // 1. 从数据库查询计划和记录（两个独立的列表）
                        List<BackupPersonalSavings> personalSavings = backupPersonalSavingsMapper
                                .selectByBackupId(backupIdentifier);

                        List<BackupPersonalSavingRecords> personalSavingRecords = backupPersonalSavingRecordsMapper
                                .selectByBackupId(backupIdentifier);

                        // 2. 使用 Map 临时分组（这是内存中的临时操作，不存储到数据库）
                        Map<String, List<BackupPersonalSavingRecords>> recordsMap = new HashMap<>();
                        if (personalSavingRecords != null && !personalSavingRecords.isEmpty()) {
                            for (BackupPersonalSavingRecords record : personalSavingRecords) {
                                String planId = record.getPlanId();
                                if (planId != null) {
                                    // 按 planId 分组
                                    recordsMap.computeIfAbsent(planId, k -> new ArrayList<>()).add(record);
                                }
                            }
                        }

                        // 3. 把分组后的记录设置到对应的计划对象中
                        if (personalSavings != null && !personalSavings.isEmpty()) {
                            for (BackupPersonalSavings saving : personalSavings) {
                                if (saving.getId() != null && recordsMap.containsKey(saving.getId())) {
                                    // 从临时 Map 中取出记录，设置到计划对象中
                                    saving.setRecords(recordsMap.get(saving.getId()));
                                } else {
                                    saving.setRecords(new ArrayList<>());
                                }
                            }
                        }

                        // 4. 设置到 DTO 中（personalSavings 列表中的每个对象都已经包含了 records）
                        backupData.setPersonalSavings(personalSavings);

                        log.info("加载个人存钱计划备份数据: {} 条计划, {} 条记录",
                                personalSavings != null ? personalSavings.size() : 0,
                                personalSavingRecords != null ? personalSavingRecords.size() : 0);
                        break;

                    case "customer":
                        List<BackupCustomers> customers = backupCustomersMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setCustomers(customers);
                        log.info("加载客户备份数据: {} 条", customers != null ? customers.size() : 0);
                        break;

                    case "customer_repayment":
                        List<BackupCustomerRepayments> customerRepayments = backupCustomerRepaymentsMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setCustomerRepayments(customerRepayments);
                        log.info("加载客户还款记录备份数据: {} 条", customerRepayments != null ? customerRepayments.size() : 0);
                        break;

                    case "product":
                        List<BackupProducts> products = backupProductsMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setProducts(products);
                        log.info("加载商品备份数据: {} 条", products != null ? products.size() : 0);
                        break;

                    case "category":
                        List<BackupProductCategories> categories = backupProductCategoriesMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setCategories(categories);
                        log.info("加载商品分类备份数据: {} 条", categories != null ? categories.size() : 0);
                        break;

                    case "supplier":
                        List<BackupSuppliers> suppliers = backupSuppliersMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setSuppliers(suppliers);
                        log.info("加载供应商备份数据: {} 条", suppliers != null ? suppliers.size() : 0);
                        break;

                    case "inventory":
                        List<BackupInventory> inventory = backupInventoryMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setInventory(inventory);
                        log.info("加载库存备份数据: {} 条", inventory != null ? inventory.size() : 0);
                        break;

                    case "purchase_order":
                        List<BackupPurchaseOrders> purchaseOrders = backupPurchaseOrdersMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setPurchaseOrders(purchaseOrders);
                        log.info("加载采购订单备份数据: {} 条", purchaseOrders != null ? purchaseOrders.size() : 0);
                        break;

                    case "purchase_history":
                        List<BackupPurchaseHistory> purchaseHistory = backupPurchaseHistoryMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setPurchaseHistory(purchaseHistory);
                        log.info("加载采购历史备份数据: {} 条", purchaseHistory != null ? purchaseHistory.size() : 0);
                        break;

                    case "expense":
                        List<BackupExpenseRecords> expenseRecords = backupExpenseRecordsMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setExpense(expenseRecords);
                        log.info("加载支出记录备份数据: {} 条", expenseRecords != null ? expenseRecords.size() : 0);
                        break;

                    case "expense_repayment":
                        List<BackupExpenseRepayments> expenseRepayments = backupExpenseRepaymentsMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setExpenseRepayments(expenseRepayments);
                        log.info("加载支出还款记录备份数据: {} 条", expenseRepayments != null ? expenseRepayments.size() : 0);
                        break;

                    case "income":
                        List<BackupIncomeRecords> incomeRecords = backupIncomeRecordsMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setIncome(incomeRecords);
                        log.info("加载收入记录备份数据: {} 条", incomeRecords != null ? incomeRecords.size() : 0);
                        break;

                    case "income_collection":
                        List<BackupIncomeCollections> incomeCollections = backupIncomeCollectionsMapper
                                .selectByBackupId(backupIdentifier);
                        backupData.setIncomeCollections(incomeCollections);
                        log.info("加载收入收款记录备份数据: {} 条", incomeCollections != null ? incomeCollections.size() : 0);
                        break;

                    default:
                        log.warn("未处理的数据类型: {}", dataType);
                        break;
                }
            }

            // 7. 统计总数据条数
            int totalCount = calculateTotalCount(backupData);
            log.info("恢复备份完成: backupId={}, 总数据条数={}", backupId, totalCount);

            // 8. 返回备份数据给前端
            Map<String, Object> result = new HashMap<>();
            result.put("backupId", backupRecord.getId());
            result.put("backupIdentifier", backupRecord.getBackupId());
            result.put("backupTime", backupRecord.getBackupTime());
            result.put("dataSize", backupRecord.getDataSize());
            result.put("dataTypes", dataTypes);
            result.put("note", backupRecord.getNote());
            result.put("data", backupData);
            result.put("totalCount", totalCount);

            return RespBean.success(RespCode.SUCCESS, "获取备份数据成功", result);

        } catch (Exception e) {
            log.error("恢复备份失败: backupId={}", backupId, e);
            return RespBean.error(RespCode.DATA_NOT_FOUND, "恢复备份失败: " + e.getMessage());
        }
    }

    /**
     * 获取用户备份数量
     */
    private long getBackupCount(Long userId) {
        LambdaQueryWrapper<BackupRecords> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BackupRecords::getUserId, userId)
                .eq(BackupRecords::getStatus, 1);
        return this.count(wrapper);
    }

    /**
     * 删除最早的备份
     * 利用数据库级联删除，只需删除主表记录，所有关联子表数据会自动删除
     */
    private void deleteOldestBackup(Long userId) {
        // 获取最早的备份（按备份时间升序排列）
        LambdaQueryWrapper<BackupRecords> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BackupRecords::getUserId, userId)
                .eq(BackupRecords::getStatus, 1)
                .orderByAsc(BackupRecords::getBackupTime)
                .last("limit 1");
        BackupRecords oldestBackup = this.getOne(wrapper);

        if (oldestBackup != null) {
            log.info("开始删除最早的备份: backupId={}, backupTime={}, id={}",
                    oldestBackup.getBackupId(), oldestBackup.getBackupTime(), oldestBackup.getId());

            // 直接删除主表记录，由于数据库设置了 ON DELETE CASCADE，所有关联子表数据会自动删除
            this.removeById(oldestBackup.getId());

            log.info("最早备份删除成功: backupId={}", oldestBackup.getBackupId());
        }
    }

    /**
     * 获取各类型数据的数量统计
     */
    private Map<String, Integer> getDataCountMap(BackupDataDTO data, List<String> dataTypes) {
        Map<String, Integer> dataCountMap = new HashMap<>();

        for (String dataType : dataTypes) {
            int count = 0;
            switch (dataType) {
                case "personal":
                    count = data.getPersonal() != null ? data.getPersonal().size() : 0;
                    break;
                case "business":
                    count = data.getBusiness() != null ? data.getBusiness().size() : 0;
                    break;
                case "personal_saving":
                    List<BackupPersonalSavings> personalSavings = data.getPersonalSavings();
                    if (personalSavings != null && !personalSavings.isEmpty()) {
                        // 先加上计划数量
                        count = personalSavings.size();
                        // 再加上每个计划的记录数量
                        for (BackupPersonalSavings personalSaving : personalSavings) {
                            if (personalSaving != null) {
                                List<BackupPersonalSavingRecords> records = personalSaving.getRecords();
                                if (records != null && !records.isEmpty()) {
                                    count += records.size();
                                }
                            }
                        }
                    } else {
                        count = 0;
                    }
                    break;
                case "customer":
                    count = data.getCustomers() != null ? data.getCustomers().size() : 0;
                    break;
                case "product":
                    count = data.getProducts() != null ? data.getProducts().size() : 0;
                    break;
                case "inventory":
                    count = data.getInventory() != null ? data.getInventory().size() : 0;
                    break;
                case "category":
                    count = data.getCategories() != null ? data.getCategories().size() : 0;
                    break;
                case "supplier":
                    count = data.getSuppliers() != null ? data.getSuppliers().size() : 0;
                    break;
                case "purchase_order":
                    count = data.getPurchaseOrders() != null ? data.getPurchaseOrders().size() : 0;
                    break;
                case "purchase_history":
                    count = data.getPurchaseHistory() != null ? data.getPurchaseHistory().size() : 0;
                    break;
                case "expense":
                    count = data.getExpense() != null ? data.getExpense().size() : 0;
                    break;
                case "income":
                    count = data.getIncome() != null ? data.getIncome().size() : 0;
                    break;
                case "expense_repayment":
                    count = data.getExpenseRepayments() != null ? data.getExpenseRepayments().size() : 0;
                    break;
                case "income_collection":
                    count = data.getIncomeCollections() != null ? data.getIncomeCollections().size() : 0;
                    break;
                case "customer_repayment":
                    count = data.getCustomerRepayments() != null ? data.getCustomerRepayments().size() : 0;
                    break;
                default:
                    log.warn("未处理的数据类型: {}", dataType);
                    break;
            }
            dataCountMap.put(dataType, count);
        }

        return dataCountMap;
    }

    /**
     * 统计备份数据总条数
     */
    private int calculateTotalCount(BackupDataDTO backupData) {
        int total = 0;

        // 个人记账
        total += backupData.getPersonal() != null ? backupData.getPersonal().size() : 0;

        // 生意记账
        total += backupData.getBusiness() != null ? backupData.getBusiness().size() : 0;

        // 个人存钱计划（计划数量 + 记录数量）
        List<BackupPersonalSavings> personalSavings = backupData.getPersonalSavings();
        if (personalSavings != null && !personalSavings.isEmpty()) {
            total += personalSavings.size(); // 加上计划数量
            for (BackupPersonalSavings saving : personalSavings) {
                if (saving != null) {
                    List<BackupPersonalSavingRecords> records = saving.getRecords();
                    if (records != null && !records.isEmpty()) {
                        total += records.size(); // 加上记录数量
                    }
                }
            }
        }

        // 客户
        total += backupData.getCustomers() != null ? backupData.getCustomers().size() : 0;

        // 客户还款记录
        total += backupData.getCustomerRepayments() != null ? backupData.getCustomerRepayments().size() : 0;

        // 商品
        total += backupData.getProducts() != null ? backupData.getProducts().size() : 0;

        // 商品分类
        total += backupData.getCategories() != null ? backupData.getCategories().size() : 0;

        // 供应商
        total += backupData.getSuppliers() != null ? backupData.getSuppliers().size() : 0;

        // 库存
        total += backupData.getInventory() != null ? backupData.getInventory().size() : 0;

        // 采购订单
        total += backupData.getPurchaseOrders() != null ? backupData.getPurchaseOrders().size() : 0;

        // 采购历史
        total += backupData.getPurchaseHistory() != null ? backupData.getPurchaseHistory().size() : 0;

        // 支出记录
        total += backupData.getExpense() != null ? backupData.getExpense().size() : 0;

        // 支出还款记录
        total += backupData.getExpenseRepayments() != null ? backupData.getExpenseRepayments().size() : 0;

        // 收入记录
        total += backupData.getIncome() != null ? backupData.getIncome().size() : 0;

        // 收入收款记录
        total += backupData.getIncomeCollections() != null ? backupData.getIncomeCollections().size() : 0;

        return total;
    }

    /**
     * 保存备份数据（只保存有数据的类型）
     */
    private void saveBackupData(String backupId, Long userId, BackupDataDTO data,
                                Map<String, Integer> dataCountMap) {

        for (Map.Entry<String, Integer> entry : dataCountMap.entrySet()) {
            String dataType = entry.getKey();
            int count = entry.getValue();

            if (count == 0) {
                continue;
            }

            switch (dataType) {
                case "personal":
                    savePersonalRecords(backupId, userId, data.getPersonal());
                    break;
                case "business":
                    saveBusinessRecords(backupId, userId, data.getBusiness());
                    break;
                case "personal_saving":
                    // 个人存钱计划的记录已经包含在 personalSavings 的 records 字段中
                    if (data.getPersonalSavings() != null && !data.getPersonalSavings().isEmpty()) {
                        savePersonalSavings(backupId, userId, data.getPersonalSavings());
                    }
                    break;
                case "customer":
                    saveCustomers(backupId, userId, data.getCustomers());
                    break;
                case "product":
                    saveProducts(backupId, userId, data.getProducts());
                    break;
                case "inventory":
                    saveInventory(backupId, userId, data.getInventory());
                    break;
                case "category":
                    saveCategories(backupId, userId, data.getCategories());
                    break;
                case "supplier":
                    saveSuppliers(backupId, userId, data.getSuppliers());
                    break;
                case "purchase_order":
                    savePurchaseOrders(backupId, userId, data.getPurchaseOrders());
                    break;
                case "purchase_history":
                    savePurchaseHistory(backupId, userId, data.getPurchaseHistory());
                    break;
                case "expense":
                    saveExpenseRecords(backupId, userId, data.getExpense());
                    break;
                case "income":
                    saveIncomeRecords(backupId, userId, data.getIncome());
                    break;
                case "expense_repayment":
                    saveExpenseRepayments(backupId, userId, data.getExpenseRepayments());
                    break;
                case "income_collection":
                    saveIncomeCollections(backupId, userId, data.getIncomeCollections());
                    break;
                case "customer_repayment":
                    saveCustomerRepayments(backupId, userId, data.getCustomerRepayments());
                    break;
                default:
                    log.warn("未处理的数据类型: {}", dataType);
                    break;
            }
        }
    }

    /**
     * 生成备份ID
     * 格式: backup_YYYYMMDD_HHMMSS_userId
     */
    private String generateBackupId(Long userId, String backupTimeStr) {
        LocalDateTime backupTime = parseBackupTime(backupTimeStr);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
        String timeStr = backupTime.format(formatter);
        return String.format("backup_%s_%d", timeStr, userId);
    }

    /**
     * 解析备份时间
     */
    private LocalDateTime parseBackupTime(String backupTimeStr) {
        if (backupTimeStr == null || backupTimeStr.isEmpty()) {
            return LocalDateTime.now();
        }
        try {
            return LocalDateTime.parse(backupTimeStr, DateTimeFormatter.ISO_DATE_TIME);
        } catch (Exception e) {
            log.warn("解析备份时间失败: {}, 使用当前时间", backupTimeStr);
            return LocalDateTime.now();
        }
    }

    // ==================== 保存方法 ====================

    /**
     * 保存个人记账备份数据
     */
    private void savePersonalRecords(String backupId, Long userId, List<BackupDailyRecords> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        log.info("保存个人记账备份数据: backupId={}, count={}", backupId, records.size());
        records.forEach(record -> {
            record.setBackupId(backupId);
            record.setUserId(userId);
            record.setCreatedAt(LocalDateTime.now());
            if (record.getRecordDate() == null) {
                record.setRecordDate(LocalDate.now());
            }
        });
        backupDailyRecordsMapper.insertBatch(records);
        log.info("个人记账备份数据保存成功: {} 条", records.size());
    }

    /**
     * 保存生意记账备份数据
     */
    private void saveBusinessRecords(String backupId, Long userId, List<BackupBusinessRecords> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        log.info("保存生意记账备份数据: backupId={}, count={}", backupId, records.size());
        records.forEach(record -> {
            record.setBackupId(backupId);
            record.setUserId(userId);
            record.setCreatedAt(LocalDateTime.now());
            if (record.getRecordDate() == null) {
                record.setRecordDate(LocalDate.now());
            }
        });
        backupBusinessRecordsMapper.insertBatch(records);
        log.info("生意记账备份数据保存成功: {} 条", records.size());
    }

    /**
     * 保存个人存钱计划备份数据
     */
    private void savePersonalSavings(String backupId, Long userId, List<BackupPersonalSavings> savings) {
        if (savings == null || savings.isEmpty()) {
            return;
        }
        log.info("保存个人存钱计划备份数据: backupId={}, count={}", backupId, savings.size());

        // 先保存计划数据
        savings.forEach(saving -> {
            saving.setBackupId(backupId);
            saving.setUserId(userId);
        });
        backupPersonalSavingsMapper.insertBatch(savings);
        log.info("个人存钱计划备份数据保存成功: {} 条", savings.size());

        // 收集所有记录，统一保存到记录表
        List<BackupPersonalSavingRecords> allRecords = new ArrayList<>();
        for (BackupPersonalSavings saving : savings) {
            if (saving.getRecords() != null && !saving.getRecords().isEmpty()) {
                for (BackupPersonalSavingRecords record : saving.getRecords()) {
                    record.setBackupId(backupId);
                    if (record.getDepositTime() == null) {
                        record.setDepositTime(LocalDateTime.now());
                    }
                    allRecords.add(record);
                }
            }
        }

        // 批量保存记录
        if (!allRecords.isEmpty()) {
            backupPersonalSavingRecordsMapper.insertBatch(allRecords);
            log.info("个人存钱记录备份数据保存成功: {} 条", allRecords.size());
        }
    }

    /**
     * 保存客户备份数据
     */
    private void saveCustomers(String backupId, Long userId, List<BackupCustomers> customers) {
        if (customers == null || customers.isEmpty()) {
            return;
        }
        log.info("保存客户备份数据: backupId={}, count={}", backupId, customers.size());
        customers.forEach(customer -> {
            customer.setBackupId(backupId);
            customer.setUserId(userId);
            customer.setCreatedAt(LocalDateTime.now());
        });
        backupCustomersMapper.insertBatch(customers);
        log.info("客户备份数据保存成功: {} 条", customers.size());
    }

    /**
     * 保存客户还款记录备份数据
     */
    private void saveCustomerRepayments(String backupId, Long userId, List<BackupCustomerRepayments> repayments) {
        if (repayments == null || repayments.isEmpty()) {
            return;
        }
        log.info("保存客户还款记录备份数据: backupId={}, count={}", backupId, repayments.size());
        repayments.forEach(repayment -> {
            repayment.setBackupId(backupId);
            repayment.setUserId(userId);
            repayment.setCreatedAt(LocalDateTime.now());
            if (repayment.getRepaymentDate() == null) {
                repayment.setRepaymentDate(LocalDate.now());
            }
        });
        backupCustomerRepaymentsMapper.insertBatch(repayments);
        log.info("客户还款记录备份数据保存成功: {} 条", repayments.size());
    }

    /**
     * 保存商品备份数据
     */
    private void saveProducts(String backupId, Long userId, List<BackupProducts> products) {
        if (products == null || products.isEmpty()) {
            return;
        }
        log.info("保存商品备份数据: backupId={}, count={}", backupId, products.size());
        products.forEach(product -> {
            product.setBackupId(backupId);
            product.setUserId(userId);
            product.setCreatedAt(LocalDateTime.now());
        });
        backupProductsMapper.insertBatch(products);
        log.info("商品备份数据保存成功: {} 条", products.size());
    }

    /**
     * 保存商品分类备份数据
     */
    private void saveCategories(String backupId, Long userId, List<BackupProductCategories> categories) {
        if (categories == null || categories.isEmpty()) {
            return;
        }
        log.info("保存商品分类备份数据: backupId={}, count={}", backupId, categories.size());
        categories.forEach(category -> {
            category.setBackupId(backupId);
            category.setUserId(userId);
            category.setCreatedAt(LocalDateTime.now());
        });
        backupProductCategoriesMapper.insertBatch(categories);
        log.info("商品分类备份数据保存成功: {} 条", categories.size());
    }

    /**
     * 保存库存备份数据
     */
    private void saveInventory(String backupId, Long userId, List<BackupInventory> inventory) {
        if (inventory == null || inventory.isEmpty()) {
            return;
        }
        log.info("保存库存备份数据: backupId={}, count={}", backupId, inventory.size());
        inventory.forEach(item -> {
            item.setBackupId(backupId);
            item.setUserId(userId);
            item.setCreatedAt(LocalDateTime.now());
        });
        backupInventoryMapper.insertBatch(inventory);
        log.info("库存备份数据保存成功: {} 条", inventory.size());
    }

    /**
     * 保存供应商备份数据
     */
    private void saveSuppliers(String backupId, Long userId, List<BackupSuppliers> suppliers) {
        if (suppliers == null || suppliers.isEmpty()) {
            return;
        }
        log.info("保存供应商备份数据: backupId={}, count={}", backupId, suppliers.size());
        suppliers.forEach(supplier -> {
            supplier.setBackupId(backupId);
            supplier.setUserId(userId);
            supplier.setCreatedAt(LocalDateTime.now());
        });
        backupSuppliersMapper.insertBatch(suppliers);
        log.info("供应商备份数据保存成功: {} 条", suppliers.size());
    }

    /**
     * 保存采购订单备份数据
     */
    private void savePurchaseOrders(String backupId, Long userId, List<BackupPurchaseOrders> orders) {
        if (orders == null || orders.isEmpty()) {
            return;
        }
        log.info("保存采购订单备份数据: backupId={}, count={}", backupId, orders.size());
        orders.forEach(order -> {
            order.setBackupId(backupId);
            order.setUserId(userId);
            order.setCreatedAt(LocalDateTime.now());
            if (order.getTotalAmount() == null) {
                order.setTotalAmount(BigDecimal.ZERO);
            }
        });
        backupPurchaseOrdersMapper.insertBatch(orders);
        log.info("采购订单备份数据保存成功: {} 条", orders.size());
    }

    /**
     * 保存采购历史备份数据
     */
    private void savePurchaseHistory(String backupId, Long userId, List<BackupPurchaseHistory> history) {
        if (history == null || history.isEmpty()) {
            return;
        }
        log.info("保存采购历史备份数据: backupId={}, count={}", backupId, history.size());

        // 打印第一条数据用于调试
        if (!history.isEmpty()) {
            log.info("第一条采购历史数据: {}", JSON.toJSONString(history.get(0)));
        }

        history.forEach(item -> {
            item.setBackupId(backupId);
            item.setUserId(userId);
            item.setCreatedAt(LocalDateTime.now());

            // 设置默认值，防止 null
            if (item.getPurchaseDate() == null) {
                item.setPurchaseDate(LocalDate.now());
            }
            if (item.getProductName() == null) {
                item.setProductName("");
            }
            if (item.getQuantity() == null) {
                item.setQuantity(BigDecimal.ZERO);
            }
            if (item.getPrice() == null) {
                item.setPrice(BigDecimal.ZERO);
            }
            if (item.getTotalAmount() == null) {
                // 如果 totalAmount 为空，尝试从 quantity 和 price 计算
                if (item.getQuantity() != null && item.getPrice() != null) {
                    item.setTotalAmount(item.getQuantity().multiply(item.getPrice()));
                } else {
                    item.setTotalAmount(BigDecimal.ZERO);
                }
            }
            if (item.getUnit() == null) {
                item.setUnit("斤");
            }
        });

        backupPurchaseHistoryMapper.insertBatch(history);
        log.info("采购历史备份数据保存成功: {} 条", history.size());
    }

    /**
     * 保存支出记录备份数据
     */
    private void saveExpenseRecords(String backupId, Long userId, List<BackupExpenseRecords> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        log.info("保存支出记录备份数据: backupId={}, count={}", backupId, records.size());
        records.forEach(record -> {
            record.setBackupId(backupId);
            record.setUserId(userId);
            record.setCreatedAt(LocalDateTime.now());
            if (record.getDate() == null) {
                record.setDate(LocalDate.now());
            }
            if (record.getRepaidAmount() == null) {
                record.setRepaidAmount(BigDecimal.ZERO);
            }
            if (record.getIsPaid() == null) {
                record.setIsPaid(false);
            }
        });
        backupExpenseRecordsMapper.insertBatch(records);
        log.info("支出记录备份数据保存成功: {} 条", records.size());
    }

    /**
     * 保存支出还款记录备份数据
     */
    private void saveExpenseRepayments(String backupId, Long userId, List<BackupExpenseRepayments> repayments) {
        if (repayments == null || repayments.isEmpty()) {
            return;
        }
        log.info("保存支出还款记录备份数据: backupId={}, count={}", backupId, repayments.size());
        repayments.forEach(repayment -> {
            repayment.setBackupId(backupId);
            repayment.setUserId(userId);
            repayment.setCreatedAt(LocalDateTime.now());
            if (repayment.getRepaymentDate() == null) {
                repayment.setRepaymentDate(LocalDate.now());
            }
            if (repayment.getAmount() == null) {
                repayment.setAmount(BigDecimal.ZERO);
            }
        });
        backupExpenseRepaymentsMapper.insertBatch(repayments);
        log.info("支出还款记录备份数据保存成功: {} 条", repayments.size());
    }

    /**
     * 保存收入记录备份数据
     */
    private void saveIncomeRecords(String backupId, Long userId, List<BackupIncomeRecords> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        log.info("保存收入记录备份数据: backupId={}, count={}", backupId, records.size());
        records.forEach(record -> {
            record.setBackupId(backupId);
            record.setUserId(userId);
            record.setCreatedAt(LocalDateTime.now());
            if (record.getDate() == null) {
                record.setDate(LocalDate.now());
            }
            if (record.getCollectedAmount() == null) {
                record.setCollectedAmount(BigDecimal.ZERO);
            }
            if (record.getIsCollected() == null) {
                record.setIsCollected(false);
            }
        });
        backupIncomeRecordsMapper.insertBatch(records);
        log.info("收入记录备份数据保存成功: {} 条", records.size());
    }

    /**
     * 保存收入收款记录备份数据
     */
    private void saveIncomeCollections(String backupId, Long userId, List<BackupIncomeCollections> collections) {
        if (collections == null || collections.isEmpty()) {
            return;
        }
        log.info("保存收入收款记录备份数据: backupId={}, count={}", backupId, collections.size());
        collections.forEach(collection -> {
            collection.setBackupId(backupId);
            collection.setUserId(userId);
            collection.setCreatedAt(LocalDateTime.now());
            if (collection.getCollectionDate() == null) {
                collection.setCollectionDate(LocalDate.now());
            }
            if (collection.getAmount() == null) {
                collection.setAmount(BigDecimal.ZERO);
            }
        });
        backupIncomeCollectionsMapper.insertBatch(collections);
        log.info("收入收款记录备份数据保存成功: {} 条", collections.size());
    }
}