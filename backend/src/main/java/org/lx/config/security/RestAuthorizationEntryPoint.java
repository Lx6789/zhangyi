package org.lx.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.lx.common.RespBean;
import org.lx.common.RespCode;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

/**
 * @Title: RestAuthorizationEntryPoint
 * @Author: MrLu2
 * @Package: org.lx.config.security
 * @Date: 2026/1/10 02:02
 * @Description: 当未登录或token失效访问接口时，自定义返回结果
 */

@Component
public class RestAuthorizationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse, AuthenticationException e) throws IOException, ServletException {
        httpServletResponse.setCharacterEncoding("UTF-8");
        httpServletResponse.setContentType("application/json");
        PrintWriter out = httpServletResponse.getWriter();
        RespBean bean = RespBean.error(RespCode.UNAUTHORIZED, "未登录，请重新登录");
        out.write(new ObjectMapper().writeValueAsString(bean));
        out.flush();
        out.close();
    }
}
