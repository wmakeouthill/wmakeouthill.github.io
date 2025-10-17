/**
 * Generate static GitHub data JSON for the portfolio frontend.
 * Usage (Windows PowerShell):
 *   $env:GITHUB_TOKEN="<token>"; node portfolio/scripts/generate-github-data.mjs wmakeouthill
 * Usage (bash):
 *   GITHUB_TOKEN="<token>" node portfolio/scripts/generate-github-data.mjs wmakeouthill
 */

const USERNAME = process.argv[2] || process.env.USERNAME || process.env.GH_USERNAME;
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!USERNAME) {
  console.error(
    'ERROR: Missing username. Pass it as an argument: node generate-github-data.mjs <github-username>'
  );
  process.exit(1);
}
if (!TOKEN) {
  console.error('ERROR: Missing GITHUB_TOKEN environment variable.');
  process.exit(1);
}

const API = 'https://api.github.com';
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const languageColors = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Java: '#b07219',
  Python: '#3776ab',
  'C#': '#239120',
  'C++': '#00599c',
  C: '#a8b9cc',
  Go: '#00add8',
  Rust: '#dea584',
  PHP: '#4f5d95',
  Ruby: '#701516',
  Swift: '#fa7343',
  Kotlin: '#7f52ff',
  Dart: '#00b4ab',
  HTML: '#e34c26',
  CSS: '#1572b6',
  SCSS: '#cf649a',
  Sass: '#cf649a',
  Less: '#1d365d',
  Vue: '#4fc08d',
  React: '#61dafb',
  Angular: '#dd0031',
  'Node.js': '#339933',
  Shell: '#89e051',
  PowerShell: '#012456',
  Dockerfile: '#384d54',
  YAML: '#cb171e',
  JSON: '#000000',
  Markdown: '#083fa1',
  SQL: '#336791',
  R: '#198ce7',
  MATLAB: '#e16737',
  Scala: '#c22d40',
  Perl: '#39457e',
  Lua: '#000080',
  Haskell: '#5d4f85',
  Clojure: '#5881d8',
  Elixir: '#6e4a7e',
  Erlang: '#a90533',
  'F#': '#b845fc',
  OCaml: '#3be133',
  D: '#ba595e',
  Nim: '#ffc200',
  Crystal: '#000100',
  Zig: '#f7a41d',
  Assembly: '#6e4c13',
  Other: '#6c757d',
};
const colorOf = (name) => languageColors[name] || languageColors.Other;

async function gh(path) {
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} on ${path}`);
  return res.json();
}

function calcLanguagePercentages(languages) {
  const total = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      percentage: Math.round((bytes * 100) / total),
      color: colorOf(name),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

async function main() {
  const repos = (await gh(`/users/${USERNAME}/repos?per_page=100&sort=updated`)).filter(
    (r) => !r.fork
  );
  const enriched = [];
  for (const r of repos) {
    const langs = await gh(`/repos/${USERNAME}/${r.name}/languages`).catch(() => ({}));
    const languages = calcLanguagePercentages(langs);
    enriched.push({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      html_url: r.html_url,
      homepage: r.homepage,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      language: r.language,
      topics: Array.isArray(r.topics) ? r.topics : [],
      created_at: r.created_at,
      updated_at: r.updated_at,
      pushed_at: r.pushed_at,
      fork: r.fork,
      languages,
    });
  }
  const payload = { generatedAt: new Date().toISOString(), repositories: enriched };

  // Write file
  const fs = await import('node:fs');
  fs.mkdirSync('portfolio/src/assets', { recursive: true });
  fs.writeFileSync('portfolio/src/assets/github_data.json', JSON.stringify(payload, null, 2));
  console.log('✔ Wrote portfolio/src/assets/github_data.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
