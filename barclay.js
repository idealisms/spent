const puppeteer = require('puppeteer');
const config = require('./config.js');

// mm/dd/yy
function formatDate(date) {
  function pad(number) {
    return '' + (number < 10 ? '0' + number : number);
  }
  let fullYear = '' + date.getFullYear();
  return pad(date.getMonth() + 1) + '/' + pad(date.getDate()) + '/' + fullYear.substr(2);
}

(async() => {
  const browser = await puppeteer.launch({executablePath: '/usr/bin/chromium-browser'});

  console.log(await browser.version());

  console.log('Loading login page...');
  const page = await browser.newPage();
  await page.setViewport({
    'width': 1024,
    'height': 600
  });
  await page.goto('https://www.barclaycardus.com/servicing/authenticate/home');
  await page.screenshot({path: 'screenshots/01.png'});

  console.log('Logging in...');
  await page.type('#username', config.BARCLAY.username);
  await page.type('#password', config.BARCLAY.password);
  await page.screenshot({path: 'screenshots/02.png'});

  let [response] = await Promise.all([
    page.waitForNavigation(),
    page.click('#loginButton'),
  ]);
  console.log(response.url());
  await page.screenshot({path: 'screenshots/03.png'});

  console.log('Load transactions...');
  await page.goto('https://www.barclaycardus.com/servicing/activity');
  await page.screenshot({path: 'screenshots/04.png'});

  await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: './downloads/'});

  console.log('Entering download information...');
  await page.waitForSelector('#download');
  await page.click('#download');
  await page.screenshot({path: 'screenshots/05.png'});

  // Get the last 30 days of transactions.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  let startTime = new Date(Date.now() - (7 * ONE_DAY_MS));
  startTime = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());

  await page.waitForSelector('input[name=downloadFromDate]');
  await page.type('input[name=downloadFromDate]', formatDate(startTime));
  await page.type('input[name=downloadToDate]', formatDate(new Date()));
  await page.screenshot({path: 'screenshots/06.png'});

  console.log('Submitting download...');
  try {
    await Promise.all([
      // TODO: Need Page.fileDownloaded to be implemented to get a notification
      // when the download completes. For now, just timeout and catch.
      page.waitForNavigation({
        'waitUntil': 'networkidle0'
      }),
      page.click('#submit_download'),
    ]);
  } catch (e) {
  }
  await page.screenshot({path: 'screenshots/07.png'});

  console.log('Logging out...');
  await Promise.all([
    page.waitForNavigation(),
    page.goto('https://www.barclaycardus.com/servicing/logout'),
  ]);
  await page.screenshot({path: 'screenshots/08.png'});
  console.log('Success!');

  await browser.close();
})();
