import { Location, LocationDescriptor, LocationState } from 'history';
import MuiAppBar from 'material-ui/AppBar';
import MuiDrawer from 'material-ui/Drawer';
import FontIcon from 'material-ui/FontIcon';
import MuiMenuItem from 'material-ui/MenuItem';
import { colors } from 'material-ui/styles';
import * as React from 'react';
import { Dispatch, connect } from 'react-redux';
import { RouterAction, push } from 'react-router-redux';
import muiTheme from '../../muiTheme';
import { IAppState } from '../Model';
import { CategoriesPage, DailyPage } from './RoutePaths';

interface IMenuBarOwnProps {
  title: string;
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

    return (
      <div className='app-bar'>
        <MuiAppBar onLeftIconButtonClick={this.handleToggle} title={this.props.title} />
        <MuiDrawer docked={false} width={250} open={this.state.open}
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
        </MuiDrawer>
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
