package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.CurriculoPersonalizado;
import com.wmakeouthill.portfolio.infrastructure.pdf.CurriculoPdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GerarCurriculoUseCase {
    private final CurriculoPdfService curriculoPdfService;

    public byte[] executar(String mensagemUsuario, String respostaIa) {
        CurriculoPersonalizado curriculo = new CurriculoPersonalizado(
                extrairCargoAlvo(mensagemUsuario),
                limitar(mensagemUsuario, 900),
                limitar(respostaIa, 900));
        return curriculoPdfService.gerar(curriculo);
    }

    public boolean deveGerar(String mensagem) {
        if (mensagem == null) {
            return false;
        }
        String lower = mensagem.toLowerCase();
        return lower.contains("currículo")
                || lower.contains("curriculo")
                || lower.contains("vaga")
                || lower.contains("job description")
                || lower.contains("descrição da vaga")
                || lower.contains("descricao da vaga");
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
