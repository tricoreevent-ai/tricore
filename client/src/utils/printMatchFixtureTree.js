const escapeHtml = (value) =>
  String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const serializeFixtureSvg = (svgElement) => {
  if (!svgElement) {
    return '';
  }

  const svgClone = svgElement.cloneNode(true);
  const graphicGroup = svgElement.querySelector('.rd3t-g') || svgElement.querySelector('g');
  let targetBounds = null;

  try {
    targetBounds = graphicGroup?.getBBox?.() || svgElement.getBBox?.() || null;
  } catch {
    targetBounds = null;
  }

  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svgClone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  if (targetBounds && Number.isFinite(targetBounds.width) && Number.isFinite(targetBounds.height)) {
    const padding = 40;
    svgClone.setAttribute(
      'viewBox',
      [
        targetBounds.x - padding,
        targetBounds.y - padding,
        targetBounds.width + padding * 2,
        targetBounds.height + padding * 2
      ].join(' ')
    );
  }

  svgClone.removeAttribute('width');
  svgClone.removeAttribute('height');
  svgClone.style.width = '100%';
  svgClone.style.height = 'auto';
  svgClone.style.display = 'block';

  return new XMLSerializer().serializeToString(svgClone);
};

export const printMatchFixtureTree = ({
  eventName = '',
  matches = [],
  svgElement = null,
  viewLabel = 'Fixture Planner View'
} = {}) => {
  const safeMatches = Array.isArray(matches) ? matches : [];
  const svgMarkup = serializeFixtureSvg(svgElement);

  if (!svgMarkup) {
    return false;
  }

  const printWindow = window.open('', '_blank', 'width=1480,height=980');

  if (!printWindow) {
    return false;
  }

  const completedCount = safeMatches.filter(
    (match) => String(match?.status || '').trim() === 'Completed'
  ).length;
  const generatedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(eventName || 'Fixture Planner View')}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", Arial, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 24px;
        background: #f8fafc;
        color: #0f172a;
      }
      .sheet {
        max-width: 1480px;
        margin: 0 auto;
        border: 1px solid #dbeafe;
        border-radius: 28px;
        padding: 28px;
        background: white;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
      }
      .header {
        display: flex;
        gap: 20px;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 24px;
      }
      .eyebrow {
        margin: 0;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: #f97316;
      }
      h1 {
        margin: 10px 0 10px;
        font-size: 34px;
        line-height: 1.15;
      }
      .copy {
        margin: 0;
        max-width: 720px;
        color: #475569;
        line-height: 1.7;
      }
      .metric-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        min-width: 420px;
      }
      .metric {
        border-radius: 20px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        padding: 16px 18px;
      }
      .metric-label {
        margin: 0;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #64748b;
      }
      .metric-value {
        margin: 10px 0 0;
        font-size: 24px;
        font-weight: 800;
        color: #0f172a;
      }
      .svg-shell {
        border-radius: 24px;
        border: 1px solid #dbeafe;
        background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
        padding: 18px;
      }
      .svg-shell svg {
        width: 100%;
        height: auto;
        display: block;
      }
      .footer {
        margin-top: 16px;
        font-size: 12px;
        color: #64748b;
      }
      @page {
        size: landscape;
        margin: 12mm;
      }
      @media print {
        body {
          background: white;
          padding: 0;
        }
        .sheet {
          max-width: none;
          border: none;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="header">
        <div>
          <p class="eyebrow">TriCore Fixture Planner</p>
          <h1>${escapeHtml(eventName || 'Selected Event')}</h1>
          <p class="copy">
            ${escapeHtml(viewLabel)} for planning review and print distribution. This printout preserves
            the current fixture tree view so schedulers can discuss dependencies, stage order, and live
            published slots in one sheet.
          </p>
        </div>
        <div class="metric-grid">
          <article class="metric">
            <p class="metric-label">Fixtures</p>
            <p class="metric-value">${escapeHtml(safeMatches.length)}</p>
          </article>
          <article class="metric">
            <p class="metric-label">Completed</p>
            <p class="metric-value">${escapeHtml(completedCount)}</p>
          </article>
          <article class="metric">
            <p class="metric-label">Printed</p>
            <p class="metric-value">${escapeHtml(generatedAt)}</p>
          </article>
        </div>
      </section>

      <section class="svg-shell">
        ${svgMarkup}
      </section>

      <p class="footer">
        Generated from the TriCore Events admin portal. Use landscape print for the clearest planner view.
      </p>
    </main>
  </body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };

  return true;
};
