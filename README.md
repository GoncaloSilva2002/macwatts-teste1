# Projeto Pequeno de Geocoding + Mapa

Este projeto recebe uma morada, faz geocoding com o Nominatim (OpenStreetMap) e mostra o local no mapa com Leaflet.

## Requisitos

- Java 17
- Maven instalado (`mvn`)

## Como executar

```bash
mvn spring-boot:run
```

Depois abre:

`http://localhost:8080`

## Como usar

1. Escreve uma morada no campo de pesquisa.
2. Clica em **Localizar**.
3. O mapa centra no ponto encontrado e mostra um marcador com a morada resolvida.

## Endpoint usado

- `GET /api/geocode?address=<morada>`

Exemplo:

`/api/geocode?address=Avenida%20da%20Liberdade%2C%20Lisboa`
