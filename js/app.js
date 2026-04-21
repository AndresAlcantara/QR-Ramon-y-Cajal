/* ============================================
   CES Ramón y Cajal — Generador de QR
   Lógica de la aplicación
   ============================================ */

(function () {
  'use strict';

  // === DOM Elements ===
  const form = document.getElementById('qr-form');
  const urlInput = document.getElementById('url-input');
  const errorMsg = document.getElementById('error-msg');
  const qrResult = document.getElementById('qr-result');
  const divider = document.getElementById('divider');
  const canvasWrap = document.getElementById('canvas-wrap');
  const urlDisplay = document.getElementById('url-display');
  const btnDownload = document.getElementById('btn-download');

  // === Config ===
  const QR_SIZE = 256;
  const LOGO_HEIGHT = 50;
  const PADDING = 24;
  const BG_COLOR = '#FFFFFF';
  const FG_COLOR = '#1B2A6B';

  // Preload logo and convert to data URL to avoid tainted canvas
  let logoLoaded = false;
  let logoDataURL = null;
  const logoImg = new Image();
  logoImg.onload = function () {
    // Convert to data URL to avoid CORS/tainted canvas issues
    try {
      var tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = logoImg.naturalWidth;
      tmpCanvas.height = logoImg.naturalHeight;
      var tmpCtx = tmpCanvas.getContext('2d');
      tmpCtx.drawImage(logoImg, 0, 0);
      logoDataURL = tmpCanvas.toDataURL('image/png');
    } catch (e) {
      // If conversion fails, we'll still use the image directly
    }
    logoLoaded = true;
  };
  logoImg.src = 'assets/image.png';

  // === Generate QR ===
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    generateQR();
  });

  function generateQR() {
    const url = urlInput.value.trim();

    // Validate
    if (!url) {
      showError('Por favor, introduce un enlace.');
      return;
    }

    if (!isValidURL(url)) {
      showError('Introduce un enlace válido (ej: https://ejemplo.com)');
      return;
    }

    hideError();

    // Hide previous result while generating
    qrResult.classList.remove('visible');
    divider.classList.remove('visible');

    // Clear previous content
    canvasWrap.innerHTML = '';

    // Create a temporary visible div for qrcode.js to render into
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    document.body.appendChild(tempDiv);

    try {
      new QRCode(tempDiv, {
        text: url,
        width: QR_SIZE,
        height: QR_SIZE,
        colorDark: FG_COLOR,
        colorLight: BG_COLOR,
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch (err) {
      document.body.removeChild(tempDiv);
      showError('Error al generar el QR. Verifica el enlace.');
      return;
    }

    // qrcode.js renders asynchronously (canvas -> img), wait for it
    setTimeout(function () {
      composeFinalImage(url, tempDiv);
    }, 500);
  }

  function composeFinalImage(url, tempDiv) {
    // qrcode.js creates a canvas and an img inside tempDiv
    var sourceCanvas = tempDiv.querySelector('canvas');
    var sourceImg = tempDiv.querySelector('img');

    // Prefer canvas, fall back to img
    var qrSource = sourceCanvas || sourceImg;

    if (!qrSource) {
      document.body.removeChild(tempDiv);
      showError('Error al generar el QR. Inténtalo de nuevo.');
      return;
    }

    // If source is img and not yet loaded, wait for it
    if (qrSource.tagName === 'IMG' && !qrSource.complete) {
      qrSource.onload = function () {
        drawFinal(url, qrSource, tempDiv);
      };
      return;
    }

    drawFinal(url, qrSource, tempDiv);
  }

  function drawFinal(url, qrSource, tempDiv) {
    // Calculate logo dimensions
    var logoAspect = logoLoaded ? (logoImg.naturalWidth / logoImg.naturalHeight) : 4;
    var logoDrawH = LOGO_HEIGHT;
    var logoDrawW = logoDrawH * logoAspect;

    // Canvas dimensions
    var totalW = QR_SIZE + PADDING * 2;
    var totalH = PADDING + QR_SIZE + (logoLoaded ? 20 + logoDrawH : 0) + PADDING;

    // Create final canvas
    var canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    var ctx = canvas.getContext('2d');

    // White rounded background
    ctx.fillStyle = BG_COLOR;
    ctx.beginPath();
    roundRect(ctx, 0, 0, totalW, totalH, 12);
    ctx.fill();

    // Draw QR code
    ctx.drawImage(qrSource, PADDING, PADDING, QR_SIZE, QR_SIZE);

    // Function to finish and show UI
    function finalize() {
      // Clean up temp element
      if (tempDiv.parentNode) document.body.removeChild(tempDiv);

      // Place final canvas in the page
      canvasWrap.innerHTML = '';
      canvasWrap.appendChild(canvas);

      // Show URL label
      urlDisplay.textContent = truncateURL(url, 40);
      urlDisplay.title = url;

      // Show result section
      qrResult.classList.add('visible');
      divider.classList.add('visible');
    }

    // Draw logo centered below QR
    if (logoLoaded) {
      var logoX = (totalW - logoDrawW) / 2;
      var logoY = PADDING + QR_SIZE + 20;
      
      if (logoDataURL) {
        var finalLogo = new Image();
        finalLogo.onload = function() {
          ctx.drawImage(finalLogo, logoX, logoY, logoDrawW, logoDrawH);
          finalize();
        };
        finalLogo.src = logoDataURL;
      } else {
        ctx.drawImage(logoImg, logoX, logoY, logoDrawW, logoDrawH);
        finalize();
      }
    } else {
      finalize();
    }
  }

  // === Download ===
  btnDownload.addEventListener('click', function () {
    var canvas = canvasWrap.querySelector('canvas');
    if (!canvas) return;

    var link = document.createElement('a');
    link.download = 'QR_CES_Ramon_y_Cajal.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
