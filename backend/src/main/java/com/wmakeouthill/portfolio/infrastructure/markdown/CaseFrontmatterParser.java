package com.wmakeouthill.portfolio.infrastructure.markdown;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extrai o frontmatter YAML (delimitado por ---) dos cases profissionais.
 * Usa SnakeYAML (já no classpath do Spring Boot) com SafeConstructor.
 * YAML inválido nunca derruba a listagem: loga warning e devolve só o corpo.
 */
@Slf4j
@Component
public class CaseFrontmatterParser {

  private static final Pattern FRONTMATTER =
      Pattern.compile("\\A---\\r?\\n(.*?)\\r?\\n---\\r?\\n?", Pattern.DOTALL);

  public CaseFrontmatter extrair(String markdown) {
    if (markdown == null) {
      return CaseFrontmatter.vazio("");
    }
    Matcher matcher = FRONTMATTER.matcher(markdown);
    if (!matcher.find()) {
      return CaseFrontmatter.vazio(markdown);
    }
    String corpo = markdown.substring(matcher.end());
    try {
      Object dados = new Yaml(new SafeConstructor(new LoaderOptions())).load(matcher.group(1));
      if (!(dados instanceof Map<?, ?> campos)) {
        return CaseFrontmatter.vazio(corpo);
      }
      return new CaseFrontmatter(
          texto(campos, "title"),
          texto(campos, "client"),
          texto(campos, "category"),
          texto(campos, "status"),
          lista(campos, "stack"),
          texto(campos, "logo"),
          texto(campos, "cover"),
          inteiro(campos, "order"),
          texto(campos, "gallery"),
          corpo);
    } catch (RuntimeException e) {
      log.warn("Frontmatter YAML inválido, usando fallback derivado do nome: {}", e.getMessage());
      return CaseFrontmatter.vazio(corpo);
    }
  }

  private String texto(Map<?, ?> campos, String chave) {
    Object valor = campos.get(chave);
    return valor == null ? null : valor.toString().trim();
  }

  private Integer inteiro(Map<?, ?> campos, String chave) {
    Object valor = campos.get(chave);
    if (valor instanceof Number numero) {
      return numero.intValue();
    }
    try {
      return valor == null ? null : Integer.valueOf(valor.toString().trim());
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private List<String> lista(Map<?, ?> campos, String chave) {
    Object valor = campos.get(chave);
    if (!(valor instanceof List<?> itens)) {
      return List.of();
    }
    List<String> resultado = new ArrayList<>();
    for (Object item : itens) {
      if (item != null && !item.toString().isBlank()) {
        resultado.add(item.toString().trim());
      }
    }
    return List.copyOf(resultado);
  }
}
