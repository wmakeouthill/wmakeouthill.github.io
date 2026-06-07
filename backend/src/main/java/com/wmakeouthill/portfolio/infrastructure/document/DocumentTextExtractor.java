package com.wmakeouthill.portfolio.infrastructure.document;

import org.apache.poi.extractor.ExtractorFactory;
import org.apache.poi.extractor.POITextExtractor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.Set;

/**
 * Extrai texto de documentos Office (Word/Excel/PowerPoint) usando Apache POI.
 *
 * <p>O Gemini só entende nativamente PDF, imagem e texto via inlineData; os
 * formatos binários do Office são rejeitados. Para esses arquivos extraímos o
 * texto aqui e enviamos como contexto textual. Imagens, PDF, texto puro e áudio
 * NÃO passam por aqui — vão direto pro Gemini.</p>
 */
@Component
public class DocumentTextExtractor {

    private static final Logger logger = LoggerFactory.getLogger(DocumentTextExtractor.class);

    /** Extensões de documentos Office que o POI consegue ler. */
    private static final Set<String> EXTENSOES_OFFICE = Set.of(
            "doc", "docx", "xls", "xlsx", "ppt", "pptx");

    /** Limite de caracteres extraídos por documento, pra não estourar tokens. */
    private static final int MAX_CARACTERES = 30_000;

    /**
     * Indica se o arquivo é um documento Office que precisa de extração.
     */
    public boolean isDocumentoOffice(String filename) {
        String ext = extensao(filename);
        return ext != null && EXTENSOES_OFFICE.contains(ext);
    }

    /**
     * Extrai o texto de um documento Office. Retorna texto vazio em caso de erro
     * (o chat continua funcionando, apenas sem o conteúdo daquele anexo).
     */
    public String extrair(byte[] bytes, String filename) {
        try (POITextExtractor extractor =
                     ExtractorFactory.createExtractor(new ByteArrayInputStream(bytes))) {
            String texto = extractor.getText();
            if (texto == null) {
                return "";
            }
            texto = texto.strip();
            if (texto.length() > MAX_CARACTERES) {
                texto = texto.substring(0, MAX_CARACTERES) + "\n[... documento truncado ...]";
            }
            return texto;
        } catch (Exception e) {
            logger.error("Falha ao extrair texto do documento '{}': {}", filename, e.getMessage());
            return "";
        }
    }

    private String extensao(String filename) {
        if (filename == null) {
            return null;
        }
        int ponto = filename.lastIndexOf('.');
        if (ponto < 0 || ponto == filename.length() - 1) {
            return null;
        }
        return filename.substring(ponto + 1).toLowerCase();
    }
}
