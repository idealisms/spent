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

// mm/dd/yyyy
function formatDate(date) {
  function pad(number) {
    return '' + (number < 10 ? '0' + number : number);
  }
  return pad(date.getMonth() + 1) + '/' + pad(date.getDate()) + '/' + date.getFullYear();
}

async function getFrameMatchingUrl(page, urlSubstring) {
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

(async() => {
  let filenameGenerator = screenshotFilename();
  let launchOptions = Object.assign({
    // Use a profile directory so we don't have to do 2-factor
    // authentication every time.
    userDataDir: './user-data/chase2'
  }, config.LAUNCH_OPTIONS);

  const browser = await puppeteer.launch(launchOptions);

  console.log(await browser.version());

  console.log('Loading login page...');
  const page = await browser.newPage();
  await page.setUserAgent(config.LAUNCH_OPTIONS.userAgent);
  await page.goto('https://www.chase.com/');

  console.log('Click Sign in...');
  let [response] = await Promise.all([
    page.waitForNavigation({'waitUntil': 'networkidle0'}),
    page.click('.btn.signInBtn'),
  ]);
  console.log(response.url());
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('Finding login frame ...');
  let loginFrame = await getFrameMatchingUrl(page, '?fromOrigin');

  await loginFrame.waitForSelector('#userId-input-field');
  await loginFrame.type('#userId-input-field', config.CHASE2.username);
  await loginFrame.focus('#password-input-field');
  await loginFrame.type('#password-input-field', config.CHASE2.password);
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('Logging in...');
  try {
    await Promise.all([
      // FIXME: Switch to waitForSelector.
      page.waitForSelector('#signin-button', {'hidden': true}),
      loginFrame.click('#signin-button'),
    ]);
  } catch (e) {
  }
  await page.screenshot({path: filenameGenerator.next().value});

  loginFrame = await getFrameMatchingUrl(page, 'logon/recognizeUser/instructions');

  if (loginFrame) {
    console.log('Logged in, starting 2-factor auth flow...');
    await loginFrame.waitForSelector('#requestDeliveryDevices-sm');

    // Verify device.
    await Promise.all([
        loginFrame.waitForSelector('input[name=identificationCodeDeliveredDevice]'),
        loginFrame.click('#requestDeliveryDevices-sm'),
    ]);
    await page.screenshot({path: filenameGenerator.next().value});
    // Have the auth code sent as a SMS message.
    await loginFrame.click('input[name=identificationCodeDeliveredDevice]');
    await page.screenshot({path: filenameGenerator.next().value});
    await Promise.all([
      loginFrame.waitForSelector('#otpcode_input-input-field'),
      loginFrame.click('#requestIdentificationCode-sm'),
    ]);
    await page.screenshot({path: filenameGenerator.next().value});
    // Get auth code from the command line.
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter auth code: ', (authCode) => {
      rl.close();
      (async() => {
        console.log('Entering auth code to website...');
        await loginFrame.type('#otpcode_input-input-field', authCode);
        await loginFrame.type('#password_input-input-field', config.CHASE2.password);
        await page.screenshot({path: filenameGenerator.next().value});

        try {
          await Promise.all([
            page.waitForNavigation({'waitUntil': 'networkidle0'}),
            loginFrame.click('#log_on_to_landing_page-sm'),
          ]);
        } catch (e) {
          console.log(e);
        }
        await page.screenshot({path: filenameGenerator.next().value});

        await getTransactionsFromDashboard(browser, page, filenameGenerator);
      })();
    });
  } else {
    console.log('No 2-factor auth.');
    await getTransactionsFromDashboard(browser, page, filenameGenerator);
  }
})();

async function getTransactionsFromDashboard(browser, page, filenameGenerator) {

  console.log('Waiting for account info to load...');
  await page.waitForSelector('.main-tile');
  let tiles = await page.$$('.main-tile');
  console.log(`Number of credit cards found: ${tiles.length}`);
  if (tiles.length != config.CHASE2.cardIdentifiers.length) {
    console.log(`Expecting ${config.CHASE2.cardIdentifiers.length} card(s).`);
    await browser.close();
    return;
  }

  for (let cardIndex in config.CHASE2.cardIdentifiers) {
    if (cardIndex > 0) {
      await page.waitForSelector('.main-tile');
      tiles = await page.$$('.main-tile');
    }
    try {
      await Promise.all([
        page.waitForSelector(config.CHASE2.cardIdentifiers[cardIndex]),
        tiles[cardIndex].click(),
      ]);
    } catch (e) {
      console.log('Selected the card.');
    }

    await page.waitForSelector('#iconButton-transactionTypeOptions');
    await page.click('#iconButton-transactionTypeOptions');
    await page.screenshot({path: filenameGenerator.next().value});
    let transactionLinks = await page.$$('#ul-list-container-transactionTypeOptions a');
    console.log(`Found ${transactionLinks.length} menu item(s)`);
    let allTransactionsLink = transactionLinks[transactionLinks.length - 3];

    try {
      await Promise.all([
        page.waitForSelector('#header-transactionTypeOptions[value="All transactions"]'),
        allTransactionsLink.click(),
      ]);
    } catch (e) {
      console.log('Showed all transactions.');
    }
    await page.screenshot({path: filenameGenerator.next().value});

    await page.waitForSelector('#downloadActivityIcon');
    await page.click('#downloadActivityIcon');
    await page.screenshot({path: filenameGenerator.next().value});
    await page.waitForSelector('#header-styledSelect1');
    await page.click('#header-styledSelect1');
    await page.waitForSelector('#ul-list-container-styledSelect1 > li:last-child > a');
    await page.click('#ul-list-container-styledSelect1 > li:last-child > a');
    await page.waitForSelector('#input-accountActivityFromDate-input-field');

    // Get the last 7 days of transactions.
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    let startTime = new Date(Date.now() - (7 * ONE_DAY_MS));
    startTime = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());

    await page.type('#input-accountActivityFromDate-input-field', formatDate(startTime));
    await page.type('#input-accountActivityToDate-input-field', formatDate(new Date()));
    await page.screenshot({path: filenameGenerator.next().value});

    console.log('Downloading transactions...')
    try {
      await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: './downloads/'});
      await page.click('#download');  // Blur the input field to activate the download button.
      await Promise.all([
        page.waitForSelector('#backToAccounts'),
        page.click('#download'),
      ]);
    } catch (e) {
    }
    await page.screenshot({path: filenameGenerator.next().value});

    try {
      await Promise.all([
        page.waitForSelector('#widget-grid', {'visible': true}),
        page.click('#backToAccounts'),
      ]);
    } catch (e) {
    }
  }


  console.log('Success!');
  await browser.close();
}
