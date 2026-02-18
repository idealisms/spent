import * as React from 'react';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { ThunkDispatch } from 'redux-thunk';
import { IAppState, SETTINGS_VERSION } from '../model';
import { AuthStatus } from '../../auth/model';
import * as RoutePaths from './RoutePaths';
import BaseNoNav from './BaseNoNav';
import { tryLogin } from '../../auth/actions';

interface IAuthRouteProps {
  children: React.ReactNode;
}

const AuthRoute: React.FC<IAuthRouteProps> = ({ children }) => {
  const dispatch: ThunkDispatch<IAppState, null, any> = useDispatch();
  const authStatus = useSelector((state: IAppState) => state.auth.authStatus);
  const settingsVersion = useSelector(
    (state: IAppState) => state.settings.settings.version
  );

  useEffect(() => {
    if (authStatus === AuthStatus.INIT) {
      dispatch(tryLogin());
    }
  }, [authStatus, dispatch]);

  if (authStatus === AuthStatus.INIT || authStatus === AuthStatus.CHECKING) {
    return (
      <BaseNoNav>
        <div>Loading...</div>
      </BaseNoNav>
    );
  } else if (authStatus === AuthStatus.NEEDS_LOGIN) {
    return <Navigate to={RoutePaths.HomePage} replace />;
  }

  if (settingsVersion > SETTINGS_VERSION) {
    return (
      <BaseNoNav>
        <div>
          A newer version is available.{' '}
          <a href="#" onClick={() => window.location.reload()}>
            Please reload the page.
          </a>
        </div>
      </BaseNoNav>
    );
  }

  return <>{children}</>;
};

export default AuthRoute;
