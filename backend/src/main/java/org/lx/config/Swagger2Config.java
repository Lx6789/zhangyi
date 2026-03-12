package org.lx.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.*;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spi.service.contexts.SecurityContext;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

import java.util.ArrayList;
import java.util.List;

/**
 * @Title: Swagger2
 * @Author: MrLu2
 * @Package: org.lx.config
 * @Date: 2026/1/4 17:03
 * @Description: swagger2配置类
 */

@Configuration
@EnableSwagger2
public class Swagger2Config {
    @Bean
    public Docket createRestApi() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(apiInfo())
                .select()
                .apis(RequestHandlerSelectors.basePackage("org.lx.controller"))
                .paths(PathSelectors.any())
                .build()
                .securityContexts(securityContexts())
                .securitySchemes(securitySchemes());
    }

    /**
     *  API 信息配置
     * @return
     */
    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("记账系统接口文档")
                .description("记账系统接口文档")
                .contact(new Contact("lx", "http:localhost:8085/doc.html", "yiyayiyayo20031126@163.com"))
                .version("1.0")
                .build();
    }

    /**
     * securityContexts() - 定义哪些接口需要认证
     * @return
     */
    private List<SecurityContext> securityContexts() {
        List<SecurityContext> result = new ArrayList<>();
        // 对所有接口应用安全配置
        result.add(getContextByPath(".*"));
        return result;
    }

    /**
     * getContextByPath() - 创建安全上下文
     * @param pathRegex
     * @return
     */
    private SecurityContext getContextByPath(String pathRegex) {
        return SecurityContext.builder()
                .securityReferences(defaultAuth())  // 引用的安全方案
                .forPaths(PathSelectors.regex(pathRegex))  // 应用该安全配置的路径
                .build();
    }

    /**
     * defaultAuth() - 定义权限范围
     * @return
     */
    private List<SecurityReference> defaultAuth() {
        List<SecurityReference> result = new ArrayList<>();
        // 创建授权范围：全局权限，可以访问所有内容
        AuthorizationScope authorizationScope = new AuthorizationScope("global", "accessEverything");
        AuthorizationScope[] authorizationScopes = new AuthorizationScope[1];
        authorizationScopes[0] = authorizationScope;
        // 创建安全引用，引用名为 "Authorization" 的安全方案
        result.add(new SecurityReference("Authorization", authorizationScopes));
        return result;
    }

    /**
     * securitySchemes() - 定义认证方案
     * 在 Swagger UI 右上角会出现 "Authorize" 按钮
     * 点击后可以输入 Token
     * Token 会以 Authorization: Bearer token_value 的形式发送
     * @return
     */
    private List<? extends SecurityScheme> securitySchemes() {
        List<ApiKey> result = new ArrayList<>();
        // 创建一个 ApiKey 对象，表示使用 API Key 认证
        // 参数1: "Authorization" - 在 Swagger UI 中显示的认证名称
        // 参数2: "Authorization" - HTTP 请求头字段名
        // 参数3: "Header" - 认证信息放在请求头中
        ApiKey apiKey = new ApiKey("Authorization", "Authorization", "Header");
        result.add(apiKey);
        return result;
    }
}
