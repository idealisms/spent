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
    'food': Category.Food,
    'gift': Category.Gift,
    'donation': Category.Gift,
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
    'transit': Category.Transit,
    'taxi': Category.Transit,
    'flight': Category.TravelExpenses,
    'lodging': Category.TravelExpenses,
    'rail': Category.TravelExpenses,
  };

  public render(): React.ReactElement<object> {
    let isCredit = this.props.transaction.amount_cents < 0;
    let categoryClassName = 'error';
    let categoryName = 'error';
    try {
      let category = this.getCategory();
      categoryClassName = this.categoryToMaterialClassName(category);
      categoryName = Category[category];
    } catch(e) {
      console.log(e);
    }
    return (
      <div className='row'>
        <div className='date'>{this.props.transaction.date}</div>
        <div className={'amount' + (isCredit ? ' credit' : '')}>{this.formatAmount()}</div>
        <div className='category'><i className='material-icons' title={categoryName}>{categoryClassName}</i></div>
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

  protected categoryToMaterialClassName(category: Category): string {
    switch (category) {
      case Category.Car:
        return 'directions_car';
      case Category.Cash:
        return 'atm';
      case Category.Clothes:
        return 'store';
      case Category.Entertainment:
        return 'local_movies';
      case Category.Food:
        return 'restaurant';
      case Category.Gift:
        return 'card_giftcard';
      case Category.HomeImprovement:
        return 'home';
      case Category.HomeAndElectronics:
        return 'shopping_cart';
      case Category.Medical:
        return 'local_hospital';
      case Category.PersonalCare:
        return 'spa';
      case Category.RecurringExpenses:
        return 'repeat';
      case Category.Transit:
        return 'directions_transit';
      case Category.TravelExpenses:
        return 'flight_takeoff';
      case Category.Other:
        return 'help_outline';
      default:
        return 'monetization_on';
    }
  }
}
