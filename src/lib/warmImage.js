// Прогрев кэша трансформаций Supabase Storage сразу после загрузки картинки.
// Приложение запрашивает сжатые версии (ImgUtil в Flutter: 160/400/300/600/1000/1200),
// а Supabase делает первую трансформацию 2–3 с. Запрашиваем их заранее из админки,
// чтобы резиденты сразу получали картинку из кэша CDN.
const SIZES = [
  [160, 70], [400, 78], [300, 80], [600, 80], [600, 75], [1000, 75], [1200, 85],
];

export function warmImage(publicUrl) {
  if (!publicUrl || !publicUrl.includes('/storage/v1/object/public/')) return;
  const base = publicUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  for (const [w, q] of SIZES) {
    fetch(`${base}?width=${w}&quality=${q}&resize=contain`, { mode: 'no-cors' }).catch(() => {});
  }
}
