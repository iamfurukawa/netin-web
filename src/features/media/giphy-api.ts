export type GiphyGif = {
  id: string;
  title: string;
  previewUrl: string;
  analytics?: { onclick?: { url: string }; onsend?: { url: string } };
};

type GiphyResponse = {
  data: Array<{
    id: string;
    title: string;
    images: { fixed_width?: { url?: string }; fixed_height?: { url?: string } };
    analytics?: GiphyGif["analytics"];
  }>;
};

const apiKey = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

export function giphyAvailable() { return Boolean(apiKey); }

export async function searchGiphy(query: string) {
  if (!apiKey) throw new Error("giphy_not_configured");
  const parameters = new URLSearchParams({ api_key: apiKey, q: query, limit: "18", rating: "g", lang: "pt" });
  const response = await fetch(`https://api.giphy.com/v1/gifs/search?${parameters}`);
  if (!response.ok) throw new Error("giphy_search_failed");
  const payload = await response.json() as GiphyResponse;
  return payload.data.flatMap((item): GiphyGif[] => {
    const previewUrl = item.images.fixed_width?.url ?? item.images.fixed_height?.url;
    return previewUrl ? [{ id: item.id, title: item.title || "GIF do GIPHY", previewUrl, analytics: item.analytics }] : [];
  });
}

export function registerGiphyAction(url: string | undefined) {
  if (url) void fetch(url, { mode: "no-cors" });
}
