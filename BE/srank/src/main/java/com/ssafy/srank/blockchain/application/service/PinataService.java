package com.ssafy.srank.blockchain.application.service;

import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class PinataService {

    @Value("${pinata.jwt}")
    private String pinataJwt;

    private final RestTemplate restTemplate = new RestTemplate();

    public String uploadMetadataToIPFS(String cardName, String imageCid) {
        String url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", pinataJwt);

        HttpEntity<Map<String, Object>> requestEntity = getMapHttpEntity(cardName, imageCid, headers);
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, requestEntity, Map.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Pinata metadata 업로드 실패");
        }

        String ipfsHash = (String) response.getBody().get("IpfsHash");
        if (ipfsHash == null || ipfsHash.isBlank()) {
            throw new RuntimeException("Pinata 응답에 IpfsHash 없음");
        }

        return "https://amber-wrong-duck-152.mypinata.cloud/ipfs/" + ipfsHash;
    }

    private static @NonNull HttpEntity<Map<String, Object>> getMapHttpEntity(String cardName, String imageCid, HttpHeaders headers) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("name", cardName);
        metadata.put("image", "https://amber-wrong-duck-152.mypinata.cloud/ipfs/" + imageCid);

        Map<String, Object> pinataMetadata = new HashMap<>();
        pinataMetadata.put("name", cardName + "_metadata.json");

        Map<String, Object> body = new HashMap<>();
        body.put("pinataMetadata", pinataMetadata);
        body.put("pinataContent", metadata);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        return requestEntity;
    }
}