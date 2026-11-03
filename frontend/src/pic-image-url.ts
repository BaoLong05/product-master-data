function safeExternalImageUrl(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    if (url.protocol !== 'https:' || !host || url.username || url.password) return null
    if (!host.includes('.') || host === 'localhost' || /\.(localhost|local|internal|test|lan|onion)$/.test(host) || host.endsWith('.home.arpa')) return null
    if (host.includes(':') || /^\d+(?:\.\d+){0,3}$/.test(host)) return null
    return url.href
  } catch {
    return null
  }
}

export function resolvePicImageUrl(picImage: string | null | undefined, picUrl: string | null | undefined): string | null {
  return safeExternalImageUrl(picImage) ?? safeExternalImageUrl(picUrl)
}
