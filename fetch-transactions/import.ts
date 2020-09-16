
const fs = require('fs');
const cryptoNode = require('crypto');

require('isomorphic-fetch');
const Dropbox = require('dropbox').Dropbox;

const config = require('./config.js');

// Figure out a way to sync this across subdirs.
interface ITransaction {
  id: string;
  description: string;
  original_line: string;
  date: string;
  tags: Array<string>;
  amount_cents: number;
  transactions: Array<ITransaction>;
  source?: string;
  notes?: string;
}

function loadFromDropbox(callback) {
  let filesDownloadArg = {
    path: '/spent tracker/transactions.json',
  };
  let dbx = new Dropbox({ accessToken: config.DROPBOX_ACCESS_TOKEN });
  dbx.filesDownload(filesDownloadArg)
      .then(file => {
          let transactions: ITransaction[] = JSON.parse(file.fileBinary);
          callback(transactions);
      }).catch(error => {
          console.log(error);
      });
}

function loadNewTransactions(pathToMerge: string): ITransaction[][] {
  let newTransactions: ITransaction[][] = [];
  let filenames: string[] = fs.readdirSync(pathToMerge);
  for (let filename of filenames) {
    if (!filename.toLowerCase().endsWith('.csv')) {
      continue;
    }

    let csvContents = fs.readFileSync(`${pathToMerge}/${filename}`).toString();
    console.log(`Reading ${filename}.`);
    newTransactions.push(importCSV(csvContents, filename));
  }
  return newTransactions;
}

function mergeTransactions(transactions: ITransaction[], newTransactions: ITransaction[]) {
  // Don't import a transaction if it already exists.
  let existingTransactions: Map<string, Set<string>> = new Map();
  for (let t of transactions) {
    if (!existingTransactions.has(t.original_line)) {
      existingTransactions.set(t.original_line, new Set());
    }
    let source = t.source || 'unknown';
    if (source.startsWith('split:')) {
      source = 'split';
    }
    existingTransactions.get(t.original_line)!.add(source);
    if (t.transactions) {
      for (let mergedTransaction of t.transactions) {
        if (!existingTransactions.has(mergedTransaction.original_line)) {
          existingTransactions.set(mergedTransaction.original_line, new Set());
        }
        let source = mergedTransaction.source || 'unknown';
        if (source.startsWith('split:')) {
          source = 'split';
        }
        existingTransactions.get(mergedTransaction.original_line)!.add(source);
      }
    }
  }

  let numImported = 0;
  for (let t of newTransactions) {
      let sourceSet = existingTransactions.get(t.original_line);
      if (sourceSet && (sourceSet.has('unknown') || sourceSet.has('split') || sourceSet.has('chase') ||
          sourceSet.has(t.source || 'unknown'))) {
        continue;
      }
      //console.log(`merging ${t.original_line} : ${t.source} : ${[...existingTransactions[t.original_line]].join(',')}`);
      transactions.push(t);
      ++numImported;
  }
  console.log(`Imported ${numImported} transaction(s).`);
  return transactions;
}

function importCSV(fileAsString: string, filename: string) {
  let ret: ITransaction[] = [];
  let rows = normalizeIntoRows(fileAsString, filename);
  for (let row of rows) {
      ret.push({
          id: generateUUID(),
          description: row[0],
          original_line: row[4],
          date: dateSlashToDash(row[1]),
          tags: [],
          amount_cents: row[2],
          transactions: [],
          source: row[3]
      })
  }
  return ret;
}

// Takes the input CSV file and converts it into an array of
// [desc, date, amount, source, original line].
function normalizeIntoRows(fileAsString: string, filename:string): [string, string, number, string, string][] {
  let rows = fileAsString.replace(/\r/g, '').split('\n') as string[];
  rows = rows.filter(line => {
      line = line.replace(/ /g, '');
      return line.length > 0;
  });
  if (!rows.length) {
      return [];
  }
  if (rows[0].startsWith('posted,') || rows[0].startsWith('forecasted,')) {
      return normalizeUSAA(rows);
  } else if (rows[0].startsWith('Transaction Date,Post Date,Description,Category,Type,Amount')) {
      // Skip the header row.
      return normalizeChase(rows.slice(1), filename);
  } else if (rows[0] == 'Barclays Bank Delaware') {
      return normalizeBarclay(rows.slice(4));
  } else {
      console.log('unknown file format, skipping');
  }
  return []
}

function normalizeUSAA(rows: string[]): [string, string, number, string, string][] {
  let ret: [string, string, number, string, string][] = [];
  for (let row of rows) {
      let tokens = parseCSVline(row);
      if (tokens[0] == 'forecasted') {
          continue;
      }
      let amount = Math.round(Number(tokens[6].substr(1)) * 100);
      ret.push([tokens[4], tokens[2], amount, 'usaa', row]);
  }
  return ret;
}

function normalizeChase(rows: string[], filename: string): [string, string, number, string, string][] {
  let match = filename.match(/Chase(\d+)/);
  let cardId = match ? match[1] : '0000';
  let ret: [string, string, number, string, string][] = [];
  for (let row of rows) {
    let tokens = parseCSVline(row);
    let amount = Math.round(Number(tokens[5]) * -100);
    if (Number.isNaN(amount)) {
        console.log(tokens);
        break;
    }
    // [desc, date, amount, source, original line].
    // Rewrite the row into the old format to avoid dupes.
    let oldRow = [tokens[4], tokens[0], tokens[1], tokens[2], tokens[5]].join(',');
    ret.push([tokens[2], tokens[0], amount, 'chase' + cardId, oldRow]);
  }
  return ret;
}

function normalizeBarclay(rows: string[]): [string, string, number, string, string][] {
  let ret: [string, string, number, string, string][] = [];
  for (let row of rows) {
      let tokens = parseCSVline(row);
      // Transaction Date,Description,Category,Amount
      let amount = Math.round(Number(tokens[3]) * -100);
      ret.push([tokens[1], tokens[0], amount, 'barclay', row]);
  }
  return ret;
}

function parseCSVline(line: string): string[] {
  let ret: string[] = [];
  let isStart = true;
  let inQuotes = false;
  let field = '';
  for (let c = 0; c < line.length; ++c) {
      let char = line[c];
      if (isStart) {
          if (char == ',') {
              ret.push(field);
              continue;
          }
          isStart = false;
          if (char == '"') {
              inQuotes = true;
              continue;
          }
          field += char;
      } else if (inQuotes && char == '"' && line[c + 1] == '"') {
          field += '"';
          ++c;
      } else if (inQuotes && char == '"' && (c + 1 == line.length || line[c + 1] == ',')) {
          ret.push(field);
          field = '';
          ++c;
          isStart = true;
          inQuotes = false;
      } else if (!inQuotes && char == ',') {
          ret.push(field);
          field = '';
          isStart = true;
          inQuotes = false;
      } else {
          field += char;
          if (c + 1 == line.length) {
              ret.push(field);
          }
      }
  }

  return ret;
}

// Create a 40 byte uuid as a hex string.
function generateUUID() {
  // Modified from https://stackoverflow.com/a/8472700
  let buf = cryptoNode.randomBytes(20);
  let S4 = function(num) {
      let ret = num.toString(16);
      while (ret.length < 2){
          ret = "0" + ret;
      }
      return ret;
  };

  // We can't use buf.map because it returns another Uint16Array, but
  // we want an array of hex strings.
  return Array.from(buf).map(S4).join('');
}

function dateSlashToDash(slashDate: string): string {
  let [month, day, year] = slashDate.split('/');
  return `${year}-${month}-${day}`;
}

function compareTransactions(lhs: ITransaction, rhs: ITransaction): number {
  if (lhs.date < rhs.date) {
    return 1;
  } else if (lhs.date > rhs.date) {
    return -1;
  }

  if (lhs.description < rhs.description) {
    return -1;
  } else if (lhs.description > rhs.description) {
    return 1;
  }

  // The ids should never be equal, so we never return 0.
  return lhs.id < rhs.id ? -1 : 1;
}

function saveToDropbox(transactions) {
  return new Promise((resolve, reject) => {
    let filesCommitInfo = {
      contents: JSON.stringify(transactions),
      path: '/spent tracker/transactions.json',
      mode: {'.tag': 'overwrite'},
      autorename: false,
      mute: false,
    };
    let dbx = new Dropbox({ accessToken: config.DROPBOX_ACCESS_TOKEN });
    dbx.filesUpload(filesCommitInfo)
        .then(metadata => {
            console.log('Saved to Dropbox.');
            console.log(metadata);
            resolve();
        }).catch(error => {
            console.log('Error saving to Dropbox.');
            reject(error);
        });
  });
}

function deleteCSVFiles(path: string) {
  let filenames: string[] = fs.readdirSync(path);
  for (let filename of filenames) {
    if (!filename.toLowerCase().endsWith('.csv')) {
      continue;
    }

    fs.unlinkSync(`${path}/${filename}`);
    console.log(`Removed ${filename}.`);
  }
}

loadFromDropbox((transactions) => {
  let numTransactionsBefore = transactions.length;
  const downloadPath = './downloads';
  let allNewTransactions = loadNewTransactions(downloadPath);
  for (let newTransactions of allNewTransactions) {
    transactions = mergeTransactions(transactions, newTransactions);
  }

  if (transactions.length > numTransactionsBefore) {
    transactions.sort(compareTransactions);
    console.log(`${transactions.length} total transactions.`);

    saveToDropbox(transactions).then(() => {
      deleteCSVFiles(downloadPath);
    });
  } else {
    deleteCSVFiles(downloadPath);
  }
});
