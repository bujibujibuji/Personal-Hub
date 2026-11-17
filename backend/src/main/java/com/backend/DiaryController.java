package com.backend;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/diaries")
public class DiaryController {
    private final DiaryRepository repository;

    public DiaryController(DiaryRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Diary> list() {
        return repository.findAllByOrderByDiaryDateDescUpdatedAtDesc();
    }

    @GetMapping("/{id}")
    public Diary get(@PathVariable Long id) {
        return findDiary(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Diary create(@Valid @RequestBody DiaryInput input) {
        Diary diary = new Diary();
        apply(diary, input);
        return repository.save(diary);
    }

    @PutMapping("/{id}")
    public Diary update(@PathVariable Long id, @Valid @RequestBody DiaryInput input) {
        Diary diary = findDiary(id);
        apply(diary, input);
        return repository.save(diary);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        Diary diary = findDiary(id);
        repository.delete(diary);
    }

    private Diary findDiary(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "日记不存在"));
    }

    private void apply(Diary diary, DiaryInput input) {
        diary.setTitle(input.title() == null ? "" : input.title().trim());
        diary.setContent(input.content() == null ? "" : input.content());
        diary.setDiaryDate(input.diaryDate() == null ? LocalDate.now() : input.diaryDate());
        diary.setWeather(normalize(input.weather()));
        diary.setMood(normalize(input.mood()));
    }

    private String normalize(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record DiaryInput(
            @Size(max = 255) String title,
            String content,
            LocalDate diaryDate,
            @Size(max = 20) String weather,
            @Size(max = 20) String mood) {}
}
