import { createStyles, WithStyles } from '@material-ui/core';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { RouteComponentProps } from 'react-router-dom';
import { IAppState } from '../model';
import { generateAuthUrl } from '../../auth/utils';

const styles = (_theme: Theme) =>
  createStyles({
    root: {},
  });

interface ILoginOwnProps
  extends WithStyles<typeof styles>,
  RouteComponentProps<void> {}
interface ILoginAppStateProps {}
interface ILoginDispatchProps {}
type ILoginProps = ILoginOwnProps & ILoginAppStateProps & ILoginDispatchProps;

const Login = withStyles(styles)(
    class Component extends React.Component<ILoginProps, any> {
      public render(): React.ReactElement<Record<string, unknown>> {
        let classes = this.props.classes;

        return (
          <div className={classes.root}>
            <a href={generateAuthUrl(window.location.origin)}>Login</a>
          </div>
        );
      }
    }
);

const mapStateToProps = (_state: IAppState): ILoginAppStateProps => ({});
const mapDispatchToProps = (
    _dispatch: ThunkDispatch<IAppState, null, any>
): ILoginDispatchProps => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
