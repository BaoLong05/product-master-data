function googleDriveImageUrl(value: string): string | null {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    if (host !== 'drive.google.com' && host !== 'drive.usercontent.google.com') return null

    const fileId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id')
    return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600` : null
  } catch {
    return null
  }
}

function safeExternalImageUrl(value: string | null | undefined): string | null {
  if (!value) return null

  const trimmedValue = value.trim()
  const driveImageUrl = googleDriveImageUrl(trimmedValue)
  if (driveImageUrl) return driveImageUrl

  try {
    const url = new URL(trimmedValue)
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
