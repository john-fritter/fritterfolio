import { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import GroceryLayout from '../../layouts/GroceryLayout';
import ListRow from './ListRow';
import ActionButton from './ActionButton';

// Simplified GroceryView component
export default function GroceryView({
  // View type
  view,
  
  // Lists view props
  combinedLists,
  selectList,
  setEditingList,
  deleteList,
  /* eslint-disable-next-line no-unused-vars */
  onShareList, // This prop is defined but unused in this component (kept for prop validation)
  
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
  // Local state for showing loading
  const [showLoading, setShowLoading] = useState(isLoading);
  
  // Store the current view for rendering
  const [currentRenderView, setCurrentRenderView] = useState(view);
  
  // Update current render view when view prop changes
  useEffect(() => {
    console.log('GroceryView: View changed to:', view);
    setCurrentRenderView(view);
  }, [view]);
  
  // Handle loading state
  useEffect(() => {
    if (isLoading) {
      setShowLoading(true);
    } else {
      setShowLoading(false);
    }
  }, [isLoading]);

  // Get the actual data for the current view - simplified
  const listData = useMemo(() => {
    // Add debug logs to see what data we're working with
    console.log('GroceryView: Preparing data for', currentRenderView, {
      listItems: items?.length || 0,
      masterItems: masterList?.items?.length || 0,
      lists: combinedLists?.length || 0
    });
    
    // Simply return the appropriate data based on view
    if (currentRenderView === 'lists') {
      return combinedLists || [];
    } else if (currentRenderView === 'list') {
      // Filter list items if tag filter is active
      const sourceItems = items || [];
      console.log('List items source data:', sourceItems);
      const filtered = sourceItems.filter(item => 
        !currentTagFilter || item.tags?.some(tag => tag.text === currentTagFilter.text)
      );
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (currentRenderView === 'master') {
      const masterItems = masterList?.items || [];
      console.log('Master items source data:', masterItems);
      return masterItems.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return [];
  }, [currentRenderView, items, masterList, combinedLists, currentTagFilter]);

  // Compute whether all items are checked
  const isAllChecked = useMemo(() => {
    if (currentRenderView === 'lists' || !listData.length) return false;
    return listData.every(item => item.completed);
  }, [currentRenderView, listData]);

  // Generate title based on view
  const title = useMemo(() => {
    if (currentRenderView === 'lists') return "My Grocery Lists";
    if (currentRenderView === 'master') return "Master List";
    if (currentRenderView === 'list' && currentList) {
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
  }, [currentRenderView, currentList, currentTagFilter, setCurrentTagFilter]);

  const emptyMessage = currentRenderView === 'lists'
    ? "You don't have any lists yet. Create your first list below."
    : currentRenderView === 'master'
      ? "Your master list is empty. Items you add to any list will appear here."
      : "No items in this list yet. Add your first item below.";

  return (
    <GroceryLayout
      title={title}
      showCheckAll={currentRenderView !== 'lists' && listData.length > 0}
      isAllChecked={isAllChecked}
      onCheckAll={currentRenderView === 'list' ? toggleAllItems : toggleAllMasterItems}
      menuItems={menuItems}
      isLoading={showLoading}
      emptyMessage={emptyMessage}
      addItemForm={addForm}
    >
      {!showLoading && (
        <>
          {/* LISTS VIEW */}
          {currentRenderView === 'lists' && combinedLists && combinedLists.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {combinedLists.map(list => (
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
                    </div>
                  }
                  rightElements={
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
                          deleteList(list.id);
                        }}
                        color="accent"
                        iconColor="text-red-500"
                      />
                    </>
                  }
                  onClick={() => {
                    console.log("ListRow clicked, selecting list:", list.name);
                    selectList(list.id);
                  }}
                />
              ))}
            </div>
          )}

          {/* LIST VIEW */}
          {currentRenderView === 'list' && items && items.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map(item => (
                <ListRow
                  key={item.id}
                  leftElement={
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleItem(item.id, !item.completed)}
                      className="h-6 w-6 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  }
                  text={
                    <div className="flex flex-col">
                      <span className={item.completed ? 'text-lg text-secondary-dm line-through' : 'text-lg text-secondary-dm'}>
                        {item.name}
                      </span>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.map(tag => (
                            <span 
                              key={tag.text} 
                              className={`inline-flex items-center text-xs px-2 py-0.5 bg-${tag.color}-100 dark:bg-${tag.color}-900 text-${tag.color}-800 dark:text-${tag.color}-200 rounded-full cursor-pointer`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentTagFilter(tag);
                              }}
                            >
                              {tag.text}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  }
                  rightElements={
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
                  }
                />
              ))}
            </div>
          )}

          {/* MASTER VIEW */}
          {currentRenderView === 'master' && masterList?.items && masterList.items.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {masterList.items.map(item => (
                <ListRow
                  key={item.id}
                  leftElement={
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleMasterItem(item.id, !item.completed)}
                      className="h-6 w-6 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  }
                  text={
                    <span className={item.completed ? 'text-lg text-secondary-dm line-through' : 'text-lg text-secondary-dm'}>
                      {item.name}
                    </span>
                  }
                  rightElements={
                    <ActionButton 
                      title="Delete item"
                      icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                      onClick={() => deleteMasterItem(item.id)}
                      color="accent"
                      iconColor="text-red-500"
                    />
                  }
                />
              ))}
            </div>
          )}

          {/* EMPTY STATE MESSAGE */}
          {((currentRenderView === 'lists' && (!combinedLists || combinedLists.length === 0)) ||
            (currentRenderView === 'list' && (!items || items.length === 0)) ||
            (currentRenderView === 'master' && (!masterList?.items || masterList.items.length === 0))) && (
            <div className="text-center text-secondary-dm opacity-60 py-4">{emptyMessage}</div>
          )}
        </>
      )}
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
  onShareList: PropTypes.func,
  
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