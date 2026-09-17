package com.acme.workflow.runtime.job;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.Period;
import java.time.ZoneId;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class DurationParser {

    private static final Pattern VIETNAMESE_DURATION_PATTERN = Pattern.compile(
            "(\\d+)\\s*(ngày|day|giờ|hour|phút|minute)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    public Instant addDuration(Instant base, String value) {
        if (value == null || value.isBlank()) {
            return base;
        }
        try {
            return base.plus(Duration.parse(value));
        } catch (RuntimeException ignored) {
            try {
                Period period = Period.parse(value);
                return base.atZone(ZoneId.of("Asia/Bangkok")).plus(period).toInstant();
            } catch (RuntimeException legacy) {
                Matcher matcher = VIETNAMESE_DURATION_PATTERN.matcher(value);
                if (!matcher.find()) {
                    throw legacy;
                }
                long amount = Long.parseLong(matcher.group(1));
                String unit = matcher.group(2).toLowerCase(Locale.ROOT);
                return unit.startsWith("ng") || unit.startsWith("day") ? base.plus(Duration.ofDays(amount))
                        : unit.startsWith("gi") || unit.startsWith("hour") ? base.plus(Duration.ofHours(amount))
                        : base.plus(Duration.ofMinutes(amount));
            }
        }
    }

    public Instant dueAt(JsonNode config) {
        if (config == null) return null;
        String duration = config.path("slaConfig").path("dueIn").asText(config.path("slaDue").asText(""));
        return duration.isBlank() ? null : addDuration(Instant.now(), duration);
    }

    public String normalizeSlaAction(String value) {
        if (value == null) return "REMIND";
        String normalized = value.toUpperCase(Locale.ROOT);
        if (normalized.contains("NHẮC") || normalized.contains("NHAC"))
            return "REMIND";
        if (normalized.contains("ESCAL"))
            return "ESCALATE";
        if (normalized.contains("REASSIGN"))
            return "REASSIGN";
        if (normalized.contains("REJECT"))
            return "REJECT";
        return normalized;
    }
}
