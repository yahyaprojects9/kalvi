import { useLang } from "@/lib/lang-context";
import { Button } from "@/components/ui/button";

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <div className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 p-1 ${className ?? ""}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setLang("ta")}
        className={`h-8 rounded-full px-3 text-xs whitespace-nowrap ${lang === "ta" ? "bg-primary text-primary-foreground font-bold" : ""}`}
      >
        {t("toggleTamil")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setLang("en")}
        className={`h-8 rounded-full px-3 text-xs whitespace-nowrap ${lang === "en" ? "bg-primary text-primary-foreground font-bold" : ""}`}
      >
        {t("toggleEnglish")}
      </Button>
    </div>
  );
}
