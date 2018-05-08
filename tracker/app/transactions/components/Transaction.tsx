import * as React from 'react';
import { ITransaction } from '../Model';

type ITransactionProps = {
  transaction: ITransaction,
};
export class Transaction extends React.Component<ITransactionProps, object> {
  public render(): React.ReactElement<object> {
    let isCredit = this.props.transaction.amount_cents < 0;
    return (
      <div className='row'>
        <div className='date'>{this.props.transaction.date}</div>
        <div className={'amount' + (isCredit ? ' credit' : '')}>{this.formatAmount(this.props.transaction.amount_cents)}</div>
        <div className='description'>{this.props.transaction.description}</div>
      </div>
    );
  }

  public formatAmount(amountCentsNumber: number): string {
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
}
