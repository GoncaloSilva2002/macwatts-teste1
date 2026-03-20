package com.oficina.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oficina.backend.model.GeocodeResult;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/geocode")
public class GeocodingController {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @GetMapping
    public GeocodeResult geocode(@RequestParam String address) {
        if (address == null || address.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A morada e obrigatoria.");
        }

        String encodedAddress = URLEncoder.encode(address, StandardCharsets.UTF_8);
        String url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodedAddress;

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Accept", "application/json")
            .header("User-Agent", "oficina-backend-geocoding-demo/1.0")
            .GET()
            .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Erro ao consultar o servico de geocoding."
                );
            }

            JsonNode root = objectMapper.readTree(response.body());
            if (!root.isArray() || root.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Morada nao encontrada.");
            }

            JsonNode first = root.get(0);
            String displayName = first.path("display_name").asText();
            double latitude = Double.parseDouble(first.path("lat").asText());
            double longitude = Double.parseDouble(first.path("lon").asText());

            return new GeocodeResult(displayName, latitude, longitude);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha no geocoding.", ex);
        }
    }

    @GetMapping("/suggest")
    public List<GeocodeResult> suggest(@RequestParam String address) {
        if (address == null || address.isBlank()) {
            return List.of();
        }

        String encodedAddress = URLEncoder.encode(address, StandardCharsets.UTF_8);
        String url = "https://nominatim.openstreetmap.org/search?format=json&limit=5&q=" + encodedAddress;

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Accept", "application/json")
            .header("User-Agent", "oficina-backend-geocoding-demo/1.0")
            .GET()
            .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Erro ao consultar o servico de geocoding."
                );
            }

            JsonNode root = objectMapper.readTree(response.body());
            if (!root.isArray() || root.isEmpty()) {
                return List.of();
            }

            List<GeocodeResult> suggestions = new ArrayList<>();
            for (JsonNode node : root) {
                String displayName = node.path("display_name").asText();
                double latitude = Double.parseDouble(node.path("lat").asText());
                double longitude = Double.parseDouble(node.path("lon").asText());
                suggestions.add(new GeocodeResult(displayName, latitude, longitude));
            }
            return suggestions;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha nas sugestões de geocoding.", ex);
        }
    }
}
