import * as React from 'react';
import { Category, ITransaction } from '../Model';

type ITransactionProps = {
  transaction: ITransaction,
};
export class Transaction extends React.Component<ITransactionProps, object> {
  private TAG_TO_CATEGORY: { [s: string]: Category; } = {
    'car': Category.Car,
    'atm': Category.Cash,
    'clothes': Category.Clothes,
    'dry cleaner': Category.Clothes,
    'shoes': Category.Clothes,
    'books': Category.Entertainment,
    'entertainment': Category.Entertainment,
    'gift': Category.Gift,
    'donation': Category.Gift,
    'grocery': Category.Grocery,
    'home improvement': Category.HomeImprovement,
    'art supplies': Category.HomeAndElectronics,
    'art': Category.HomeAndElectronics,
    'electronics': Category.HomeAndElectronics,
    'flowers': Category.HomeAndElectronics,
    'furniture': Category.HomeAndElectronics,
    'household goods': Category.HomeAndElectronics,
    'plants': Category.HomeAndElectronics,
    'medical': Category.Medical,
    'personal care': Category.PersonalCare,
    'utility': Category.RecurringExpenses,
    'phone service': Category.RecurringExpenses,
    'internet': Category.RecurringExpenses,
    'membership fee': Category.RecurringExpenses,
    'restaurant': Category.Restaurant,
    'transit': Category.Transit,
    'taxi': Category.Transit,
    'flight': Category.TravelExpenses,
    'lodging': Category.TravelExpenses,
    'rail': Category.TravelExpenses,
  };

  public render(): React.ReactElement<object> {
    let isCredit = this.props.transaction.amount_cents < 0;
    let categoryEmoji = '🙅';
    let categoryName = 'error';
    try {
      let category = this.getCategory();
      categoryEmoji = this.categoryToEmoji(category);
      categoryName = Category[category];
    } catch(e) {
      console.log(e);
    }
    return (
      <div className='row'>
        <div className='date'>{this.props.transaction.date}</div>
        <div className={'amount' + (isCredit ? ' credit' : '')}>{this.formatAmount()}</div>
        <div className='category' title={categoryName}>{categoryEmoji}</div>
        <div className='description'>{this.props.transaction.description}</div>
      </div>
    );
  }

  protected formatAmount(): string {
    let amountCentsNumber = this.props.transaction.amount_cents;
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

  protected getCategory(): Category {
    let categories: Category[] = [];
    for (let tag of this.props.transaction.tags) {
      if (tag in this.TAG_TO_CATEGORY) {
        let category = this.TAG_TO_CATEGORY[tag];
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

  protected categoryToEmoji(category: Category): string {
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
      case Category.Other:
        return '❓';
      default:
        return '💲';
    }
  }
}
