const puppeteer = require("puppeteer");
const readline = require("readline");

const config = require("./config.js");

// mm/dd/yyyy
function formatDate(date) {
  function pad(number) {
    return "" + (number < 10 ? "0" + number : number);
  }
  let fullYear = "" + date.getFullYear();
  return pad(date.getMonth() + 1) + "/" + pad(date.getDate()) + "/" + fullYear;
}

function* screenshotFilename() {
  let index = 0;
  while (true) {
    ++index;
    let fileNumber = index < 10 ? "0" + index : "" + index;
    yield `screenshots/${fileNumber}.png`;
  }
}

async function getFrameMatchingUrl(page, urlSubstring) {
  for (let frame of page.frames()) {
    // Sometimes calls to get the frame title hang (maybe the frame isn't
    // fully created?). Skip those frames (they won't have a url).
    if (frame.url().length == 0) {
      continue;
    }
    let title = await frame.title();
    let fullUrl = frame.url();
    console.log(`  ${title}: ${fullUrl}`);
    if (fullUrl.indexOf(urlSubstring) != -1) {
      return frame;
    }
  }
  return null;
}

async function main(authCode) {
  let filenameGenerator = screenshotFilename();
  let options = {
    ...config.LAUNCH_OPTIONS,
    userDataDir: "./user-data/usaa2",
  };
  const browser = await puppeteer.launch(options);
  console.log(await browser.version());

  console.log("Loading login page...");
  const page = await browser.newPage();
  await page.setUserAgent(config.LAUNCH_OPTIONS.userAgent);
  // await page.goto('https://www.usaa.com/');
  await page.goto("https://www.usaa.com/");
  await page.waitForSelector("a.profileWidget-button--logon");
  await page.screenshot({ path: filenameGenerator.next().value });
  await page.click("a.profileWidget-button--logon");
  // await page.goto('https://www.usaa.com/inet/ent_logon/Logon');
  // await page.waitForSelector('#usaa-my-profile');
  await page.waitForSelector("[name=memberId]");
  await page.screenshot({ path: filenameGenerator.next().value });

  console.log("Typing user name");
  // await page.click('#usaa-my-profile');
  await page.type("[name=memberId]", config.USAA.username, { delay: 90 });
  await page.screenshot({ path: filenameGenerator.next().value });
  console.log("Clicking Next...");
  await Promise.all([
    page.waitForSelector("input[name=pintoken]"),
    page.click("button.miam-btn-next"),
  ]);
  await page.screenshot({ path: filenameGenerator.next().value });
  console.log("Entering PIN + token...");
  await page.type("input[name=pintoken]", config.USAA.pin + authCode, {
    delay: 102,
  });
  await page.screenshot({ path: filenameGenerator.next().value });
  console.log("Clicking Log On...");
  let [response] = await Promise.all([
    page.waitForNavigation({ waitUntil: "load", timeout: 60000 }),
    page.click("button.pin-token-submit-btn"),
  ]);

  // try {
  //   console.log('waiting 10s for another nav');
  //   await page.waitForNavigation({timeout: 10000});
  //   console.log('nav happened');
  // } catch (e) {
  //   console.log('timeout, no nav');
  // }

  let frame = await getFrameMatchingUrl(page, "/EntManageAccounts?");
  if (!frame) {
    console.log("Frame not found.");
    await browser.close();
    return;
  }
  [response] = await Promise.all([
    page.waitForNavigation(),
    frame.click(".acctName > a"),
  ]);
  console.log(response.url());
  await page.screenshot({ path: filenameGenerator.next().value });

  console.log("looking for menu");
  await page.waitForSelector("#actionMenuTarget button");
  await page.click("#actionMenuTarget button");
  await page.click("#actionMenuTarget .yuimenuitem:nth-child(2)");
  await page.screenshot({ path: filenameGenerator.next().value });

  console.log("select date range");
  await page.waitForSelector("#searchcriteria\\.allorselectedtransactions_3", {
    visible: true,
  });
  await page.click("#searchcriteria\\.allorselectedtransactions_3");
  await page.waitForSelector("#exportFromDate", { visible: true });

  // Get the last 7 days of transactions.
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  let startTime = new Date(Date.now() - 21 * ONE_DAY_MS);
  startTime = new Date(
    startTime.getFullYear(),
    startTime.getMonth(),
    startTime.getDate()
  );

  await page.type("#exportFromDate", formatDate(startTime));
  await page.type("#exportToDate", formatDate(new Date()));
  await page.screenshot({ path: filenameGenerator.next().value });

  console.log("Downloading...");
  try {
    await page._client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: "./downloads/",
    });
    await Promise.all([
      // This will timeout, we're just giving time for the download to finish.
      page.waitForNavigation(),
      page.click("#exportTable"),
    ]);
  } catch (e) {}
  await page.screenshot({ path: filenameGenerator.next().value });

  console.log("Success!");
  await browser.close();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.question("Enter auth code: ", (authCode) => {
  rl.close();
  main(authCode);
});
