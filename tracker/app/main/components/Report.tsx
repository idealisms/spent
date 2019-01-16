import TextField from '@material-ui/core/TextField';
import * as Dropbox from 'dropbox';
import { InlineDatePicker } from 'material-ui-pickers';
import * as moment from 'moment';
import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { ACCESS_TOKEN } from '../../config';
import { Category, filterTransactionsByDate, formatAmountNumber, ITransaction, TAG_TO_CATEGORY, Transaction } from '../../transactions';
import MenuBar, { CloudState } from './MenuBar';

type ReportNode = {
  title: string,
  tags: string[],
  subcategories: ReportNode[],
};
type ReportRenderNode = {
  ReportNode: ReportNode,
  amountCents: number,
  transactions: ITransaction[],
  subcategories: ReportRenderNode[],
};
type IReportState = {
  transactions: ITransaction[],
  startDate: Date,
  endDate: Date,
  categories: ReportNode[],
  categoriesPretty: string,
  cloudState: CloudState,
};
class Report extends React.Component<RouteComponentProps<object>, IReportState> {

  constructor(props:any, context:any) {
    super(props, context);
    let startDate = moment().year(moment().year() - 1).month(0).date(1).toDate();
    let endDate = moment().year(moment().year() - 1).month(11).date(31).toDate();

    this.state = {
      transactions: [],
      startDate: startDate,
      endDate: endDate,
      categories: [],
      categoriesPretty: 'loading...',
      cloudState: CloudState.Done,
    };
    this.loadFromDropbox();
  }

  public render(): React.ReactElement<object> {
    let filteredTransactions = filterTransactionsByDate(
        this.state.transactions, this.state.startDate, this.state.endDate);
    let [unmatchedTransactions, renderedTree] = this.buildTree(filteredTransactions);
    let rows = unmatchedTransactions.map(t => {
        return (
          <Transaction transaction={t} key={t.id}/>
        );
      });

    let minDate = moment(this.state.startDate).toDate();
    let maxDate = moment(this.state.endDate).toDate();
    if (this.state.transactions.length > 0) {
      minDate = moment(this.state.transactions.slice(-1)[0].date).toDate();
      maxDate = moment(this.state.transactions[0].date).toDate();
    }

    return (
      <div id='page-report'>
        <MenuBar
          title='Report'
          cloudState={this.state.cloudState}
          onSaveClick={this.handleSaveReportJson}
        />

        <div className='controls'>
          <InlineDatePicker
            keyboard
            label='Start date'
            minDate={minDate}
            maxDate={maxDate}
            value={this.state.startDate}
            onChange={this.handleChangeStartDate}
            format='YYYY-MM-DD'
            mask={[/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
          />
          <InlineDatePicker
            keyboard
            label='End date'
            minDate={minDate}
            maxDate={maxDate}
            value={this.state.endDate}
            style={{marginLeft: '24px'}}
            onChange={this.handleChangeEndDate}
            format='YYYY-MM-DD'
            mask={[/\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, '-', /\d/, /\d/]}
          />
        </div>
        <div className='report-trees'>
          <TextField
            id='json-categories'
            label='categories'
            placeholder='e.g., {}'
            multiline
            variant='outlined'
            value={this.state.categoriesPretty}
            onChange={this.handleChangeReportJson}
          />
          <div id='rendered-tree'>
              {renderedTree}
          </div>
        </div>
        <div className='transactions'>
          {rows}
        </div>
      </div>
    );
  }

  public handleChangeStartDate = (m: moment.Moment): void => {
    this.setState({
      startDate: m.toDate(),
    });
  }

  public handleChangeEndDate = (m: moment.Moment): void => {
    this.setState({
      endDate: m.toDate(),
    });
  }

  public handleChangeReportJson = (event: React.ChangeEvent<{}>): void => {
    let categoriesPretty = (event.target as HTMLTextAreaElement).value;
    let state = {
      cloudState: CloudState.Modified,
      categoriesPretty: categoriesPretty,
      categories: this.state.categories,
    };
    try {
      state.categories = JSON.parse(categoriesPretty);
    } catch (e) {
      // If there's a parse error, don't update categories.
    }
    this.setState(state);
  }
  public handleSaveReportJson = (): void => {
    this.setState({cloudState: CloudState.Uploading});
    let filesCommitInfo = {
        contents: JSON.stringify({reportCategories: this.state.categories}),
        path: '/settings.json',
        mode: {'.tag': 'overwrite'} as DropboxTypes.files.WriteModeOverwrite,
        autorename: false,
        mute: false,
    };
    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN });
    dbx.filesUpload(filesCommitInfo)
        .then(metadata => {
            console.log('wrote to dropbox');
            console.log(metadata);
            this.setState({cloudState: CloudState.Done});
        }).catch(error => {
            console.log('error');
            console.log(error);
            this.setState({cloudState: CloudState.Modified});
        });
  }

  public loadFromDropbox = (): void => {
    let dbx = new Dropbox.Dropbox({ accessToken: ACCESS_TOKEN });
    let report = this;
    dbx.filesDownload({path: '/transactions.json'})
        .then(file => {
            let fr = new FileReader();
            fr.addEventListener('load', ev => {
                let transactions: ITransaction[] = JSON.parse(fr.result as string);
                let state: any = { transactions: transactions };
                report.setState(state);
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

    dbx.filesDownload({path: '/settings.json'})
        .then(file => {
            let fr = new FileReader();
            fr.addEventListener('load', ev => {
                let settings = JSON.parse(fr.result as string);
                let categories = settings.reportCategories;
                if (categories) {
                  let categoriesPretty = JSON.stringify(categories, null, 2);
                  report.setState({
                    categories: categories,
                    categoriesPretty: categoriesPretty,
                  });
                } else {
                  console.info('reportCategories not found in settings.json');
                  report.loadDefaultCategories();
                }
            });
            fr.addEventListener('error', ev => {
                console.log(ev);
            });
            fr.readAsText((file as any).fileBlob);
        }).catch(error => {
            console.info(`settings.json download failed, ignoring. ${error}`);
            report.loadDefaultCategories();
        });
  }
  private loadDefaultCategories = (): void => {
    let lookup = new Map<string, ReportNode>();
    TAG_TO_CATEGORY.forEach((category, tag) => {
      let categoryName = Category[category];
      let node = lookup.get(categoryName) || {title: categoryName, tags: [], subcategories: []};
      node.tags.push(tag);
      lookup.set(categoryName, node);
    });
    let categories: ReportNode[] = [];
    lookup.forEach(node => categories.push(node));

    this.setState({
      categories: categories,
      categoriesPretty: JSON.stringify(categories, null, 2),
    });
  }

  // Builds the preview tree to be rendered.
  private buildTree = (transactions: ITransaction[]): [ITransaction[], JSX.Element[]] => {
    if (!this.state.categories.length) {
      return [[], [<div key='loading'>Loading...</div>]];
    }

    let startTime = window.performance.now();
    let output: JSX.Element[] = [];
    const buildRenderTree = (ReportNodes: ReportNode[]): ReportRenderNode[] => {
      let renderNodes: ReportRenderNode[] = [];
      for (let reportNode of ReportNodes) {
        let reportRenderNode: ReportRenderNode = {
          ReportNode: reportNode,
          amountCents: 0,
          transactions: [],
          subcategories: buildRenderTree(reportNode.subcategories),
        };
        renderNodes.push(reportRenderNode);
      }
      return renderNodes;
    };
    let ReportRenderNodes = buildRenderTree(this.state.categories);

    let tagToRootReportRenderNode: Map<string, ReportRenderNode> = new Map();
    for (let renderNode of ReportRenderNodes) {
      for (let tag of renderNode.ReportNode.tags) {
        if (tagToRootReportRenderNode.has(tag)) {
          return [[], [<div key={tagToRootReportRenderNode.get(tag)!.ReportNode.title + tag}>
              Error, tag appears twice.
              {tag} in {tagToRootReportRenderNode.get(tag)!.ReportNode.title}
              and {renderNode.ReportNode.title}.</div>]];
        }
        tagToRootReportRenderNode.set(tag, renderNode);
      }
    }

    const addTransactionToRenderNode = (transaction: ITransaction, node: ReportRenderNode): void => {
      node.transactions.push(transaction);
      node.amountCents += transaction.amount_cents;
      let subnodes = [];
      for (let subnode of node.subcategories) {
        for (let tag of subnode.ReportNode.tags) {
          if (transaction.tags.indexOf(tag) != -1) {
            subnodes.push(subnode);
            break;
          }
        }
      }
      if (subnodes.length > 1) {
        output.push(<div key={transaction.id}>
            Multiple subnodes of {node.ReportNode.title}: {transaction.description} ({transaction.tags.join(', ')})</div>);
      } else if (subnodes.length == 1) {
        addTransactionToRenderNode(transaction, subnodes[0]);
      }
    };

    let unmatchedTransactions: ITransaction[] = [];
    let multipleCategoriesTransactions: ITransaction[] = [];
    for (let transaction of transactions) {
      let renderNodes = [];
      for (let tag of transaction.tags) {
        let node = tagToRootReportRenderNode.get(tag);
        if (node && renderNodes.indexOf(node) == -1) {
          renderNodes.push(node);
        }
      }
      if (renderNodes.length == 0) {
        unmatchedTransactions.push(transaction);
      } else if (renderNodes.length > 1) {
        multipleCategoriesTransactions.push(transaction);
      } else {
        addTransactionToRenderNode(transaction, renderNodes[0]);
      }
    }

    // console.log(ReportRenderNodes);

    let buildTime = window.performance.now();
    const buildDom = (renderNodes: ReportRenderNode[], depth: number, outputDom: JSX.Element[]): void => {
      renderNodes.sort((lhs, rhs) => {
        if (lhs.amountCents == rhs.amountCents) {
          return 0;
        }
        return lhs.amountCents > rhs.amountCents ? -1 : 1;
      });
      for (let renderNode of renderNodes) {
        outputDom.push(
            <div
                key={`${renderNode.ReportNode.title}-${renderNode.amountCents}`}
                className='row'
                style={{marginLeft: (depth * 32) + 'px'}}>
              <span className='amount'>${formatAmountNumber(renderNode.amountCents)}</span>
              {renderNode.ReportNode.title} from {renderNode.transactions.length} transaction(s)
            </div>);
        buildDom(renderNode.subcategories, depth + 1, outputDom);
      }
    };
    buildDom(ReportRenderNodes, 0, output);

    let domTime = window.performance.now();
    output.push(<div key='debug0' className='info'>Build time: {(buildTime - startTime).toFixed(2)}ms</div>);
    output.push(<div key='debug1' className='info'>DOM time: {(domTime - buildTime).toFixed(2)}ms</div>);
    return [unmatchedTransactions, output];
  }
}

export default Report;
