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
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
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
    private static final long MAX_TEXT_PREVIEW_SIZE = 2L * 1024 * 1024;
    private static final long MAX_DOC_PREVIEW_SIZE = 20L * 1024 * 1024;

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

    @GetMapping("/{id}")
    public FileUploadResponse get(@PathVariable Long id) {
        Attachment attachment = findAttachment(id);
        return new FileUploadResponse(
                attachment.getId(),
                attachment.getOriginalName(),
                attachment.getSize(),
                "/api/files/" + attachment.getId() + "/download"
        );
    }

    /** 附件在线预览：md/txt 返回纯文本，doc/docx 转成 HTML，其他格式由前端引导下载打开。 */
    @GetMapping("/{id}/preview")
    public PreviewResponse preview(@PathVariable Long id) {
        Attachment attachment = findAttachment(id);
        Path path = fileDirectory.resolve(attachment.getStoredName()).normalize();
        if (!path.startsWith(fileDirectory) || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "文件不存在");
        }

        String name = attachment.getOriginalName().toLowerCase(Locale.ROOT);
        return new PreviewResponse(previewTypeOf(name), renderPreview(name, path, attachment.getSize()));
    }

    private Attachment findAttachment(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "文件不存在"));
    }

    private String previewTypeOf(String lowercaseName) {
        if (lowercaseName.endsWith(".md") || lowercaseName.endsWith(".markdown")) return "markdown";
        if (lowercaseName.endsWith(".txt")) return "text";
        if (lowercaseName.endsWith(".docx")) return "html";
        if (lowercaseName.endsWith(".doc")) return "html";
        return "unsupported";
    }

    private String renderPreview(String lowercaseName, Path path, long size) {
        if (lowercaseName.endsWith(".md") || lowercaseName.endsWith(".markdown") || lowercaseName.endsWith(".txt")) {
            if (size > MAX_TEXT_PREVIEW_SIZE) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "文本文件超过 2MB，暂不支持在线预览，请下载查看");
            }
            try {
                return Files.readString(path, StandardCharsets.UTF_8);
            } catch (IOException exception) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "文件读取失败", exception);
            }
        }
        if (size > MAX_DOC_PREVIEW_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "文档超过 20MB，暂不支持在线预览，请下载查看");
        }
        try (InputStream input = Files.newInputStream(path)) {
            return lowercaseName.endsWith(".docx")
                    ? docxToHtml(input)
                    : legacyDocToHtml(input);
        } catch (IOException | RuntimeException exception) {
            // 加密或损坏的文档会在这里抛出，引导用户下载后用本机软件打开。
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "该文档暂不支持在线预览，请下载后查看", exception);
        }
    }

    /** .docx 转 HTML：保留标题、加粗、斜体、下划线、列表和表格；图片暂不展示。 */
    private String docxToHtml(InputStream input) throws IOException {
        StringBuilder html = new StringBuilder();
        StringBuilder listItems = new StringBuilder();
        try (XWPFDocument document = new XWPFDocument(input)) {
            for (IBodyElement element : document.getBodyElements()) {
                if (element instanceof XWPFParagraph paragraph) {
                    if (paragraph.getNumID() != null) {
                        String text = paragraphText(paragraph);
                        if (!text.isEmpty()) listItems.append("<li>").append(text).append("</li>");
                        continue;
                    }
                    flushList(html, listItems);
                    appendParagraph(html, paragraph);
                } else if (element instanceof XWPFTable table) {
                    flushList(html, listItems);
                    appendTable(html, table);
                }
            }
        }
        flushList(html, listItems);
        return html.toString();
    }

    private void flushList(StringBuilder html, StringBuilder listItems) {
        if (listItems.length() > 0) {
            html.append("<ul>").append(listItems).append("</ul>");
            listItems.setLength(0);
        }
    }

    private void appendParagraph(StringBuilder html, XWPFParagraph paragraph) {
        String text = paragraphText(paragraph);
        if (text.isEmpty()) return;
        int level = headingLevel(paragraph.getStyleID());
        if (level > 0) {
            html.append("<h").append(level).append('>').append(text).append("</h").append(level).append('>');
        } else {
            html.append("<p>").append(text).append("</p>");
        }
    }

    private String paragraphText(XWPFParagraph paragraph) {
        StringBuilder text = new StringBuilder();
        boolean bold = false;
        boolean italic = false;
        boolean underline = false;
        for (XWPFRun run : paragraph.getRuns()) {
            String piece = run.text();
            if (piece == null || piece.isEmpty()) continue;
            boolean runUnderline = run.getUnderline() != UnderlinePatterns.NONE;
            boolean plain = bold == run.isBold() && italic == run.isItalic() && underline == runUnderline;
            if (!plain) {
                closeFormatting(text, bold, italic, underline);
                bold = run.isBold();
                italic = run.isItalic();
                underline = runUnderline;
                openFormatting(text, bold, italic, underline);
            }
            text.append(escapeHtml(piece));
        }
        closeFormatting(text, bold, italic, underline);
        return text.toString();
    }

    private int headingLevel(String styleId) {
        if (styleId == null) return 0;
        String lower = styleId.toLowerCase(Locale.ROOT);
        if (lower.contains("heading") || lower.contains("标题")) {
            for (int level = 1; level <= 6; level++) {
                if (lower.endsWith(String.valueOf(level))) return level;
            }
        }
        // 中文版 Word 的内置标题样式 ID 常是 "1"~"6"。
        if (styleId.matches("[1-6]")) return Integer.parseInt(styleId);
        return 0;
    }

    private void openFormatting(StringBuilder text, boolean bold, boolean italic, boolean underline) {
        if (bold) text.append("<b>");
        if (italic) text.append("<i>");
        if (underline) text.append("<u>");
    }

    private void closeFormatting(StringBuilder text, boolean bold, boolean italic, boolean underline) {
        if (underline) text.append("</u>");
        if (italic) text.append("</i>");
        if (bold) text.append("</b>");
    }

    private void appendTable(StringBuilder html, XWPFTable table) {
        html.append("<table>");
        for (XWPFTableRow row : table.getRows()) {
            html.append("<tr>");
            for (XWPFTableCell cell : row.getTableCells()) {
                html.append("<td>");
                for (int i = 0; i < cell.getParagraphs().size(); i++) {
                    if (i > 0) html.append("<br>");
                    html.append(escapeHtml(cell.getParagraphs().get(i).getText()));
                }
                html.append("</td>");
            }
            html.append("</tr>");
        }
        html.append("</table>");
    }

    /** 老格式 .doc（HWPF）提取纯文本，按段落包成 HTML；格式信息会丢失。 */
    private String legacyDocToHtml(InputStream input) throws IOException {
        String text;
        try (HWPFDocument document = new HWPFDocument(input)) {
            text = document.getRange().text();
        }
        StringBuilder html = new StringBuilder();
        for (String line : text.split("[\\r\\n\\u0007]+")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            html.append("<p>").append(escapeHtml(trimmed)).append("</p>");
        }
        return html.toString();
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
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

    public record PreviewResponse(String type, String content) {}
}
