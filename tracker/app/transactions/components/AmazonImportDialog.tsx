import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { Theme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import { ITransaction } from '../model';

// --- Types ---

interface ICsvRow {
  items: string;
  paymentDate: string;
  amountCents: number;
}

interface IMatchResult {
  csvRow: ICsvRow;
  transactions: ITransaction[];
  isSplit: boolean;
  proposedNote: string;
  checked: boolean;
}

// --- CSV parsing ---

function parseField(row: string, start: number): [string, number] {
  if (row[start] === '"') {
    let field = '';
    let i = start + 1;
    while (i < row.length) {
      if (row[i] === '"' && row[i + 1] === '"') {
        field += '"';
        i += 2;
      } else if (row[i] === '"') {
        return [field, i + 2]; // skip closing quote + comma
      } else {
        field += row[i++];
      }
    }
    return [field, i];
  }
  const end = row.indexOf(',', start);
  if (end === -1) {return [row.slice(start), row.length + 1];}
  return [row.slice(start, end), end + 1];
}

function parseRow(row: string): string[] {
  const fields: string[] = [];
  let pos = 0;
  while (pos <= row.length) {
    const [field, next] = parseField(row, pos);
    fields.push(field);
    if (next > row.length) {break;}
    pos = next;
  }
  return fields;
}

function parseCsv(text: string): Record<string, string>[] {
  // Strip BOM and normalize line endings
  const lines = text
    .replace(/^\uFEFF/, '')
    .split('\n')
    .map(l => l.replace(/\r$/, ''))
    .filter(Boolean);
  if (lines.length < 2) {return [];}
  const headers = parseRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? '';
    });
    return obj;
  });
}

// Parses "Card Name: YYYY-MM-DD: $amount; ..." format.
// Falls back to order date + total for gift-card-only payments.
function parsePayment(
  paymentsStr: string,
  orderDate: string,
  totalStr: string,
): { date: string; amountCents: number } | null {
  for (const entry of paymentsStr
    .split(';')
    .map(e => e.trim())
    .filter(Boolean)) {
    const parts = entry.split(':').map(p => p.trim());
    if (parts.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) {
      const amount = parseFloat(parts[2].replace(/,/g, '').replace('$', ''));
      if (!isNaN(amount) && amount > 0) {
        return { date: parts[1], amountCents: Math.round(amount * 100) };
      }
    }
  }
  // Gift card fallback: use order date + total
  const total = parseFloat(totalStr.replace(/,/g, ''));
  if (!isNaN(total) && total > 0 && orderDate) {
    return { date: orderDate, amountCents: Math.round(total * 100) };
  }
  return null;
}

function extractNote(items: string): string {
  const first = items.split(';')[0].trim();
  return first.length > 80 ? first.slice(0, 77) + '...' : first;
}

function daysDiff(fromDate: string, toDate: string): number {
  return (
    (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000
  );
}

// Charge date is 0-7 days after CSV payment/order date (items ship after order).
// For split shipments, try pairs of transactions summing to the CSV amount within 14 days.
function matchCsvRow(
  csvRow: ICsvRow,
  txns: ITransaction[],
): ITransaction[] | null {
  const TOL = 1;
  const near = txns.filter(t => {
    const d = daysDiff(csvRow.paymentDate, t.date);
    return d >= 0 && d <= 7;
  });
  const single = near.find(
    t => Math.abs(t.amount_cents - csvRow.amountCents) <= TOL,
  );
  if (single) {return [single];}

  const wide = txns.filter(t => {
    const d = daysDiff(csvRow.paymentDate, t.date);
    return d >= 0 && d <= 14;
  });
  for (let i = 0; i < wide.length; i++) {
    for (let j = i + 1; j < wide.length; j++) {
      if (
        Math.abs(
          wide[i].amount_cents + wide[j].amount_cents - csvRow.amountCents,
        ) <= TOL
      ) {
        return [wide[i], wide[j]];
      }
    }
  }
  return null;
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
}

interface IAmazonImportDialogState {
  step: 'upload' | 'review';
  matches: IMatchResult[];
  unmatchedCount: number;
  alreadyNotedCount: number;
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
      if (text) {this.parseAndMatch(text);}
    };
    reader.readAsText(file);
  };

  private parseAndMatch(csvText: string) {
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
      if (!items) {continue;} // skip rows with no item description

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

    this.setState({ step: 'review', matches, unmatchedCount, alreadyNotedCount });
  }

  private handleToggleMatch = (idx: number) => {
    const matches = [...this.state.matches];
    matches[idx] = { ...matches[idx], checked: !matches[idx].checked };
    this.setState({ matches });
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
