import TextField from '@material-ui/core/TextField';
import { Dropbox } from 'dropbox';
import * as moment from 'moment';
import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { ACCESS_TOKEN } from '../../config';
import { Category, filterTransactionsByDate, ITransaction, TAG_TO_CATEGORY, Transaction } from '../../transactions';
import MenuBar from './MenuBar';

type SankeyNode = {
  title: string,
  tags: string[],
  subcategories: SankeyNode[],
};
type ISankeyMakerState = {
  transactions: ITransaction[],
  startDate: Date,
  endDate: Date,
  categories: SankeyNode[],
};
class SankeyMaker extends React.Component<RouteComponentProps<object>, ISankeyMakerState> {

  constructor(props:any, context:any) {
    super(props, context);
    let startDate = moment().year(moment().year() - 1).month(0).date(1).toDate();
    let endDate = moment().year(moment().year() - 1).month(11).date(31).toDate();

    let lookup = new Map<string, SankeyNode>();
    TAG_TO_CATEGORY.forEach((category, tag) => {
      let categoryName = Category[category];
      let node = lookup.get(categoryName) || {title: categoryName, tags: [], subcategories: []};
      node.tags.push(tag);
      lookup.set(categoryName, node);
    });
    let categories: SankeyNode[] = [];
    lookup.forEach(node => categories.push(node));

    this.state = {
      transactions: [],
      startDate: startDate,
      endDate: endDate,
      categories: categories,
    };
    this.loadFromDropbox();
  }

  public render(): React.ReactElement<object> {
    let filteredTransactions = filterTransactionsByDate(this.state.transactions, this.state.startDate, this.state.endDate);
    let rows = filteredTransactions.map(t => {
        return (
          <Transaction transaction={t} key={t.id}/>
        );
      });

    return (
      <div id='page-sankey-maker'>
        <MenuBar title='Sankey Maker'/>

        <div className='controls'>
          {/* The type='date' component is a bit janky. Consider using an
              add-on component: https://material-ui.com/demos/pickers/ */}
          <TextField
            className='start-date'
            type='date'
            label='Start date'
            value={moment(this.state.startDate).format('YYYY-MM-DD')}
            onChange={this.handleChangeStartDate}
          />
          <TextField
            className='end-date'
            type='date'
            style={{marginLeft: '24px', marginRight: '24px'}}
            label='End date'
            value={moment(this.state.endDate).format('YYYY-MM-DD')}
            onChange={this.handleChangeEndDate}
          />
        </div>
        <div className='sankey-trees'>
          <TextField
            id='json-categories'
            label='categories'
            placeholder='e.g., {}'
            multiline
            variant='outlined'
            value={JSON.stringify(this.state.categories, null, 2)}
          />
          <div id='rendered-tree'>
              Hello World!
          </div>
        </div>
        <div className='transactions'>
          {rows}
        </div>
      </div>
    );
  }

  public handleChangeStartDate = (event: React.ChangeEvent<{}>): void => {
    let dateStr = (event.target as HTMLInputElement).value;
    this.setState({
      startDate: moment(dateStr).toDate(),
    });
  }

  public handleChangeEndDate = (event: React.ChangeEvent<{}>): void => {
    let dateStr = (event.target as HTMLInputElement).value;
    this.setState({
      endDate: moment(dateStr).toDate(),
    });
  }

  public loadFromDropbox = (): void => {
    let filesDownloadArg = {
      path: '/transactions.json',
    };
    let dbx = new Dropbox({ accessToken: ACCESS_TOKEN });
    let sankeyMaker = this;
    dbx.filesDownload(filesDownloadArg)
        .then(file => {
            let fr = new FileReader();
            fr.addEventListener('load', ev => {
                let transactions: ITransaction[] = JSON.parse(fr.result as string);
                let state: any = { transactions: transactions };
                sankeyMaker.setState(state);
            });
            fr.addEventListener('error', ev => {
                console.log(ev);
            });
            // NOTE: The Dropbox SDK specification does not include a fileBlob
            // field on the FileLinkMetadataReference type, so it is missing from
            // the TypeScript type. This field is injected by the Dropbox SDK.
            fr.readAsText((file as any).fileBlob);
        }).catch(error => {
            console.log(error);
        });

  }
}

export default SankeyMaker;
