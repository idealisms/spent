import { createStyles, WithStyles } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import { Theme, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import BaseNoNav from './BaseNoNav';
import { generateAuthUrl } from '../../auth/utils';

const styles = (_theme: Theme) => createStyles({});

interface ILoginOwnProps extends WithStyles<typeof styles> {}

const Login = withStyles(styles)(
  class Component extends React.Component<ILoginOwnProps, any> {
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

export default Login;
