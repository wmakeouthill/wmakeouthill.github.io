package com.wmakeouthill.portfolio.infrastructure.pdf;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.Margin;
import com.microsoft.playwright.options.Media;
import com.microsoft.playwright.options.WaitUntilState;
import com.wmakeouthill.portfolio.application.dto.CurriculoPersonalizado;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CurriculoPdfService {
    private static final String TEMPLATE_PATH = "templates/curriculo.html";
    private static final String FOTO_PATH = "templates/assets/foto-wesley.png";

    public byte[] gerar(CurriculoPersonalizado curriculo) {
        String html = carregarTemplate();
        html = html.replace("foto-wesley.png", fotoUri());
        html = aplicarDadosEstruturados(html, curriculo);
        return renderizarPdf(html);
    }

    /** Largura A4 em px a 96dpi (210mm). A altura é dinâmica (página única contínua). */
    private static final int LARGURA_PX = 794;

    private byte[] renderizarPdf(String html) {
        try (Playwright playwright = Playwright.create();
                Browser browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                        .setHeadless(true)
                        .setArgs(java.util.List.of("--no-sandbox", "--disable-dev-shm-usage")))) {
            Page page = browser.newPage(new Browser.NewPageOptions()
                    .setViewportSize(LARGURA_PX, 1123));
            page.setContent(html, new Page.SetContentOptions().setWaitUntil(WaitUntilState.NETWORKIDLE));
            page.emulateMedia(new Page.EmulateMediaOptions().setMedia(Media.PRINT));

            // Espera as fontes (Inter/JetBrains Mono via @import) terminarem de carregar
            // antes de medir/renderizar — senão a medição usa métricas da fonte fallback
            // e a altura/quebra sai diferente do resultado final.
            page.evaluate("() => document.fonts.ready");

            // Gera UMA única página contínua com a altura real do conteúdo, em vez de
            // fatiar em folhas A4 (que cortava o currículo no meio das seções/colunas).
            long alturaPx = Math.round(((Number) page.evaluate(
                    "() => { const el = document.querySelector('.page') || document.body;"
                            + " return Math.ceil(el.getBoundingClientRect().height); }")).doubleValue());

            return page.pdf(new Page.PdfOptions()
                    .setPrintBackground(true)
                    .setWidth(LARGURA_PX + "px")
                    .setHeight(alturaPx + "px")
                    .setMargin(new Margin()
                            .setTop("0")
                            .setRight("0")
                            .setBottom("0")
                            .setLeft("0")));
        }
    }

    private String aplicarDadosEstruturados(String html, CurriculoPersonalizado curriculo) {
        String result = substituirRole(html, curriculo);
        result = substituirResumo(result, curriculo);
        return inserirBlocoPersonalizado(result, curriculo);
    }

    private String substituirRole(String html, CurriculoPersonalizado curriculo) {
        return Pattern.compile("<div class=\"role\">.*?</div>", Pattern.DOTALL)
                .matcher(html)
                .replaceFirst(Matcher.quoteReplacement(
                        "<div class=\"role\">" + escape(curriculo.tituloProfissional()) + "</div>"));
    }

    private String substituirResumo(String html, CurriculoPersonalizado curriculo) {
        String resumo = """
            <p class="summary">
              %s
            </p>
            """.formatted(escape(curriculo.resumoAdaptado()));
        return Pattern.compile("<p class=\"summary\">.*?</p>", Pattern.DOTALL)
                .matcher(html)
                .replaceFirst(Matcher.quoteReplacement(resumo));
    }

    private String inserirBlocoPersonalizado(String html, CurriculoPersonalizado curriculo) {
        // O CSS de .ai-fit vive no template (curriculo.html), junto do .summary, para
        // herdar a mesma linguagem visual. Aqui só injetamos o conteúdo da seção.
        String bloco = """
                  <section class="ai-fit">
                    <h2>Alinhamento com a vaga</h2>
                    <p><b>Cargo alvo:</b> %s</p>
                    <p><b>Palavras-chave:</b> %s</p>
                    <p>%s</p>
                  </section>
                """.formatted(
                escape(curriculo.cargoAlvo()),
                escape(curriculo.palavrasChave()),
                escape(curriculo.destaquesAlinhamento()));

        return html.replace("<main class=\"main\">", "<main class=\"main\">\n" + bloco);
    }

    private String carregarTemplate() {
        try {
            return new ClassPathResource(TEMPLATE_PATH).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Template do currículo não encontrado", e);
        }
    }

    private String fotoUri() {
        try {
            byte[] bytes = new ClassPathResource(FOTO_PATH).getInputStream().readAllBytes();
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (IOException e) {
            throw new IllegalStateException("Foto do currículo não encontrada", e);
        }
    }

    private String escape(String value) {
        if (value == null || value.isBlank()) {
            return "Não informado.";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
