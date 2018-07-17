import * as React from 'react';
import { Category, ITransaction } from '../Model';
import { categoryToEmoji, formatAmount, getCategory } from '../utils';

type ITransactionProps = {
  transaction: ITransaction,
  isSelected?: boolean,
  onCategoryClick?: (transaction: ITransaction) => void,
};
export class Transaction extends React.Component<ITransactionProps, object> {

  public render(): React.ReactElement<object> {
    let isCredit = this.props.transaction.amount_cents < 0;
    let categoryEmoji = '🙅';
    let categoryName = 'error';
    try {
      let category = this.getCategory();
      categoryEmoji = categoryToEmoji(category);
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
    return getCategory(this.props.transaction);
  }
}
