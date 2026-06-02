import { useEffect, useMemo, useRef } from "react";

type YouTubePlayer = {
  getIframe?: () => HTMLIFrameElement;
  pauseVideo: () => void;
  stopVideo: () => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
          };
        },
      ) => YouTubePlayer;
      PlayerState?: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING_STATE = 1;
let youtubeApiPromise: Promise<void> | null = null;
let activePlayer: YouTubePlayer | null = null;
const players = new Set<YouTubePlayer>();

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return match?.[1] ?? null;
}

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<void>((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

export function stopAllYouTubePlayers() {
  players.forEach((player) => {
    try {
      player.stopVideo();
    } catch {
      // The iframe may already be gone during route teardown.
    }
  });
  activePlayer = null;
}

function prepareNativeFullscreen(player: YouTubePlayer, title: string) {
  const iframe = player.getIframe?.();
  if (!iframe) return;

  iframe.title = title;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
  iframe.allowFullscreen = true;
  iframe.className = "youtube-player-frame absolute inset-0 h-full w-full border-0";
}

export function getYouTubeEmbedUrl(url: string) {
  const id = getYouTubeId(url);
  if (!id) return url;
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    fs: "1",
    playsinline: "0",
    enablejsapi: "1",
  });
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export function ResponsiveYouTube({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const iframePlayerRef = useRef<YouTubePlayer | null>(null);
  const videoId = useMemo(() => getYouTubeId(url), [url]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !videoId) return;

    let cancelled = false;
    const host = document.createElement("div");
    host.className = "h-full w-full";
    mount.replaceChildren(host);

    loadYouTubeApi().then(() => {
      if (cancelled || !host.isConnected || !window.YT?.Player) return;

      const player = new window.YT.Player(host, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          fs: 1,
          playsinline: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => prepareNativeFullscreen(event.target, title),
          onStateChange: (event) => {
            const isPlaying = event.data === (window.YT?.PlayerState?.PLAYING ?? PLAYING_STATE);
            if (!isPlaying) return;

            players.forEach((otherPlayer) => {
              if (otherPlayer !== event.target) {
                try {
                  otherPlayer.stopVideo();
                } catch {
                  // Ignore stale player handles; cleanup will remove them.
                }
              }
            });
            activePlayer = event.target;
          },
        },
      });

      iframePlayerRef.current = player;
      players.add(player);
    });

    return () => {
      cancelled = true;
      const player = iframePlayerRef.current;
      if (!player) {
        if (mount.contains(host)) mount.replaceChildren();
        return;
      }

      players.delete(player);
      if (activePlayer === player) activePlayer = null;
      iframePlayerRef.current = null;

      try {
        player.stopVideo();
        player.destroy();
      } catch {
        // YouTube may throw if the iframe is already detached.
      }

      if (mount.contains(host)) mount.replaceChildren();
    };
  }, [title, videoId]);

  useEffect(() => {
    const stopOnPageHide = () => stopAllYouTubePlayers();
    const stopOnHidden = () => {
      if (document.hidden) stopAllYouTubePlayers();
    };

    window.addEventListener("pagehide", stopOnPageHide);
    document.addEventListener("visibilitychange", stopOnHidden);

    return () => {
      window.removeEventListener("pagehide", stopOnPageHide);
      document.removeEventListener("visibilitychange", stopOnHidden);
    };
  }, []);

  return (
    <div className="youtube-player w-full max-w-full rounded-[inherit] bg-black">
      <div className="youtube-player-shell relative aspect-video h-auto w-full max-w-full">
        {videoId ? (
          <div ref={mountRef} title={title} className="absolute inset-0 h-full w-full border-0" />
        ) : (
          <iframe
            className="youtube-player-frame absolute inset-0 h-full w-full border-0"
            src={getYouTubeEmbedUrl(url)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
