const fs = require('fs');
const path = require('path');

const fonts = [
  {
    name: 'txcPearl',
    path: '../public/fonts/TXCPearl-Regular.ttf'
  },
  {
    name: 'neuzeitRegular',
    path: '../public/fonts/Neuzeit-Grotesk-Regular.ttf'
  },
  {
    name: 'neuzeitBold',
    path: '../public/fonts/Neuzeit-Grotesk-bold.ttf'
  }
];

fonts.forEach(font => {
  const fontPath = path.join(__dirname, font.path);
  const fontContent = fs.readFileSync(fontPath);
  const base64 = fontContent.toString('base64');
  console.log(`export const ${font.name}Base64 = 'data:font/ttf;base64,${base64}'`);
}); 