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
  let amountCentsNumber = transaction.amount_cents;
  let isNegative = amountCentsNumber < 0;
  let amountCents = Math.abs(amountCentsNumber).toString();
  let digits = amountCents.length;
  let dollars = amountCents.substr(0, digits - 2);
  let numCommas = parseInt(
      ((dollars.length - 1) / 3).toString(), 10);
  for (let c = numCommas * 3; c > 0; c -= 3) {
      dollars = dollars.substr(0, dollars.length - c) + ',' +
          dollars.substr(dollars.length - c);
  }
  let amount = dollars + '.' + amountCents.substr(digits - 2);
  if (isNegative) {
      amount = '(' + amount + ')';
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
    if (tag in TAG_TO_CATEGORY) {
      let category = TAG_TO_CATEGORY[tag];
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
    case Category.HomeImprovement:
      return '🛠️';
    case Category.HomeAndElectronics:
      return '🛍️';
    case Category.Income:
      return '🤑';
    case Category.Medical:
      return '👩‍⚕️';
    case Category.PersonalCare:
      return '💆‍';
    case Category.RecurringExpenses:
      return '🔁';
    case Category.Restaurant:
      return '🍽';
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

export function generateUUID(): string {
  // From https://stackoverflow.com/a/8472700
  let buf = new Uint16Array(10);
  crypto.getRandomValues(buf);
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
