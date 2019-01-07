import TextField from '@material-ui/core/TextField';
import * as Dropbox from 'dropbox';
import * as moment from 'moment';
import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { ACCESS_TOKEN } from '../../config';
import { Category, filterTransactionsByDate, formatAmountNumber, ITransaction, TAG_TO_CATEGORY, Transaction } from '../../transactions';
import MenuBar, { CloudState } from './MenuBar';

type SankeyNode = {
  title: string,
  tags: string[],
  subcategories: SankeyNode[],
};
type SankeyRenderNode = {
  sankeyNode: SankeyNode,
  amountCents: number,
  transactions: ITransaction[],
  subcategories: SankeyRenderNode[],
};
type ISankeyMakerState = {
  transactions: ITransaction[],
  startDate: Date,
  endDate: Date,
  categories: SankeyNode[],
  categoriesPretty: string,
  cloudState: CloudState,
};
class SankeyMaker extends React.Component<RouteComponentProps<object>, ISankeyMakerState> {

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

    return (
      <div id='page-sankey-maker'>
        <MenuBar
          title='Sankey Maker'
          cloudState={this.state.cloudState}
          onSaveClick={this.handleSaveSankeyJson}
        />

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
            value={this.state.categoriesPretty}
            onChange={this.handleChangeSankeyJson}
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

  public handleChangeSankeyJson = (event: React.ChangeEvent<{}>): void => {
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
  public handleSaveSankeyJson = (): void => {
    this.setState({cloudState: CloudState.Uploading});
    let filesCommitInfo = {
        contents: JSON.stringify({sankeyCategories: this.state.categories}),
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
    let sankeyMaker = this;
    dbx.filesDownload({path: '/transactions.json'})
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

    dbx.filesDownload({path: '/settings.json'})
        .then(file => {
            let fr = new FileReader();
            fr.addEventListener('load', ev => {
                let settings = JSON.parse(fr.result as string);
                let categories = settings.sankeyCategories;
                let categoriesPretty = JSON.stringify(categories, null, 2);
                sankeyMaker.setState({
                  categories: categories,
                  categoriesPretty: categoriesPretty,
                });
            });
            fr.addEventListener('error', ev => {
                console.log(ev);
            });
            fr.readAsText((file as any).fileBlob);
        }).catch(error => {
            console.info(`settings.json download failed, ignoring. ${error}`);
            sankeyMaker.loadDefaultCategories();
        });
  }
  private loadDefaultCategories = (): void => {
    let lookup = new Map<string, SankeyNode>();
    TAG_TO_CATEGORY.forEach((category, tag) => {
      let categoryName = Category[category];
      let node = lookup.get(categoryName) || {title: categoryName, tags: [], subcategories: []};
      node.tags.push(tag);
      lookup.set(categoryName, node);
    });
    let categories: SankeyNode[] = [];
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
    const buildRenderTree = (sankeyNodes: SankeyNode[]): SankeyRenderNode[] => {
      let renderNodes: SankeyRenderNode[] = [];
      for (let sankeyNode of sankeyNodes) {
        let sankeyRenderNode: SankeyRenderNode = {
          sankeyNode: sankeyNode,
          amountCents: 0,
          transactions: [],
          subcategories: buildRenderTree(sankeyNode.subcategories),
        };
        renderNodes.push(sankeyRenderNode);
      }
      return renderNodes;
    };
    let sankeyRenderNodes = buildRenderTree(this.state.categories);

    let tagToRootSankeyRenderNode: Map<string, SankeyRenderNode> = new Map();
    for (let renderNode of sankeyRenderNodes) {
      for (let tag of renderNode.sankeyNode.tags) {
        if (tagToRootSankeyRenderNode.has(tag)) {
          return [[], [<div key={tagToRootSankeyRenderNode.get(tag)!.sankeyNode.title + tag}>
              Error, tag appears twice.
              {tag} in {tagToRootSankeyRenderNode.get(tag)!.sankeyNode.title}
              and {renderNode.sankeyNode.title}.</div>]];
        }
        tagToRootSankeyRenderNode.set(tag, renderNode);
      }
    }

    const addTransactionToRenderNode = (transaction: ITransaction, node: SankeyRenderNode): void => {
      node.transactions.push(transaction);
      node.amountCents += transaction.amount_cents;
      let subnodes = [];
      for (let subnode of node.subcategories) {
        for (let tag of subnode.sankeyNode.tags) {
          if (transaction.tags.indexOf(tag) != -1) {
            subnodes.push(subnode);
            break;
          }
        }
      }
      if (subnodes.length > 1) {
        output.push(<div key={transaction.id}>
            Multiple subnodes of {node.sankeyNode.title}: {transaction.description} ({transaction.tags.join(', ')})</div>);
      } else if (subnodes.length == 1) {
        addTransactionToRenderNode(transaction, subnodes[0]);
      }
    };

    let unmatchedTransactions: ITransaction[] = [];
    let multipleCategoriesTransactions: ITransaction[] = [];
    for (let transaction of transactions) {
      let renderNodes = [];
      for (let tag of transaction.tags) {
        let node = tagToRootSankeyRenderNode.get(tag);
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

    // console.log(sankeyRenderNodes);

    let buildTime = window.performance.now();
    const buildDom = (renderNodes: SankeyRenderNode[], depth: number, outputDom: JSX.Element[]): void => {
      renderNodes.sort((lhs, rhs) => {
        if (lhs.amountCents == rhs.amountCents) {
          return 0;
        }
        return lhs.amountCents > rhs.amountCents ? -1 : 1;
      });
      for (let renderNode of renderNodes) {
        outputDom.push(
            <div
                key={`${renderNode.sankeyNode.title}-${renderNode.amountCents}`}
                className='row'
                style={{marginLeft: (depth * 32) + 'px'}}>
              <span className='amount'>${formatAmountNumber(renderNode.amountCents)}</span>
              {renderNode.sankeyNode.title} from {renderNode.transactions.length} transaction(s)
            </div>);
        buildDom(renderNode.subcategories, depth + 1, outputDom);
      }
    };
    buildDom(sankeyRenderNodes, 0, output);

    let domTime = window.performance.now();
    output.push(<div key='debug0' className='info'>Build time: {(buildTime - startTime).toFixed(2)}ms</div>);
    output.push(<div key='debug1' className='info'>DOM time: {(domTime - buildTime).toFixed(2)}ms</div>);
    return [unmatchedTransactions, output];
  }
}

export default SankeyMaker;
