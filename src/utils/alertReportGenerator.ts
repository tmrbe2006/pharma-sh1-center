import { jsPDF } from 'jspdf';
import { amiriFontBase64 } from '../assets/fonts/amiriFont';

export interface AlertReportParams {
  expiredList: any[];
  expiringSoon: any[];
  criticalStock: any[];
  daysThreshold: number;
  recipientEmail: string;
  generatedDate?: string;
  pharmacyName?: string;
}

/**
 * Generates an institutional, responsive RTL HTML report
 * suitable for both rich email bodies and native Google Apps Script HTML-to-PDF conversion.
 */
export function generateAlertHtmlReport(params: AlertReportParams): string {
  const {
    expiredList = [],
    expiringSoon = [],
    criticalStock = [],
    daysThreshold = 30,
    recipientEmail = '',
    generatedDate = new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' }),
    pharmacyName = 'صيدلية مركز رعاية وتأهيل ذوي الإعاقة'
  } = params;

  const totalWarnings = expiredList.length + expiringSoon.length + criticalStock.length;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير التنبيهات الدوائية والصلاحية والمخزون</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, 'Cairo', Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 24px;
      direction: rtl;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid #cbd5e1;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
      color: #ffffff;
      padding: 28px 24px;
      text-align: center;
      border-bottom: 4px solid #14b8a6;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: #ccfbf1;
    }
    .meta-bar {
      background: #f8fafc;
      padding: 14px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
      font-size: 11px;
      color: #475569;
    }
    .meta-item {
      display: inline-block;
      margin-left: 18px;
    }
    .meta-item strong {
      color: #0f172a;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      padding: 20px 24px;
      background: #fafafa;
      border-bottom: 1px solid #e2e8f0;
    }
    .metric-card {
      padding: 14px;
      border-radius: 14px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .metric-card.red {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }
    .metric-card.amber {
      background: #fffbeb;
      border-color: #fde68a;
      color: #92400e;
    }
    .metric-card.blue {
      background: #f0f9ff;
      border-color: #bae6fd;
      color: #075985;
    }
    .metric-num {
      font-size: 24px;
      font-weight: 900;
      margin: 4px 0 0 0;
    }
    .metric-lbl {
      font-size: 11px;
      font-weight: 700;
    }
    .section {
      padding: 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .section-title {
      font-size: 15px;
      font-weight: 800;
      margin: 0 0 14px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title.red { color: #dc2626; }
    .section-title.amber { color: #d97706; }
    .section-title.blue { color: #0284c7; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: right;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      padding: 10px 12px;
      font-weight: 700;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #fcfcfc;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 700;
    }
    .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-blue { background: #e0f2fe; color: #075985; border: 1px solid #7dd3fc; }
    .footer {
      background: #f8fafc;
      padding: 24px;
      font-size: 11px;
      color: #64748b;
      text-align: center;
      line-height: 1.6;
    }
    .sign-table {
      width: 100%;
      margin-top: 20px;
      text-align: center;
    }
    .sign-table td {
      border: none;
      padding: 10px;
      background: transparent !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${pharmacyName}</h1>
      <p>🛡️ تقرير التنبيهات الدوائية ومراقبة صلاحيات الأدوية والمخزون الحرج</p>
    </div>

    <!-- Meta Info -->
    <div class="meta-bar">
      <div>
        <span class="meta-item"><strong>تاريخ الفحص والتصدير:</strong> ${generatedDate}</span>
        <span class="meta-item"><strong>مهلة التنبيه المبكر:</strong> ${daysThreshold} يوماً قبل الصلاحية</span>
      </div>
      <div>
        <span class="meta-item"><strong>المرسل إليه:</strong> ${recipientEmail}</span>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="metrics-grid">
      <div class="metric-card red">
        <div class="metric-lbl">🚫 أدوية منتهية الصلاحية</div>
        <div class="metric-num">${expiredList.length}</div>
      </div>
      <div class="metric-card amber">
        <div class="metric-lbl">⚠️ وشيكة انتهاء الصلاحية</div>
        <div class="metric-num">${expiringSoon.length}</div>
      </div>
      <div class="metric-card blue">
        <div class="metric-lbl">📉 أصناف بمخزون حرج</div>
        <div class="metric-num">${criticalStock.length}</div>
      </div>
    </div>

    <!-- 1. Expired Medicines Section -->
    ${expiredList.length > 0 ? `
    <div class="section">
      <div class="section-title red">
        <span>🚫 الأدوية منتهية الصلاحية بالفعل (يجب عزلها وسحبها فوراً):</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>اسم الدواء التجاري</th>
            <th>الاسم العلمي</th>
            <th>الفئة / المصنع</th>
            <th>الكمية المتبقية</th>
            <th>تاريخ الانتهاء</th>
            <th>الإجراء المطلوب</th>
          </tr>
        </thead>
        <tbody>
          ${expiredList.map(m => `
            <tr>
              <td><strong>${m.commercialNameAr || m.commercialName}${m.commercialNameEn ? ` (${m.commercialNameEn})` : ''}</strong></td>
              <td>${m.scientificName || '-'}</td>
              <td>${m.category || m.manufacturer || 'عام'}</td>
              <td><span class="badge badge-red font-bold">${m.quantity} ${m.unit || 'وحدة'}</span></td>
              <td style="color:#dc2626; font-weight:bold;">${m.expiryDate}</td>
              <td><span class="badge badge-red">سحب فوري وإتلاف</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- 2. Expiring Soon Section -->
    ${expiringSoon.length > 0 ? `
    <div class="section">
      <div class="section-title amber">
        <span>⚠️ أدوية تقترب صلاحيتها من الانتهاء (خلال أقل من ${daysThreshold} يوماً):</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>اسم الدواء التجاري</th>
            <th>الاسم العلمي</th>
            <th>الفئة العلاجية</th>
            <th>الكمية المتوفرة</th>
            <th>تاريخ الانتهاء</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${expiringSoon.map(m => `
            <tr>
              <td><strong>${m.commercialNameAr || m.commercialName}${m.commercialNameEn ? ` (${m.commercialNameEn})` : ''}</strong></td>
              <td>${m.scientificName || '-'}</td>
              <td>${m.category || 'عام'}</td>
              <td>${m.quantity} ${m.unit || 'وحدة'}</td>
              <td style="color:#d97706; font-weight:bold;">${m.expiryDate}</td>
              <td><span class="badge badge-amber">أولوية صرف / استبدال</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- 3. Critical Stock Section -->
    ${criticalStock.length > 0 ? `
    <div class="section">
      <div class="section-title blue">
        <span>📉 أدوية وصلت لمعدل مخزون حرج (15 وحدة أو أقل):</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>اسم الدواء التجاري</th>
            <th>الاسم العلمي</th>
            <th>الكمية الحالية</th>
            <th>الوحدة</th>
            <th>الشركة المصنعة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${criticalStock.map(m => `
            <tr>
              <td><strong>${m.commercialNameAr || m.commercialName}${m.commercialNameEn ? ` (${m.commercialNameEn})` : ''}</strong></td>
              <td>${m.scientificName || '-'}</td>
              <td><span class="badge badge-blue font-bold">${m.quantity}</span></td>
              <td>${m.unit || 'وحدة'}</td>
              <td>${m.manufacturer || '-'}</td>
              <td><span class="badge badge-blue">طلب توريد عاجل</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${totalWarnings === 0 ? `
    <div class="section" style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 40px; margin-bottom: 12px;">✅</div>
      <h3 style="color: #0f766e; margin: 0 0 6px 0;">المخزون الدوائي في حالة ممتازة وآمنة تماماً!</h3>
      <p style="color: #64748b; font-size: 13px; margin: 0;">
        لا توجد أي أدوية منتهية الصلاحية أو قريبة الانتهاء، وجميع الكميات أعلى من الحد الحرج.
      </p>
    </div>
    ` : ''}

    <!-- Institutional Signatures -->
    <div class="section" style="background: #fafafa;">
      <table class="sign-table">
        <tr>
          <td>
            <p><strong>الصيدلي المسؤول:</strong></p>
            <p style="margin-top: 30px;">د. تامر مدبولي عبدالمجيد</p>
            <p style="font-size: 10px; color: #94a3b8;">صيدلي ممارس - ترخيص رقم: PH-48192</p>
          </td>
          <td>
            <p><strong>اعتماد الإدارة الطبية:</strong></p>
            <p style="margin-top: 30px;">___________________</p>
            <p style="font-size: 10px; color: #94a3b8;">إدارة الرعاية والخدمات الطبية</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>صدر هذا التقرير المنظم والملف المرفق آلياً بواسطة نظام الرقابة الدوائية الذكي بصيدلية المركز لضمان السلامة التامة للمقيمين.</p>
      <p style="direction: ltr; font-family: monospace; font-size: 10px; color: #94a3b8;">Report Ref: MED-ALERT-${Date.now().toString(36).toUpperCase()}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Helper to get a safe, printable name for standard vector PDF fonts
 */
function getPdfSafeMedicineNameEn(m: any): string {
  if (m.commercialNameEn && m.commercialNameEn.trim()) {
    return m.commercialNameEn.trim();
  }
  const raw = m.commercialName || m.commercialNameAr || '';
  const parenMatch = raw.match(/\(([^)]*[A-Za-z][^)]*)\)/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim();
  }
  const enWords = raw.match(/[A-Za-z0-9\-+.]+/g);
  if (enWords && enWords.join(' ').trim().length >= 3) {
    return enWords.join(' ').trim();
  }
  return raw.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim() || 'Medication Item';
}

/**
 * -------------------------------------------------------------
 * 1. ARABIC PDF GENERATOR (نسخة باللغة العربية مع خط أميري كامل)
 * -------------------------------------------------------------
 */
export function generateAlertPdfAr(params: AlertReportParams): { base64: string; doc: jsPDF } {
  const {
    expiredList = [],
    expiringSoon = [],
    criticalStock = [],
    daysThreshold = 30,
    recipientEmail = '',
    generatedDate = new Date().toISOString().split('T')[0],
    pharmacyName = 'صيدلية مركز رعاية وتأهيل ذوي الإعاقة'
  } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Load and register authentic Amiri font
  doc.addFileToVFS('Amiri-Regular.ttf', amiriFontBase64);
  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  doc.setFont('Amiri');

  const p = (text: string | number) => doc.processArabic(String(text ?? ''));
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 18;

  // Header Banner
  doc.setFillColor(15, 118, 110); // Teal-700
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(p(pharmacyName), pageWidth / 2, 11, { align: 'center' });

  doc.setFontSize(10);
  doc.text(p('تقرير التنبيهات الدوائية ومراقبة صلاحيات الأدوية والمخزون الحرج'), pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(8.5);
  doc.text(p(`تاريخ الفحص والتصدير: ${generatedDate}  |  مهلة التنبيه المبكر: ${daysThreshold} يوماً  |  المستلم: ${recipientEmail}`), pageWidth / 2, 24, { align: 'center' });

  currentY = 36;

  // Summary Metrics Box (الملخص التنفيذي للمراقبة)
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(p('الملخص التنفيذي لحالة الصلاحية والمخزون:'), pageWidth - 20, currentY + 6, { align: 'right' });

  // Expired Count (Right column in RTL)
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(9);
  doc.text(p(`أدوية منتهية الصلاحية: ${expiredList.length}`), pageWidth - 20, currentY + 15, { align: 'right' });

  // Expiring Soon (Center)
  doc.setTextColor(217, 119, 6);
  doc.text(p(`وشيكة انتهاء الصلاحية: ${expiringSoon.length}`), pageWidth / 2 + 15, currentY + 15, { align: 'center' });

  // Critical Stock (Left column in RTL)
  doc.setTextColor(2, 132, 199);
  doc.text(p(`أصناف بمخزون حرج: ${criticalStock.length}`), 22, currentY + 15, { align: 'left' });

  currentY += 28;

  // Zero-Defects Healthy State Card
  if (expiredList.length === 0 && expiringSoon.length === 0 && criticalStock.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, currentY, pageWidth - 28, 24, 3, 3, 'FD');
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(11);
    doc.text(p('حالة المخزون: سليم وآمن تماماً (لا توجد أدوية منتهية أو نواقص حرجة)'), pageWidth / 2, currentY + 10, { align: 'center' });
    doc.setFontSize(9);
    doc.text(p('جميع الأصناف الدوائية المسجلة في صيدلية المركز تقع ضمن مدة الصلاحية الآمنة والكميات الكافية.'), pageWidth / 2, currentY + 17, { align: 'center' });
    currentY += 32;
  }

  // 1. Expired Medicines Section
  if (expiredList.length > 0) {
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(11);
    doc.text(p(`١. الأدوية منتهية الصلاحية بالفعل (يجب عزلها وسحبها فوراً: ${expiredList.length} صنف):`), pageWidth - 14, currentY, { align: 'right' });
    currentY += 5;

    // Table Header (RTL)
    doc.setFillColor(254, 226, 226);
    doc.rect(14, currentY, pageWidth - 28, 7, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(153, 27, 27);
    doc.text(p('اسم الدواء التجاري والعلمي'), pageWidth - 18, currentY + 4.8, { align: 'right' });
    doc.text(p('الكمية المتبقية'), 100, currentY + 4.8, { align: 'right' });
    doc.text(p('تاريخ الانتهاء'), 65, currentY + 4.8, { align: 'right' });
    doc.text(p('الإجراء المطلوب'), 18, currentY + 4.8, { align: 'left' });
    currentY += 8;

    doc.setTextColor(30, 41, 59);

    expiredList.forEach((m) => {
      if (currentY > 265) {
        doc.addPage();
        doc.setFont('Amiri');
        currentY = 20;
      }
      const displayName = m.commercialNameAr || m.commercialName || m.commercialNameEn || 'دواء';
      const scName = m.scientificName ? ` (${m.scientificName})` : '';

      doc.setFontSize(8.5);
      doc.text(p(`${displayName}${scName}`.substring(0, 60)), pageWidth - 18, currentY + 4, { align: 'right' });
      doc.text(p(`${m.quantity} ${m.unit || 'وحدة'}`), 100, currentY + 4, { align: 'right' });
      doc.text(String(m.expiryDate || '-'), 65, currentY + 4, { align: 'right' });
      doc.setTextColor(220, 38, 38);
      doc.text(p('سحب فوري وإتلاف'), 18, currentY + 4, { align: 'left' });
      doc.setTextColor(30, 41, 59);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 5.5, pageWidth - 14, currentY + 5.5);
      currentY += 6.5;
    });

    currentY += 5;
  }

  // 2. Expiring Soon Section
  if (expiringSoon.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      doc.setFont('Amiri');
      currentY = 20;
    }

    doc.setTextColor(180, 83, 9);
    doc.setFontSize(11);
    doc.text(p(`٢. أدوية تقترب صلاحيتها من الانتهاء (خلال أقل من ${daysThreshold} يوماً: ${expiringSoon.length} صنف):`), pageWidth - 14, currentY, { align: 'right' });
    currentY += 5;

    doc.setFillColor(254, 243, 199);
    doc.rect(14, currentY, pageWidth - 28, 7, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text(p('اسم الدواء التجاري والعلمي'), pageWidth - 18, currentY + 4.8, { align: 'right' });
    doc.text(p('الكمية الحالية'), 100, currentY + 4.8, { align: 'right' });
    doc.text(p('تاريخ الانتهاء'), 65, currentY + 4.8, { align: 'right' });
    doc.text(p('الإجراء المطلوب'), 18, currentY + 4.8, { align: 'left' });
    currentY += 8;

    doc.setTextColor(30, 41, 59);

    expiringSoon.forEach((m) => {
      if (currentY > 265) {
        doc.addPage();
        doc.setFont('Amiri');
        currentY = 20;
      }
      const displayName = m.commercialNameAr || m.commercialName || m.commercialNameEn || 'دواء';
      const scName = m.scientificName ? ` (${m.scientificName})` : '';

      doc.setFontSize(8.5);
      doc.text(p(`${displayName}${scName}`.substring(0, 60)), pageWidth - 18, currentY + 4, { align: 'right' });
      doc.text(p(`${m.quantity} ${m.unit || 'وحدة'}`), 100, currentY + 4, { align: 'right' });
      doc.text(String(m.expiryDate || '-'), 65, currentY + 4, { align: 'right' });
      doc.setTextColor(217, 119, 6);
      doc.text(p('أولوية صرف / استبدال'), 18, currentY + 4, { align: 'left' });
      doc.setTextColor(30, 41, 59);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 5.5, pageWidth - 14, currentY + 5.5);
      currentY += 6.5;
    });

    currentY += 5;
  }

  // 3. Critical Stock Section
  if (criticalStock.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      doc.setFont('Amiri');
      currentY = 20;
    }

    doc.setTextColor(3, 105, 161);
    doc.setFontSize(11);
    doc.text(p(`٣. أدوية وصلت لمعدل مخزون حرج (١٥ وحدة أو أقل: ${criticalStock.length} صنف):`), pageWidth - 14, currentY, { align: 'right' });
    currentY += 5;

    doc.setFillColor(224, 242, 254);
    doc.rect(14, currentY, pageWidth - 28, 7, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(7, 89, 133);
    doc.text(p('اسم الدواء التجاري والعلمي'), pageWidth - 18, currentY + 4.8, { align: 'right' });
    doc.text(p('الرصيد المتبقي'), 100, currentY + 4.8, { align: 'right' });
    doc.text(p('الوحدة'), 65, currentY + 4.8, { align: 'right' });
    doc.text(p('الإجراء المطلوب'), 18, currentY + 4.8, { align: 'left' });
    currentY += 8;

    doc.setTextColor(30, 41, 59);

    criticalStock.forEach((m) => {
      if (currentY > 265) {
        doc.addPage();
        doc.setFont('Amiri');
        currentY = 20;
      }
      const displayName = m.commercialNameAr || m.commercialName || m.commercialNameEn || 'دواء';
      const scName = m.scientificName ? ` (${m.scientificName})` : '';

      doc.setFontSize(8.5);
      doc.text(p(`${displayName}${scName}`.substring(0, 60)), pageWidth - 18, currentY + 4, { align: 'right' });
      doc.text(p(String(m.quantity)), 100, currentY + 4, { align: 'right' });
      doc.text(p(String(m.unit || 'وحدة')), 65, currentY + 4, { align: 'right' });
      doc.setTextColor(3, 105, 161);
      doc.text(p('طلب توريد عاجل'), 18, currentY + 4, { align: 'left' });
      doc.setTextColor(30, 41, 59);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 5.5, pageWidth - 14, currentY + 5.5);
      currentY += 6.5;
    });

    currentY += 5;
  }

  // Footer & Signatures (Arabic)
  if (currentY > 250) {
    doc.addPage();
    doc.setFont('Amiri');
    currentY = 25;
  }

  currentY += 6;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 8;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(p('الصيدلي المسؤول: د. تامر مدبولي عبدالمجيد'), pageWidth - 14, currentY, { align: 'right' });
  doc.text(p('اعتماد الإدارة الطبية: ________________________'), 14, currentY, { align: 'left' });
  currentY += 6;
  doc.text(p('سجل رقابة دوائية إلكتروني معتمد وموثق  |  صيدلية مركز رعاية وتأهيل ذوي الإعاقة'), pageWidth / 2, currentY, { align: 'center' });

  const dataUri = doc.output('datauristring');
  const base64 = dataUri.includes(';base64,') ? dataUri.split(';base64,')[1] : dataUri.replace(/^data:[^;]*;base64,/, '');

  return {
    base64,
    doc
  };
}

/**
 * -------------------------------------------------------------
 * 2. ENGLISH PDF GENERATOR (نسخة باللغة الإنجليزية الرسمية)
 * -------------------------------------------------------------
 */
export function generateAlertPdfEn(params: AlertReportParams): { base64: string; doc: jsPDF } {
  const {
    expiredList = [],
    expiringSoon = [],
    criticalStock = [],
    daysThreshold = 30,
    recipientEmail = '',
    generatedDate = new Date().toISOString().split('T')[0],
    pharmacyName = 'Care Center Pharmacy - Medication Safety Ledger'
  } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Load and register authentic Amiri font for mixed Arabic text in English report
  doc.addFileToVFS('Amiri-Regular.ttf', amiriFontBase64);
  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');

  const drawSafeText = (text: string | number, x: number, y: number, options?: any) => {
    const str = String(text ?? '');
    if (!str) return;
    const hasArabic = /[\u0600-\u06FF]/.test(str);
    if (hasArabic) {
      doc.setFont('Amiri', 'normal');
      doc.text(doc.processArabic(str), x, y, options);
      doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    } else {
      doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
      doc.text(str, x, y, options);
    }
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 18;

  // Header Banner
  doc.setFillColor(15, 118, 110); // Teal-700
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MEDICATION SAFETY & EXPIRY AUDIT REPORT', pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  drawSafeText(pharmacyName, pageWidth / 2, 18, { align: 'center' });
  drawSafeText(`Generated Date: ${generatedDate} | Alert Threshold: ${daysThreshold} Days | Recipient: ${recipientEmail}`, pageWidth / 2, 23, { align: 'center' });

  currentY = 36;

  // Summary Metrics Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EXECUTIVE AUDIT SUMMARY', 18, currentY + 6);

  // Expired Count
  doc.setTextColor(220, 38, 38);
  doc.text(`[!] Expired Medicines: ${expiredList.length}`, 18, currentY + 14);

  // Expiring Soon
  doc.setTextColor(217, 119, 6);
  doc.text(`[*] Expiring Soon (<${daysThreshold}d): ${expiringSoon.length}`, 80, currentY + 14);

  // Critical Stock
  doc.setTextColor(2, 132, 199);
  doc.text(`[v] Critical Stock (<=15): ${criticalStock.length}`, 145, currentY + 14);

  currentY += 28;

  // Zero-Defects Healthy State Card
  if (expiredList.length === 0 && expiringSoon.length === 0 && criticalStock.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, currentY, pageWidth - 28, 24, 3, 3, 'FD');
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('AUDIT STATUS: FULLY COMPLIANT & SAFE', pageWidth / 2, currentY + 10, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('All registered pharmaceutical inventory items are safely within their validity period and adequate stock levels.', pageWidth / 2, currentY + 17, { align: 'center' });
    currentY += 32;
  }

  // Section 1: Expired Medicines
  if (expiredList.length > 0) {
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`1. EXPIRED MEDICATIONS (Immediate Disposal Required: ${expiredList.length} items)`, 14, currentY);
    currentY += 5;

    // Table Header
    doc.setFillColor(254, 226, 226);
    doc.rect(14, currentY, pageWidth - 28, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27);
    doc.text('Medication Brand & Scientific Name', 16, currentY + 4.5);
    doc.text('Stock', 115, currentY + 4.5);
    doc.text('Expiry Date', 140, currentY + 4.5);
    doc.text('Status', 170, currentY + 4.5);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    expiredList.forEach((m) => {
      if (currentY > 265) {
        doc.addPage();
        currentY = 20;
      }
      const displayName = getPdfSafeMedicineNameEn(m);
      const scName = m.scientificName ? ` (${m.scientificName.trim()})` : '';

      doc.setFontSize(8);
      drawSafeText(`${displayName}${scName}`.substring(0, 55), 16, currentY + 4);
      doc.text(`${m.quantity} ${m.unit || 'unit'}`, 115, currentY + 4);
      doc.text(String(m.expiryDate || '-'), 140, currentY + 4);
      doc.setTextColor(220, 38, 38);
      doc.text('EXPIRED', 170, currentY + 4);
      doc.setTextColor(30, 41, 59);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 5.5, pageWidth - 14, currentY + 5.5);
      currentY += 6;
    });

    currentY += 5;
  }

  // Section 2: Expiring Soon
  if (expiringSoon.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setTextColor(180, 83, 9);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`2. EXPIRING SOON MEDICATIONS (< ${daysThreshold} Days: ${expiringSoon.length} items)`, 14, currentY);
    currentY += 5;

    doc.setFillColor(254, 243, 199);
    doc.rect(14, currentY, pageWidth - 28, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text('Medication Brand & Scientific Name', 16, currentY + 4.5);
    doc.text('Stock', 115, currentY + 4.5);
    doc.text('Expiry Date', 140, currentY + 4.5);
    doc.text('Action', 170, currentY + 4.5);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    expiringSoon.forEach((m) => {
      if (currentY > 265) {
        doc.addPage();
        currentY = 20;
      }
      const displayName = getPdfSafeMedicineNameEn(m);
      const scName = m.scientificName ? ` (${m.scientificName.trim()})` : '';

      doc.setFontSize(8);
      drawSafeText(`${displayName}${scName}`.substring(0, 55), 16, currentY + 4);
      doc.text(`${m.quantity} ${m.unit || 'unit'}`, 115, currentY + 4);
      doc.text(String(m.expiryDate || '-'), 140, currentY + 4);
      doc.setTextColor(217, 119, 6);
      doc.text('PRIORITY DISPENSE', 170, currentY + 4);
      doc.setTextColor(30, 41, 59);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 5.5, pageWidth - 14, currentY + 5.5);
      currentY += 6;
    });

    currentY += 5;
  }

  // Section 3: Critical Stock
  if (criticalStock.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setTextColor(3, 105, 161);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`3. CRITICAL STOCK DEPLETION (<= 15 Units Remaining: ${criticalStock.length} items)`, 14, currentY);
    currentY += 5;

    doc.setFillColor(224, 242, 254);
    doc.rect(14, currentY, pageWidth - 28, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(7, 89, 133);
    doc.text('Medication Brand & Scientific Name', 16, currentY + 4.5);
    doc.text('Remaining', 115, currentY + 4.5);
    doc.text('Unit', 140, currentY + 4.5);
    doc.text('Restock', 170, currentY + 4.5);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    criticalStock.forEach((m) => {
      if (currentY > 265) {
        doc.addPage();
        currentY = 20;
      }
      const displayName = getPdfSafeMedicineNameEn(m);
      const scName = m.scientificName ? ` (${m.scientificName.trim()})` : '';

      doc.setFontSize(8);
      drawSafeText(`${displayName}${scName}`.substring(0, 55), 16, currentY + 4);
      doc.text(String(m.quantity), 115, currentY + 4);
      doc.text(String(m.unit || 'unit'), 140, currentY + 4);
      doc.setTextColor(3, 105, 161);
      doc.text('REORDER REQUIRED', 170, currentY + 4);
      doc.setTextColor(30, 41, 59);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 5.5, pageWidth - 14, currentY + 5.5);
      currentY += 6;
    });

    currentY += 5;
  }

  // Footer & Signatures
  if (currentY > 250) {
    doc.addPage();
    currentY = 25;
  }

  currentY += 6;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 8;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Head Pharmacist In-Charge: Dr. Tamer Madbouly Abdelmajeed', 14, currentY);
  doc.text('Medical Director Authorization: ________________________', 110, currentY);
  currentY += 6;
  doc.text('Certified Electronic Audit Record | Care Center Medication Control System', 14, currentY);

  const dataUri = doc.output('datauristring');
  const base64 = dataUri.includes(';base64,') ? dataUri.split(';base64,')[1] : dataUri.replace(/^data:[^;]*;base64,/, '');

  return {
    base64,
    doc
  };
}

/**
 * -------------------------------------------------------------
 * 3. DUAL PDF GENERATOR (توليد النسختين العربية والإنجليزية معاً)
 * -------------------------------------------------------------
 */
export function generateAlertPdfs(params: AlertReportParams): {
  pdfArBase64: string;
  pdfEnBase64: string;
  docAr: jsPDF;
  docEn: jsPDF;
} {
  const arResult = generateAlertPdfAr(params);
  const enResult = generateAlertPdfEn(params);

  return {
    pdfArBase64: arResult.base64,
    pdfEnBase64: enResult.base64,
    docAr: arResult.doc,
    docEn: enResult.doc
  };
}

/**
 * Backwards compatibility default export (Defaults to Arabic)
 */
export function generateAlertPdf(params: AlertReportParams): { base64: string; doc: jsPDF } {
  return generateAlertPdfAr(params);
}
