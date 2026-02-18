import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
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
import { DEFAULT_CATEGORIES, ICategoryDefinition } from '../../transactions/model';
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
  categoryName: {
    flexGrow: 1,
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
  },
  addTagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
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
  newTagInputs: Record<string, string>;
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
      newTagInputs: {},
    };
  }

  public render(): React.ReactElement {
    const { categories, cloudState, classes } = this.props;
    const { dialogOpen, dialogCategory, newTagInputs } = this.state;

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
            const tagInput = newTagInputs[name] || '';
            return (
              <Accordion key={name} disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <div className={classes.summaryContent}>
                    <span className={classes.emoji}>{def.emoji}</span>
                    <Typography className={classes.categoryName}>
                      {name}
                    </Typography>
                  </div>
                  <IconButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      this.setState({ dialogOpen: true, dialogCategory: name });
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
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
                    <TextField
                      size="small"
                      label="New tag"
                      value={tagInput}
                      onChange={e =>
                        this.setState(prev => ({
                          newTagInputs: {
                            ...prev.newTagInputs,
                            [name]: e.target.value,
                          },
                        }))
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          this.handleAddTag(name, tagInput);
                        }
                      }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => this.handleAddTag(name, tagInput)}
                      disabled={!tagInput.trim()}
                    >
                      Add
                    </Button>
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

  private handleAddTag = (categoryName: string, tag: string) => {
    this.props.updateCategories(addTag(this.props.categories, categoryName, tag));
    this.setState(prev => ({
      newTagInputs: { ...prev.newTagInputs, [categoryName]: '' },
    }));
  };

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
