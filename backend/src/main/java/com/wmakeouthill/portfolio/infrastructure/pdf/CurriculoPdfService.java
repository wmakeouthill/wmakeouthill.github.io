package com.wmakeouthill.portfolio.infrastructure.pdf;

import com.wmakeouthill.portfolio.application.dto.CurriculoPersonalizado;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class CurriculoPdfService {
    private static final float MARGIN = 48;
    private static final float LINE_HEIGHT = 14;

    public byte[] gerar(CurriculoPersonalizado curriculo) {
        try (PDDocument document = new PDDocument();
                ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = page.getMediaBox().getHeight() - MARGIN;
                PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

                y = write(content, "Wesley de Carvalho Augusto Correia", bold, 18, MARGIN, y);
                y = write(content, curriculo.cargoAlvo(), regular, 12, MARGIN, y - 4);
                y = write(content, "Portfólio: wmakeouthill.dev | GitHub: github.com/wmakeouthill", regular, 9, MARGIN, y - 8);

                y = section(content, "Resumo adaptado", bold, MARGIN, y - 18);
                y = paragraph(content, curriculo.resumoAdaptado(), regular, 10, MARGIN, y, 92);

                y = section(content, "Foco da vaga", bold, MARGIN, y - 12);
                y = paragraph(content, curriculo.contextoVaga(), regular, 10, MARGIN, y, 92);

                y = section(content, "Competências alinhadas", bold, MARGIN, y - 12);
                y = bullets(content, regular, MARGIN, y, List.of(
                        "Java, Spring Boot, APIs REST, arquitetura limpa e integrações.",
                        "Angular, TypeScript, experiência com interfaces responsivas.",
                        "Docker, Oracle Cloud, Firebase/Vercel e automação de deploy.",
                        "Observabilidade, cache, PDFs, integrações externas e IA aplicada."));

                y = section(content, "Experiência destacada", bold, MARGIN, y - 12);
                paragraph(content,
                        "Desenvolvimento de sistemas web full stack, integrações com APIs, automações, portfólio técnico com backend Java/Spring Boot e frontend Angular, além de soluções com IA generativa.",
                        regular, 10, MARGIN, y, 92);
            }

            document.save(output);
            return output.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Erro ao gerar currículo PDF", e);
        }
    }

    private float section(PDPageContentStream content, String text, PDType1Font font, float x, float y)
            throws IOException {
        return write(content, text, font, 13, x, y) - 2;
    }

    private float bullets(PDPageContentStream content, PDType1Font font, float x, float y, List<String> items)
            throws IOException {
        float currentY = y;
        for (String item : items) {
            currentY = paragraph(content, "• " + item, font, 10, x, currentY, 92);
        }
        return currentY;
    }

    private float paragraph(PDPageContentStream content, String text, PDType1Font font, int size, float x, float y,
            int maxChars) throws IOException {
        float currentY = y;
        for (String line : wrap(text, maxChars)) {
            currentY = write(content, line, font, size, x, currentY);
        }
        return currentY;
    }

    private float write(PDPageContentStream content, String text, PDType1Font font, int size, float x, float y)
            throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(x, y);
        content.showText(sanitize(text));
        content.endText();
        return y - LINE_HEIGHT;
    }

    private List<String> wrap(String text, int maxChars) {
        String normalized = text == null || text.isBlank() ? "Não informado." : text.replaceAll("\\s+", " ").trim();
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String word : normalized.split(" ")) {
            if (current.length() + word.length() + 1 > maxChars) {
                lines.add(current.toString());
                current.setLength(0);
            }
            if (!current.isEmpty()) {
                current.append(' ');
            }
            current.append(word);
        }
        if (!current.isEmpty()) {
            lines.add(current.toString());
        }
        return lines;
    }

    private String sanitize(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replace("•", "-")
                .replace("—", "-")
                .replace("–", "-")
                .replace("“", "\"")
                .replace("”", "\"")
                .replace("’", "'");
    }
}
