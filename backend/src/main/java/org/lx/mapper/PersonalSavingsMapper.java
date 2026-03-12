package org.lx.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.lx.pojo.PersonalSavings;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * <p>
 * 个人存钱计划表 - 存储用户的个人存钱目标 Mapper 接口
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Mapper
public interface PersonalSavingsMapper extends BaseMapper<PersonalSavings> {

}
