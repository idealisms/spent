# Scripts for Downloading Credit Card and Bank Transactions

This is a set of Node.js scripts using [Puppeteer](https://github.com/GoogleChrome/puppeteer/) to sign in to bank accounts and download bank transactions.

This is an alternative to using something like Mint for budgeting.


## Running on a Raspberry Pi 3 running Raspbian stretch.

Here are a few notes about getting Puppeteer to run on a Raspberry Pi. The Puppeteer npm package doesn't download an ARM version of Chromium.  The following is a launchpad built version of Chromium for ARM (this requires Raspbian stretch).

```sh
wget https://launchpad.net/~chromium-team/+archive/ubuntu/beta/+build/14381587/+files/chromium-codecs-ffmpeg_65.0.3325.88-0ubuntu0.17.10.1_armhf.deb; sudo dpkg -i chromium-codecs-ffmpeg_65.0.3325.88-0ubuntu0.17.10.1_armhf.deb

wget https://launchpad.net/~chromium-team/+archive/ubuntu/beta/+build/14381587/+files/chromium-browser_65.0.3325.88-0ubuntu0.17.10.1_armhf.deb; sudo dpkg -i chromium-browser_65.0.3325.88-0ubuntu0.17.10.1_armhf.deb
```

I found this in the issue tracker: https://github.com/GoogleChrome/puppeteer/issues/550.
