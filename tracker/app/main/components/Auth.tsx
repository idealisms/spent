import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { RouteComponentProps } from 'react-router-dom';
import { IAppState } from '../model';
import { setDropboxAccessToken } from '../../auth/actions';
import { HomePage, DailyPage } from './RoutePaths';
import BaseNoNav from './BaseNoNav';
import { getAuthToken } from '../../auth/utils';

interface IAuthOwnProps extends RouteComponentProps<void> {}
interface IAuthDispatchProps {
  dispatchSetDropboxAuthToken: (token: string) => void;
}
type IAuthProps = IAuthOwnProps & IAuthDispatchProps;

class AuthComponent extends React.Component<IAuthProps, any> {
  public render(): React.ReactElement<Record<string, unknown>> {
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
      <BaseNoNav>
        <div>Fetching token and redirecting...</div>
      </BaseNoNav>
    );
  }
}

const mapDispatchToProps = (
  dispatch: ThunkDispatch<IAppState, null, any>
): IAuthDispatchProps => ({
  dispatchSetDropboxAuthToken: token => {
    dispatch(setDropboxAccessToken(token));
  },
});

export default connect(null, mapDispatchToProps)(AuthComponent);
