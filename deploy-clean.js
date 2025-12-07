// deploy-clean.js
const ghpages = require('gh-pages');
const fs = require('fs');
const path = require('path');

// The name of the temporary folder to hold clean files for deployment
const TEMP_DIR = 'temp-deploy';

// List of files and folders necessary for the dashboard to run
const filesToInclude = [
    'index.html',
    'index.js',
    'propertyTypeDumbbell.js',
    'scatterPlot.js',
    'townComparisonChart.js',
    'test2.json',
    'style.css', // Ensure all necessary files are listed
    '.gitignore', // Include .gitignore to prevent accidental tracking later
    'package.json' // Useful for debugging deployed page
];

// Function to copy a file/folder
function copyFileOrDir(src, dest) {
    if (fs.existsSync(src)) {
        if (fs.lstatSync(src).isDirectory()) {
            fs.cpSync(src, dest, { recursive: true });
        } else {
            fs.copyFileSync(src, dest);
        }
    } else {
        console.warn(`Warning: File not found and skipped: ${src}`);
    }
}

// 1. Clean up previous temp dir and create a new one
if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEMP_DIR);

// 2. Copy only the necessary files into the temporary directory
filesToInclude.forEach(file => {
    const sourcePath = path.join(__dirname, file);
    const destPath = path.join(__dirname, TEMP_DIR, file);
    copyFileOrDir(sourcePath, destPath);
});

// 3. Deploy the temporary directory
console.log('Starting deployment from clean temporary directory...');

ghpages.publish(
    TEMP_DIR,
    {
        branch: 'gh-pages',
        dotfiles: true,
        repo: require('./package.json').repository.url
    },
    (err) => {
        // 4. Clean up the temporary directory
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });

        if (err) {
            console.error('Deployment failed:', err);
        } else {
            console.log('Deployment successful! Check your GitHub Pages settings.');
        }
    }
);