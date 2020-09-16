import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { RouteComponentProps } from 'react-router-dom';
import { IAppState } from '../Model';
import { setDropboxAccessToken } from '../../auth/actions';
import { HomePage, DailyPage } from './RoutePaths';
import { getAuthToken } from '../../auth/utils';

const styles = (_theme: Theme) =>
  createStyles({
    root: {},
  });

interface IAuthOwnProps
  extends WithStyles<typeof styles>,
  RouteComponentProps<void> {}
interface IAuthAppStateProps {}
interface IAuthDispatchProps {
  dispatchSetDropboxAuthToken: (token: string) => void;
}
type IAuthProps = IAuthOwnProps & IAuthAppStateProps & IAuthDispatchProps;

const Auth = withStyles(styles)(
    class Component extends React.Component<IAuthProps, any> {
      public render(): React.ReactElement<Record<string, unknown>> {
        let classes = this.props.classes;

        // Following the steps outlined here (PKCE):
        // https://www.dropbox.com/lp/developers/reference/oauth-guide
        const returnCode = new URLSearchParams(this.props.location.search).get(
            'code'
        );

        getAuthToken(window.location.origin, returnCode)
          .then(accessToken => {
            this.props.dispatchSetDropboxAuthToken(accessToken);
            this.props.history.push(DailyPage);
          })
          .catch(reason => {
            console.log(reason);
            this.props.history.push(HomePage);
          });

        return (
          <div className={classes.root}>Fetching token and redirecting ...</div>
        );
      }
    }
);

const mapStateToProps = (_state: IAppState): IAuthAppStateProps => ({});
const mapDispatchToProps = (
    dispatch: ThunkDispatch<IAppState, null, any>
): IAuthDispatchProps => ({
  dispatchSetDropboxAuthToken: token => {
    dispatch(setDropboxAccessToken(token));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Auth);
