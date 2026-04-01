package org.lx.pojo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.lx.pojo.*;

import java.util.List;
import java.util.Map;

/**
 * @Title: BackupDataDTO
 * @Author: MrLu2
 * @Package: org.lx.pojo.dto
 * @Date: 2026/3/27 12:10
 * @Description: 备份数据内容接收类
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value = "BackupDataDTO对象", description = "备份数据内容")
public class BackupDataDTO {

    // ==================== 原有数据类型 ====================

    @ApiModelProperty(value = "个人记账数据")
    private List<BackupDailyRecords> personal;

    @ApiModelProperty(value = "生意记账数据")
    private List<BackupBusinessRecords> business;

    @ApiModelProperty(value = "个人存钱计划列表")
    @JsonProperty("personal_savings")
    private List<BackupPersonalSavings> personalSavings;

    @ApiModelProperty(value = "客户管理数据")
    private List<BackupCustomers> customers;

    @ApiModelProperty(value = "商品管理数据")
    private List<BackupProducts> products;

    @ApiModelProperty(value = "商品分类数据")
    private List<BackupProductCategories> categories;

    @ApiModelProperty(value = "供应商数据")
    private List<BackupSuppliers> suppliers;

    @ApiModelProperty(value = "库存管理数据")
    private List<BackupInventory> inventory;

    @ApiModelProperty(value = "采购订单数据")
    @JsonProperty("purchase_orders")
    private List<BackupPurchaseOrders> purchaseOrders;

    @ApiModelProperty(value = "采购历史数据")
    @JsonProperty("purchase_history")
    private List<BackupPurchaseHistory> purchaseHistory;

    // ==================== 新增数据类型 ====================

    @ApiModelProperty(value = "支出记录数据")
    private List<BackupExpenseRecords> expense;

    @ApiModelProperty(value = "收入记录数据")
    private List<BackupIncomeRecords> income;

    @ApiModelProperty(value = "支出还款记录数据")
    @JsonProperty("expense_repayments")
    private List<BackupExpenseRepayments> expenseRepayments;

    @ApiModelProperty(value = "收入收款记录数据")
    @JsonProperty("income_collections")
    private List<BackupIncomeCollections> incomeCollections;

    @ApiModelProperty(value = "客户还款记录数据")
    @JsonProperty("customer_repayments")
    private List<BackupCustomerRepayments> customerRepayments;
}