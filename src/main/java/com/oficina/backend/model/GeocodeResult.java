package com.oficina.backend.model;

public record GeocodeResult(
    String displayName,
    double latitude,
    double longitude
) {
}
