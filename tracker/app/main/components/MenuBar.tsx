import { createStyles, WithStyles } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { Theme, withStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import CallMergeIcon from '@material-ui/icons/CallMerge';
import CallSplitIcon from '@material-ui/icons/CallSplit';
import CategoryIcon from '@material-ui/icons/Category';
import CloudDoneIcon from '@material-ui/icons/CloudDone';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import MenuIcon from '@material-ui/icons/Menu';
import TimelineIcon from '@material-ui/icons/Timeline';
import { Location, LocationDescriptor, LocationState } from 'history';
import * as React from 'react';
import { connect, Dispatch } from 'react-redux';
import { push, RouterAction } from 'react-router-redux';
import { EditTransactionDialog, ITransaction, MergeTransactionDialog, SplitTransactionDialog } from '../../transactions';
import { IAppState } from '../Model';
import { DailyPage, EditorPage, ReportPage } from './RoutePaths';

export enum CloudState {
  Done = 1,
  Modified = 2,
  Uploading = 3,
}

const styles = (theme: Theme) => createStyles({
  drawerPaper: {
    width: '250px',
  },
  tooltip: {
    marginLeft: '36px',
  },
  whiteIconButton: {
    '& svg': {
      fill: '#fff',
      color: '#fff',
    },
  },
  flexNone: {
    flex: 'none',
  },
  grow: {
    flexGrow: 1,
  },
  appBar: {
    color: '#fff',
  },
  appBarSelected: {
    backgroundColor: '#fff',
    color: 'rgba(0, 0, 0, .54)',
  },
  drawerHeader: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'green',
    color: '#fff',
  },
  drawerHeaderIcon: {
    fontSize: '24px',
    width: '48px',
  },
  drawerItemText: {
    fontWeight: 500,
  },
});

interface IMenuBarOwnProps extends WithStyles<typeof styles> {
  title: string;
  selectedTransactions?: Map<string, ITransaction>;
  cloudState?: CloudState;
  onSaveClick?: () => void;
  onSelectedBackClick?: () => void;
  onSelectedEditSaveClick?: (transaction: ITransaction) => void;
  onSelectedMergeSaveClick?: (transaction: ITransaction) => void;
  onSelectedDeleteClick?: (transactions: Map<string, ITransaction>) => void;
  onSelectedSplitSaveClick?: (transactions: Map<string, ITransaction>) => void;
}
interface IMenuBarStateProps {
  location: Location | null;
}
interface IMenuBarDispatchProps {
  navigateTo: (location: LocationDescriptor, state?: LocationState) => RouterAction;
}
type IMenuBarProps = IMenuBarOwnProps & IMenuBarStateProps & IMenuBarDispatchProps;

interface IMenuBarReactState {
  isDrawerOpen: boolean;
  isEditDialogOpen: boolean;
  isMergeDialogOpen: boolean;
  isSplitDialogOpen: boolean;
}

const MenuBar = withStyles(styles)(
class extends React.Component<IMenuBarProps, IMenuBarReactState> {

  constructor(props: IMenuBarProps, context?: any) {
    super(props, context);
    this.state = {
      isDrawerOpen: false,
      isEditDialogOpen: false,
      isMergeDialogOpen: false,
      isSplitDialogOpen: false,
    };
  }

  public render(): JSX.Element {
    let classes = this.props.classes;
    let selectedTransactionsArray = this.props.selectedTransactions ? [...this.props.selectedTransactions.values()] : [];

    let numSelectedTransactions = selectedTransactionsArray.length;
    let title = this.props.title;
    if (numSelectedTransactions === 1) {
      title = '1 item';
    } else if (numSelectedTransactions > 1) {
      title = numSelectedTransactions + ' items';
    }

    let iconElementLeft = numSelectedTransactions
        ? <IconButton onClick={() => {
              if (this.props.onSelectedBackClick) {
                this.props.onSelectedBackClick();
              }
          }}>
            <ArrowBackIcon />
          </IconButton>
        : <IconButton classes={{root: classes.whiteIconButton}} onClick={() => {
            this.handleToggle();
          }}>
            <MenuIcon />
          </IconButton>;

    let iconElementRight = numSelectedTransactions
        ? <span>
            <Tooltip classes={{tooltip: classes.tooltip}} title='Edit'><span><IconButton
                disabled={numSelectedTransactions > 1}
                onClick={() => this.handleShowEditDialog()}
                ><EditIcon /></IconButton></span>
            </Tooltip>
            <Tooltip classes={{tooltip: classes.tooltip}} title='Merge'><span><IconButton
                disabled={numSelectedTransactions === 1}
                onClick={() => this.handleShowMergeDialog()}
                ><CallMergeIcon /></IconButton></span>
            </Tooltip>
            <Tooltip classes={{tooltip: classes.tooltip}} title='Split'><span><IconButton
                disabled={numSelectedTransactions > 1}
                onClick={() => this.handleShowSplitDialog()}
                ><CallSplitIcon /></IconButton></span>
            </Tooltip>
            <Tooltip title='Delete' placement='bottom-end'><IconButton
                onClick={() => this.props.onSelectedDeleteClick!(this.props.selectedTransactions!)}
                ><DeleteIcon /></IconButton>
            </Tooltip>
          </span>
        : (this.props.cloudState ?
            <span>
              <IconButton
                  classes={{root: classes.whiteIconButton}}
                  disabled={this.props.cloudState != CloudState.Modified}
                  onClick={this.props.onSaveClick}>{
                this.props.cloudState == CloudState.Modified ? <CloudUploadIcon /> :
                    (this.props.cloudState == CloudState.Uploading
                        ? <CircularProgress size={24} thickness={4} />
                        : <CloudDoneIcon />)
              }</IconButton>
            </span> : undefined);

    let selectedPage = this.props.location!.pathname;
    return (
      <div className={classes.flexNone}>
        <AppBar position='static'
            classes={{root: numSelectedTransactions ? classes.appBarSelected
                                                    : classes.appBar}}>
          <Toolbar>
            {iconElementLeft}
            <Typography variant='h6' classes={{root: classes.grow}} color='inherit'>{title}</Typography>
            {iconElementRight}
          </Toolbar>
        </AppBar>

        <Drawer classes={{paper: classes.drawerPaper}}  open={this.state.isDrawerOpen}
            onClose={() => this.setState({isDrawerOpen: false})}>
          <div className={classes.drawerHeader}>
            <div className={classes.drawerHeaderIcon}>📈</div>
            <Typography variant='h6' color='inherit'>Spent</Typography>
          </div>
          <List>
            <ListItem
                key='Daily'
                button
                selected={selectedPage === DailyPage}
                onClick={() => this.handleNavigate(DailyPage)}>
              <ListItemIcon><TimelineIcon color={selectedPage === DailyPage ? 'primary' : 'default'} /></ListItemIcon>
              <ListItemText classes={{primary: classes.drawerItemText}} primary='Daily' />
            </ListItem>
            <ListItem
                key='Editor'
                button
                selected={selectedPage === EditorPage}
                onClick={() => this.handleNavigate(EditorPage)}>
              <ListItemIcon><EditIcon color={selectedPage === EditorPage ? 'primary' : 'default'} /></ListItemIcon>
              <ListItemText classes={{primary: classes.drawerItemText}} primary='Editor' />
            </ListItem>
            <ListItem
                key='Report'
                button
                selected={selectedPage === ReportPage}
                onClick={() => this.handleNavigate(ReportPage)}>
              <ListItemIcon><CategoryIcon color={selectedPage === ReportPage ? 'primary' : 'default'} /></ListItemIcon>
              <ListItemText classes={{primary: classes.drawerItemText}} primary='Report' />
            </ListItem>
          </List>
        </Drawer>
        {this.state.isEditDialogOpen && this.props.onSelectedEditSaveClick ?
          <EditTransactionDialog
              transaction={this.props.selectedTransactions!.values().next().value}
              onClose={() => this.setState({isEditDialogOpen: false})}
              onSaveChanges={this.props.onSelectedEditSaveClick}
          /> : undefined}
        {this.state.isMergeDialogOpen && this.props.onSelectedMergeSaveClick ?
          <MergeTransactionDialog
              transactions={selectedTransactionsArray}
              onClose={() => this.setState({isMergeDialogOpen: false})}
              onSaveChanges={this.props.onSelectedMergeSaveClick}
          /> : undefined}
        {this.state.isSplitDialogOpen && this.props.onSelectedSplitSaveClick ?
          <SplitTransactionDialog
              transaction={this.props.selectedTransactions!.values().next().value}
              onClose={() => this.setState({isSplitDialogOpen: false})}
              onSaveChanges={this.props.onSelectedSplitSaveClick}
          /> : undefined}
      </div>
    );
  }

  private handleShowEditDialog(): void {
    if (!this.props.selectedTransactions || this.props.selectedTransactions.size != 1) {
      return;
    }
    this.setState({
      isEditDialogOpen: true,
    });
  }

  private handleShowMergeDialog(): void {
    if (!this.props.selectedTransactions || this.props.selectedTransactions.size < 2) {
      return;
    }
    this.setState({
      isMergeDialogOpen: true,
    });
  }

  private handleShowSplitDialog(): void {
    if (!this.props.selectedTransactions || this.props.selectedTransactions.size != 1) {
      return;
    }
    this.setState({
      isSplitDialogOpen: true,
    });
  }

  private handleToggle = () => {
    this.setState({isDrawerOpen: !this.state.isDrawerOpen});
  }

  private handleNavigate = (path: string) => {
    this.props.navigateTo(path);
    this.setState({isDrawerOpen: false});
  }
});

const mapStateToProps = (state: IAppState):IMenuBarStateProps => {
  return {
    location: state.routing.location,
  };
};

const mapDispatchToProps = (dispatch:Dispatch<any>):IMenuBarDispatchProps => ({
  navigateTo: (location:LocationDescriptor, state?: LocationState) => {
    return dispatch(push(location));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(MenuBar);
