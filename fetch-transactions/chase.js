const puppeteer = require('puppeteer');
const readline = require('readline');

const config = require('./config.js');

function* screenshotFilename(filenamePrefix) {
  let index = 0;
  while (true) {
    ++index;
    let fileNumber = index < 10 ? '0' + index : '' + index;
    yield `screenshots/${filenamePrefix}-${fileNumber}.png`;
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
  let configKey = process.argv[2] || 'chase';
  console.log(`Using config: ${configKey.toUpperCase()}.`);

  let filenameGenerator = screenshotFilename(configKey);
  let CONFIG = config[configKey.toUpperCase()];

  let launchOptions = Object.assign({
    // Use a profile directory so we don't have to do 2-factor
    // authentication every time.
    userDataDir: `./user-data/${configKey}`
  }, config.LAUNCH_OPTIONS);

  const browser = await puppeteer.launch(launchOptions);

  console.log(await browser.version());

  console.log('Loading login page...');
  const page = await browser.newPage();
  await page.setUserAgent(config.LAUNCH_OPTIONS.userAgent);
  await page.setViewport({
    'width': 840,
    'height': 800
  });
  await page.goto('https://www.chase.com/', {'waitUntil': 'networkidle0'});

  console.log('Click Sign in...');
  page.waitForSelector('.btn.signInBtn'),
  await page.screenshot({path: filenameGenerator.next().value});
  await Promise.all([
    page.waitForNavigation({
        'waitUntil': 'networkidle0',
        'timeout': 60000}),
    page.click('.btn.signInBtn')
  ]);
  await page.screenshot({path: filenameGenerator.next().value});
  await page.waitForSelector('#logonDialog');

  console.log('Finding login frame ...');
  let loginFrame = await getFrameMatchingUrl(page, '?fromOrigin');

  await loginFrame.waitForSelector('#userId-input-field');
  await loginFrame.type('#userId-input-field', CONFIG.username);
  await loginFrame.focus('#password-input-field');
  await loginFrame.type('#password-input-field', CONFIG.password);
  await page.screenshot({path: filenameGenerator.next().value});

  console.log('Logging in...');
  try {
    await Promise.all([
      loginFrame.click('#signin-button'),
      page.waitForSelector('#signin-button', {'hidden': true}),
    ]);
  } catch (e) {
  }
  await page.screenshot({path: filenameGenerator.next().value});
  try {
    await page.waitForSelector('#body', {'visible': true});
  } catch (e) {
    console.log('Timeout waiting for #body (maybe 2-factor).');
  }
  await page.screenshot({path: filenameGenerator.next().value});
  try {
    await page.waitForSelector('.cardArtLogo');
  } catch (e) {
    console.log('Timeout waiting for .cardArtLogo (maybe 2-factor).');
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
        await loginFrame.type('#password_input-input-field', CONFIG.password);
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

        await getTransactionsFromDashboard(CONFIG, browser, page, filenameGenerator);
      })();
    });
  } else {
    console.log('No 2-factor auth.');
    await getTransactionsFromDashboard(CONFIG, browser, page, filenameGenerator);
  }
})();

async function getTransactionsFromDashboard(CONFIG, browser, page, filenameGenerator) {
  console.log('Waiting for account info to load...');
  await page.waitForSelector('.main-tile');
  let tiles = await page.$$('.main-tile');
  console.log(`Number of credit cards found: ${tiles.length}`);
  if (tiles.length != CONFIG.cardIdentifiers.length) {
    console.log(`Expecting ${CONFIG.cardIdentifiers.length} card(s).`);
    await browser.close();
    return;
  }

  for (let cardIndex in CONFIG.cardIdentifiers) {
    if (cardIndex > 0) {
      await page.waitForSelector('.main-tile');
      tiles = await page.$$('.main-tile');
    }
    try {
      await Promise.all([
        page.waitForSelector(
            CONFIG.cardIdentifiers[cardIndex],
            {'timeout': 20000}),
        tiles[cardIndex].click(),
      ]);
    } catch (e) {
    }

    await page.waitForSelector('#header-transactionTypeOptions');
    await page.click('#header-transactionTypeOptions');
    await page.screenshot({path: filenameGenerator.next().value});
    let transactionLinks = await page.$$('#transactionTypeOptions .list > li > a');
    console.log(`Found ${transactionLinks.length} menu item(s)`);
    let allTransactionsLink = transactionLinks[transactionLinks.length - 2];

    try {
      await Promise.all([
        page.waitForSelector('#header-transactionTypeOptions[aria-label="SHOWING: All transactions"]'),
        allTransactionsLink.click(),
      ]);
    } catch (e) {
      console.log('Showed all transactions.');
    }
    await page.screenshot({path: filenameGenerator.next().value});

    await page.waitForSelector('#activityTable tbody');
    await page.focus('#downloadActivityIcon');
    await page.screenshot({path: filenameGenerator.next().value});

    try {
      await Promise.all([
        page.waitForSelector('#header-currentDisplayOption[aria-label="Activity: Current display"]'),
        page.click('#downloadActivityIcon'),
      ]);
      await page.screenshot({path: filenameGenerator.next().value});
    } catch (e) {
      console.log('No transactions, skipping card.');
      await page.screenshot({path: filenameGenerator.next().value});

      continue;
    }
    // Open the drop down to select custom date range.
    await page.click('#header-currentDisplayOption');
    await page.screenshot({path: filenameGenerator.next().value});
    await page.waitForSelector('#currentDisplayOption .list > li:last-child > a');
    await page.click('#currentDisplayOption .list > li:last-child > a');
    await page.waitForSelector('#input-accountActivityFromDate-validate-input-field');

    // Get the last 7 days of transactions.
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    let startTime = new Date(Date.now() - (7 * ONE_DAY_MS));
    startTime = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());

    await page.type('#input-accountActivityFromDate-validate-input-field', formatDate(startTime));
    await page.type('#input-accountActivityToDate-validate-input-field', formatDate(new Date()));
    await page.screenshot({path: filenameGenerator.next().value});

    console.log('Downloading transactions...')
    try {
      await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: './downloads/'});
      await page.click('#download');  // Blur the input field to activate the download button.
      await Promise.all([
        page.waitForSelector('#backToAccounts'),
        page.click('#download'),
      ]);
      console.log('✅');
    } catch (e) {
      console.log('❌');
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

  console.log('All done!');
  try {
    await browser.close();
  } catch (e) {
  }
}
