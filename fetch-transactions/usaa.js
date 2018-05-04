const puppeteer = require('puppeteer');
const readline = require('readline');

const config = require('./config.js');

// mm/dd/yyyy
function formatDate(date) {
  function pad(number) {
    return '' + (number < 10 ? '0' + number : number);
  }
  let fullYear = '' + date.getFullYear();
  return pad(date.getMonth() + 1) + '/' + pad(date.getDate()) + '/' + fullYear;
}

function* screenshotFilename() {
  let index = 0;
  while (true) {
    ++index;
    let fileNumber = index < 10 ? '0' + index : '' + index;
    yield `screenshots/${fileNumber}.png`;
  }
}

async function getFrameMatchingUrl(page, urlSubstring) {
  console.log('getFrameMatchingUrl');
  for (let frame of page.frames()) {
    let title = await frame.title();
    let fullUrl = await frame.evaluate('window.location.href');
    console.log(`  ${title}: ${fullUrl}`);
    if (fullUrl.indexOf(urlSubstring) != -1) {
      return frame;
    }
  }
  return null;
}

async function main(authCode) {
  let filenameGenerator = screenshotFilename();
  const browser = await puppeteer.launch(config.LAUNCH_OPTIONS);
  console.log(await browser.version());

  console.log('Loading login page...');
  const page = await browser.newPage();
  await page.setUserAgent(config.LAUNCH_OPTIONS.userAgent);
  await page.goto('https://www.usaa.com/');
  await page.waitForSelector('#usaa-my-profile');
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('Logging in...');
  await page.click('#usaa-my-profile');
  await page.type('#usaaNum', config.USAA.username);
  await page.type('#usaaPass', config.USAA.pin + authCode);
  await page.screenshot({path: filenameGenerator.next().value});

  let [response] = await Promise.all([
    page.waitForNavigation({timeout: 60000}),
    page.click('#login'),
  ]);
  console.log(response.url());
  await page.screenshot({path: filenameGenerator.next().value});

  let frame = await getFrameMatchingUrl(page, '/EntManageAccounts?');
  if (!frame) {
    console.log('Frame not found.');
    await browser.close();
    return;
  }
  [response] = await Promise.all([
    page.waitForNavigation(),
    frame.click('.acctName > a'),
  ]);
  console.log(response.url());
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('looking for menu');
  await page.waitForSelector('#actionMenuTarget button');
  await page.click('#actionMenuTarget button');
  await page.click('#actionMenuTarget .yuimenuitem:nth-child(2)');
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('select date range')
  await page.waitForSelector('#searchcriteria\\.allorselectedtransactions_3', {visible: true});
  await page.click('#searchcriteria\\.allorselectedtransactions_3');
  await page.waitForSelector('#exportFromDate', {visible: true});

  // Get the last 7 days of transactions.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  let startTime = new Date(Date.now() - (7 * ONE_DAY_MS));
  startTime = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());

  await page.type('#exportFromDate', formatDate(startTime));
  await page.type('#exportToDate', formatDate(new Date()));
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('Downloading...');
  try {
    await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: './downloads/'});
    await Promise.all([
      // This will timeout, we're just giving time for the download to finish.
      page.waitForNavigation(),
      page.click('#exportTable'),
    ]);
  } catch (e) {
  }
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('Success!');
  await browser.close();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.question('Enter auth code: ', (authCode) => {
  rl.close();
  main(authCode);
});
