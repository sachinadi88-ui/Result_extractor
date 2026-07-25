export async function compressAndResizeImage(
  file: File,
  maxDimension = 1800,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve({ base64: '', mimeType: 'image/jpeg' });
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        const mimeType = 'image/jpeg';
        const base64 = canvas.toDataURL(mimeType, quality);
        resolve({ base64, mimeType });
      };

      img.onerror = () => {
        resolve({
          base64: src,
          mimeType: file.type || 'image/png',
        });
      };

      img.src = src;
    };

    reader.onerror = () => {
      resolve({ base64: '', mimeType: 'image/jpeg' });
    };

    reader.readAsDataURL(file);
  });
}

export async function compressBase64Image(
  base64Str: string,
  maxDimension = 800,
  quality = 0.4
): Promise<string> {
  if (!base64Str) return '';
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, width, height);
      }

      const mimeType = 'image/jpeg';
      const base64 = canvas.toDataURL(mimeType, quality);
      resolve(base64);
    };

    img.onerror = () => {
      resolve(base64Str);
    };

    img.src = base64Str;
  });
}

