import ofxparse
import glob
import dropbox
import os
import re
import json
import html

DOWNLOAD_DIR = 'downloads'
DROPBOX_PATH = '/spent tracker/transactions.json'

def read_transactions(filename):
    '''Reads transactions from a .ofx file.

    Returns a list of transaction dicts.'''
    transactions = []
    m = re.search(r'/(Card\d\d\d\d)--', filename)
    card_number = m.group(1)
    with open(filename) as fileobj:
        ofx = ofxparse.OfxParser.parse(fileobj)
        if not hasattr(ofx, 'account'):
            print('no account, skipping', filename)
            return []
        for t in ofx.account.statement.transactions:
            transactions.append({
                'id': str(t.id),
                'description': t.payee,
                'original_line': str(t.id),
                'date': str(t.date.date()),
                'tags': [],
                'amount_cents': int(float(t.amount) * -100),
                'transactions': [],
                'source': 'ofx-' + card_number,
                'notes': '',
            })
    return transactions


def read_access_token(filename):
    '''Returns the dropbox access token from filename.'''
    with open('config.js') as fileobj:
        m = re.search(r'DROPBOX_ACCESS_TOKEN = \'(.+)\'', fileobj.read())
        return m.group(1)


def format_description(transaction):
    '''Format the date and description of a transaction.

    This is used to de-dupe transactions that came from different
    sources (e.g., csv file vs ofx file). The date is the posting
    date of the transaction.'''
    if 'source' in transaction and transaction['source'].startswith('chase'):
        posted_date = transaction['original_line'].split(',')[2]
        m, d, y = posted_date.split('/')
        return '{}-{}-{} {}'.format(
                y, m, d, html.unescape(transaction['description']))
    return '{} {}'.format(transaction['date'], transaction['description'])


def walk_transactions(transactions):
    '''Visit all transactions and returns sets of seen ids and descriptions.'''
    seen_ids = set()
    seen_descs = set()
    for transaction in transactions:
        seen_ids.add(transaction['id'])
        if ('source' in transaction
                and not transaction['source'].startswith('ofx')):
            seen_descs.add(format_description(transaction))

        if 'transactions' in transaction:
            sub_seen_ids, sub_seen_descs = walk_transactions(
                    transaction['transactions'])
            seen_ids.update(sub_seen_ids)
            seen_descs.update(sub_seen_descs)

    return seen_ids, seen_descs


def merge(transactions, new_transactions):
    seen_ids, seen_descs = walk_transactions(transactions)

    for new_transaction in new_transactions:
        # There are two ways to detect duplicates:
        # - The entry was from an ofx file and the id is the one
        #   assigned by the bank.
        # - Otherwise, we do a loose match based on the posting
        #   date and description.
        if new_transaction['id'] in seen_ids:
            continue
        if format_description(new_transaction) in seen_descs:
            continue

        print('Adding {}'.format(new_transaction['description']))
        # Append the new transaction so we don't shift all the items
        # in the list.
        transactions.append(new_transaction)
        seen_ids.add(new_transaction['id'])

    # Now that we're done adding transactions, sort so new transactions
    # are organized by date descending. This is a stable sort.
    transactions.sort(key=lambda t: t['date'], reverse=True)


def main():
    new_transactions = []
    ofx_filenames = glob.glob(os.path.join(DOWNLOAD_DIR, '*.ofx'))
    for filename in ofx_filenames:
        new_transactions.extend(read_transactions(filename))
    print('{} transaction(s) in ofx files'.format(len(new_transactions)))

    access_token = read_access_token('config.js')

    dbx = dropbox.Dropbox(access_token)
    transactions = []
    meta, response = dbx.files_download(DROPBOX_PATH)
    transactions = json.loads(response.content.decode('utf-8'))

    before_size = len(transactions)
    merge(transactions, new_transactions)

    new_transactions_count = len(transactions) - before_size
    if not new_transactions_count:
        print('No new transactions')
    else:
        # Only write to Dropbox if there are changes.
        print('Added {} new transaction(s)'.format(new_transactions_count))

        result = dbx.files_upload(
            json.dumps(transactions).encode('utf-8'),
            DROPBOX_PATH,
            dropbox.files.WriteMode.overwrite)

        print(result)

    for filename in ofx_filenames:
        os.remove(filename)
    print('.ofx files deleted')

if __name__ == '__main__':
    main()
