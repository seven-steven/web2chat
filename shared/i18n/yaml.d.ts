// TypeScript module declaration for YAML locale imports.
// The Vite plugin (vite-plugins/yaml-locale.ts) transforms the WXT YAML
// format ({ key: { message, placeholders } }) into flat { key: string } dicts
// at build time. This declaration reflects the *output* of that transform,
// not the raw YAML structure.
declare module '*.yml' {
  const data: Record<string, string>;
  export default data;
}
