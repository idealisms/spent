import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import * as React from 'react';

function isValidEmoji(s: string): boolean {
  if (!s) { return false; }
  // Intl.Segmenter correctly handles multi-codepoint emoji (ZWJ sequences, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segments = [...new (Intl as any).Segmenter().segment(s)];
  return segments.length === 1 && /\p{Extended_Pictographic}/u.test(s);
}

interface ICategoryEditDialogProps {
  open: boolean;
  name: string;
  emoji: string;
  isNew: boolean;
  onSave: (name: string, emoji: string) => void;
  onClose: () => void;
}

interface ICategoryEditDialogState {
  name: string;
  emoji: string;
}

export class CategoryEditDialog extends React.Component<
  ICategoryEditDialogProps,
  ICategoryEditDialogState
> {
  constructor(props: ICategoryEditDialogProps) {
    super(props);
    this.state = {
      name: props.name,
      emoji: props.emoji,
    };
  }

  public componentDidUpdate(prevProps: ICategoryEditDialogProps): void {
    if (!prevProps.open && this.props.open) {
      this.setState({ name: this.props.name, emoji: this.props.emoji });
    }
  }

  public render(): React.ReactElement {
    const { open, isNew, onClose } = this.props;
    const { name, emoji } = this.state;
    const emojiValid = isValidEmoji(emoji);
    const canSave = name.trim().length > 0 && emojiValid;

    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>{isNew ? 'Add Category' : 'Edit Category'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Emoji"
            fullWidth
            value={emoji}
            onChange={e => this.setState({ emoji: e.target.value })}
            error={emoji.length > 0 && !emojiValid}
            helperText={emoji.length > 0 && !emojiValid ? 'Must be a single emoji' : undefined}
          />
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            value={name}
            onChange={e => this.setState({ name: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter' && canSave) {
                this.handleSave();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={this.handleSave}
            variant="contained"
            disabled={!canSave}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  private handleSave = () => {
    this.props.onSave(this.state.name.trim(), this.state.emoji);
  };
}

export default CategoryEditDialog;
