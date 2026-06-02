import type { Lang } from "@/lib/i18n";
import type { Profile } from "@/lib/auth-context";
import { englishToTamilName, isTamilText, tamilToEnglishName } from "@/lib/name-transliteration";

type LocalizedName = {
  ta?: string;
  en?: string;
};

const NAME_KEY_PREFIX = "kalvi_name_i18n:";

function keyFor(id: string): string {
  return `${NAME_KEY_PREFIX}${id}`;
}

function normalize(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function saveLocalizedName(identifier: string, value: LocalizedName): void {
  if (typeof window === "undefined") return;
  const id = normalize(identifier);
  if (!id) return;
  const payload: LocalizedName = {
    ta: normalize(value.ta),
    en: normalize(value.en),
  };
  localStorage.setItem(keyFor(id), JSON.stringify(payload));
}

export function getLocalizedName(identifier: string): LocalizedName | null {
  if (typeof window === "undefined") return null;
  const id = normalize(identifier);
  if (!id) return null;
  const raw = localStorage.getItem(keyFor(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LocalizedName;
    return {
      ta: normalize(parsed.ta),
      en: normalize(parsed.en),
    };
  } catch {
    return null;
  }
}

export function deriveLocalizedName(singleInputName: string): LocalizedName {
  const value = normalize(singleInputName) ?? "";
  if (!value) return {};

  if (isTamilText(value)) {
    return {
      ta: value,
      en: tamilToEnglishName(value),
    };
  }

  return {
    en: value,
    ta: englishToTamilName(value),
  };
}

export function resolveProfileName(profile: Profile | null, lang: Lang): string {
  if (!profile) return "-";
  const ids = [profile.id, profile.mobile_number].filter(Boolean) as string[];
  for (const id of ids) {
    const localized = getLocalizedName(id);
    if (!localized) continue;
    const preferred = normalize(localized[lang]);
    if (preferred) return preferred;

     const alternate = normalize(lang === "ta" ? localized.en : localized.ta);
     if (alternate) {
       return lang === "ta" ? englishToTamilName(alternate) : tamilToEnglishName(alternate);
     }
  }

  const fallback = normalize(profile.full_name);
  if (!fallback) return "-";
  return lang === "ta"
    ? (isTamilText(fallback) ? fallback : englishToTamilName(fallback))
    : (isTamilText(fallback) ? tamilToEnglishName(fallback) : fallback);
}
