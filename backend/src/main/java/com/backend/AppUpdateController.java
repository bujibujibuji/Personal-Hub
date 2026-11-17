package com.backend;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

/**
 * App 热更新：CI 构建时把 release.json 与 latest.wgt 打进后端镜像，
 * App 启动时检查版本号，有新版本就下载 wgt 安装，无需重新打包 APK。
 */
@RestController
@RequestMapping("/api/app")
public class AppUpdateController {
    private final ObjectMapper objectMapper;

    public AppUpdateController(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @GetMapping("/check-update")
    public ResponseEntity<AppUpdateResponse> checkUpdate() throws IOException {
        ClassPathResource release = classpathResource("app/release.json");
        Map<String, Object> data = objectMapper.readValue(release.getInputStream(), Map.class);
        Number versionCode = (Number) data.get("versionCode");
        if (versionCode == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "暂无应用更新包");
        }
        String versionName = String.valueOf(data.getOrDefault("versionName", ""));
        String notes = String.valueOf(data.getOrDefault("notes", ""));
        AppUpdateResponse response = new AppUpdateResponse(
                versionCode.longValue(),
                versionName,
                notes,
                "/api/app/download",
                wgtSize()
        );
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
    }

    @GetMapping("/download")
    public ResponseEntity<ClassPathResource> download() throws IOException {
        ClassPathResource wgt = classpathResource("app/latest.wgt");
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("personal-hub.wgt", StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(wgt.contentLength())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(wgt);
    }

    private ClassPathResource classpathResource(String path) {
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "暂无应用更新包");
        }
        return resource;
    }

    private long wgtSize() throws IOException {
        return new ClassPathResource("app/latest.wgt").contentLength();
    }

    public record AppUpdateResponse(long versionCode, String versionName, String notes, String url, long size) {}
}
