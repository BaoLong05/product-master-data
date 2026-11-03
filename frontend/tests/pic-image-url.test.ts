import { expect, it } from 'bun:test'

type PicImageUrlModule = {
  resolvePicImageUrl: (picImage: string | null, picUrl: string | null) => string | null
}

it('accepts only safe external HTTPS PIC images and falls back to the PIC URL field', async () => {
  const module = await import('../src/' + 'pic-image-url').catch(() => null) as PicImageUrlModule | null
  expect(module).not.toBeNull()
  if (!module) return

  expect(module.resolvePicImageUrl('https://cdn.example.com/pic.png', 'https://other.example/pic.png'))
    .toBe('https://cdn.example.com/pic.png')
  expect(module.resolvePicImageUrl('not-an-image-url', 'https://cdn.example.com/fallback.png'))
    .toBe('https://cdn.example.com/fallback.png')
  for (const unsafe of [
    'http://cdn.example.com/pic.png',
    'javascript:alert(1)',
    'https://user:pass@cdn.example.com/pic.png',
    'https://localhost/pic.png',
    'https://files.local/pic.png',
    'https://printer/pic.png',
    'https://camera.home.arpa/pic.png',
    'https://127.0.0.1/pic.png',
    'https://192.168.1.4/pic.png',
    'https://[::1]/pic.png',
  ]) {
    expect(module.resolvePicImageUrl(unsafe, null)).toBeNull()
  }
})
