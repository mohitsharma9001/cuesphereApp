/** YouTube video id from a watch / youtu.be / live / embed / shorts link, or null.
 * Same links as the website accepts; parsed by hand because URL.searchParams
 * isn't reliable in every React Native build. */
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /^https?:\/\/(?:www\.|m\.)?(youtu\.be|youtube(?:-nocookie)?\.com)(\/[^?#]*)?(\?[^#]*)?/i.exec(url.trim());
  if (!m) return null;
  const [, host, path = '/', query = ''] = m;
  let id: string | null = null;
  if (host.toLowerCase() === 'youtu.be') id = path.slice(1).split('/')[0] || null;
  else if (path === '/watch') id = /[?&]v=([^&]+)/.exec(query)?.[1] ?? null;
  else id = /^\/(?:live|embed|shorts)\/([^/?#]+)/.exec(path)?.[1] ?? null;
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1` : null;
}

export interface StreamSettings {
  /** YouTube link per table number. */
  youtubeUrls: Record<string, string>;
}
