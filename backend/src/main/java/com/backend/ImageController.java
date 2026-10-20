package com.backend;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.CacheControl;
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
@RequestMapping("/api/images")
public class ImageController {
    private static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    private static final Map<String, String> EXTENSIONS = Map.of(
            MediaType.IMAGE_JPEG_VALUE, "jpg",
            MediaType.IMAGE_PNG_VALUE, "png",
            MediaType.IMAGE_GIF_VALUE, "gif",
            "image/webp", "webp"
    );

    private final Path uploadDirectory;

    public ImageController(@Value("${personal-hub.upload-dir}") String uploadDirectory) {
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    @PostConstruct
    void createUploadDirectory() throws IOException {
        Files.createDirectories(uploadDirectory);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageUploadResponse upload(@RequestParam("image") MultipartFile image) {
        if (image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请选择图片");
        }
        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "图片不能超过 10MB");
        }

        String contentType = Optional.ofNullable(image.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        String extension = EXTENSIONS.get(contentType);
        if (extension == null || !hasValidSignature(image, contentType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "仅支持 JPG、PNG、GIF 和 WebP 图片");
        }

        String storedName = UUID.randomUUID() + "." + extension;
        Path destination = uploadDirectory.resolve(storedName).normalize();
        if (!destination.startsWith(uploadDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "图片路径无效");
        }

        try (InputStream input = image.getInputStream()) {
            Files.copy(input, destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "图片保存失败", exception);
        }

        String originalName = Optional.ofNullable(image.getOriginalFilename()).filter(name -> !name.isBlank()).orElse("图片");
        return new ImageUploadResponse("/api/images/" + storedName, originalName, image.getSize());
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> get(@PathVariable String filename) {
        if (!filename.matches("[0-9a-fA-F-]+\\.(jpg|png|gif|webp)")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        Path imagePath = uploadDirectory.resolve(filename).normalize();
        if (!imagePath.startsWith(uploadDirectory) || !Files.isRegularFile(imagePath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        try {
            Resource resource = new UrlResource(imagePath.toUri());
            return ResponseEntity.ok()
                    .contentType(mediaTypeFor(filename))
                    .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic())
                    .body(resource);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "图片读取失败", exception);
        }
    }

    private boolean hasValidSignature(MultipartFile image, String contentType) {
        try (InputStream input = image.getInputStream()) {
            byte[] header = input.readNBytes(12);
            return switch (contentType) {
                case MediaType.IMAGE_JPEG_VALUE -> startsWith(header, 0xFF, 0xD8, 0xFF);
                case MediaType.IMAGE_PNG_VALUE -> startsWith(header, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
                case MediaType.IMAGE_GIF_VALUE -> startsWith(header, 'G', 'I', 'F', '8')
                        && header.length >= 6 && (header[4] == '7' || header[4] == '9') && header[5] == 'a';
                case "image/webp" -> startsWith(header, 'R', 'I', 'F', 'F')
                        && header.length >= 12 && new String(Arrays.copyOfRange(header, 8, 12)).equals("WEBP");
                default -> false;
            };
        } catch (IOException exception) {
            return false;
        }
    }

    private boolean startsWith(byte[] actual, int... expected) {
        if (actual.length < expected.length) return false;
        for (int index = 0; index < expected.length; index++) {
            if ((actual[index] & 0xFF) != expected[index]) return false;
        }
        return true;
    }

    private MediaType mediaTypeFor(String filename) {
        if (filename.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (filename.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (filename.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.IMAGE_JPEG;
    }

    public record ImageUploadResponse(String url, String originalName, long size) {}
}
