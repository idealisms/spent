import { Location, LocationDescriptor, LocationState } from 'history';
import AppBar from 'material-ui/AppBar';
import Drawer from 'material-ui/Drawer';
import FontIcon from 'material-ui/FontIcon';
import IconButton from 'material-ui/IconButton';
import MuiMenuItem from 'material-ui/MenuItem';
import { colors } from 'material-ui/styles';
import ActionDelete from 'material-ui/svg-icons/action/delete';
import CommunicationCallMerge from 'material-ui/svg-icons/communication/call-merge';
import CommunicationCallSplit from 'material-ui/svg-icons/communication/call-split';
import FileCloudDone from 'material-ui/svg-icons/file/cloud-done';
import ImageEdit from 'material-ui/svg-icons/image/edit';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import NavigationMenu from 'material-ui/svg-icons/navigation/menu';
import * as React from 'react';
import { connect, Dispatch } from 'react-redux';
import { push, RouterAction } from 'react-router-redux';
import muiTheme from '../../muiTheme';
import { IAppState } from '../Model';
import { CategoriesPage, DailyPage } from './RoutePaths';

interface IMenuBarOwnProps {
  title: string;
  selectedTransactions?: Set<string>;
  hasChanges?: boolean;
  onSelectedBackClick?: () => void;
  onSelectedEditClick?: () => void;
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
  open: boolean;
}

class MenuBar extends React.Component<IMenuBarProps, IMenuBarReactState> {

  constructor(props:IMenuBarProps, context:any) {
    super(props, context);
    this.state = {open: false};
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

    return (
      <div className='app-bar'>
        <AppBar
            iconElementLeft={<IconButton>{numSelectedTransactions
                ? <NavigationArrowBack onClick={this.props.onSelectedBackClick}/>
                : <NavigationMenu />}
              </IconButton>}
            onLeftIconButtonClick={numSelectedTransactions ? undefined : this.handleToggle}
            title={title}
            iconElementRight={numSelectedTransactions
              ?
                <span>
                  <IconButton disabled={numSelectedTransactions > 1}><ImageEdit/></IconButton>
                  <IconButton disabled={numSelectedTransactions === 1}><CommunicationCallMerge /></IconButton>
                  <IconButton disabled={numSelectedTransactions === 1}><CommunicationCallSplit /></IconButton>
                  <IconButton><ActionDelete /></IconButton>
                </span>
              :
                <span>
                  <IconButton disabled={true}><FileCloudDone /></IconButton>
                </span>}
            className={className}
            />
        <Drawer docked={false} width={250} open={this.state.open}
                   onRequestChange={(open) => this.setState({open})}>
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
      </div>
    );
  }

  private handleToggle = () => this.setState({open: !this.state.open});

  private handleNavigate = (path:string) => {
    return () => {
      this.props.navigateTo(path);
      this.setState({open: false});
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
