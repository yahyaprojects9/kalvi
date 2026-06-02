import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang, DictKey } from "./i18n";
import { t as translate } from "./i18n";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("appLanguage") ?? localStorage.getItem("lang");
    return stored === "ta" || stored === "en" ? stored : "en";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
    document.documentElement.classList.toggle("font-tamil", lang === "ta");
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("appLanguage", l);
      localStorage.setItem("lang", l);
    }
  };

  return (
    <Ctx.Provider value={{ lang, setLang, t: (k) => translate(k, lang) }}>{children}</Ctx.Provider>
  );
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside LangProvider");
  return c;
}
