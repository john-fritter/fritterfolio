import { useMemo, useState, useEffect } from 'react';
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
  onShareList,
  
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
  // Local state for storing the last valid lists data to prevent flickering
  const [cachedLists, setCachedLists] = useState([]);
  const [cachedView, setCachedView] = useState(view);
  const [showLoading, setShowLoading] = useState(isLoading);
  
  // Store combined lists in a cache to prevent flickering
  useEffect(() => {
    if (view === 'lists') {
      // Always update cached lists when combinedLists changes in lists view
      // This ensures deletions are reflected immediately
      setCachedLists(combinedLists || []);
    }
  }, [view, combinedLists]);
  
  // IMPORTANT: Store the current view IMMEDIATELY when it changes
  // This ensures view transitions work properly
  useEffect(() => {
    console.log('GroceryView: View changed to:', view);
    setCachedView(view);
  }, [view]);
  
  // Handle loading state without debounce to prevent flickering
  useEffect(() => {
    // Always show loading immediately when isLoading is true
    // This ensures smooth transitions between views
    if (isLoading) {
      setShowLoading(true);
    } else {
      // When loading completes, hide loading immediately
      setShowLoading(false);
    }
  }, [isLoading]);

  // Get the actual data for the current view
  const listData = useMemo(() => {
    if (cachedView === 'lists') {
      // Use cached lists if we have them, otherwise fall back to combined lists
      return cachedLists.length > 0 ? cachedLists : combinedLists || [];
    }
    
    // For other views, we don't need special handling
    const sourceItems = cachedView === 'list' ? items : masterList?.items;
    
    if (!sourceItems || !Array.isArray(sourceItems)) {
      return [];
    }
    
    if (cachedView === 'list') {
      const filtered = sourceItems.filter(item => 
        !currentTagFilter || item.tags?.some(tag => tag.text === currentTagFilter.text)
      );
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return [...sourceItems].sort((a, b) => a.name.localeCompare(b.name));
  }, [cachedView, items, masterList, combinedLists, cachedLists, currentTagFilter]);

  // Compute whether all items are checked
  const isAllChecked = useMemo(() => {
    if (cachedView === 'lists' || !listData.length) return false;
    return listData.every(item => item.completed);
  }, [cachedView, listData]);

  // Generate title based on view
  const title = useMemo(() => {
    if (cachedView === 'lists') return "My Grocery Lists";
    if (cachedView === 'master') return "Master List";
    if (cachedView === 'list' && currentList) {
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
  }, [cachedView, currentList, currentTagFilter, setCurrentTagFilter]);

  const emptyMessage = cachedView === 'lists'
    ? "You don't have any lists yet. Create your first list below."
    : cachedView === 'master'
      ? "Your master list is empty. Items you add to any list will appear here."
      : "No items in this list yet. Add your first item below.";

  return (
    <GroceryLayout
      title={title}
      showCheckAll={cachedView !== 'lists' && listData.length > 0}
      isAllChecked={isAllChecked}
      onCheckAll={cachedView === 'list' ? toggleAllItems : toggleAllMasterItems}
      menuItems={menuItems}
      isLoading={showLoading}
      emptyMessage={emptyMessage}
      addItemForm={addForm}
    >
      {!showLoading ? (
        // Generate list items based on view
        listData.length > 0 ? (
          listData.map(cachedView === 'lists' 
            ? list => (
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
                  // For all lists show edit and delete buttons
                  // Only show share button for non-shared lists
                  <>
                    <ActionButton 
                      title="Edit list"
                      icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingList(list);
                      }}
                    />
                    {!list.is_shared && (
                      <ActionButton 
                        title="Share list"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onShareList(list.id);
                        }}
                        color="primary"
                        iconColor="text-blue-500"
                      />
                    )}
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
                  selectList(list);
                }}
              />
            )
            : item => (
              <ListRow
                key={item.id}
                leftElement={
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {
                      const toggleFn = cachedView === 'list' ? toggleItem : toggleMasterItem;
                      toggleFn(item.id, !item.completed);
                    }}
                    className="h-6 w-6 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                }
                text={
                  cachedView === 'list' ? (
                    <div 
                      className="relative w-full flex flex-col min-w-0 cursor-pointer" 
                      onClick={() => {
                        const toggleFn = cachedView === 'list' ? toggleItem : toggleMasterItem;
                        toggleFn(item.id, !item.completed);
                      }}
                    >
                      <div className="flex-none truncate">
                        <span className={(item.completed && cachedView === 'list') ? 'text-lg text-secondary-dm line-through' : 'text-lg text-secondary-dm'}>
                          {item.name}
                        </span>
                      </div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-end">
                          <SmartTruncatedTags 
                            tags={item.tags} 
                            onTagClick={(tag) => {
                              // Stop propagation to prevent toggling when clicking tags
                              setCurrentTagFilter(tag);
                            }}
                            onEditItem={() => {
                              // Stop propagation to prevent toggling when clicking edit
                              setEditingItem(item);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span 
                      className="text-lg text-secondary-dm truncate block max-w-64 sm:max-w-none cursor-pointer"
                      onClick={() => {
                        const toggleFn = cachedView === 'list' ? toggleItem : toggleMasterItem;
                        toggleFn(item.id, !item.completed);
                      }}
                    >
                      {item.name}
                    </span>
                  )
                }
                rightElements={
                  cachedView === 'list' ? (
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
            ))
        ) : (
          !showLoading && <div className="text-center text-secondary-dm opacity-60 py-4">{emptyMessage}</div>
        )
      ) : (
        // Placeholder skeleton
        cachedView === 'lists' ? (
          <div className="animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="py-4 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="py-4 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        )
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