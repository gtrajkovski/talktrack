const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\gpt30\\Downloads\\TalkTrack_Screenshots';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));

// Read PNG header to get dimensions
files.forEach(file => {
  const buffer = fs.readFileSync(path.join(dir, file));
  // PNG dimensions are at bytes 16-23 (width at 16-19, height at 20-23)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log(`${file}: ${width} x ${height}`);
});
