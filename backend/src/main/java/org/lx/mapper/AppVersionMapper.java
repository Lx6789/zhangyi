package org.lx.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.lx.pojo.AppVersion;

@Mapper
public interface AppVersionMapper extends BaseMapper<AppVersion> {

    /**
     * 查询最新版本
     */
    @Select("SELECT * FROM app_version ORDER BY version_code DESC LIMIT 1")
    AppVersion selectLatestVersion();
}