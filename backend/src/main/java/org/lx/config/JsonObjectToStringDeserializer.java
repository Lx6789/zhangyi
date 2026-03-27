package org.lx.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * @Title: JsonObjectToStringDeserializer
 * @Author: MrLu2
 * @Package: org.lx.config
 * @Date: 2026/3/27 13:18
 * @Description: 自定义反序列化器
 */

public class JsonObjectToStringDeserializer extends JsonDeserializer<String> {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt)
            throws IOException, JsonProcessingException {
        JsonNode node = p.getCodec().readTree(p);
        // 如果是对象，转换为JSON字符串
        if (node.isObject() || node.isArray()) {
            return objectMapper.writeValueAsString(node);
        }
        // 如果是字符串，直接返回
        if (node.isTextual()) {
            return node.textValue();
        }
        // 其他情况返回null或空字符串
        return null;
    }
}