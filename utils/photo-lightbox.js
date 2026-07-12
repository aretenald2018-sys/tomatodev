export function openPhotoLightbox(src) {
  const imageSrc = String(src || '').trim();
  if (!imageSrc) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'meal-photo-lightbox';
  const image = document.createElement('img');
  image.src = imageSrc;
  image.alt = '확대 사진';
  backdrop.appendChild(image);
  backdrop.addEventListener('click', () => backdrop.remove(), { once: true });
  document.body.appendChild(backdrop);
}
