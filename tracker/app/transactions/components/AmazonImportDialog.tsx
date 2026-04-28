import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Theme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import { ITransaction } from '../model';
import {
  ICsvRow,
  extractNote,
  matchCsvRow,
  parseCsv,
  parsePayment,
} from '../amazonImportUtils';

// --- Types ---

interface IMatchResult {
  csvRow: ICsvRow;
  transactions: ITransaction[];
  isSplit: boolean;
  proposedNote: string;
  checked: boolean;
}

// --- Claude API ---

async function shortenDescription(items: string, apiKey: string): Promise<string> {
  const first = items.split(';')[0].trim();
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: `Shorten this Amazon product title to 4-6 words keeping brand and product type. Reply with only the shortened title.\n\n${first}`,
          },
        ],
      }),
    });
    if (!resp.ok) {return extractNote(items);}
    const data = await resp.json();
    return data.content?.[0]?.text?.trim() || extractNote(items);
  } catch {
    return extractNote(items);
  }
}

// --- Styles ---

const useStyles = makeStyles()((_theme: Theme) => ({
  dialogPaper: { margin: '16px' },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '32px',
    textAlign: 'center',
  },
  apiKeySection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    maxWidth: '380px',
    paddingTop: '16px',
    borderTop: '1px solid #eee',
  },
  apiKeyRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  matchList: {
    borderTop: '1px solid lightgrey',
    maxHeight: '55vh',
    overflow: 'auto',
  },
  matchRow: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '6px 0',
    borderBottom: '1px solid #f5f5f5',
    gap: '8px',
  },
  matchNote: {
    flex: '1 1 0',
    minWidth: 0,
    fontSize: '14px',
    wordBreak: 'break-word',
  },
  matchArrow: {
    flex: 'none',
    color: '#bbb',
    paddingTop: '2px',
  },
  matchTxns: {
    flex: '1 1 0',
    minWidth: 0,
    fontSize: '13px',
    color: '#555',
  },
  txnRow: {
    marginBottom: '2px',
  },
  existingNote: {
    color: '#e65100',
    fontSize: '12px',
  },
  splitLabel: {
    color: '#999',
    fontSize: '11px',
    fontStyle: 'italic',
  },
  summary: {
    paddingTop: '8px',
    color: '#666',
    fontSize: '13px',
  },
}));

// --- Component ---

interface IAmazonImportDialogProps {
  allTransactions: ITransaction[];
  onClose: () => void;
  onSaveChanges: (updatedTransactions: ITransaction[]) => void;
  anthropicApiKey?: string;
  onSaveApiKey: (key: string | undefined) => void;
}

interface IAmazonImportDialogState {
  step: 'upload' | 'review';
  matches: IMatchResult[];
  unmatchedCount: number;
  alreadyNotedCount: number;
  isLoading: boolean;
  isEditingApiKey: boolean;
  apiKeyInput: string;
}

interface IAmazonImportDialogInnerProps extends IAmazonImportDialogProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class AmazonImportDialogInner extends React.Component<
  IAmazonImportDialogInnerProps,
  IAmazonImportDialogState
> {
  private fileInputRef = React.createRef<HTMLInputElement>();

  constructor(props: IAmazonImportDialogInnerProps) {
    super(props);
    this.state = {
      step: 'upload',
      matches: [],
      unmatchedCount: 0,
      alreadyNotedCount: 0,
      isLoading: false,
      isEditingApiKey: false,
      apiKeyInput: '',
    };
  }

  public render() {
    const { classes } = this.props;
    const { step, matches, unmatchedCount, alreadyNotedCount } = this.state;
    const checkedCount = matches.filter(m => m.checked).length;

    return (
      <Dialog
        open
        onClose={this.props.onClose}
        classes={{ paper: classes.dialogPaper }}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>Import Amazon Order History</DialogTitle>
        <DialogContent>
          {step === 'upload' ? (
            this.renderUpload()
          ) : (
            <>
              {this.renderReview()}
              <Typography className={classes.summary}>
                {unmatchedCount > 0
                  ? `${unmatchedCount} orders had no matching transaction. `
                  : ''}
                {alreadyNotedCount > 0
                  ? `${alreadyNotedCount} match${alreadyNotedCount > 1 ? 'es' : ''} already have notes (unchecked).`
                  : ''}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={this.props.onClose}>Cancel</Button>
          {step === 'review' && (
            <Button
              color="primary"
              disabled={checkedCount === 0}
              onClick={this.handleApply}
            >
              Apply ({checkedCount})
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  private renderUpload() {
    const { classes } = this.props;
    const { isLoading } = this.state;

    if (isLoading) {
      return (
        <div className={classes.uploadArea}>
          <CircularProgress size={32} />
          <Typography color="textSecondary">Shortening descriptions with Claude…</Typography>
        </div>
      );
    }

    return (
      <div className={classes.uploadArea}>
        <Typography>
          Upload an Amazon order history CSV to automatically fill in Notes for
          matching transactions.
        </Typography>
        <input
          ref={this.fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={this.handleFileChange}
        />
        <Button
          variant="outlined"
          onClick={() => this.fileInputRef.current?.click()}
        >
          Choose CSV file
        </Button>
        {this.renderApiKeySection()}
      </div>
    );
  }

  private renderApiKeySection() {
    const { classes, anthropicApiKey } = this.props;
    const { isEditingApiKey, apiKeyInput } = this.state;
    const hasKey = !!anthropicApiKey;

    if (isEditingApiKey) {
      return (
        <div className={classes.apiKeySection}>
          <TextField
            label="Anthropic API key"
            value={apiKeyInput}
            onChange={e => this.setState({ apiKeyInput: e.target.value })}
            size="small"
            fullWidth
            type="password"
            autoFocus
          />
          <div className={classes.apiKeyRow}>
            <Button
              size="small"
              onClick={this.handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
            >
              Save
            </Button>
            <Button
              size="small"
              onClick={() => this.setState({ isEditingApiKey: false, apiKeyInput: '' })}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className={classes.apiKeySection}>
        <Typography variant="caption" color="textSecondary">
          {hasKey
            ? 'Anthropic API key set — descriptions will be shortened by Claude'
            : 'No Anthropic API key — descriptions will be truncated'}
        </Typography>
        <div className={classes.apiKeyRow}>
          <Button
            size="small"
            onClick={() => this.setState({ isEditingApiKey: true, apiKeyInput: '' })}
          >
            {hasKey ? 'Edit key' : 'Set key'}
          </Button>
          {hasKey && (
            <Button size="small" onClick={this.handleClearApiKey}>
              Clear
            </Button>
          )}
        </div>
      </div>
    );
  }

  private renderReview() {
    const { classes } = this.props;
    const { matches } = this.state;
    if (matches.length === 0) {
      return (
        <Typography style={{ padding: '16px 0' }}>
          No matches found in this CSV.
        </Typography>
      );
    }
    return (
      <div className={classes.matchList}>
        {matches.map((match, idx) => (
          <div key={idx} className={classes.matchRow}>
            <Checkbox
              checked={match.checked}
              onChange={() => this.handleToggleMatch(idx)}
              size="small"
              style={{ paddingTop: 0, paddingBottom: 0 }}
            />
            <div className={classes.matchNote}>{match.proposedNote}</div>
            <div className={classes.matchArrow}>→</div>
            <div className={classes.matchTxns}>
              {match.transactions.map(t => (
                <div key={t.id} className={classes.txnRow}>
                  {t.date} · ${(t.amount_cents / 100).toFixed(2)} ·{' '}
                  {t.description}
                  {t.notes?.trim() && (
                    <span className={classes.existingNote}>
                      {' '}
                      (has note: &ldquo;{t.notes}&rdquo;)
                    </span>
                  )}
                </div>
              ))}
              {match.isSplit && (
                <div className={classes.splitLabel}>split shipment</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  private handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {return;}
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        if (this.props.anthropicApiKey) {
          this.setState({ isLoading: true });
        }
        this.parseAndMatch(text);
      }
    };
    reader.readAsText(file);
  };

  private async parseAndMatch(csvText: string) {
    const rows = parseCsv(csvText);
    // Amazon transactions only, skip Prime membership fee rows
    const amazonTxns = this.props.allTransactions.filter(
      t => /amazon|amzn/i.test(t.description) && !/prime pmts/i.test(t.description),
    );

    const matches: IMatchResult[] = [];
    let unmatchedCount = 0;
    let alreadyNotedCount = 0;
    const usedIds = new Set<string>();

    for (const row of rows) {
      const items = row['items']?.trim() ?? '';
      if (!items) {continue;}

      const payment = parsePayment(
        row['payments'] ?? '',
        row['date'] ?? '',
        row['total'] ?? '',
      );
      if (!payment) {continue;}

      const csvRow: ICsvRow = {
        items,
        paymentDate: payment.date,
        amountCents: payment.amountCents,
      };

      const available = amazonTxns.filter(t => !usedIds.has(t.id));
      const matched = matchCsvRow(csvRow, available);
      if (!matched) {
        unmatchedCount++;
        continue;
      }
      matched.forEach(t => usedIds.add(t.id));

      const alreadyNoted = matched.some(t => !!t.notes?.trim());
      if (alreadyNoted) {alreadyNotedCount++;}

      matches.push({
        csvRow,
        transactions: matched,
        isSplit: matched.length > 1,
        proposedNote: extractNote(items),
        checked: !alreadyNoted,
      });
    }

    matches.sort((a, b) =>
      a.csvRow.paymentDate.localeCompare(b.csvRow.paymentDate),
    );

    if (this.props.anthropicApiKey) {
      const shortened = await Promise.all(
        matches.map(m => shortenDescription(m.csvRow.items, this.props.anthropicApiKey!)),
      );
      shortened.forEach((note, i) => {matches[i].proposedNote = note;});
    }

    this.setState({ step: 'review', matches, unmatchedCount, alreadyNotedCount, isLoading: false });
  }

  private handleToggleMatch = (idx: number) => {
    const matches = [...this.state.matches];
    matches[idx] = { ...matches[idx], checked: !matches[idx].checked };
    this.setState({ matches });
  };

  private handleSaveApiKey = () => {
    const key = this.state.apiKeyInput.trim();
    if (key) {
      this.props.onSaveApiKey(key);
      this.setState({ isEditingApiKey: false, apiKeyInput: '' });
    }
  };

  private handleClearApiKey = () => {
    this.props.onSaveApiKey(undefined);
  };

  private handleApply = () => {
    const updates = new Map<string, ITransaction>();
    for (const match of this.state.matches.filter(m => m.checked)) {
      for (const t of match.transactions) {
        updates.set(t.id, { ...t, notes: match.proposedNote });
      }
    }
    this.props.onSaveChanges(
      this.props.allTransactions.map(t => updates.get(t.id) ?? t),
    );
    this.props.onClose();
  };
}

function AmazonImportDialog(props: IAmazonImportDialogProps) {
  const { classes } = useStyles();
  return <AmazonImportDialogInner {...props} classes={classes} />;
}

export default AmazonImportDialog;
