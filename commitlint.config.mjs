/**
 * Conventional Commits con gitmoji delante (AGENTS.md › Commits).
 * Formato: <gitmoji> <tipo>(<ámbito>): <asunto>
 */

/** Gitmoji permitidos por tipo. Se comparan sin el selector de variación U+FE0F. */
const GITMOJI_BY_TYPE = {
  feat: ['✨', '💄', '♿️', '🔒️', '🗃️', '🧱', '🎉'],
  fix: ['🐛', '🚑️', '🩹', '💄', '♿️', '🔒️', '🗃️', '🧱'],
  docs: ['📝', '🏗️', '🧱'],
  refactor: ['♻️', '🏗️', '🚚'],
  test: ['✅', '🧪'],
  chore: ['🔧', '🙈', '🔥', '🚚', '🔨', '🧱', '🎉', '🔖'],
  ci: ['👷', '💚'],
  perf: ['⚡️'],
  build: ['📦️', '➕', '➖', '⬆️', '⬇️', '📌'],
  revert: ['⏪️'],
};

export const TYPES = Object.keys(GITMOJI_BY_TYPE);
export const SCOPES = [
  'app',
  'auth',
  'reports',
  'map',
  'operator',
  'functions',
  'rules',
  'config',
  'infra',
  'docs',
  'deps',
  'ci',
];

const HEADER = /^(\S+) (\w+)(?:\(([\w-]+)\))?(!)?: (.+)$/u;
const TRAILER =
  /^(co-authored-by|signed-off-by|claude-session|generated-by)\s*:|generated with|🤖/imu;
const stripVs = (text) => text.replace(/\uFE0F/gu, '');

export default {
  parserPreset: {
    parserOpts: {
      headerPattern: HEADER,
      headerCorrespondence: ['gitmoji', 'type', 'scope', 'breaking', 'subject'],
    },
  },
  plugins: [
    {
      rules: {
        'gitmoji-matches-type': ({ header }) => {
          const match = HEADER.exec(header ?? '');
          if (!match) {
            return [false, 'el asunto debe ser «<gitmoji> <tipo>(<ámbito>): <asunto>»'];
          }
          const [, gitmoji, type] = match;
          const allowed = GITMOJI_BY_TYPE[type];
          if (!allowed) return [true];
          const ok = allowed.some((emoji) => stripVs(emoji) === stripVs(gitmoji));
          return [ok, `el gitmoji de «${type}» debe ser uno de: ${allowed.join(' ')}`];
        },
        'no-tool-trailers': ({ raw }) => [
          !TRAILER.test(raw ?? ''),
          'sin coautores, firmas ni «Generated with» (AGENTS.md › Commits)',
        ],
      },
    },
  ],
  rules: {
    'gitmoji-matches-type': [2, 'always'],
    'no-tool-trailers': [2, 'always'],
    'type-enum': [2, 'always', TYPES],
    'type-empty': [2, 'never'],
    'scope-enum': [2, 'always', SCOPES],
    'scope-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [1, 'always', 72],
    'footer-leading-blank': [2, 'always'],
  },
};
