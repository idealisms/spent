import Button from '@mui/material/Button';
import * as React from 'react';
import BaseNoNav from './BaseNoNav';
import { generateAuthUrl } from '../../auth/utils';

const Login: React.FC = () => {
  return (
    <BaseNoNav>
      <div>
        📈 Spent is a tool for tracking money being spent. It is a method for
        budgeting based on an annual spending target.
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
};

export default Login;
