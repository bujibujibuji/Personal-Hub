package com.backend;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024;

    private final AttachmentRepository repository;
    private final Path fileDirectory;

    public FileController(AttachmentRepository repository,
                          @Value("${personal-hub.file-dir}") String fileDirectory) {
        this.repository = repository;
        this.fileDirectory = Path.of(fileDirectory).toAbsolutePath().normalize();
    }

    @PostConstruct
    void createFileDirectory() throws IOException {
        Files.createDirectories(fileDirectory);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileUploadResponse upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请选择文件");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "文件不能超过 50MB");
        }

        String originalName = cleanOriginalName(file.getOriginalFilename());
        String storedName = UUID.randomUUID() + extensionOf(originalName);
        Path destination = fileDirectory.resolve(storedName).normalize();
        if (!destination.startsWith(fileDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "文件路径无效");
        }

        try (InputStream input = file.getInputStream()) {
            Files.copy(input, destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "文件保存失败", exception);
        }

        Attachment attachment = new Attachment();
        attachment.setOriginalName(originalName);
        attachment.setStoredName(storedName);
        attachment.setContentType(Optional.ofNullable(file.getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE));
        attachment.setSize(file.getSize());
        try {
            attachment = repository.save(attachment);
        } catch (RuntimeException exception) {
            try { Files.deleteIfExists(destination); } catch (IOException ignored) { }
            throw exception;
        }

        return new FileUploadResponse(
                attachment.getId(),
                attachment.getOriginalName(),
                attachment.getSize(),
                "/api/files/" + attachment.getId() + "/download"
        );
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        Attachment attachment = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "文件不存在"));
        Path path = fileDirectory.resolve(attachment.getStoredName()).normalize();
        if (!path.startsWith(fileDirectory) || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "文件不存在");
        }

        try {
            Resource resource = new UrlResource(path.toUri());
            MediaType mediaType = parseMediaType(attachment.getContentType());
            String disposition = ContentDisposition.attachment()
                    .filename(attachment.getOriginalName(), StandardCharsets.UTF_8)
                    .build().toString();
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .contentLength(attachment.getSize())
                    .cacheControl(CacheControl.noStore())
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                    .body(resource);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "文件读取失败", exception);
        }
    }

    private String cleanOriginalName(String name) {
        String cleaned = Optional.ofNullable(name).orElse("附件")
                .replace('\\', '/');
        cleaned = cleaned.substring(cleaned.lastIndexOf('/') + 1)
                .replaceAll("[\\p{Cntrl}]", "_").trim();
        if (cleaned.isBlank()) cleaned = "附件";
        return cleaned.length() > 255 ? cleaned.substring(cleaned.length() - 255) : cleaned;
    }

    private String extensionOf(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) return "";
        String extension = name.substring(dot).toLowerCase(Locale.ROOT);
        return extension.matches("\\.[a-z0-9]{1,10}") ? extension : "";
    }

    private MediaType parseMediaType(String contentType) {
        try {
            return MediaType.parseMediaType(contentType);
        } catch (IllegalArgumentException exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    public record FileUploadResponse(Long id, String originalName, long size, String downloadUrl) {}
}
