const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths for the .next folder, build folder, package.json files, and buildParams.json
const nextFolderPath = path.join(__dirname, '.next');
const buildFolderPath = path.join(__dirname, 'build');
const packageJsonPath = path.join(__dirname, 'package.json');
const buildParamsPath = path.join(__dirname, 'buildParams.json');
const newPackageJsonPath = path.join(buildFolderPath, 'package.json');

// Check if buildParams.json exists, if not, create it with default values
if (!fs.existsSync(buildParamsPath)) {
    console.log('buildParams.json not found. Creating with default values.');
    const defaultBuildParams = {
        scripts: {},
        folders: [],
        files: [],
        dependencies: []
    };
    fs.writeFileSync(buildParamsPath, JSON.stringify(defaultBuildParams, null, 2), 'utf-8');
}

// Read and parse the build parameters from buildParams.json
let buildParams = {};
try {
    buildParams = JSON.parse(fs.readFileSync(buildParamsPath, 'utf-8'));
} catch (error) {
    console.error('Error parsing buildParams.json. Using default values.', error.message);
    buildParams = {
        scripts: {},
        folders: [],
        files: [],
        dependencies: []
    };
}
// Set default values if not provided
const filesToCopy = buildParams.files || [];
let foldersToCopy = buildParams.folders || [];
let buildDependencies = buildParams.dependencies || [];
let scripts = buildParams.scripts || {};

// Ensure "next" is included in the build dependencies
if (!buildDependencies.includes("next")) {
    buildDependencies.push("next");
}

// Ensure "start" script is included in the build scripts
if (!scripts.hasOwnProperty('start')) {
    scripts['start'] = 'next start';
}

// Remove .next from foldersToCopy if present
foldersToCopy = foldersToCopy.filter(folder => folder !== '.next');

// Remove the build folder if it exists
if (fs.existsSync(buildFolderPath)) {
    fs.rm(buildFolderPath, { recursive: true, force: true }, (err) => {
        if (err) {
            console.error(`Error deleting build folder: ${err.message}`);
        } else {
            console.log('build folder deleted.');
        }
        // Continue with the rest of the operations after deleting the build folder
        cleanNextFolderAndBuild();
    });
} else {
    // Continue with the rest of the operations if the build folder does not exist
    cleanNextFolderAndBuild();
}

// Function to clean .next folder and run the build
function cleanNextFolderAndBuild() {
    // Check if the .next folder exists and delete it
    if (fs.existsSync(nextFolderPath)) {
        fs.rm(nextFolderPath, { recursive: true, force: true }, (err) => {
            if (err) {
                console.error(`Error deleting .next folder: ${err.message}`);
            } else {
                console.log('.next folder deleted.');
            }
            // Run the 'npm run build' command after deleting the folder
            runBuild();
        });
    } else {
        // If .next folder doesn't exist, run the build command
        runBuild();
    }
}

// Function to run the 'npm run build' command
function runBuild() {
    console.log('Running build...');
    exec('npm run build', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing build: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`Build error: ${stderr}`);
        }

        console.log(`Build output:\n${stdout}`);

        // Move the .next folder and copy other files and folders to the build folder
        moveNextAndCopyFilesAndFolders();
    });
}

// Function to move .next folder and copy specified files and folders to build folder
function moveNextAndCopyFilesAndFolders() {
    // Ensure the build folder exists
    if (!fs.existsSync(buildFolderPath)) {
        fs.mkdirSync(buildFolderPath);
    }

    // Move .next folder
    const newNextFolderPath = path.join(buildFolderPath, '.next');
    if (fs.existsSync(nextFolderPath)) {
        fs.rename(nextFolderPath, newNextFolderPath, (err) => {
            if (err) {
                console.error(`Error moving .next folder: ${err.message}`);
            } else {
                console.log('.next folder moved to build/.next.');
            }
        });
    }

    // Copy specified folders
    foldersToCopy.forEach(folder => {
        const sourcePath = path.join(__dirname, folder);
        const destinationPath = path.join(buildFolderPath, folder);
        if (fs.existsSync(sourcePath)) {
            fs.cpSync(sourcePath, destinationPath, { recursive: true });
            console.log(`${folder} folder copied to build/${folder}.`);
        } else {
            console.error(`Folder not found: ${folder}`);
        }
    });

    // Copy specified files
    filesToCopy.forEach(file => {
        const sourcePath = path.join(__dirname, file);
        const destinationPath = path.join(buildFolderPath, file);
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destinationPath);
            console.log(`${file} copied to build/${file}.`);
        } else {
            console.error(`File not found: ${file}`);
        }
    });

    // Create a new package.json with filtered dependencies
    createBuildPackageJson();
}

// Function to create a new package.json file in the build folder with filtered dependencies
function createBuildPackageJson() {
    // Read and parse the original package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const dependencies = packageJson.dependencies;

    // Filter the dependencies based on the buildDependencies list
    const filteredDependencies = {};
    buildDependencies.forEach(dep => {
        if (dependencies[dep]) {
            filteredDependencies[dep] = dependencies[dep];
        }
    });

    // Create the new package.json structure
    const newPackageJson = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        main: packageJson.main,
        scripts: scripts,
        dependencies: filteredDependencies
    };

    // Write the new package.json to the build folder
    fs.writeFileSync(newPackageJsonPath, JSON.stringify(newPackageJson, null, 2), 'utf-8');
    console.log('New package.json created in the build folder.');
}
