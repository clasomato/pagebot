const puppeteer = require('puppeteer');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomTimeout() {
    return getRandomInt(60, 300) * 1000; // 60-300 seconds
}

async function exploreNewPage(page) {
    try {
        // Initial wait to let page load properly
        await new Promise(r => setTimeout(r, 5000));

        // First round of random scrolling
        console.log('Starting initial scroll...');
        await page.evaluate(async () => {
            const scrollTimes = Math.floor(Math.random() * 5) + 3;
            for (let i = 0; i < scrollTimes; i++) {
                const scrollAmount = Math.random() * 500;
                window.scrollBy(0, scrollAmount);
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
            }
        });

        // Wait a bit before clicking
        await new Promise(r => setTimeout(r, 5000));

        // Try to click a random link
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .filter(link => {
                    try {
                        const href = link.href.toLowerCase();
                        new URL(href);
                        return href && 
                               href !== '#' && 
                               !href.startsWith('javascript:') &&
                               (href.startsWith('http://') || href.startsWith('https://'));
                    } catch {
                        return false;
                    }
                })
                .map(link => link.href);
        });

        if (links.length > 0) {
            const randomLink = links[Math.floor(Math.random() * links.length)];
            console.log('Clicking random link:', randomLink);
            await page.goto(randomLink, { waitUntil: 'domcontentloaded' });
            
            // Wait and scroll on the new page too
            await new Promise(r => setTimeout(r, 5000));
            await page.evaluate(async () => {
                const scrollTimes = Math.floor(Math.random() * 5) + 3;
                for (let i = 0; i < scrollTimes; i++) {
                    const scrollAmount = Math.random() * 500;
                    window.scrollBy(0, scrollAmount);
                    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
                }
            });
        }
    } catch (error) {
        console.log('Error during page exploration:', error.message);
    }
}

async function randomClick() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: null
        });

        const mainPage = await browser.newPage();
        mainPage.setDefaultTimeout(60000);
        mainPage.setDefaultNavigationTimeout(60000);

        while (true) {
            try {
                await mainPage.goto('https://learnstuff.co.nz', {
                    waitUntil: 'networkidle0',
                    timeout: 60000
                });

                const elements = await mainPage.evaluate(() => {
                    const links = document.querySelectorAll('a[class^="container-"]');
                    return Array.from(links).map(link => ({
                        href: link.href,
                        className: link.className
                    }));
                });

                if (elements.length > 0) {
                    const randomIndex = Math.floor(Math.random() * elements.length);
                    
                    // Setup listener for new tab before clicking
                    const newPagePromise = new Promise(resolve => 
                        browser.once('targetcreated', async target => {
                            const newPage = await target.page();
                            resolve(newPage);
                        })
                    );
                    
                    // Click the container link
                    await mainPage.evaluate((className) => {
                        const element = document.querySelector(`a.${className}`);
                        if (element) element.click();
                    }, elements[randomIndex].className);

                    // Get the new page
                    const newPage = await newPagePromise;
                    
                    // Wait for the page to have content
                    try {
                        await newPage.waitForSelector('body', { timeout: 30000 });
                        // Wait a bit more to ensure content is loaded
                        await new Promise(r => setTimeout(r, 5000));
                        
                        console.log('Starting page exploration...');
                        await exploreNewPage(newPage);
                        
                        // Ensure minimum exploration time (45-60 seconds total)
                        const additionalWaitTime = getRandomInt(45000, 60000);
                        console.log(`Additional exploration time: ${Math.round(additionalWaitTime/1000)} seconds`);
                        await new Promise(r => setTimeout(r, additionalWaitTime));
                    } catch (exploreError) {
                        console.log('Error during page exploration:', exploreError.message);
                    }
                    
                    // Close all tabs except main
                    console.log('Closing extra tabs...');
                    const pages = await browser.pages();
                    for (const page of pages) {
                        if (page !== mainPage) {
                            await page.close();
                        }
                    }

                    // Refresh main page
                    console.log('Refreshing main page...');
                    await mainPage.reload({ waitUntil: 'networkidle0' });
                    
                    // Random wait before next iteration
                    const timeout = getRandomTimeout();
                    console.log(`Waiting ${Math.round(timeout/1000)} seconds before next iteration...`);
                    await new Promise(resolve => setTimeout(resolve, timeout));
                } else {
                    console.log('No container elements found, retrying...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (innerError) {
                console.error('Error during iteration:', innerError);
                // Clean up any extra tabs
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