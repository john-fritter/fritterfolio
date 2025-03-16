import { useMemo } from 'react';
import PropTypes from 'prop-types';
import GroceryLayout from '../../layouts/GroceryLayout';
import ListRow from './ListRow';
import ActionButton from './ActionButton';
import SmartTruncatedTags from './SmartTruncatedTags';

export default function GroceryView({
  // View type
  view,
  
  // Lists view props
  combinedLists,
  selectList,
  setEditingList,
  deleteList,
  
  // List view props
  items,
  currentList,
  toggleItem,
  toggleAllItems,
  deleteItem,
  setEditingItem,
  currentTagFilter,
  setCurrentTagFilter,
  
  // Master list props
  masterList,
  toggleMasterItem,
  toggleAllMasterItems,
  deleteMasterItem,
  
  // Common props
  isLoading,
  menuItems,
  addForm
}) {
  // Compute sorted items based on view type
  const sortedItems = useMemo(() => {
    if (view === 'lists') {
      return combinedLists;
    }

    const sourceItems = view === 'list' ? items : masterList?.items;
    
    if (!sourceItems || !Array.isArray(sourceItems)) {
      console.log('No items or invalid items array');
      return [];
    }
    
    if (view === 'list') {
      const filtered = sourceItems.filter(item => 
        !currentTagFilter || item.tags?.some(tag => tag.text === currentTagFilter.text)
      );
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return [...sourceItems].sort((a, b) => a.name.localeCompare(b.name));
  }, [view, items, masterList, combinedLists, currentTagFilter]);

  // Compute whether all items are checked
  const isAllChecked = useMemo(() => {
    if (view === 'lists' || !sortedItems.length) return false;
    return sortedItems.every(item => item.completed);
  }, [view, sortedItems]);

  // Generate title based on view
  const title = useMemo(() => {
    if (view === 'lists') return "My Grocery Lists";
    if (view === 'master') return "Master List";
    if (view === 'list' && currentList) {
      return (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-52 sm:max-w-none">{currentList.name}</span>
          {currentList.is_shared && (
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full whitespace-nowrap">
              <span className="hidden sm:inline">{currentList.shared_with_email}</span>
              <span className="sm:hidden">Shared</span>
            </span>
          )}
          {currentTagFilter && (
            <div className="relative group">
              <span className={`inline-flex items-center text-xs px-2 py-1 bg-${currentTagFilter.color}-100 dark:bg-${currentTagFilter.color}-900 text-${currentTagFilter.color}-800 dark:text-${currentTagFilter.color}-200 rounded-full whitespace-nowrap`}>
                {currentTagFilter.text}
                <button
                  onClick={() => setCurrentTagFilter(null)}
                  className="ml-1 flex items-center justify-center w-4 h-4 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 border-0 outline-none"
                >
                  <span className="text-xs font-bold">×</span>
                </button>
              </span>
            </div>
          )}
        </div>
      );
    }
    return "";
  }, [view, currentList, currentTagFilter, setCurrentTagFilter]);

  // Generate list items based on view
  const listItems = useMemo(() => {
    if (view === 'lists') {
      return sortedItems.map(list => (
        <ListRow
          key={list.id + (list.is_received_share ? '-shared' : '')}
          text={
            <div className="flex items-center">
              <span className="text-lg text-secondary-dm truncate max-w-32 sm:max-w-none">
                {list.name}
              </span>
              {list.is_shared && (
                <span className="ml-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                  <span className="hidden sm:inline">{list.shared_with_email}</span>
                  <span className="sm:hidden">Shared</span>
                </span>
              )}
              <span className="ml-2 text-xs text-secondary-dm opacity-75 hidden sm:inline">
                {Array.isArray(list.items) ? `${list.items.length} items` : '0 items'}
              </span>
            </div>
          }
          rightElements={
            !list.is_received_share && (
              <>
                <ActionButton 
                  title="Edit list"
                  icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingList(list);
                  }}
                />
                <ActionButton 
                  title="Delete list"
                  icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this list?')) {
                      deleteList(list.id);
                    }
                  }}
                  color="accent"
                  iconColor="text-red-500"
                />
              </>
            )
          }
          onClick={() => selectList(list)}
        />
      ));
    }

    return sortedItems.map(item => (
      <ListRow
        key={item.id}
        leftElement={
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => {
              const toggleFn = view === 'list' ? toggleItem : toggleMasterItem;
              toggleFn(item.id, !item.completed);
            }}
            className="h-6 w-6 text-primary border-gray-300 rounded focus:ring-primary"
          />
        }
        text={
          view === 'list' ? (
            <div className="relative w-full flex items-center gap-2 overflow-hidden">
              <div className="flex-none">
                <span className={item.completed ? 'text-lg text-secondary-dm line-through' : 'text-lg text-secondary-dm'}>
                  {item.name}
                </span>
              </div>
              {item.tags && item.tags.length > 0 && (
                <SmartTruncatedTags 
                  tags={item.tags} 
                  onTagClick={setCurrentTagFilter}
                />
              )}
            </div>
          ) : (
            <span className={item.completed ? 'text-lg text-secondary-dm line-through truncate block max-w-64 sm:max-w-none' : 'text-lg text-secondary-dm truncate block max-w-64 sm:max-w-none'}>
              {item.name}
            </span>
          )
        }
        rightElements={
          view === 'list' ? (
            <>
              <ActionButton 
                title="Edit item"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                onClick={() => setEditingItem(item)}
              />
              <ActionButton 
                title="Delete item"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                onClick={() => deleteItem(item.id)}
                color="accent"
                iconColor="text-red-500"
              />
            </>
          ) : (
            <ActionButton 
              title="Delete item"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
              onClick={() => deleteMasterItem(item.id)}
              color="accent"
              iconColor="text-red-500"
            />
          )
        }
      />
    ));
  }, [view, sortedItems, toggleItem, toggleMasterItem, deleteItem, deleteMasterItem, setEditingItem, setCurrentTagFilter, selectList, setEditingList, deleteList]);

  // Get empty message based on view
  const emptyMessage = view === 'lists'
    ? "You don't have any lists yet. Create your first list below."
    : view === 'master'
      ? "Your master list is empty. Items you add to any list will appear here."
      : "No items in this list yet. Add your first item below.";

  return (
    <GroceryLayout
      title={title}
      showCheckAll={view !== 'lists' && sortedItems.length > 0}
      isAllChecked={isAllChecked}
      onCheckAll={view === 'list' ? toggleAllItems : toggleAllMasterItems}
      menuItems={menuItems}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      addItemForm={addForm}
    >
      {listItems}
    </GroceryLayout>
  );
}

GroceryView.propTypes = {
  // View type
  view: PropTypes.oneOf(['lists', 'list', 'master']).isRequired,
  
  // Lists view props
  combinedLists: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    is_shared: PropTypes.bool,
    shared_with_email: PropTypes.string,
    is_received_share: PropTypes.bool,
    items: PropTypes.array
  })),
  selectList: PropTypes.func,
  setEditingList: PropTypes.func,
  deleteList: PropTypes.func,
  
  // List view props
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    completed: PropTypes.bool.isRequired,
    tags: PropTypes.arrayOf(PropTypes.shape({
      text: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired
    }))
  })),
  currentList: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    is_shared: PropTypes.bool,
    shared_with_email: PropTypes.string
  }),
  toggleItem: PropTypes.func,
  toggleAllItems: PropTypes.func,
  deleteItem: PropTypes.func,
  setEditingItem: PropTypes.func,
  currentTagFilter: PropTypes.shape({
    text: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired
  }),
  setCurrentTagFilter: PropTypes.func,
  
  // Master list props
  masterList: PropTypes.shape({
    items: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      completed: PropTypes.bool.isRequired
    }))
  }),
  toggleMasterItem: PropTypes.func,
  toggleAllMasterItems: PropTypes.func,
  deleteMasterItem: PropTypes.func,
  
  // Common props
  isLoading: PropTypes.bool.isRequired,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    action: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired
  })).isRequired,
  addForm: PropTypes.node
}; 