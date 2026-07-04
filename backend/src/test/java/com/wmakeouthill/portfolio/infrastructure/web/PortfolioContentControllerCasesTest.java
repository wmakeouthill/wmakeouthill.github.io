package com.wmakeouthill.portfolio.infrastructure.web;

import com.wmakeouthill.portfolio.application.dto.CaseDto;
import com.wmakeouthill.portfolio.application.port.out.GithubRepositoryContentPort;
import com.wmakeouthill.portfolio.application.usecase.ListarCasesUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PortfolioContentControllerCasesTest {

  private final GithubRepositoryContentPort contentPort = mock(GithubRepositoryContentPort.class);
  private final ListarCasesUseCase listarCasesUseCase = mock(ListarCasesUseCase.class);
  private final MockMvc mvc = MockMvcBuilders
      .standaloneSetup(new PortfolioContentController(contentPort, listarCasesUseCase))
      .build();

  @Test
  void listarCases_semLang_deveUsarPtEExporJson() throws Exception {
    when(listarCasesUseCase.executar("pt")).thenReturn(List.of(new CaseDto(
        "mercearia-rv", "Mercearia R&V", "Mercearia R&V", "freela", "Produção",
        List.of("Java 21"), null, null, true, "mercearia-r-v", 9)));

    mvc.perform(get("/api/content/cases"))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "max-age=300, public"))
        .andExpect(jsonPath("$[0].slug").value("mercearia-rv"))
        .andExpect(jsonPath("$[0].hasGallery").value(true));
  }

  @Test
  void listarCases_comLangEn_deveRepassarIdioma() throws Exception {
    when(listarCasesUseCase.executar("en")).thenReturn(List.of());

    mvc.perform(get("/api/content/cases").param("lang", "en"))
        .andExpect(status().isOk());
  }
}
