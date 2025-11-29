package com.wmakeouthill.portfolio.infrastructure.github;

import java.util.Map;

/**
 * Mapeia linguagens para cores, similar ao GitHub.
 */
final class GithubLanguageColors {

  private static final String OTHER_LANGUAGE = "Other";

  private static final Map<String, String> COLORS = Map.ofEntries(
      Map.entry("TypeScript", "#3178c6"),
      Map.entry("JavaScript", "#f1e05a"),
      Map.entry("Java", "#b07219"),
      Map.entry("Python", "#3776ab"),
      Map.entry("C#", "#239120"),
      Map.entry("C++", "#00599c"),
      Map.entry("C", "#a8b9cc"),
      Map.entry("Go", "#00add8"),
      Map.entry("Rust", "#dea584"),
      Map.entry("PHP", "#4f5d95"),
      Map.entry("Ruby", "#701516"),
      Map.entry("Swift", "#fa7343"),
      Map.entry("Kotlin", "#7f52ff"),
      Map.entry("Dart", "#00b4ab"),
      Map.entry("HTML", "#e34c26"),
      Map.entry("CSS", "#1572b6"),
      Map.entry("SCSS", "#cf649a"),
      Map.entry("Sass", "#cf649a"),
      Map.entry("Less", "#1d365d"),
      Map.entry("Vue", "#4fc08d"),
      Map.entry("React", "#61dafb"),
      Map.entry("Angular", "#dd0031"),
      Map.entry("Node.js", "#339933"),
      Map.entry("Shell", "#89e051"),
      Map.entry("PowerShell", "#012456"),
      Map.entry("Dockerfile", "#384d54"),
      Map.entry("YAML", "#cb171e"),
      Map.entry("JSON", "#000000"),
      Map.entry("Markdown", "#083fa1"),
      Map.entry("SQL", "#336791"),
      Map.entry("R", "#198ce7"),
      Map.entry("MATLAB", "#e16737"),
      Map.entry("Scala", "#c22d40"),
      Map.entry("Perl", "#39457e"),
      Map.entry("Lua", "#000080"),
      Map.entry("Haskell", "#5d4f85"),
      Map.entry("Clojure", "#5881d8"),
      Map.entry("Elixir", "#6e4a7e"),
      Map.entry("Erlang", "#a90533"),
      Map.entry("F#", "#b845fc"),
      Map.entry("OCaml", "#3be133"),
      Map.entry("D", "#ba595e"),
      Map.entry("Nim", "#ffc200"),
      Map.entry("Crystal", "#000100"),
      Map.entry("Zig", "#f7a41d"),
      Map.entry("Assembly", "#6e4c13"),
      Map.entry(OTHER_LANGUAGE, "#6c757d"));

  private GithubLanguageColors() {
  }

  static String colorOf(String language) {
    if (language == null || language.isBlank()) {
      return COLORS.get(OTHER_LANGUAGE);
    }
    return COLORS.getOrDefault(language, COLORS.get(OTHER_LANGUAGE));
  }
}
