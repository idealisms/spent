import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { makeStyles } from 'tss-react/mui';
import { Theme } from '@mui/material/styles';
import * as React from 'react';
import MenuBarWithDrawer from '../../main/components/MenuBarWithDrawer';
import {
  IBrokerageTransaction,
  IQualifiedConfig,
  ITaxSummary,
} from '../model';
import {
  parseVanguardCsv,
  parseSchwebCsv,
  parseSchwebEquityCsv,
} from '../csvParser';
import { calculateTax } from '../taxCalculator';

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = makeStyles()((_theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    marginBottom: '12px',
    fontWeight: 600,
  },
  uploadRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  uploadButton: {
    textTransform: 'none',
  },
  chip: {
    marginLeft: '8px',
  },
  warningText: {
    color: '#856404',
    fontSize: '0.85rem',
    marginTop: '6px',
  },
  table: {
    fontSize: '0.85rem',
  },
  summaryPaper: {
    padding: '16px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontWeight: 700,
    borderTop: '2px solid #ccc',
    marginTop: '4px',
  },
  positive: { color: '#155724' },
  negative: { color: '#721c24' },
  qualifiedRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  qualifiedSymbol: {
    minWidth: '80px',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  qualifiedField: {
    width: '120px',
  },
  emptyState: {
    color: '#999',
    fontStyle: 'italic',
    padding: '16px 0',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUALIFIED_CONFIG_KEY = 'brokerage:qualifiedConfig';

function loadQualifiedConfig(): IQualifiedConfig {
  try {
    const stored = localStorage.getItem(QUALIFIED_CONFIG_KEY);
    return stored ? (JSON.parse(stored) as IQualifiedConfig) : {};
  } catch {
    return {};
  }
}

function fmt(cents: number): string {
  const abs = Math.abs(cents) / 100;
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return cents < 0 ? `($${str})` : `$${str}`;
}

function categoryLabel(cat: IBrokerageTransaction['category']): string {
  switch (cat) {
    case 'dividend': return 'Dividend';
    case 'interest': return 'Interest';
    case 'ltcg':     return 'LT Gain';
    case 'stcg':     return 'ST Gain';
  }
}

function sourceLabel(src: IBrokerageTransaction['source']): string {
  switch (src) {
    case 'vanguard':     return 'Vanguard';
    case 'schwab':       return 'Schwab';
    case 'schwab_equity': return 'Schwab RSU';
  }
}

// ── Upload button ─────────────────────────────────────────────────────────────

interface IUploadButtonProps {
  label: string;
  count: number;
  onFile: (text: string) => void;
}

function UploadButton({ label, count, onFile }: IUploadButtonProps) {
  const { classes } = useStyles();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onFile(ev.target?.result as string ?? '');
    reader.readAsText(file);
    // Reset so the same file can be re-uploaded
    e.target.value = '';
  };

  return (
    <Box display="flex" alignItems="center">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <Button
        className={classes.uploadButton}
        variant="outlined"
        startIcon={<UploadFileIcon />}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
      {count > 0 && (
        <Chip
          className={classes.chip}
          label={`${count} transaction${count !== 1 ? 's' : ''}`}
          size="small"
          color="success"
          variant="outlined"
        />
      )}
    </Box>
  );
}

// ── Summary row helper ────────────────────────────────────────────────────────

function SummaryRow({ label, cents, indent }: { label: string; cents: number; indent?: boolean }) {
  const { classes } = useStyles();
  return (
    <div className={classes.summaryRow} style={indent ? { paddingLeft: '16px' } : undefined}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2" className={cents < 0 ? classes.negative : undefined}>
        {fmt(cents)}
      </Typography>
    </div>
  );
}

function SummaryTotal({ label, cents }: { label: string; cents: number }) {
  const { classes } = useStyles();
  return (
    <div className={classes.summaryTotal}>
      <Typography variant="body1">{label}</Typography>
      <Typography variant="body1">{fmt(cents)}</Typography>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BrokeragePage() {
  const { classes } = useStyles();
  const [transactions, setTransactions] = React.useState<IBrokerageTransaction[]>([]);
  const [qualifiedConfig, setQualifiedConfig] = React.useState<IQualifiedConfig>(loadQualifiedConfig);

  // Persist qualified config to localStorage on change
  React.useEffect(() => {
    localStorage.setItem(QUALIFIED_CONFIG_KEY, JSON.stringify(qualifiedConfig));
  }, [qualifiedConfig]);

  const countBySource = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      counts[t.source] = (counts[t.source] ?? 0) + 1;
    }
    return counts;
  }, [transactions]);

  const dividendSymbols = React.useMemo(() => {
    const syms = new Set<string>();
    for (const t of transactions) {
      if (t.category === 'dividend' && t.symbol) syms.add(t.symbol);
    }
    return Array.from(syms).sort();
  }, [transactions]);

  const taxSummary: ITaxSummary | null = React.useMemo(() => {
    if (transactions.length === 0) return null;
    return calculateTax(transactions, qualifiedConfig);
  }, [transactions, qualifiedConfig]);

  const addTransactions = (
    parser: (text: string) => IBrokerageTransaction[],
    source: IBrokerageTransaction['source'],
  ) => (text: string) => {
    const parsed = parser(text);
    setTransactions(prev => [
      ...prev.filter(t => t.source !== source),
      ...parsed,
    ]);
  };

  const handleQualifiedChange = (symbol: string, value: string) => {
    const pct = parseFloat(value);
    if (isNaN(pct)) return;
    setQualifiedConfig(prev => ({ ...prev, [symbol]: Math.min(1, Math.max(0, pct / 100)) }));
  };

  // Sort transactions newest first for display
  const sortedTransactions = React.useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );

  return (
    <div className={classes.root}>
      <MenuBarWithDrawer title="Tax Estimates" />
      <div className={classes.content}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          2025 Federal + California estimate · Married Filing Jointly · All figures approximate
        </Typography>

        {/* ── Import ── */}
        <div className={classes.section}>
          <Typography variant="h6" className={classes.sectionTitle}>Import CSVs</Typography>
          <div className={classes.uploadRow}>
            <UploadButton
              label="Vanguard"
              count={countBySource['vanguard'] ?? 0}
              onFile={addTransactions(parseVanguardCsv, 'vanguard')}
            />
            <UploadButton
              label="Schwab"
              count={countBySource['schwab'] ?? 0}
              onFile={addTransactions(parseSchwebCsv, 'schwab')}
            />
            <UploadButton
              label="Schwab RSU"
              count={countBySource['schwab_equity'] ?? 0}
              onFile={addTransactions(parseSchwebEquityCsv, 'schwab_equity')}
            />
            {transactions.length > 0 && (
              <Button
                size="small"
                color="error"
                onClick={() => setTransactions([])}
              >
                Clear all
              </Button>
            )}
          </div>
          <Typography className={classes.warningText}>
            Note: Vanguard and Schwab fund sells are not included (cost basis not in CSV export).
            Enter those gains manually or use the 1099-B.
          </Typography>
        </div>

        {transactions.length === 0 && (
          <Typography className={classes.emptyState}>
            Upload one or more CSVs to see transactions and tax estimates.
          </Typography>
        )}

        {/* ── Qualified dividend config ── */}
        {dividendSymbols.length > 0 && (
          <div className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Qualified Dividend % by Fund
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Enter the qualified percentage from your prior-year 1099-DIV.
              Bond funds = 0%. Stock ETFs are typically 80–100%. Saved in browser.
            </Typography>
            {dividendSymbols.map(symbol => (
              <div key={symbol} className={classes.qualifiedRow}>
                <Typography className={classes.qualifiedSymbol}>{symbol}</Typography>
                <TextField
                  className={classes.qualifiedField}
                  size="small"
                  type="number"
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  value={Math.round((qualifiedConfig[symbol] ?? 0) * 100)}
                  onChange={e => handleQualifiedChange(symbol, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Tax summary ── */}
        {taxSummary && (
          <div className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>Tax Summary</Typography>
            <Paper className={classes.summaryPaper} variant="outlined">
              <Typography variant="subtitle2" gutterBottom>Income</Typography>
              <SummaryRow label="Ordinary dividends" cents={taxSummary.ordinaryDividendsCents} />
              <SummaryRow label="Qualified dividends" cents={taxSummary.qualifiedDividendsCents} />
              <SummaryRow label="Interest" cents={taxSummary.interestCents} />
              <SummaryRow label="Short-term gains" cents={taxSummary.stcgCents} />
              <SummaryRow label="Long-term gains" cents={taxSummary.ltcgCents} />

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>Federal</Typography>
              <SummaryRow
                label={`Standard deduction`}
                cents={-taxSummary.federalStandardDeductionCents}
              />
              <SummaryRow
                label="Ordinary income tax"
                cents={taxSummary.federalOrdinaryTaxCents}
                indent
              />
              <SummaryRow
                label="LTCG / qualified dividend tax"
                cents={taxSummary.federalLtcgTaxCents}
                indent
              />
              {taxSummary.federalNiitCents > 0 && (
                <SummaryRow
                  label="NIIT (3.8%)"
                  cents={taxSummary.federalNiitCents}
                  indent
                />
              )}
              <SummaryTotal label="Federal total" cents={taxSummary.federalTotalCents} />

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>California</Typography>
              <SummaryRow
                label="Standard deduction"
                cents={-taxSummary.caStandardDeductionCents}
              />
              <SummaryRow
                label="CA income tax (all ordinary)"
                cents={taxSummary.caTaxCents}
                indent
              />
              <SummaryTotal label="CA total" cents={taxSummary.caTaxCents} />

              <Divider sx={{ my: 1.5 }} />
              <SummaryTotal label="Total estimated tax" cents={taxSummary.totalTaxCents} />
            </Paper>
          </div>
        )}

        {/* ── Transactions table ── */}
        {sortedTransactions.length > 0 && (
          <div className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Transactions ({sortedTransactions.length})
            </Typography>
            <Table size="small" className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedTransactions.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>{sourceLabel(t.source)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{t.symbol}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>{categoryLabel(t.category)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: t.amountCents < 0 ? '#721c24' : undefined }}
                    >
                      {fmt(t.amountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
