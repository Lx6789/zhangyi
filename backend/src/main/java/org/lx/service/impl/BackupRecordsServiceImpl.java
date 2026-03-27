package org.lx.service.impl;

import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.lx.mapper.*;
import org.lx.pojo.*;
import org.lx.pojo.dto.BackupDTO;
import org.lx.pojo.dto.BackupDataDTO;
import org.lx.service.IBackupRecordsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // 现有 Mapper
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

    // 新增 Mapper
    @Autowired
    private BackupExpenseRecordsMapper backupExpenseRecordsMapper;

    @Autowired
    private BackupIncomeRecordsMapper backupIncomeRecordsMapper;

    @Autowired
    private BackupExpenseRepaymentsMapper backupExpenseRepaymentsMapper;

    @Autowired
    private BackupIncomeCollectionsMapper backupIncomeCollectionsMapper;

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

        // 4. 统计并验证各类型数据
        Map<String, Integer> dataCountMap = getDataCountMap(data, dataTypes);

        // 5. 检查是否有实际数据
        int totalCount = dataCountMap.values().stream().mapToInt(Integer::intValue).sum();
        if (totalCount == 0) {
            return RespBean.error(RespCode.DATA_NOT_FOUND, "所有数据类型都为空，无法备份");
        }

        // 6. 记录日志，打印各类型数据统计
        log.info("备份数据统计: userId={}, 总条数={}", backupDTO.getUserId(), totalCount);
        for (Map.Entry<String, Integer> entry : dataCountMap.entrySet()) {
            if (entry.getValue() > 0) {
                log.info("  - {}: {} 条", entry.getKey(), entry.getValue());
            }
        }

        // 7. 生成备份ID
        String backupId = generateBackupId(backupDTO.getUserId(), backupDTO.getBackupTime());

        // 8. 保存备份记录
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

        // 9. 保存各类型数据（只保存有数据的类型）
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
     * 获取各类型数据的数量统计（不抛出异常，只是统计）
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
                    count = data.getPersonalSavings() != null ? data.getPersonalSavings().size() : 0;
                    if (data.getPersonalSavingRecords() != null) {
                        count += data.getPersonalSavingRecords().values().stream()
                                .mapToInt(List::size)
                                .sum();
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
                    if (data.getPersonalSavings() != null && !data.getPersonalSavings().isEmpty()) {
                        savePersonalSavings(backupId, userId, data.getPersonalSavings());
                    }
                    if (data.getPersonalSavingRecords() != null && !data.getPersonalSavingRecords().isEmpty()) {
                        savePersonalSavingRecords(backupId, userId, data.getPersonalSavingRecords());
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

    // ==================== 现有保存方法 ====================

    /**
     * 保存个人记账备份数据
     */
    private void savePersonalRecords(String backupId, Long userId, List<BackupDailyRecords> records) {
        if (records == null || records.isEmpty()) {
            log.warn("个人记账备份数据为空，跳过保存");
            return;
        }

        log.info("保存个人记账备份数据: backupId={}, count={}", backupId, records.size());

        records.forEach(record -> {
            record.setBackupId(backupId);
            record.setUserId(userId);
            record.setCreatedAt(LocalDateTime.now());
            // 如果 recordDate 为空，设置为当前日期
            if (record.getRecordDate() == null) {
                record.setRecordDate(LocalDate.now());
            }
        });

        int result = backupDailyRecordsMapper.insertBatch(records);
        if (result != records.size()) {
            throw new RuntimeException(String.format(
                    "保存个人记账备份数据失败: 预期 %d 条，实际 %d 条", records.size(), result));
        }
        log.info("个人记账备份数据保存成功: {} 条", result);
    }

    /**
     * 保存生意记账备份数据
     */
    private void saveBusinessRecords(String backupId, Long userId, List<BackupBusinessRecords> records) {
        if (records == null || records.isEmpty()) {
            log.warn("生意记账备份数据为空，跳过保存");
            return;
        }

        log.info("保存生意记账备份数据: backupId={}, count={}", backupId, records.size());

        records.forEach(record -> {
            record.setBackupId(backupId);
            record.setUserId(userId);
            record.setCreatedAt(LocalDateTime.now());
            // 如果 recordDate 为空，设置为当前日期
            if (record.getRecordDate() == null) {
                record.setRecordDate(LocalDate.now());
            }
        });

        int result = backupBusinessRecordsMapper.insertBatch(records);
        if (result != records.size()) {
            throw new RuntimeException(String.format(
                    "保存生意记账备份数据失败: 预期 %d 条，实际 %d 条", records.size(), result));
        }
        log.info("生意记账备份数据保存成功: {} 条", result);
    }

    private void savePersonalSavings(String backupId, Long userId, List<BackupPersonalSavings> savings) {
        if (savings == null || savings.isEmpty()) {
            log.warn("个人存钱计划备份数据为空，跳过保存");
            return;
        }
        log.info("保存个人存钱计划备份数据: backupId={}, count={}", backupId, savings.size());
        savings.forEach(saving -> {
            saving.setBackupId(backupId);
            saving.setUserId(userId);
            saving.setCreatedAt(LocalDateTime.now());
        });
        int result = backupPersonalSavingsMapper.insertBatch(savings);
        if (result != savings.size()) {
            throw new RuntimeException(String.format(
                    "保存个人存钱计划备份数据失败: 预期 %d 条，实际 %d 条", savings.size(), result));
        }
        log.info("个人存钱计划备份数据保存成功: {} 条", result);
    }

    private void savePersonalSavingRecords(String backupId, Long userId,
                                           Map<String, List<BackupPersonalSavingRecords>> recordsMap) {
        if (recordsMap == null || recordsMap.isEmpty()) {
            log.warn("个人存钱记录备份数据为空，跳过保存");
            return;
        }
        int totalCount = recordsMap.values().stream().mapToInt(List::size).sum();
        log.info("保存个人存钱记录备份数据: backupId={}, count={}", backupId, totalCount);
        List<BackupPersonalSavingRecords> allRecords = new ArrayList<>();
        recordsMap.values().forEach(allRecords::addAll);
        allRecords.forEach(record -> {
            record.setBackupId(backupId);
            record.setUserId(userId);
            record.setCreatedAt(LocalDateTime.now());
        });
        int result = backupPersonalSavingRecordsMapper.insertBatch(allRecords);
        if (result != totalCount) {
            throw new RuntimeException(String.format(
                    "保存个人存钱记录备份数据失败: 预期 %d 条，实际 %d 条", totalCount, result));
        }
        log.info("个人存钱记录备份数据保存成功: {} 条", result);
    }

    private void saveCustomers(String backupId, Long userId, List<BackupCustomers> customers) {
        if (customers == null || customers.isEmpty()) {
            log.warn("客户备份数据为空，跳过保存");
            return;
        }
        log.info("保存客户备份数据: backupId={}, count={}", backupId, customers.size());
        customers.forEach(customer -> {
            customer.setBackupId(backupId);
            customer.setUserId(userId);
            customer.setCreatedAt(LocalDateTime.now());
        });
        int result = backupCustomersMapper.insertBatch(customers);
        if (result != customers.size()) {
            throw new RuntimeException(String.format(
                    "保存客户备份数据失败: 预期 %d 条，实际 %d 条", customers.size(), result));
        }
        log.info("客户备份数据保存成功: {} 条", result);
    }

    private void saveProducts(String backupId, Long userId, List<BackupProducts> products) {
        if (products == null || products.isEmpty()) {
            log.warn("商品备份数据为空，跳过保存");
            return;
        }
        log.info("保存商品备份数据: backupId={}, count={}", backupId, products.size());
        products.forEach(product -> {
            product.setBackupId(backupId);
            product.setUserId(userId);
            product.setCreatedAt(LocalDateTime.now());
        });
        int result = backupProductsMapper.insertBatch(products);
        if (result != products.size()) {
            throw new RuntimeException(String.format(
                    "保存商品备份数据失败: 预期 %d 条，实际 %d 条", products.size(), result));
        }
        log.info("商品备份数据保存成功: {} 条", result);
    }

    private void saveInventory(String backupId, Long userId, List<BackupInventory> inventory) {
        if (inventory == null || inventory.isEmpty()) {
            log.warn("库存备份数据为空，跳过保存");
            return;
        }
        log.info("保存库存备份数据: backupId={}, count={}", backupId, inventory.size());
        inventory.forEach(item -> {
            item.setBackupId(backupId);
            item.setUserId(userId);
            item.setCreatedAt(LocalDateTime.now());
        });
        int result = backupInventoryMapper.insertBatch(inventory);
        if (result != inventory.size()) {
            throw new RuntimeException(String.format(
                    "保存库存备份数据失败: 预期 %d 条，实际 %d 条", inventory.size(), result));
        }
        log.info("库存备份数据保存成功: {} 条", result);
    }

    private void saveCategories(String backupId, Long userId, List<BackupProductCategories> categories) {
        if (categories == null || categories.isEmpty()) {
            log.warn("商品分类备份数据为空，跳过保存");
            return;
        }
        log.info("保存商品分类备份数据: backupId={}, count={}", backupId, categories.size());
        categories.forEach(category -> {
            category.setBackupId(backupId);
            category.setUserId(userId);
            category.setCreatedAt(LocalDateTime.now());
        });
        int result = backupProductCategoriesMapper.insertBatch(categories);
        if (result != categories.size()) {
            throw new RuntimeException(String.format(
                    "保存商品分类备份数据失败: 预期 %d 条，实际 %d 条", categories.size(), result));
        }
        log.info("商品分类备份数据保存成功: {} 条", result);
    }

    private void saveSuppliers(String backupId, Long userId, List<BackupSuppliers> suppliers) {
        if (suppliers == null || suppliers.isEmpty()) {
            log.warn("供应商备份数据为空，跳过保存");
            return;
        }
        log.info("保存供应商备份数据: backupId={}, count={}", backupId, suppliers.size());
        suppliers.forEach(supplier -> {
            supplier.setBackupId(backupId);
            supplier.setUserId(userId);
            supplier.setCreatedAt(LocalDateTime.now());
        });
        int result = backupSuppliersMapper.insertBatch(suppliers);
        if (result != suppliers.size()) {
            throw new RuntimeException(String.format(
                    "保存供应商备份数据失败: 预期 %d 条，实际 %d 条", suppliers.size(), result));
        }
        log.info("供应商备份数据保存成功: {} 条", result);
    }

    private void savePurchaseOrders(String backupId, Long userId, List<BackupPurchaseOrders> orders) {
        if (orders == null || orders.isEmpty()) {
            log.warn("采购订单备份数据为空，跳过保存");
            return;
        }
        log.info("保存采购订单备份数据: backupId={}, count={}", backupId, orders.size());
        orders.forEach(order -> {
            order.setBackupId(backupId);
            order.setUserId(userId);
            order.setCreatedAt(LocalDateTime.now());
        });
        int result = backupPurchaseOrdersMapper.insertBatch(orders);
        if (result != orders.size()) {
            throw new RuntimeException(String.format(
                    "保存采购订单备份数据失败: 预期 %d 条，实际 %d 条", orders.size(), result));
        }
        log.info("采购订单备份数据保存成功: {} 条", result);
    }

    private void savePurchaseHistory(String backupId, Long userId, List<BackupPurchaseHistory> history) {
        if (history == null || history.isEmpty()) {
            log.warn("采购历史备份数据为空，跳过保存");
            return;
        }
        log.info("保存采购历史备份数据: backupId={}, count={}", backupId, history.size());
        history.forEach(item -> {
            item.setBackupId(backupId);
            item.setUserId(userId);
            item.setCreatedAt(LocalDateTime.now());
        });
        int result = backupPurchaseHistoryMapper.insertBatch(history);
        if (result != history.size()) {
            throw new RuntimeException(String.format(
                    "保存采购历史备份数据失败: 预期 %d 条，实际 %d 条", history.size(), result));
        }
        log.info("采购历史备份数据保存成功: {} 条", result);
    }

    // ==================== 新增保存方法 ====================

    /**
     * 保存支出记录备份数据
     */
    private void saveExpenseRecords(String backupId, Long userId, List<BackupExpenseRecords> records) {
        if (records == null || records.isEmpty()) {
            log.warn("支出记录备份数据为空，跳过保存");
            return;
        }
        log.info("保存支出记录备份数据: backupId={}, count={}", backupId, records.size());
        records.forEach(record -> {
            record.setBackupId(backupId);
            record.setUserId(userId);
            record.setCreatedAt(LocalDateTime.now());
        });
        int result = backupExpenseRecordsMapper.insertBatch(records);
        if (result != records.size()) {
            throw new RuntimeException(String.format(
                    "保存支出记录备份数据失败: 预期 %d 条，实际 %d 条", records.size(), result));
        }
        log.info("支出记录备份数据保存成功: {} 条", result);
    }

    /**
     * 保存收入记录备份数据
     */
    private void saveIncomeRecords(String backupId, Long userId, List<BackupIncomeRecords> records) {
        if (records == null || records.isEmpty()) {
            log.warn("收入记录备份数据为空，跳过保存");
            return;
        }
        log.info("保存收入记录备份数据: backupId={}, count={}", backupId, records.size());
        records.forEach(record -> {
            record.setBackupId(backupId);
            record.setUserId(userId);
            record.setCreatedAt(LocalDateTime.now());
        });
        int result = backupIncomeRecordsMapper.insertBatch(records);
        if (result != records.size()) {
            throw new RuntimeException(String.format(
                    "保存收入记录备份数据失败: 预期 %d 条，实际 %d 条", records.size(), result));
        }
        log.info("收入记录备份数据保存成功: {} 条", result);
    }

    /**
     * 保存支出还款记录备份数据
     */
    private void saveExpenseRepayments(String backupId, Long userId, List<BackupExpenseRepayments> repayments) {
        if (repayments == null || repayments.isEmpty()) {
            log.warn("支出还款记录备份数据为空，跳过保存");
            return;
        }
        log.info("保存支出还款记录备份数据: backupId={}, count={}", backupId, repayments.size());
        repayments.forEach(repayment -> {
            repayment.setBackupId(backupId);
            repayment.setUserId(userId);
            repayment.setCreatedAt(LocalDateTime.now());
        });
        int result = backupExpenseRepaymentsMapper.insertBatch(repayments);
        if (result != repayments.size()) {
            throw new RuntimeException(String.format(
                    "保存支出还款记录备份数据失败: 预期 %d 条，实际 %d 条", repayments.size(), result));
        }
        log.info("支出还款记录备份数据保存成功: {} 条", result);
    }

    /**
     * 保存收入收款记录备份数据
     */
    private void saveIncomeCollections(String backupId, Long userId, List<BackupIncomeCollections> collections) {
        if (collections == null || collections.isEmpty()) {
            log.warn("收入收款记录备份数据为空，跳过保存");
            return;
        }
        log.info("保存收入收款记录备份数据: backupId={}, count={}", backupId, collections.size());
        collections.forEach(collection -> {
            collection.setBackupId(backupId);
            collection.setUserId(userId);
            collection.setCreatedAt(LocalDateTime.now());
        });
        int result = backupIncomeCollectionsMapper.insertBatch(collections);
        if (result != collections.size()) {
            throw new RuntimeException(String.format(
                    "保存收入收款记录备份数据失败: 预期 %d 条，实际 %d 条", collections.size(), result));
        }
        log.info("收入收款记录备份数据保存成功: {} 条", result);
    }

    /**
     * 保存客户还款记录备份数据
     */
    private void saveCustomerRepayments(String backupId, Long userId, List<BackupCustomerRepayments> repayments) {
        if (repayments == null || repayments.isEmpty()) {
            log.warn("客户还款记录备份数据为空，跳过保存");
            return;
        }
        log.info("保存客户还款记录备份数据: backupId={}, count={}", backupId, repayments.size());
        repayments.forEach(repayment -> {
            repayment.setBackupId(backupId);
            repayment.setUserId(userId);
            repayment.setCreatedAt(LocalDateTime.now());
        });
        int result = backupCustomerRepaymentsMapper.insertBatch(repayments);
        if (result != repayments.size()) {
            throw new RuntimeException(String.format(
                    "保存客户还款记录备份数据失败: 预期 %d 条，实际 %d 条", repayments.size(), result));
        }
        log.info("客户还款记录备份数据保存成功: {} 条", result);
    }
}