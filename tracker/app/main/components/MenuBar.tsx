import { Location, LocationDescriptor, LocationState } from 'history';
import AppBar from 'material-ui/AppBar';
import CircularProgress from 'material-ui/CircularProgress';
import Drawer from 'material-ui/Drawer';
import FontIcon from 'material-ui/FontIcon';
import IconButton from 'material-ui/IconButton';
import MuiMenuItem from 'material-ui/MenuItem';
import { colors } from 'material-ui/styles';
import ActionDelete from 'material-ui/svg-icons/action/delete';
import CommunicationCallMerge from 'material-ui/svg-icons/communication/call-merge';
import CommunicationCallSplit from 'material-ui/svg-icons/communication/call-split';
import FileCloudDone from 'material-ui/svg-icons/file/cloud-done';
import FileCloudUpload from 'material-ui/svg-icons/file/cloud-upload';
import ImageEdit from 'material-ui/svg-icons/image/edit';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import NavigationMenu from 'material-ui/svg-icons/navigation/menu';
import * as React from 'react';
import { connect, Dispatch } from 'react-redux';
import { push, RouterAction } from 'react-router-redux';
import muiTheme from '../../muiTheme';
import { EditTransactionDialog, ITransaction } from '../../transactions';
import { IAppState } from '../Model';
import { CategoriesPage, DailyPage } from './RoutePaths';

export enum CloudState {
  Done = 1,
  Modified = 2,
  Uploading = 3,
}

interface IMenuBarOwnProps {
  title: string;
  selectedTransactions?: Map<string, ITransaction>;
  cloudState?: CloudState;
  onSaveTransactionsClick?: () => void;
  onSelectedBackClick?: () => void;
  onSelectedEditSaveClick?: (transaction: ITransaction) => void;
  onSelectedDeleteClick?: () => void;
  onSelectedMergeClick?: () => void;
  onSelectedSplitClick?: () => void;
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
}

class MenuBar extends React.Component<IMenuBarProps, IMenuBarReactState> {

  constructor(props:IMenuBarProps, context:any) {
    super(props, context);
    this.state = {
      isDrawerOpen: false,
      isEditDialogOpen: false,
    };
  }

  public render():JSX.Element {

    const MenuItem = (props:{name:string, path:string, leftIconName?:string}):React.ReactElement<MuiMenuItem> => {
      let selected = this.props.location!.pathname === props.path;
      let focusState = selected ? 'focused' : 'none';
      let style: React.CSSProperties = {
        fontWeight: 500,
      };
      if (selected) {
        style.color = muiTheme!.palette!.primary2Color;
        style.backgroundColor = colors.grey100;
      }
      return (
          <MuiMenuItem
              onClick={this.handleNavigate(props.path)}
              leftIcon={<FontIcon className='material-icons' style={style}>{props.leftIconName}</FontIcon>}
              focusState={focusState}
              style={style}
              >
            {props.name}
          </MuiMenuItem>
      );
    };

    let numSelectedTransactions = this.props.selectedTransactions ? this.props.selectedTransactions.size : 0;
    let title = this.props.title;
    let className = '';
    if (numSelectedTransactions === 1) {
      title = '1 item';
      className = 'has-selected-items one-item';
    } else if (numSelectedTransactions > 1) {
      title = numSelectedTransactions + ' items';
      className = 'has-selected-items multiple-items';
    }

    let iconElementRight = numSelectedTransactions
        ? <span>
            <IconButton
                disabled={numSelectedTransactions > 1}
                onClick={() => this.handleShowEditDialog()}><ImageEdit/></IconButton>
            <IconButton
                disabled={numSelectedTransactions === 1}
                onClick={this.props.onSelectedMergeClick}><CommunicationCallMerge /></IconButton>
            <IconButton
                disabled={numSelectedTransactions === 1}
                onClick={this.props.onSelectedSplitClick}><CommunicationCallSplit /></IconButton>
            <IconButton
                onClick={this.props.onSelectedDeleteClick}><ActionDelete /></IconButton>
          </span>
        : (this.props.cloudState ?
            <span>
              <IconButton
                  disabled={this.props.cloudState != CloudState.Modified}
                  onClick={this.props.onSaveTransactionsClick}>{
                this.props.cloudState == CloudState.Modified ? <FileCloudUpload /> :
                    (this.props.cloudState == CloudState.Uploading
                        ? <CircularProgress size={24} thickness={3} color='#fff'/> : <FileCloudDone />)
              }</IconButton>
            </span> : undefined);

    return (
      <div className='app-bar'>
        <AppBar
            iconElementLeft={<IconButton>{numSelectedTransactions
                ? <NavigationArrowBack onClick={this.props.onSelectedBackClick}/>
                : <NavigationMenu />}
              </IconButton>}
            onLeftIconButtonClick={numSelectedTransactions ? undefined : this.handleToggle}
            title={title}
            iconElementRight={iconElementRight}
            className={className}
            />
        <Drawer docked={false} width={250} open={this.state.isDrawerOpen}
                   onRequestChange={(isDrawerOpen) => this.setState({isDrawerOpen})}>
          <div className='app-drawer-header' style={{
              backgroundColor: muiTheme!.palette!.primary1Color,
              color: muiTheme!.palette!.alternateTextColor}}>
            <div className='user-icon'>📈</div>
            <div className='name'>Spent</div>
          </div>
          <MenuItem
              name='Daily'
              path={DailyPage}
              leftIconName='timeline'
          />
          <MenuItem
              name='Categories'
              path={CategoriesPage}
              leftIconName='category'
          />
        </Drawer>
        {this.state.isEditDialogOpen && this.props.onSelectedEditSaveClick ?
          <EditTransactionDialog
              transaction={this.props.selectedTransactions!.values().next().value}
              isOpen={true}
              onClose={() => this.setState({isEditDialogOpen: false})}
              onSaveChanges={this.props.onSelectedEditSaveClick}
          /> : undefined}
      </div>
    );
  }

  private handleShowEditDialog(): void {
    if (!this.props.selectedTransactions || this.props.selectedTransactions.size !== 1) {
      return;
    }
    this.setState({
      isEditDialogOpen: true,
    });
  }

  private handleToggle = () => this.setState({isDrawerOpen: !this.state.isDrawerOpen});

  private handleNavigate = (path:string) => {
    return () => {
      this.props.navigateTo(path);
      this.setState({isDrawerOpen: false});
    };
  }
}

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
