const fs = require('fs');
const path = require('path');

function processDirectory(directory) {
    fs.readdirSync(directory).forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Replaces "dark:something" or "dark:something-else/50" strings.
            // Be careful to match the prefix `dark:` followed by tailwind class format characters.
            const updatedContent = content.replace(/dark:[\w\-.\/\[\]]+(?:[:]?[\w\-.\/\[\]]*)/g, '');
            // Optional: clean up extra spaces left behind
            const cleanedContent = updatedContent.replace(/\s{2,}/g, ' ');

            if (content !== updatedContent) {
                fs.writeFileSync(fullPath, updatedContent, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

const targetDir = path.join(__dirname, 'src');
console.log(`Starting cleanup in ${targetDir}`);
processDirectory(targetDir);
console.log("Cleanup complete!");
