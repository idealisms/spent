import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import { IAppState } from '../model';
import * as React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { AuthStatus } from '../../auth/model';
import * as RoutePaths from './RoutePaths';
import { tryLogin } from '../../auth/actions';

const styles = (_theme: Theme) => createStyles({});

interface IAuthRouteOwnProps extends WithStyles<typeof styles> {
  exact: boolean;
  path: string;
  component: React.ComponentType<any>;
}
interface IAuthRouteAppStateProps {
  authStatus: AuthStatus;
  dropboxAccessToken: string;
}
interface IAuthStateDispatchProps {
  tryLogin: () => void;
}
type IAuthRouteProps = IAuthRouteOwnProps &
  IAuthRouteAppStateProps &
  IAuthStateDispatchProps;

interface IAuthRouteState {}

const AuthRoute = withStyles(styles)(
  class Component extends React.Component<IAuthRouteProps, IAuthRouteState> {
    constructor(props: IAuthRouteProps) {
      super(props);
      this.state = {};
    }

    public componentDidMount() {
      if (this.props.authStatus === AuthStatus.INIT) {
        this.props.tryLogin();
      }
    }

    public render(): React.ReactElement<Record<string, unknown>> {
      if (
        this.props.authStatus === AuthStatus.INIT ||
        this.props.authStatus === AuthStatus.CHECKING
      ) {
        return <div>Loading...</div>;
      } else if (this.props.authStatus === AuthStatus.NEEDS_LOGIN) {
        return <Redirect to={RoutePaths.HomePage} />;
      }

      return (
        <Route
          exact={this.props.exact}
          path={this.props.path}
          component={this.props.component}
        />
      );
    }
  }
);

const mapStateToProps = (state: IAppState): IAuthRouteAppStateProps => ({
  dropboxAccessToken: state.auth.dropboxAccessToken,
  authStatus: state.auth.authStatus,
});
const mapDispatchToProps = (
  dispatch: ThunkDispatch<IAppState, null, any>
): IAuthStateDispatchProps => ({
  tryLogin: () => {
    dispatch(tryLogin());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(AuthRoute);
