declare module "simple-spellchecker" {
  export function getDictionarySync(lang: string): any;
  export function getDictionary(
    lang: string,
    cb: (err: Error | null, dictionary?: any) => void
  ): void;
}
