import moment from 'moment';
import { Category, ITransaction, TAG_TO_CATEGORY } from './Model';

export function shouldExclude(transaction: ITransaction, excludeTags: Set<string>): boolean {
  for (let tag of transaction.tags) {
    if (excludeTags.has(tag)) {
      return true;
    }
  }
  return false;
}

export function formatAmount(transaction: ITransaction): string {
  return formatAmountNumber(transaction.amount_cents);
}

export function formatAmountNumber(amountCentsNumber: number): string {
  amountCentsNumber = Math.round(amountCentsNumber);
  let isNegative = amountCentsNumber < 0;
  let amountCents = Math.abs(amountCentsNumber).toString();
  let digits = amountCents.length;
  let dollars = amountCents.substr(0, digits - 2) || '0';
  let numCommas = parseInt(
      ((dollars.length - 1) / 3).toString(), 10);
  for (let c = numCommas * 3; c > 0; c -= 3) {
      dollars = `${dollars.substr(0, dollars.length - c)},${dollars.substr(dollars.length - c)}`;
  }
  let centsString = amountCents.substr(digits - 2);
  if (centsString.length == 1) {
    centsString = `0${centsString}`;
  }
  let amount = `${dollars}.${centsString}`;
  if (isNegative) {
      amount = `(${amount})`;
  }
  return amount;
}

// This sorts in decending order by date, then ascending order by description.
export function compareTransactions(lhs: ITransaction, rhs: ITransaction): number {
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

export function getCategory(transaction: ITransaction): Category {
  let categories: Category[] = [];
  for (let tag of transaction.tags) {
    let category = TAG_TO_CATEGORY.get(tag);
    if (category != undefined) {
      if (categories.indexOf(category) === -1) {
        categories.push(category);
      }
    }
  }

  if (categories.length === 1) {
    return categories[0];
  } else if (categories.length > 1) {
    throw Error('multiple categories: ' + categories.map(cat => Category[cat]).join(', '));
  }
  return Category.Other;
}

export function categoryToEmoji(category: Category): string {
  switch (category) {
    case Category.Bank:
      return '🏦';
    case Category.Car:
      return '🚗';
    case Category.Cash:
      return '🏧';
    case Category.Clothes:
      return '👚';
    case Category.Entertainment:
      return '🎟️';
    case Category.Gift:
      return '🎁';
    case Category.Grocery:
      return '🛒';
    case Category.Home:
      return '🏠';
    case Category.HomeImprovement:
      return '🛠️';
    case Category.HomeAndElectronics:
      return '🛍️';
    case Category.Income:
      return '🤑';
    case Category.Insurance:
      return '🛡️';
    case Category.Medical:
      return '👩‍⚕️';
    case Category.PersonalCare:
      return '💆‍';
    case Category.RecurringExpenses:
      return '🔁';
    case Category.Restaurant:
      return '🍽';
    case Category.Taxes:
      return '💸';
    case Category.Transit:
      return '🚇';
    case Category.TravelExpenses:
      return '🛫';
    case Category.Vitamins:
      return '💊';
    case Category.Other:
      return '❓';
    default:
      return '💲';
  }
}

export function generateUUID(crypto_: Crypto = crypto): string {
  // From https://stackoverflow.com/a/8472700
  let buf = new Uint16Array(10);
  crypto_.getRandomValues(buf);
  let S4 = function(num: number): string {
      let ret = num.toString(16);
      while (ret.length < 4) {
          ret = '0' + ret;
      }
      return ret;
  };

  // We can't use buf.map because it returns another Uint16Array, but
  // we want an array of hex strings.
  return Array.from(buf).map(S4).join('');
}

function searchByDate(transactions: ITransaction[], date: string, isStart: boolean): number {
  let hi = 0;
  let lo = transactions.length - 1;
  while (lo > hi) {
    let mid = Math.floor((lo + hi) / 2);
    let transactionDate = transactions[mid].date;
    if (transactionDate == date) {
      let scanDirection = isStart ? 1 : -1;
      while (mid + scanDirection >= 0 && mid + scanDirection <= transactions.length - 1
          && transactions[mid + scanDirection].date == transactionDate) {
        mid += scanDirection;
      }
      return mid;
    } else if (transactionDate < date) {
      lo = lo == mid ? mid - 1 : mid;
    } else {
      hi = hi == mid ? mid + 1 : mid;
    }
  }
  if (isStart) {
    while (lo > 0 && transactions[lo].date < date) {
      lo -= 1;
    }
  } else {
    while (lo < transactions.length - 1 && transactions[lo].date > date) {
      lo += 1;
    }
  }
  return lo;
}

// Returns transactions between the two provided dates (inclusive). This assumes the
// transactions are sorted from most recent to oldest.
export function filterTransactionsByDate(transactions: ITransaction[], startDate: Date, endDate: Date): ITransaction[] {
  // 20-30ms for filter with conversion to Date objects.
  // 3-4ms for filter with string comparisons.
  // 2-4ms with binary search.
  let startDateString = moment(startDate).format('YYYY-MM-DD');
  let endDateString = moment(endDate).format('YYYY-MM-DD');

  let startIndex = searchByDate(transactions, startDateString, true);
  let endIndex = searchByDate(transactions, endDateString, false);
  return transactions.slice(endIndex, startIndex + 1);
}

/** Filters for {filterTransactions}. */
export interface IFilters {
  /** Starting date, inclusive. */
  startDate?: Date;
  /** Ending date, inclusive. */
  endDate?: Date;
  /** The transaction must have one of these tags. */
  tagsIncludeAny?: string[];
  /** The transaction must have all of these tags. */
  tagsIncludeAll?: string[];
  /** The transaction may not have any of these tags. */
  tagsExcludeAny?: string[];
  /** Split the search query into keywords and the transaction must have
   *  all of the keywords in the description or notes.
   */
  searchQuery?: string;
}
/**
 * Filter transactions by the parameters provided.
 */
export function filterTransactions(
    transactions: ITransaction[],
    filters: IFilters): ITransaction[] {
  if (!transactions.length) {
    return [];
  }
  let filteredTransactions: ITransaction[] = transactions;
  if (filters.startDate || filters.endDate) {
    filteredTransactions = filterTransactionsByDate(
        filteredTransactions,
        filters.startDate || moment(transactions[transactions.length - 1].date).toDate(),
        filters.endDate || moment(transactions[0].date).toDate());
  }

  if (filters.tagsIncludeAll && filters.tagsIncludeAll.length > 0) {
    let tagsInclude = new Set(filters.tagsIncludeAll);
    filteredTransactions = filteredTransactions.filter(transaction => {
      let intersection = transaction.tags.filter(tag => tagsInclude.has(tag));
      return intersection.length == tagsInclude.size;
    });
  }

  if (filters.tagsIncludeAny && filters.tagsIncludeAny.length > 0) {
    let tagsInclude = new Set(filters.tagsIncludeAny);
    filteredTransactions = filteredTransactions.filter(transaction => {
      let intersection = transaction.tags.filter(tag => tagsInclude.has(tag));
      return intersection.length > 0;
    });
  }

  if (filters.tagsExcludeAny &&  filters.tagsExcludeAny.length > 0) {
    let tagsExclude = new Set(filters.tagsExcludeAny);
    filteredTransactions = filteredTransactions.filter(transaction => {
      let intersection = transaction.tags.filter(tag => tagsExclude.has(tag));
      return !intersection.length;
    });
  }

  if (filters.searchQuery) {
    let tokens = filters.searchQuery.toLowerCase().split(/\s+/);
    filteredTransactions = filteredTransactions.filter(transaction => {
      let descriptionLowerCase = transaction.description.toLowerCase();
      let notesLowerCase = (transaction.notes || '').toLowerCase();
      for (let token of tokens) {
        if (descriptionLowerCase.indexOf(token) == -1 &&
            notesLowerCase.indexOf(token) == -1) {
          return false;
        }
      }
      return true;
    });
  }

  return filteredTransactions;
}

export function getTags(transactions: ITransaction[]): Set<string> {
  let tagSet: Set<string> = new Set();
  for (let transaction of transactions) {
    for (let tag of transaction.tags) {
      tagSet.add(tag);
    }
  }
  return tagSet;
}

export function getSpreadDurationAsDays(transaction: ITransaction): number | undefined {
  for (let tag of transaction.tags) {
    if (tag.startsWith('spread:')) {
      let durationString = tag.split(':')[1];
      return moment.duration(`P${durationString.toUpperCase()}`).asDays();
    }
  }
}
