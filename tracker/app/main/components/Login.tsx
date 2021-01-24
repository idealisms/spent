import { createStyles, WithStyles } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { RouteComponentProps } from 'react-router-dom';
import { IAppState } from '../model';
import BaseNoNav from './BaseNoNav';
import { generateAuthUrl } from '../../auth/utils';

const styles = (_theme: Theme) => createStyles({});

interface ILoginOwnProps
  extends WithStyles<typeof styles>,
    RouteComponentProps<void> {}
interface ILoginAppStateProps {}
interface ILoginDispatchProps {}
type ILoginProps = ILoginOwnProps & ILoginAppStateProps & ILoginDispatchProps;

const Login = withStyles(styles)(
  class Component extends React.Component<ILoginProps, any> {
    public render(): React.ReactElement<Record<string, unknown>> {
      return (
        <BaseNoNav>
          <div>
            📈 Spent is a tool for tracking money being spent. It is a method
            for budgeting based on an annual spending target.
          </div>

          <div style={{ marginTop: '16px' }}>
            <Button
              variant="contained"
              color="primary"
              href={generateAuthUrl(window.location.origin)}
            >
              Login with Dropbox
            </Button>
          </div>
        </BaseNoNav>
      );
    }
  }
);

const mapStateToProps = (_state: IAppState): ILoginAppStateProps => ({});
const mapDispatchToProps = (
  _dispatch: ThunkDispatch<IAppState, null, any>
): ILoginDispatchProps => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
