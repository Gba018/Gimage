const cache = new Map();

function intentarCarga(src, crossOrigin) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    if (crossOrigin) image.crossOrigin = crossOrigin;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen. Comprueba que la dirección sea directa y accesible.'));
    image.src = src;
  });
}

export function cargarImagen(src) {
  if (!cache.has(src)) {
    const esLocal = src.startsWith('data:') || src.startsWith('blob:');
    const promesa = esLocal
      ? intentarCarga(src).then((image) => ({ image, corsSafe: true }))
      : intentarCarga(src, 'anonymous')
        .then((image) => ({ image, corsSafe: true }))
        // DECISION: si el servidor no ofrece CORS, se permite verla y se advierte de la limitación futura.
        .catch(() => intentarCarga(src).then((image) => ({ image, corsSafe: false })));
    cache.set(src, promesa);
    promesa.catch(() => cache.delete(src));
  }
  return cache.get(src);
}
