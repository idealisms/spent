import { createStyles, WithStyles } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { Theme, withStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import BarChartIcon from '@material-ui/icons/BarChart';
import CategoryIcon from '@material-ui/icons/Category';
import EditIcon from '@material-ui/icons/Edit';
import MenuIcon from '@material-ui/icons/Menu';
import TimelineIcon from '@material-ui/icons/Timeline';
import { push } from 'connected-react-router';
import { Location, LocationState } from 'history';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { IAppState } from '../Model';
import * as Pages from './RoutePaths';

const styles = (_theme: Theme) => createStyles({
  root: {
    flex: 'none',
  },
  grow: {
    flexGrow: 1,
  },
  whiteIconButton: {
    '& svg': {
      fill: '#fff',
      color: '#fff',
    },
  },
  appBar: {
  },
  drawerPaper: {
    width: '250px',
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

interface IMenuBarWithDrawerOwnProps extends WithStyles<typeof styles> {
  title: string;
  /** If not provided, this is the hamburger menu. */
  iconElementLeft?: JSX.Element;
  iconElementRight?: JSX.Element;
}
interface IMenuBarWithDrawerAppStateProps {
  location: Location | null;
}
interface IMenuBarWithDrawerDispatchProps {
  navigateTo: (location: string, state?: LocationState) => void;
}
type IMenuBarWithDrawerProps = IMenuBarWithDrawerOwnProps & IMenuBarWithDrawerAppStateProps & IMenuBarWithDrawerDispatchProps;

interface IMenuBarWithDrawerState {
  isDrawerOpen: boolean;
}

const MenuBarWithDrawer = withStyles(styles)(
    class Component extends React.Component<IMenuBarWithDrawerProps, IMenuBarWithDrawerState> {

      constructor(props: IMenuBarWithDrawerProps, context?: any) {
        super(props, context);
        this.state = {
          isDrawerOpen: false,
        };
      }

      public render(): JSX.Element {
        let classes = this.props.classes;
        let selectedPage = this.props.location && this.props.location.pathname;
        return (
          <div className={classes.root}>
            <AppBar position='static' className={classes.appBar}>
              <Toolbar>
                {this.props.iconElementLeft
                  ? this.props.iconElementLeft
                  : <IconButton className={classes.whiteIconButton} onClick={() => {
                    this.handleToggle();
                  }}>
                    <MenuIcon />
                  </IconButton>}
                <Typography variant='h6' className={classes.grow} color='inherit'>{this.props.title}</Typography>
                {this.props.iconElementRight}
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
                  selected={selectedPage === Pages.DailyPage}
                  onClick={() => this.handleNavigate(Pages.DailyPage)}>
                  <ListItemIcon><TimelineIcon color={selectedPage === Pages.DailyPage ? 'primary' : 'inherit'} /></ListItemIcon>
                  <ListItemText classes={{primary: classes.drawerItemText}} primary='Daily' />
                </ListItem>
                <ListItem
                  key='Monthly'
                  button
                  selected={selectedPage === Pages.MonthlyPage}
                  onClick={() => this.handleNavigate(Pages.MonthlyPage)}>
                  <ListItemIcon><BarChartIcon color={selectedPage === Pages.MonthlyPage ? 'primary' : 'inherit'} /></ListItemIcon>
                  <ListItemText classes={{primary: classes.drawerItemText}} primary='Monthly' />
                </ListItem>
                <ListItem
                  key='Editor'
                  button
                  selected={selectedPage === Pages.EditorPage}
                  onClick={() => this.handleNavigate(Pages.EditorPage)}>
                  <ListItemIcon><EditIcon color={selectedPage === Pages.EditorPage ? 'primary' : 'inherit'} /></ListItemIcon>
                  <ListItemText classes={{primary: classes.drawerItemText}} primary='Editor' />
                </ListItem>
                <ListItem
                  key='Report'
                  button
                  selected={selectedPage === Pages.ReportPage}
                  onClick={() => this.handleNavigate(Pages.ReportPage)}>
                  <ListItemIcon><CategoryIcon color={selectedPage === Pages.ReportPage ? 'primary' : 'inherit'} /></ListItemIcon>
                  <ListItemText classes={{primary: classes.drawerItemText}} primary='Report' />
                </ListItem>
              </List>
            </Drawer>
          </div>
        );
      }

      private handleToggle = () => {
        this.setState({isDrawerOpen: !this.state.isDrawerOpen});
      };

      private handleNavigate = (path: string) => {
        this.props.navigateTo(path);
        this.setState({isDrawerOpen: false});
      };
    });

const mapStateToProps = (state: IAppState): IMenuBarWithDrawerAppStateProps => {
  return {
    location: state.router.location,
  };
};

const mapDispatchToProps = (dispatch: Dispatch): IMenuBarWithDrawerDispatchProps => ({
  navigateTo: (location: string) => {
    dispatch(push(location));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(MenuBarWithDrawer);
