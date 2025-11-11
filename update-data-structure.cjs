const fs = require('fs');
const path = require('path');

// Read the data file
const dataPath = path.join(__dirname, 'assets', 'data', 'data.js');
let fileContent = fs.readFileSync(dataPath, 'utf8');

// Extract the JSON array from the file
const jsonMatch = fileContent.match(/const data = (\[[\s\S]*\]);/);
if (!jsonMatch) {
  console.error('Could not find data array in file');
  process.exit(1);
}

const data = JSON.parse(jsonMatch[1]);

console.log(`Found ${data.length} members`);

// Update each member to ensure they have all required fields
let updated = 0;
data.forEach(member => {
  let memberUpdated = false;
  
  // Add missing fields with empty strings
  if (!member.hasOwnProperty('englishName')) {
    member.englishName = '';
    memberUpdated = true;
  }
  if (!member.hasOwnProperty('mobile')) {
    member.mobile = '';
    memberUpdated = true;
  }
  if (!member.hasOwnProperty('address')) {
    member.address = '';
    memberUpdated = true;
  }
  
  if (memberUpdated) {
    updated++;
  }
});

console.log(`Updated ${updated} members with new fields`);

// Write back to file
const newContent = `const data = ${JSON.stringify(data, null, 2)};\n\nexport default data;\n`;
fs.writeFileSync(dataPath, newContent, 'utf8');

console.log('Data file updated successfully!');
