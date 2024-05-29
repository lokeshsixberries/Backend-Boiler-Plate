#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

const createApp = async (name) => {
    const targetPath = path.join(process.cwd(), name);
    const templatePath = path.join(__dirname, '../templates');

    try {
        // Check if the target directory already exists
        if (await fs.pathExists(targetPath)) {
            console.error(chalk.red(`Error: Directory ${name} already exists.`));
            process.exit(1);
        }

        await fs.copy(templatePath, targetPath);

        // Define default dependencies
        const dependencies = {
            express: "^4.17.1",
            dotenv: "^10.0.0",
            mongoose: "^6.0.12",
            "body-parser": "^1.19.0"
        };

        // Ensure package.json exists and include dependencies
        const packageJsonPath = path.join(targetPath, 'package.json');
        if (!(await fs.pathExists(packageJsonPath))) {
            const packageJsonContent = {
                name,
                version: '1.0.0',
                main: 'src/index.js',
                scripts: {
                    start: 'node src/index.js'
                },
                dependencies
            };
            await fs.writeJson(packageJsonPath, packageJsonContent, { spaces: 2 });
            console.log(chalk.green('Created package.json with default dependencies'));
        }

        // Ensure .gitignore exists
        const gitignorePath = path.join(targetPath, '.gitignore');
        if (!(await fs.pathExists(gitignorePath))) {
            const gitignoreContent = `
node_modules
.DS_Store
.env
`;
            await fs.writeFile(gitignorePath, gitignoreContent);
            console.log(chalk.green('Created .gitignore'));
        }

        // Ensure README.md exists
        const readmePath = path.join(targetPath, 'README.md');
        if (!(await fs.pathExists(readmePath))) {
            const readmeContent = `# ${name}\n\nThis is the ${name} project.`;
            await fs.writeFile(readmePath, readmeContent);
            console.log(chalk.green('Created README.md'));
        }

        // Create src directory and necessary files
        const srcDirPath = path.join(targetPath, 'src');
        await fs.ensureDir(srcDirPath);

        // Create app.js with API endpoints
        const appPath = path.join(srcDirPath, 'app.js');
        const appContent = `
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/authMiddleware');
const userRoutes = require('./routes/userRoutes');
const { connectDB } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(authMiddleware); // Apply authentication middleware

// Routes
app.use('/users', userRoutes);

// Connect to MongoDB
connectDB().catch(error => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the process with a non-zero exit code
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});

// Start the server
app.listen(PORT, () => {
    console.log(\`Server is running on port \${PORT}\`);
});
`;
        await fs.writeFile(appPath, appContent);
        console.log(chalk.green('Created src/app.js'));

        // Create index.js to export app
        const indexPath = path.join(srcDirPath, 'index.js');
        const indexContent = `
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(\`Server is running on port \${PORT}\`);
});
`;
        await fs.writeFile(indexPath, indexContent);
        console.log(chalk.green('Created src/index.js'));

        // Ensure .env file exists with predefined variables
        const envPath = path.join(targetPath, '.env');
        if (!(await fs.pathExists(envPath))) {
            const envContent = `MONGO_URI=your_mongo_uri_here\nPORT=3000\n`;
            await fs.writeFile(envPath, envContent);
            console.log(chalk.green('Created .env with MONGO_URI and PORT variables'));
        }

        console.log(chalk.green(`Project ${name} created successfully!`));
    } catch (error) {
        console.error(chalk.red(`Error creating project: ${error.message}`));
        process.exit(1);
    }
};

program
    .version('1.0.0')
    .arguments('<name>')
    .action((name) => {
        createApp(name);
    })
    .on('--help', () => {
        console.log();
        console.log(`Example:`);
        console.log(`  $ create-node-app my-new-app`);
    });

program.parse(process.argv);

// Provide feedback if the user does not provide any arguments
if (!process.argv.slice(2).length) {
    program.outputHelp(chalk.red);
}
