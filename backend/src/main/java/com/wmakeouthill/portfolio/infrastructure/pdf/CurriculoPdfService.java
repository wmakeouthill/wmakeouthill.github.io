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

@Service
public class CurriculoPdfService {
    private static final String TEMPLATE_PATH = "templates/curriculo.html";
    private static final String FOTO_PATH = "templates/assets/foto-wesley.png";

    public byte[] gerar(CurriculoPersonalizado curriculo) {
        String html = carregarTemplate();
        html = html.replace("foto-wesley.png", fotoUri());
        html = inserirBlocoPersonalizado(html, curriculo);
        return renderizarPdf(html);
    }

    private byte[] renderizarPdf(String html) {
        try (Playwright playwright = Playwright.create();
                Browser browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                        .setHeadless(true)
                        .setArgs(java.util.List.of("--no-sandbox", "--disable-dev-shm-usage")))) {
            Page page = browser.newPage(new Browser.NewPageOptions()
                    .setViewportSize(794, 1123));
            page.setContent(html, new Page.SetContentOptions().setWaitUntil(WaitUntilState.NETWORKIDLE));
            page.emulateMedia(new Page.EmulateMediaOptions().setMedia(Media.PRINT));
            return page.pdf(new Page.PdfOptions()
                    .setFormat("A4")
                    .setPrintBackground(true)
                    .setMargin(new Margin()
                            .setTop("0")
                            .setRight("0")
                            .setBottom("0")
                            .setLeft("0")));
        }
    }

    private String inserirBlocoPersonalizado(String html, CurriculoPersonalizado curriculo) {
        String style = """
                <style>
                  .ai-fit{border:1px solid var(--line);background:var(--bg-soft);border-radius:8px;padding:3.5mm 4mm;margin:0 0 5mm 0}
                  .ai-fit h2{margin-top:0}
                  .ai-fit p{margin:1.5mm 0 0 0;color:var(--ink-soft);font-size:9pt}
                </style>
                """;
        String bloco = """
                  <section class="ai-fit">
                    <h2>Alinhamento com a vaga</h2>
                    <p><b>Cargo alvo:</b> %s</p>
                    <p>%s</p>
                  </section>
                """.formatted(escape(curriculo.cargoAlvo()), escape(curriculo.resumoAdaptado()));

        String withStyle = html.replace("</style>", style + "\n</style>");
        return withStyle.replace("<main class=\"main\">", "<main class=\"main\">\n" + bloco);
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
