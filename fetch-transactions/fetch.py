'''Download transactions using ofxclient.

I followed these instructions to get the settings for Chase.
https://github.com/captin411/ofxclient/issues/19#issuecomment-432480908

The client args are kept in config.js.
'''


import copy
import datetime
import json
import ofxclient
import os

DOWNLOAD_DIR = 'downloads'

class Config(object):
    LAUNCH_OPTIONS = None
    BARCLAY = None
    CHASE = None
    CHASE2 = None
    CHASE3 = None
    USAA = None
    DROPBOX_ACCESS_TOKEN = None

class IdentDict(dict):
    def __missing__(self, key):
        return key

def download(settings, days=7):
    kwargs = copy.deepcopy(settings['ofx'])
    kwargs['username'] = settings['username']
    kwargs['password'] = settings['password']
    inst = ofxclient.Institution(**kwargs)

    accounts = inst.accounts()
    for account in accounts:
        if hasattr(account, 'account_type'):  # bank account
            continue
        card_id = str(account.number)
        filename = os.path.join(DOWNLOAD_DIR, 'Card{}--{}.ofx'.format(
            card_id[-4:],
            datetime.datetime.now().strftime('%Y-%m-%d.%H.%M.%S')))

        download = account.download(days=days)
        with open(filename, 'w') as outfile:
            outfile.write(download.read())
        print('Wrote {}'.format(filename))


def main():
    # This is a trick for allowing unquoted JSON to be parsed as python dicts.
    # https://stackoverflow.com/a/37936640
    _globals = IdentDict()
    _globals['exports'] = Config()

    with open('config.js') as fp:
        exec(fp.read(), _globals)
    config = _globals['exports']

    download(config.CHASE)
    # download(config.CHASE2)
    download(config.CHASE3)


if __name__ == '__main__':
    main()
