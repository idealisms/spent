import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setDropboxAccessToken } from '../../auth/actions';
import { HomePage, DailyPage } from './RoutePaths';
import BaseNoNav from './BaseNoNav';
import { getAuthToken } from '../../auth/utils';

const Auth: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    const returnCode = searchParams.get('code');

    getAuthToken(window.location.origin, returnCode)
      .then(accessToken => {
        dispatch(setDropboxAccessToken(accessToken));
        navigate(DailyPage);
      })
      .catch(reason => {
        console.log(reason);
        navigate(HomePage);
      });
  }, [dispatch, navigate, searchParams]);

  return (
    <BaseNoNav>
      <div>Fetching token and redirecting...</div>
    </BaseNoNav>
  );
};

export default Auth;
