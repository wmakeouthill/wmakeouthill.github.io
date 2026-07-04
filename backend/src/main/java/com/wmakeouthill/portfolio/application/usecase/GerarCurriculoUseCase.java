package com.wmakeouthill.portfolio.application.usecase;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wmakeouthill.portfolio.application.dto.CertificadoPdfDto;
import com.wmakeouthill.portfolio.application.dto.ChatResponse;
import com.wmakeouthill.portfolio.application.dto.CurriculoPersonalizado;
import com.wmakeouthill.portfolio.domain.service.PortfolioPromptService;
import com.wmakeouthill.portfolio.infrastructure.ai.GeminiAdapter;
import com.wmakeouthill.portfolio.infrastructure.pdf.CurriculoPdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class GerarCurriculoUseCase {
    private static final double TEMPERATURE_CURRICULO = 0.3;

    /** Substantivo "CV"/"resume" como palavra isolada (evita casar dentro de outras palavras). */
    private static final Pattern CV_TOKEN = Pattern.compile("\\b(cv|resume)\\b",
            Pattern.UNICODE_CHARACTER_CLASS);

    /**
     * Verbos/termos de intenção de GERAR ou RECEBER o currículo. O PDF só é gerado
     * quando a mensagem cita currículo/CV E traz uma destas intenções — assim
     * pedir "redigir um email pra essa vaga" não dispara a 2ª chamada ao Vertex.
     */
    private static final List<String> INTENCAO_GERAR = List.of(
            "gera", "gere", "cria", "crie", "monta", "monte", "faz", "fazer", "faça", "faca",
            "quero", "queria", "gostaria", "preciso", "prepara", "adapta", "personaliza",
            "atualiza", "baixa", "baixar", "download", "pdf", "manda", "mandar", "envia", "enviar",
            "generate", "create", "make", "build", "want", "need", "prepare", "tailor", "update");

    private final CurriculoPdfService curriculoPdfService;
    private final PortfolioPromptService portfolioPromptService;
    private final ListarCertificadosUseCase listarCertificadosUseCase;
    private final GeminiAdapter geminiAdapter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public byte[] executar(String mensagemUsuario, String respostaIa) {
        CurriculoPersonalizado curriculo = gerarDadosEstruturados(mensagemUsuario, respostaIa);
        return curriculoPdfService.gerar(curriculo);
    }

    public boolean deveGerar(String mensagem) {
        if (mensagem == null || mensagem.isBlank()) {
            return false;
        }
        String lower = mensagem.toLowerCase();
        return mencionaCurriculo(lower) && temIntencaoDeGerar(lower);
    }

    private boolean mencionaCurriculo(String lower) {
        return lower.contains("currículo")
                || lower.contains("curriculo")
                || lower.contains("résumé")
                || lower.contains("resumé")
                || CV_TOKEN.matcher(lower).find();
    }

    private boolean temIntencaoDeGerar(String lower) {
        return INTENCAO_GERAR.stream().anyMatch(lower::contains);
    }

    private CurriculoPersonalizado gerarDadosEstruturados(String mensagemUsuario, String respostaIa) {
        String systemPrompt = portfolioPromptService.obterSystemPromptOtimizado(mensagemUsuario, "pt")
                + "\n\n"
                + promptCurriculo()
                + "\n\nCERTIFICADOS DO REPOSITÓRIO certificados-wesley:\n"
                + listarCertificados();

        ChatResponse response = geminiAdapter.chatComTemperatura(
                systemPrompt,
                List.of(),
                montarMensagemCurriculo(mensagemUsuario, respostaIa),
                TEMPERATURE_CURRICULO);

        return parseCurriculo(response.reply(), mensagemUsuario, respostaIa);
    }

    private String promptCurriculo() {
        return """
                Você vai gerar dados estruturados para preencher um currículo no HTML original do Wesley.
                Use somente fatos presentes nos CONTEXTOS DO PORTFÓLIO, no currículo base e nos certificados listados.
                Use palavras-chave reais da vaga quando forem compatíveis com a experiência do Wesley.
                Não invente senioridade, empresas, datas, certificados nem tecnologias.
                Seja orientado a ATS, mas mantenha texto humano e profissional.
                Responda somente JSON válido, sem markdown, neste formato:
                {
                  "cargoAlvo": "cargo da vaga ou foco profissional",
                  "tituloProfissional": "título curto para substituir a role do currículo",
                  "resumoAdaptado": "resumo profissional em primeira pessoa implícita, até 900 caracteres",
                  "palavrasChave": "lista curta separada por vírgulas com keywords compatíveis",
                  "destaquesAlinhamento": "2 a 4 frases explicando aderência concreta à vaga"
                }
                """;
    }

    private String montarMensagemCurriculo(String mensagemUsuario, String respostaIa) {
        return """
                VAGA / PEDIDO DO USUÁRIO:
                %s

                RESPOSTA CONTEXTUAL JÁ GERADA PELO CHAT:
                %s

                Gere os dados estruturados do currículo personalizado.
                """.formatted(limitar(mensagemUsuario, 5000), limitar(respostaIa, 3000));
    }

    private String listarCertificados() {
        try {
            return listarCertificadosUseCase.executar().stream()
                    .map(CertificadoPdfDto::displayName)
                    .limit(40)
                    .reduce("", (acc, item) -> acc + "- " + item + "\n");
        } catch (Exception e) {
            return "Certificados indisponíveis no momento.\n";
        }
    }

    private CurriculoPersonalizado parseCurriculo(String json, String mensagemUsuario, String respostaIa) {
        try {
            JsonNode root = objectMapper.readTree(extrairJson(json));
            return new CurriculoPersonalizado(
                    texto(root, "cargoAlvo", extrairCargoAlvo(mensagemUsuario)),
                    texto(root, "tituloProfissional", "Engenheiro de Software Full Stack"),
                    texto(root, "resumoAdaptado", limitar(respostaIa, 900)),
                    texto(root, "palavrasChave", "Java, Spring Boot, Angular, IA, RAG, Docker, Cloud"),
                    texto(root, "destaquesAlinhamento", limitar(respostaIa, 700)));
        } catch (Exception e) {
            return fallback(mensagemUsuario, respostaIa);
        }
    }

    private CurriculoPersonalizado fallback(String mensagemUsuario, String respostaIa) {
        return new CurriculoPersonalizado(
                extrairCargoAlvo(mensagemUsuario),
                "Engenheiro de Software Full Stack",
                limitar(respostaIa, 900),
                "Java, Spring Boot, Angular, IA, RAG, Docker, Cloud",
                limitar(respostaIa, 700));
    }

    private String texto(JsonNode root, String field, String fallback) {
        String value = root.path(field).asText("");
        return value.isBlank() ? fallback : limitar(value, field.equals("resumoAdaptado") ? 900 : 500);
    }

    private String extrairJson(String text) {
        String value = text == null ? "" : text.trim();
        if (value.startsWith("```")) {
            value = value.replaceFirst("(?s)^```(?:json)?\\s*", "").replaceFirst("(?s)\\s*```$", "");
        }
        int start = value.indexOf('{');
        int end = value.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return value.substring(start, end + 1);
        }
        return value;
    }

    private String extrairCargoAlvo(String mensagem) {
        String texto = mensagem == null ? "" : mensagem.trim();
        if (texto.isBlank()) {
            return "Currículo personalizado";
        }
        String primeiraLinha = texto.lines().findFirst().orElse("Currículo personalizado").trim();
        return limitar(primeiraLinha, 120);
    }

    private String limitar(String texto, int limite) {
        String normalized = texto == null || texto.isBlank() ? "Não informado." : texto.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= limite) {
            return normalized;
        }
        return normalized.substring(0, limite).trim();
    }
}
