import * as React from 'react';
import { Category, ITransaction } from '../Model';
import { formatAmount } from '../Module';

type ITransactionProps = {
  transaction: ITransaction,
  isSelected?: boolean,
  onCategoryClick?: (transaction: ITransaction) => void,
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
    'credit card reward': Category.Income,
    'dividend': Category.Income,
    'income': Category.Income,
    'interest': Category.Income,
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
    'vitamins': Category.Vitamins,
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
    // Use a zero width space (\u200B) so double clicking a tag only
    // selects the tag and not the words around it.
    let tags = this.props.transaction.tags.map(tag => ['\u200B', <span key={tag}>{tag}</span>]);
    return (
      <div className={'row' + (this.props.isSelected ? ' selected' : '')}>
        <div className='date'>{this.props.transaction.date}</div>
        <div className={'amount' + (isCredit ? ' credit' : '')}>{this.formatAmount()}</div>
        <div
            className={'category' + (this.props.onCategoryClick ? ' editable' : '')}
            title={categoryName}
            onClick={this.props.onCategoryClick ? () => this.props.onCategoryClick!(this.props.transaction) : undefined}
            >{this.props.isSelected ? <i className='material-icons'>check_box</i> : categoryEmoji}</div>
        <div className='description'>
          {this.props.transaction.description}
          {this.props.transaction.notes ? <span className='notes'> - {this.props.transaction.notes}</span> : ''}
          {tags}
        </div>
      </div>
    );
  }

  protected formatAmount(): string {
    return formatAmount(this.props.transaction);
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
}
