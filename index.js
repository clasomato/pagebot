const puppeteer = require('puppeteer');
const os = require('os');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomTimeout() {
    return getRandomInt(60, 300) * 1000;
}

async function randomScroll(page) {
    await page.evaluate(async () => {
        const scrollTimes = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < scrollTimes; i++) {
            const scrollAmount = Math.random() * 500;
            window.scrollBy(0, scrollAmount);
            await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
            if (i === scrollTimes - 1) {
                window.scrollTo(0, 0);
            }
        }
    });
}

async function randomClick() {
    let browser;
    try {
        const launchOptions = {
            defaultViewport: null
        };

        if (os.platform() === 'linux') {
            console.log('Linux system detected, using system Chromium');
            launchOptions.executablePath = '/usr/bin/chromium-browser';
            launchOptions.headless = 'new';
            launchOptions.args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-features=VizDisplayCompositor',
                '--headless=new'
            ];
        } else {
            console.log('Non-Linux system detected, using default Chrome');
            launchOptions.headless = false;
            launchOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
        }

        browser = await puppeteer.launch(launchOptions);

        const mainPage = await browser.newPage();
        mainPage.setDefaultTimeout(60000);
        mainPage.setDefaultNavigationTimeout(60000);

        while (true) {
            try {
                await mainPage.goto('https://learnstuff.co.nz', {
                    waitUntil: 'networkidle0',
                    timeout: 60000
                });

                const shouldClickContainer = Math.random() < 0.35;

                if (shouldClickContainer) {
                    console.log('Rolling for container click... Success!');
                    const elements = await mainPage.evaluate(() => {
                        const links = document.querySelectorAll('a[class^="container-"]');
                        return Array.from(links).map(link => ({
                            href: link.href,
                            className: link.className
                        }));
                    });

                    if (elements.length > 0) {
                        const randomIndex = Math.floor(Math.random() * elements.length);
                        
                        const newPagePromise = new Promise(resolve => 
                            browser.once('targetcreated', target => resolve(target.page()))
                        );
                        
                        await mainPage.evaluate((className) => {
                            const element = document.querySelector(`a.${className}`);
                            if (element) element.click();
                        }, elements[randomIndex].className);

                        const newPage = await newPagePromise;
                        
                        try {
                            await newPage.waitForSelector('body', { timeout: 30000 });
                            await new Promise(r => setTimeout(r, 5000));
                            
                            console.log('Scrolling on new page...');
                            await randomScroll(newPage);
                            
                            const exploreTime = getRandomInt(45000, 60000);
                            console.log(`Exploring page for ${Math.round(exploreTime/1000)} seconds...`);
                            await new Promise(r => setTimeout(r, exploreTime));
                        } catch (exploreError) {
                            console.log('Error during page exploration:', exploreError.message);
                        }
                        
                        console.log('Closing extra tabs...');
                        const pages = await browser.pages();
                        for (const page of pages) {
                            if (page !== mainPage) {
                                await page.close();
                            }
                        }
                    }
                } else {
                    console.log('Rolling for container click... Just scrolling this time.');
                    await randomScroll(mainPage);
                    
                    const scrollTime = getRandomInt(15000, 30000);
                    console.log(`Scrolling main page for ${Math.round(scrollTime/1000)} seconds...`);
                    await new Promise(r => setTimeout(r, scrollTime));
                }

                await mainPage.reload({ waitUntil: 'networkidle0' });
                
                const timeout = getRandomTimeout();
                console.log(`Waiting ${Math.round(timeout/1000)} seconds before next iteration...`);
                await new Promise(resolve => setTimeout(resolve, timeout));

            } catch (innerError) {
                console.error('Error during iteration:', innerError);
                const pages = await browser.pages();
                for (const page of pages) {
                    if (page !== mainPage) {
                        await page.close();
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (error) {
        console.error('Fatal error occurred:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
        console.log('Restarting process in 5 seconds...');
        setTimeout(randomClick, 5000);
    }
}

console.log('Starting automation...');
randomClick();