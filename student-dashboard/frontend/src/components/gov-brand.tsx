import { cn } from "@/lib/utils";
import { useLang } from "@/lib/lang-context";
import tnSeal from "@/assets/tn-government-seal.svg";

export function TamilNaduGovLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-white p-1 shadow-sm",
        className,
      )}
      aria-label="Tamil Nadu Government logo"
    >
      <img src={tnSeal} alt="Tamil Nadu Government seal" className="h-full w-full object-contain" />
    </div>
  );
}

export function GovIdentity({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { t } = useLang();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <TamilNaduGovLogo className={compact ? "h-10 w-10" : undefined} />
      <div className="min-w-0">
        <p
          className={cn("font-bold leading-tight text-primary", compact ? "text-sm" : "text-base")}
        >
          {t("governmentOfTamilNadu")}
        </p>
        <p
          className={cn("leading-tight text-muted-foreground", compact ? "text-[11px]" : "text-xs")}
        >
          {t("samacheerKalviDigitalLearningPlatform")}
        </p>
      </div>
    </div>
  );
}

export function GovFooter() {
  const { t } = useLang();
  return (
    <footer className="border-t border-border px-5 py-4 text-center text-[11px] text-muted-foreground">
      {t("governmentOfTamilNadu")} · {t("samacheerKalviDigitalLearningPlatform")}
    </footer>
  );
}
