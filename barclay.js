const puppeteer = require('puppeteer');
const readline = require('readline');

const config = require('./config.js');

function* screenshotFilename() {
  let index = 0;
  while (true) {
    ++index;
    let fileNumber = index < 10 ? '0' + index : '' + index;
    yield `screenshots/${fileNumber}.png`;
  }
}

// mm/dd/yy
function formatDate(date) {
  function pad(number) {
    return '' + (number < 10 ? '0' + number : number);
  }
  let fullYear = '' + date.getFullYear();
  return pad(date.getMonth() + 1) + '/' + pad(date.getDate()) + '/' + fullYear.substr(2);
}

(async() => {
  let filenameGenerator = screenshotFilename();
  let launchOptions = Object.assign({
    // Use a profile directory so we don't have to do 2-factor
    // authentication every time.
    userDataDir: './user-data/barclay'
  }, config.LAUNCH_OPTIONS);
  const browser = await puppeteer.launch(launchOptions);
  console.log(await browser.version());

  console.log('Loading login page...');
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36');
  await page.setViewport({
    'width': 1024,
    'height': 600
  });
  await page.goto('https://www.barclaycardus.com/servicing/authenticate/home');
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('Logging in...');
  await page.type('#username', config.BARCLAY.username);
  await page.type('#password', config.BARCLAY.password);
  await page.screenshot({path: filenameGenerator.next().value});

  let [response] = await Promise.all([
    page.waitForNavigation(),
    page.click('#loginButton'),
  ]);
  console.log(response.url());
  await page.screenshot({path: filenameGenerator.next().value});

  if (response.url() == 'https://www.barclaycardus.com/servicing/otp') {
    await handleOTP(browser, page, filenameGenerator);
  } else {
    await downloadTransactions(browser, page, filenameGenerator);
  }
})();

async function handleOTP(browser, page, filenameGenerator) {
  try {
    await page.waitForSelector('input[type=radio]');
  } catch (e) {
    console.log('Unable to find radio button. Exiting.');
    await browser.close();
    return;
  }
  await page.click('input[type=radio]');
  await page.screenshot({path: filenameGenerator.next().value, fullPage: true});

  try {
    await Promise.all([
      page.waitForNavigation(),
      await page.click('#otpDecision\\.btnContinue'),
    ]);
  } catch (e) {
  }

  // Get auth code from the command line.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter OTP: ', (authCode) => {
    rl.close();
    (async() => {
      console.log('Entering OTP to website...');
      await page.screenshot({path: filenameGenerator.next().value, fullPage: true});

      await page.type('#otpPasscode', authCode);
      await page.screenshot({path: filenameGenerator.next().value});

      try {
        await Promise.all([
          page.waitForNavigation({'waitUntil': 'networkidle0'}),
          page.click('#otpEntryForm\\.btnContinue'),
        ]);
      } catch (e) {
        console.log(e);
      }
      await page.screenshot({path: filenameGenerator.next().value});

      await downloadTransactions(browser, page, filenameGenerator);
    })();
  });
}

async function downloadTransactions(browser, page, filenameGenerator) {
  console.log('Load transactions...');
  await page.waitForSelector('#activityTile .tile-title-container .text-right a');
  try {
    await Promise.all([
      page.waitForNavigation(),
      page.click('#activityTile .tile-title-container .text-right a'),
    ]);
  } catch (e) {
    console.log(e);
  }
  await page.screenshot({path: filenameGenerator.next().value});

  await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: './downloads/'});

  console.log('Entering download information...');
  await page.waitForSelector('#download');
  await page.click('#download');
  await page.screenshot({path: filenameGenerator.next().value});

  // Get the last 30 days of transactions.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  let startTime = new Date(Date.now() - (7 * ONE_DAY_MS));
  startTime = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());

  await page.waitForSelector('input[name=downloadFromDate]');
  await page.type('input[name=downloadFromDate]', formatDate(startTime));
  await page.type('input[name=downloadToDate]', formatDate(new Date()));
  await page.screenshot({path: filenameGenerator.next().value});

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
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('Logging out...');
  await Promise.all([
    page.waitForNavigation(),
    page.goto('https://www.barclaycardus.com/servicing/logout'),
  ]);
  await page.screenshot({path: filenameGenerator.next().value});
  console.log('Success!');

  await browser.close();
}
