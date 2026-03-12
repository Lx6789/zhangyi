package org.lx.service.impl;

import org.lx.pojo.PersonalSavings;
import org.lx.mapper.PersonalSavingsMapper;
import org.lx.service.IPersonalSavingsService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 个人存钱计划表 - 存储用户的个人存钱目标 服务实现类
 * </p>
 *
 * @author lx
 * @since 2026-01-08
 */
@Service
public class PersonalSavingsServiceImpl extends ServiceImpl<PersonalSavingsMapper, PersonalSavings> implements IPersonalSavingsService {

}
