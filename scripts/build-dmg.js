const appdmg = require('appdmg');
const path = require('path');
const fs = require('fs');

// Read version from tauri.conf.json
const tauriConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src-tauri/tauri.conf.json'), 'utf8'));
const version = tauriConfig.version;
const productName = tauriConfig.productName || 'BP-ESC';

const targetDmg = path.resolve(__dirname, `../src-tauri/target/universal-apple-darwin/release/bundle/dmg/${productName}_${version}_universal.dmg`);
const appPath = path.resolve(__dirname, `../src-tauri/target/universal-apple-darwin/release/bundle/macos/${productName}.app`);

// Ensure target directory exists
const targetDir = path.dirname(targetDmg);
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

console.log(`🚀 Creating DMG for ${productName} v${version}...`);
console.log(`📦 Source: ${appPath}`);
console.log(`🎯 Target: ${targetDmg}`);

if (!fs.existsSync(appPath)) {
    console.error(`❌ Error: App bundle not found at ${appPath}`);
    console.error(`💡 Run 'npx tauri build --bundles app' first.`);
    process.exit(1);
}

const dmg = appdmg({
    target: targetDmg,
    basepath: path.resolve(__dirname, '..'),
    specification: {
        title: productName,
        icon: 'src-tauri/icons/icon.png', // Use PNG for appdmg icon
        'icon-size': 128,
        contents: [
            { x: 448, y: 344, type: 'link', path: '/Applications' },
            { x: 192, y: 344, type: 'file', path: appPath }
        ]
    }
});

dmg.on('finish', () => {
    console.log('✅ DMG created successfully!');
});

dmg.on('error', (err) => {
    console.error('❌ DMG creation failed:');
    console.error(err);
    process.exit(1);
});
