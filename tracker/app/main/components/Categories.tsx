import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { Theme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import { makeStyles } from 'tss-react/mui';
import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { DEFAULT_CATEGORIES, ICategoryDefinition, ITransaction, TagSelect } from '../../transactions';
import { saveSettingsToDropbox, updateSetting } from '../actions';
import { CloudState, IAppState } from '../model';
import {
  addCategory,
  addTag,
  deleteCategory,
  deleteTag,
  editCategory,
} from '../categoriesUtils';
import CategoryEditDialog from './CategoryEditDialog';
import MenuBarWithDrawer from './MenuBarWithDrawer';

const useStyles = makeStyles()((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  scrollable: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
  },
  summaryContent: {
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    minWidth: 0,
  },
  emoji: {
    fontSize: '1.4rem',
    marginRight: theme.spacing(1),
    flexShrink: 0,
  },
  summaryText: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  categoryName: {},
  tagsPreview: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
  },
  addTagRow: {
    marginTop: theme.spacing(1),
  },
  addCategoryButton: {
    marginTop: theme.spacing(2),
  },
}));

interface ICategoriesOwnProps {}
interface ICategoriesAppStateProps {
  categories: Record<string, ICategoryDefinition>;
  cloudState: CloudState;
  allTransactions: ITransaction[];
}
interface ICategoriesDispatchProps {
  updateCategories: (cats: Record<string, ICategoryDefinition>) => void;
  saveSettings: () => void;
}
type ICategoriesProps = ICategoriesOwnProps &
  ICategoriesAppStateProps &
  ICategoriesDispatchProps;

interface ICategoriesState {
  dialogOpen: boolean;
  /** null = adding new, string = editing existing */
  dialogCategory: string | null;
}

interface ICategoriesInnerProps extends ICategoriesProps {
  classes: ReturnType<typeof useStyles>['classes'];
}

class CategoriesInner extends React.Component<
  ICategoriesInnerProps,
  ICategoriesState
> {
  constructor(props: ICategoriesInnerProps) {
    super(props);
    this.state = {
      dialogOpen: false,
      dialogCategory: null,
    };
  }

  public render(): React.ReactElement {
    const { categories, cloudState, allTransactions, classes } = this.props;
    const { dialogOpen, dialogCategory } = this.state;

    const sortedNames = Object.keys(categories).sort((a, b) => {
      if (a === 'Other') { return 1; }
      if (b === 'Other') { return -1; }
      return a.localeCompare(b);
    });

    const editingDef = dialogCategory != null ? categories[dialogCategory] : null;

    const saveButton = (
      <IconButton
        color="inherit"
        onClick={this.props.saveSettings}
        disabled={cloudState === CloudState.Done}
      >
        <SaveIcon />
      </IconButton>
    );

    return (
      <div className={classes.root}>
        <MenuBarWithDrawer title="Categories" iconElementRight={saveButton} />
        <div className={classes.scrollable}>
          {sortedNames.map(name => {
            const def = categories[name];
            // Build filtered transactions: exclude tags used in other categories
            const tagsElsewhere = new Set(
              Object.entries(categories)
                .filter(([k]) => k !== name)
                .flatMap(([, d]) => d.tags)
            );
            const filteredTransactions = allTransactions
              .map(t => ({ ...t, tags: t.tags.filter(tag => !tagsElsewhere.has(tag)) }))
              .filter(t => t.tags.length > 0);
            return (
              <Accordion key={name} disableGutters>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ '& .MuiAccordionSummary-content': { minWidth: 0 } }}
                >
                  <div className={classes.summaryContent}>
                    <span className={classes.emoji}>{def.emoji}</span>
                    <div className={classes.summaryText}>
                      <Typography className={classes.categoryName}>
                        {name}
                      </Typography>
                      <Typography className={classes.tagsPreview} noWrap>
                        {def.tags.join(', ')}
                      </Typography>
                    </div>
                  </div>
                  <IconButton
                    component="span"
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      this.setState({ dialogOpen: true, dialogCategory: name });
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    component="span"
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      this.props.updateCategories(
                        deleteCategory(categories, name)
                      );
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </AccordionSummary>
                <AccordionDetails>
                  <div className={classes.tagsContainer}>
                    {def.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() =>
                          this.props.updateCategories(
                            deleteTag(categories, name, tag)
                          )
                        }
                      />
                    ))}
                  </div>
                  <div className={classes.addTagRow}>
                    <TagSelect
                      allowNewTags={true}
                      hideCategories={true}
                      transactions={filteredTransactions}
                      value={[]}
                      placeholder="Add a tag..."
                      onChange={tags => {
                        let updated = this.props.categories;
                        for (const tag of tags) {
                          updated = addTag(updated, name, tag);
                        }
                        this.props.updateCategories(updated);
                      }}
                    />
                  </div>
                </AccordionDetails>
              </Accordion>
            );
          })}

          <Button
            variant="outlined"
            className={classes.addCategoryButton}
            onClick={() =>
              this.setState({ dialogOpen: true, dialogCategory: null })
            }
          >
            + Add Category
          </Button>
        </div>

        <CategoryEditDialog
          open={dialogOpen}
          name={dialogCategory ?? ''}
          emoji={editingDef?.emoji ?? ''}
          isNew={dialogCategory === null}
          onSave={this.handleDialogSave}
          onClose={() => this.setState({ dialogOpen: false })}
        />
      </div>
    );
  }

  private handleDialogSave = (name: string, emoji: string) => {
    const { categories, dialogCategory } = { ...this.props, ...this.state };
    let updated: Record<string, ICategoryDefinition>;
    if (dialogCategory === null) {
      updated = addCategory(categories, name, emoji);
    } else {
      updated = editCategory(categories, dialogCategory, name, emoji);
    }
    this.props.updateCategories(updated);
    this.setState({ dialogOpen: false });
  };
}

function CategoriesWrapper(props: ICategoriesProps) {
  const { classes } = useStyles();
  return <CategoriesInner {...props} classes={classes} />;
}

const mapStateToProps = (state: IAppState): ICategoriesAppStateProps => ({
  categories: state.settings.settings.categories ?? DEFAULT_CATEGORIES,
  cloudState: state.settings.cloudState,
  allTransactions: state.transactions.transactions,
});

const mapDispatchToProps = (
  dispatch: ThunkDispatch<IAppState, null, any>
): ICategoriesDispatchProps => ({
  updateCategories: cats => {
    dispatch(updateSetting('categories', cats));
  },
  saveSettings: () => {
    dispatch(saveSettingsToDropbox());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(CategoriesWrapper);
