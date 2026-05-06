import { parse } from 'yaml';
import { readFileSync } from 'fs';

type WxtLocaleEntry = {
  message: string;
  placeholders?: Record<string, { content: string; example?: string }>;
};

type LocaleYaml = Record<string, WxtLocaleEntry>;
type LocaleDict = Record<string, string>;

/**
 * Transform WXT locale YAML ({ key: { message, placeholders } }) into a flat
 * { key: resolvedString } dict. Placeholder syntax `$NAME$` is rewritten to
 * positional `{0}`, `{1}`, … based on the placeholder's `content` field
 * (`$1` → index 0, `$2` → index 1, etc.).
 */
function transformLocale(raw: LocaleYaml): LocaleDict {
  const dict: LocaleDict = {};
  for (const [key, entry] of Object.entries(raw)) {
    let msg = entry.message;
    if (entry.placeholders) {
      const nameToIndex: Record<string, number> = {};
      for (const [name, ph] of Object.entries(entry.placeholders)) {
        const match = ph.content.match(/^\$(\d+)$/);
        if (match) {
          nameToIndex[name.toLowerCase()] = parseInt(match[1]!, 10) - 1;
        }
      }
      msg = msg.replace(/\$([A-Za-z_]+)\$/g, (_, name: string) => {
        const idx = nameToIndex[name.toLowerCase()];
        return idx !== undefined ? `{${idx}}` : `$${name}$`;
      });
    }
    dict[key] = msg;
  }
  return dict;
}

/**
 * Vite plugin: intercepts imports of `locales/{en,zh_CN}.yml` and returns a
 * flat `{ key: string }` JS object instead of the raw YAML structure.
 *
 * This lets the signal-based `t()` in `shared/i18n/index.ts` import locale
 * dicts as plain JS objects with zero runtime YAML parsing overhead.
 */
export function yamlLocalePlugin() {
  const localeFileRE = /locales\/(en|zh_CN)\.yml(\?|$)/;

  return {
    name: 'yaml-locale' as const,
    transform(_code: string, id: string) {
      if (!localeFileRE.test(id)) return null;
      const raw = parse(readFileSync(id.split('?')[0]!, 'utf-8')) as LocaleYaml;
      const dict = transformLocale(raw);
      return {
        code: `export default ${JSON.stringify(dict)};`,
        map: null as string | null,
      };
    },
  };
}
