const fs = require('fs');
const path = require('path');

const COLORS = {
  navy: '#063B70',
  blue: '#0B5C92',
  pale: '#EEF4F8',
  line: '#D9E3EA',
  text: '#243746',
  muted: '#647787',
  white: '#FFFFFF'
};

function getEnotelLogoPath() {
  return [
    path.join(__dirname, '../assets/logotipo.png'),
    path.join(__dirname, '../../frontend/public/logotipo.png')
  ].find((candidate) => fs.existsSync(candidate)) || null;
}

function drawReportHeader(doc, title, subtitle = `Gerado em ${new Date().toLocaleString('pt-BR')}`) {
  const x = 40;
  const logoPath = getEnotelLogoPath();
  if (logoPath) doc.image(logoPath, x, 28, { fit: [62, 62] });
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.navy).text(title, 118, 37, { width: 420 });
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(subtitle, 118, 61, { width: 420 });
  doc.moveTo(x, 101).lineTo(doc.page.width - x, 101).lineWidth(1).stroke(COLORS.line);
  return 113;
}

function drawTableHeaderBackground(doc, x, y, width, height) {
  doc.roundedRect(x, y, width, height, 4).fill(COLORS.pale);
  doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9);
}

function drawSummaryCard(doc, x, y, width, label, value) {
  doc.roundedRect(x, y, width, 54, 7).fillAndStroke(COLORS.pale, COLORS.line);
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label.toUpperCase(), x + 12, y + 10, { width: width - 24 });
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.navy).text(String(value), x + 12, y + 25, { width: width - 24 });
}

module.exports = { COLORS, getEnotelLogoPath, drawReportHeader, drawTableHeaderBackground, drawSummaryCard };
