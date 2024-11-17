const puppeteer = require('puppeteer');
const os = require('os');

async function startBrowser() {
    let browser;
    try {
        const launchOptions = {
            args: [],
            ignoreHTTPSErrors: true,
            defaultViewport: null
        };

        // Configure Linux-specific options
        if (os.platform() === 'linux') {
            console.log('Linux system detected, using system Chromium');
            launchOptions.executablePath = '/usr/bin/chromium-browser';
            launchOptions.headless = true;
            launchOptions.args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--no-zygote',
                '--single-process',
                '--disable-extensions',
                '--window-size=1920,1080'
            ];
        }

        browser = await puppeteer.launch(launchOptions);
        
        // Get all pages
        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();

        // Set default timeout
        page.setDefaultTimeout(30000);

        return { browser, page };
    } catch (err) {
        console.error('Error launching browser:', err);
        if (browser) {
            await browser.close();
        }
        throw err;
    }
}

async function closeBrowser(browser) {
    try {
        if (browser) {
            await browser.close();
        }
    } catch (err) {
        console.error('Error closing browser:', err);
        throw err;
    }
}

// Example usage
async function main() {
    let browserInstance = null;
    try {
        browserInstance = await startBrowser();
        const page = browserInstance.page;

        // Your page automation code here
        await page.goto('https://example.com');
        
    } catch (err) {
        console.error('Error in main:', err);
    } finally {
        if (browserInstance && browserInstance.browser) {
            await closeBrowser(browserInstance.browser);
        }
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    process.exit(0);
});

// Start the script
main().catch(console.error);