const GEMINI_WEB_URL = "https://gemini.google.com/";

export function GeminiLauncher() {
  const openGemini = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const opened = window.open(GEMINI_WEB_URL, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(GEMINI_WEB_URL);
  };

  return (
    <a
      href={GEMINI_WEB_URL}
      target="_blank"
      rel="noreferrer"
      onClick={openGemini}
      aria-label="Open Gemini"
      title="Open Gemini"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-md backdrop-blur"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="h-5 w-5">
        <defs>
          <linearGradient id="gemini-gradient" x1="4" x2="28" y1="28" y2="4">
            <stop offset="0" stopColor="#4285f4" />
            <stop offset="0.35" stopColor="#9b72f6" />
            <stop offset="0.68" stopColor="#d96570" />
            <stop offset="1" stopColor="#fbbc04" />
          </linearGradient>
        </defs>
        <path
          fill="url(#gemini-gradient)"
          d="M16 2.5c1.4 6.9 5.6 11.1 12.5 12.5C21.6 16.4 17.4 20.6 16 27.5 14.6 20.6 10.4 16.4 3.5 15 10.4 13.6 14.6 9.4 16 2.5Z"
        />
      </svg>
    </a>
  );
}
