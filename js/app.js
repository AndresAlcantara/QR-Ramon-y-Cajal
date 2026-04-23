/* ============================================
   CES Ramón y Cajal — Generador de QR
   Lógica de la aplicación
   ============================================ */

(function () {
  'use strict';

  const form = document.getElementById('qr-form');
  const urlInput = document.getElementById('url-input');
  const errorMsg = document.getElementById('error-msg');
  const qrResult = document.getElementById('qr-result');
  const divider = document.getElementById('divider');
  const canvasWrap = document.getElementById('canvas-wrap');
  const urlDisplay = document.getElementById('url-display');
  const btnDownload = document.getElementById('btn-download');

  // CONFIGURACIÓN DE ALTA CALIDAD
  const EXPORT_SCALE = 4; // Multiplicador de resolución para descarga
  const QR_SIZE = 1024;   // Generamos el QR internamente a gran tamaño (nativo)
  const DISPLAY_SIZE = 256; // Tamaño visual en la web (CSS)
  const LOGO_FINAL_HEIGHT = 50; // Altura base del logo

  let highResQrCanvas = null;
  const logoImg = new Image();
  // LOGO_BASE64 está definido en js/logo.js para saltarse las restricciones Anti-Taint de file:// en navegadores
  logoImg.src = LOGO_BASE64;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const url = urlInput.value.trim();

    if (!url) {
      showError('Por favor, introduce un enlace.');
      return;
    }

    if (!isValidURL(url)) {
      showError('Introduce un enlace válido (ej: https://ejemplo.com)');
      return;
    }

    hideError();

    qrResult.classList.remove('visible');
    divider.classList.remove('visible');
    canvasWrap.innerHTML = '';

    // 1. Generar QR en un div oculto a ALTA RESOLUCIÓN (1024px reales)
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      new QRCode(tempDiv, {
        text: url,
        width: QR_SIZE,
        height: QR_SIZE,
        colorDark: "#1B2A6B",
        colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (err) {
      document.body.removeChild(tempDiv);
      showError('Error al generar el QR. Verifica el enlace.');
      return;
    }

    setTimeout(() => {
      highResQrCanvas = tempDiv.querySelector('canvas') || tempDiv.querySelector('img');

      if (!highResQrCanvas) {
        document.body.removeChild(tempDiv);
        showError('Error al generar el QR.');
        return;
      }

      // 2. CREAR PREVIEW VISUAL (Nativo en HTML)
      const previewCard = document.createElement('div');
      previewCard.style.background = 'white';
      // Ajustamos los paddings a valores visuales para la web
      previewCard.style.padding = '24px';
      previewCard.style.borderRadius = '12px';
      previewCard.style.display = 'flex';
      previewCard.style.flexDirection = 'column';
      previewCard.style.alignItems = 'center';

      // Usar imagen renderizada del QR en alta definición para pantalla
      const visualQr = new Image();
      if (highResQrCanvas.tagName === 'CANVAS') {
        visualQr.src = highResQrCanvas.toDataURL();
      } else {
        visualQr.src = highResQrCanvas.src;
      }
      visualQr.style.width = DISPLAY_SIZE + "px";
      visualQr.style.height = DISPLAY_SIZE + "px";
      visualQr.style.display = "block";

      const visualLogo = logoImg.cloneNode();
      visualLogo.style.height = LOGO_FINAL_HEIGHT + "px";
      visualLogo.style.marginTop = "20px";
      visualLogo.style.display = "block";

      previewCard.appendChild(visualQr);
      previewCard.appendChild(visualLogo);
      canvasWrap.appendChild(previewCard);

      document.body.removeChild(tempDiv);

      urlDisplay.textContent = truncateURL(url, 40);
      urlDisplay.title = url;
      qrResult.classList.add('visible');
      divider.classList.add('visible');
    }, 500);
  });

  btnDownload.addEventListener('click', function () {
    if (!highResQrCanvas) return;

    // Tomar la imagen base64 cargada internamente
    const domLogo = logoImg;

    // 3. GENERAR DESCARGA PROFESIONAL
    const qualityCanvas = document.createElement('canvas');
    const ctx = qualityCanvas.getContext('2d');

    // Mantenemos la lógica de proporciones para exportar
    const padding = 24;
    const logoAspect = domLogo.naturalHeight ? (domLogo.naturalWidth / domLogo.naturalHeight) : 4;
    const logoDrawH = LOGO_FINAL_HEIGHT;
    const logoDrawW = logoDrawH * logoAspect;

    // Tamaño base (para coordinar el escalado)
    const totalW = DISPLAY_SIZE + padding * 2;
    const totalH = DISPLAY_SIZE + padding * 2 + LOGO_FINAL_HEIGHT + 20;

    // Escalar canvas resolutivamente x4
    qualityCanvas.width = totalW * EXPORT_SCALE;
    qualityCanvas.height = totalH * EXPORT_SCALE;

    // Fondo
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, 0, 0, totalW * EXPORT_SCALE, totalH * EXPORT_SCALE, 12 * EXPORT_SCALE);
    ctx.fill();

    // Contexto en escala para pintar elementos lógicamente
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);

    // Activar smoothing para logo original de alta res
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // QR image es internamente 1024, DISPLAY_SIZE es 256. EXPORT_SCALE = 4. 256*4 = 1024. Así que el QR calza puramente píxel a píxel!
    ctx.drawImage(highResQrCanvas, padding, padding, DISPLAY_SIZE, DISPLAY_SIZE);

    const logoX = (totalW - logoDrawW) / 2;
    const logoY = padding + DISPLAY_SIZE + 20;

    const triggerDownload = () => {
      const link = document.createElement('a');
      link.download = 'QR_CES_Ramon_y_Cajal.png';
      link.href = qualityCanvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (domLogo.complete && domLogo.naturalHeight) {
      setTimeout(() => {
        ctx.drawImage(domLogo, logoX, logoY, logoDrawW, logoDrawH);
        triggerDownload();
      }, 20); // Retardo minúsculo
    } else {
      domLogo.onload = () => {
        ctx.drawImage(domLogo, logoX, logoY, logoDrawW, logoDrawH);
        triggerDownload();
      };
    }
  });

  // === Helpers ===
  function isValidURL(str) {
    try {
      var u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('visible');
    qrResult.classList.remove('visible');
    divider.classList.remove('visible');
  }

  function hideError() {
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
  }

  function truncateURL(url, maxLen) {
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen - 3) + '...';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
})();