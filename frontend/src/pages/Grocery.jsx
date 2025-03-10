import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/auth';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';

// Import components
import LoadingSpinner from '../components/grocery/LoadingSpinner';
import Notification from '../components/grocery/Notification';
import ListRow from '../components/grocery/ListRow';
import ActionButton from '../components/grocery/ActionButton';
import ListEditingModal from '../components/grocery/ListEditingModal';
import ListSelectionModal from '../components/grocery/ListSelectionModal';
import ShareListModal from '../components/grocery/ShareListModal';
import PendingSharesNotification from '../components/grocery/PendingSharesNotification';
import ItemEditingModal from '../components/grocery/ItemEditingModal';
import SmartTruncatedTags from '../components/grocery/SmartTruncatedTags';

// Import hooks
import { useGroceryLists } from '../hooks/grocery/useGroceryLists';
import { useGroceryItems } from '../hooks/grocery/useGroceryItems';
import { useMasterList } from '../hooks/grocery/useMasterList';
import { useListSharing } from '../hooks/grocery/useListSharing';

// Views enum
const VIEWS = {
  LIST: 'list',
  MASTER: 'master',
  LISTS: 'lists'
};

export default function Grocery() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const newItemInputRef = useRef(null);

  // Use our custom hooks
  const {
    groceryLists,
    currentList,
    listsLoading,
    newListName,
    setNewListName,
    setCurrentList,
    fetchGroceryLists,
    createList,
    deleteList,
    updateListName,
    updateListItemsCount
  } = useGroceryLists(user);

  const {
    items,
    itemsLoading,
    newItem,
    setNewItem,
    fetchItems,
    addItem,
    deleteItem,
    toggleItem,
    toggleAllItems,
    updateItem
  } = useGroceryItems(currentList?.id, updateListItemsCount);

  const {
    masterList,
    masterLoading,
    fetchMasterList,
    addToMasterList,
    deleteMasterItem,
    toggleMasterItem,
    toggleAllMasterItems
  } = useMasterList(user);

  const {
    pendingShares,
    acceptedShares,
    sharingLoading,
    shareList: shareListWithUser,
    acceptShare,
    rejectShare,
    fetchAcceptedShares
  } = useListSharing(user);

  // Local state
  const [view, setView] = useState(() => {
    // Try to get the saved view from localStorage
    const savedView = localStorage.getItem('groceryView');
    const savedListId = localStorage.getItem('currentListId');
    
    // Only restore LIST view if we have both the view and a valid list ID
    if (savedView === VIEWS.LIST && !savedListId) {
      return VIEWS.LISTS;
    }
    
    return savedView || VIEWS.LISTS;
  });

  // Save view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('groceryView', view);
  }, [view]);

  // Restore current list on mount
  useEffect(() => {
    const savedListId = localStorage.getItem('currentListId');
    if (savedListId && groceryLists.length > 0 && !currentList) {
      const savedList = groceryLists.find(list => list.id === parseInt(savedListId));
      if (savedList) {
        setCurrentList(savedList);
      }
    }
  }, [groceryLists, currentList, setCurrentList]);

  // Save current list ID to localStorage
  useEffect(() => {
    if (currentList?.id) {
      localStorage.setItem('currentListId', currentList.id);
    }
  }, [currentList?.id]);

  // When currentList becomes set and view is 'LIST', fetch items for that list
  useEffect(() => {
    if (view === VIEWS.LIST && currentList) {
      fetchItems(currentList.id);
    }
  }, [currentList, view, fetchItems]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingList, setEditingList] = useState(null);
  const [showListSelection, setShowListSelection] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPendingShares, setShowPendingShares] = useState(true);
  const [combinedLists, setCombinedLists] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [allTags, setAllTags] = useState([]);

  // Added dropdownRef and useEffect to collapse the dropdown when clicking outside
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Fetch tags when component mounts
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await api.getTags();
        setAllTags(tags);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    if (user) {
      fetchTags();
    }
  }, [user]);

  // Initialize and fetch data
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      sessionStorage.setItem('loginRedirect', window.location.pathname);
      navigate('/login');
      return;
    }

    fetchGroceryLists();
    fetchMasterList();
    fetchAcceptedShares();
  }, [user, authLoading, navigate, fetchGroceryLists, fetchMasterList, fetchAcceptedShares]);

  // Combine owned and shared lists for display
  useEffect(() => {
    // Format shared lists to match grocery lists structure
    const sharedListsFormatted = acceptedShares.map(share => ({
      id: share.list_id,
      name: share.list_name,
      is_shared: true,
      shared_with_email: share.owner_email,
      items: share.items || [],
      is_received_share: true // Mark as a received share for special handling
    }));
    
    setCombinedLists([...groceryLists, ...sharedListsFormatted]);
  }, [groceryLists, acceptedShares]);

  // Keep new item input focused
  useEffect(() => {
    if (newItemInputRef.current && document.activeElement !== newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [newItem]);

  // Handle list selection
  const selectList = (list) => {
    setCurrentList(list);
    fetchItems(list.id);
    setView(VIEWS.LIST);
  };

  // Handle list creation
  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      await createList(newListName);
      setNewListName('');
      setView(VIEWS.LIST);
    } catch {
      setNotification({
        message: "Failed to create list",
        type: "error"
      });
    }
  };

  // Handle item addition
  const handleAddItem = async (e) => {
    e?.preventDefault();
    if (!newItem.trim()) return;
    
    try {
      if (view === VIEWS.LIST && currentList) {
        // Check for duplicates case-insensitively
        const isDuplicate = items.some(item => 
          item.name.toLowerCase() === newItem.trim().toLowerCase()
        );
        
        if (isDuplicate) {
          setNotification({
            message: "This item is already in your list",
            type: "warning"
          });
          return;
        }
        
        await addItem(newItem);
        await addToMasterList(newItem);
      } else if (view === VIEWS.MASTER) {
        // Check for duplicates in master list
        const isDuplicate = masterList.items.some(item => 
          item.name.toLowerCase() === newItem.trim().toLowerCase()
        );
        
        if (isDuplicate) {
          setNotification({
            message: "This item is already in your master list",
            type: "warning"
          });
          return;
        }
        
        await addToMasterList(newItem);
      }
      setNewItem('');
    } catch {
      setNotification({
        message: "Failed to add item",
        type: "error"
      });
    }
  };

  // Handle adding selected items to current list
  const handleAddSelectedToList = async () => {
    if (!currentList) return;

    try {
      const selectedMasterItems = masterList.items.filter(item => item.completed);
      
      if (selectedMasterItems.length === 0) {
        setNotification({
          message: "No items selected to add",
          type: "warning"
        });
        return;
      }
      
      // Track duplicates and added items
      const duplicates = [];
      const addedItems = [];
      
      for (const item of selectedMasterItems) {
        // Check for duplicates case-insensitively
        const isDuplicate = items.some(existingItem => 
          existingItem.name.toLowerCase() === item.name.toLowerCase()
        );
        
        if (isDuplicate) {
          duplicates.push(item.name);
        } else {
          await addItem(item.name);
          addedItems.push(item.name);
        }
      }
      
      // Create appropriate notification message
      if (addedItems.length > 0) {
        let message = `${addedItems.length} item(s) added to ${currentList.name}`;
        if (duplicates.length > 0) {
          message += `. ${duplicates.length} item(s) skipped (already in list)`;
        }
        setNotification({
          message,
          type: "success"
        });
      } else if (duplicates.length > 0) {
        setNotification({
          message: "All selected items are already in your list",
          type: "warning"
        });
      }
      
      // Uncheck the items after attempting to add them
      for (const item of selectedMasterItems) {
        await toggleMasterItem(item.id, false);
      }
      
      await fetchItems(currentList.id);
    } catch {
      setNotification({
        message: "Failed to add items to list",
        type: "error"
      });
    }
  };

  // Handle deleting selected items
  const handleDeleteSelected = async () => {
    if (view === VIEWS.LIST && currentList) {
      const selectedItems = items.filter(item => item.completed);
      if (selectedItems.length === 0) {
        setNotification({
          message: "No items selected to delete",
          type: "warning"
        });
        return;
      }
      
      try {
        for (const item of selectedItems) {
          await deleteItem(item.id);
        }
        setNotification({
          message: `${selectedItems.length} item(s) deleted`,
          type: "success"
        });
      } catch {
        setNotification({
          message: "Failed to delete items",
          type: "error"
        });
      }
    } else if (view === VIEWS.MASTER) {
      const selectedItems = masterList.items.filter(item => item.completed);
      if (selectedItems.length === 0) {
        setNotification({
          message: "No items selected to delete",
          type: "warning"
        });
        return;
      }
      
      try {
        for (const item of selectedItems) {
          await deleteMasterItem(item.id);
        }
        setNotification({
          message: `${selectedItems.length} item(s) deleted from master list`,
          type: "success"
        });
      } catch {
        setNotification({
          message: "Failed to delete items",
          type: "error"
        });
      }
    }
  };

  // Handle sharing a list
  const handleShareList = async (email) => {
    if (!currentList) return;
    
    try {
      const result = await shareListWithUser(currentList.id, email);
      
      if (result) {
        setNotification({
          message: `List shared with ${email}`,
          type: "success"
        });
        
        // Refresh the lists to update the UI
        await fetchGroceryLists();
      }
    } catch {
      setNotification({
        message: "Failed to share list",
        type: "error"
      });
    }
  };

  // Handle accepting a shared list
  const handleAcceptShare = async (shareId) => {
    try {
      const result = await acceptShare(shareId);
      
      if (result) {
        setNotification({
          message: "Shared list accepted",
          type: "success"
        });
      }
    } catch {
      setNotification({
        message: "Failed to accept shared list",
        type: "error"
      });
    }
  };

  // Handle rejecting a shared list
  const handleRejectShare = async (shareId) => {
    try {
      const result = await rejectShare(shareId);
      
      if (result) {
        setNotification({
          message: "Shared list declined",
          type: "success"
        });
      }
    } catch {
      setNotification({
        message: "Failed to decline shared list",
        type: "error"
      });
    }
  };

  const handleDeleteTag = async (tag) => {
    try {
      await api.deleteTag(tag.text);
      setAllTags(prev => prev.filter(t => t.text !== tag.text));
      setNotification({
        message: `Tag "${tag.text}" deleted`,
        type: "success"
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      setNotification({
        message: "Failed to delete tag",
        type: "error"
      });
    }
  };

  // Handle item update
  const handleUpdateItem = async (itemId, updates) => {
    try {
      // Update allTags with any new tags
      if (updates.tags) {
        setAllTags(prev => {
          const newTags = updates.tags.filter(newTag => 
            !prev.some(existingTag => existingTag.text === newTag.text)
          );
          return [...prev, ...newTags];
        });
      }

      await updateItem(itemId, updates);
      setEditingItem(null);
    } catch {
      setNotification({
        message: "Failed to update item",
        type: "error"
      });
    }
  };

  // Menu items for the dropdown menu
  const menuItems = [
    { 
      label: "Lists View",
      action: () => setView(VIEWS.LISTS),
      show: view !== VIEWS.LISTS
    },
    { 
      label: "Master List",
      action: () => {
        fetchMasterList();
        setView(VIEWS.MASTER);
      },
      show: view !== VIEWS.MASTER
    },
    { 
      label: currentList ? `View ${currentList.name}` : "Current List",
      action: () => {
        if (currentList) {
          fetchItems(currentList.id);
          setView(VIEWS.LIST);
        }
      },
      show: view !== VIEWS.LIST && currentList !== null
    },
    { 
      label: "Share Current List", 
      action: () => setShowShareModal(true),
      show: view === VIEWS.LIST && currentList !== null && !currentList.is_shared
    },
    { 
      label: "Add Selected to Current List", 
      action: handleAddSelectedToList,
      show: view === VIEWS.MASTER && currentList !== null 
    },
    {
      label: "Delete Selected Items",
      action: handleDeleteSelected,
      show: (view === VIEWS.LIST && items?.some(item => item.completed)) || 
            (view === VIEWS.MASTER && masterList?.items?.some(item => item.completed))
    }
  ];

  // Sort items in alphabetical order
  const sortedItems = items ? [...items].sort((a, b) => a.name.localeCompare(b.name)) : [];
  const sortedMasterItems = masterList && masterList.items ? [...masterList.items].sort((a, b) => a.name.localeCompare(b.name)) : [];

  // Render function
  return (
    <div className="pr-6 md:pr-0 max-w-[calc(100%-24px)] md:max-w-full mx-auto">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 flex flex-col h-full min-w-0">
        {/* Show pending shares notification if there are any */}
        {showPendingShares && pendingShares.length > 0 && (
          <PendingSharesNotification
            pendingShares={pendingShares}
            onAccept={handleAcceptShare}
            onReject={handleRejectShare}
            onClose={() => setShowPendingShares(false)}
          />
        )}
        
        <ListRow
          leftElement={
            ((view === VIEWS.LIST && items?.length > 0) ||
             (view === VIEWS.MASTER && masterList?.items?.length > 0)) ? (
              <input
                type="checkbox"
                checked={
                  view === VIEWS.LIST 
                    ? items.every(item => item.completed)
                    : view === VIEWS.MASTER 
                      ? masterList.items.every(item => item.completed)
                      : false
                }
                onChange={(e) => 
                  view === VIEWS.LIST
                    ? toggleAllItems(e.target.checked)
                    : toggleAllMasterItems(e.target.checked)
                }
                className="h-6 w-6 text-primary border-gray-300 rounded focus:ring-primary"
              />
            ) : null
          }
          text={
            <h1 className="text-2xl font-bold text-secondary-dm">
              {view === VIEWS.LIST && currentList ? (
                <div className="flex items-center">
                  <span className="truncate max-w-52 sm:max-w-none">{currentList.name}</span>
                  {currentList.is_shared && (
                    <span className="ml-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full whitespace-nowrap">
                      <span className="hidden sm:inline">{currentList.shared_with_email}</span>
                      <span className="sm:hidden">Shared</span>
                    </span>
                  )}
                </div>
              ) : 
               view === VIEWS.MASTER ? 'Master List' : 'My Grocery Lists'}
            </h1>
          }
          rightElements={
            <div className="relative" ref={dropdownRef}>
              <ActionButton
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                onClick={() => setMenuOpen(!menuOpen)}
                iconColor="text-blue-500"
              />
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-dark-background ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {menuItems
                      .filter(item => item.show)
                      .map((item, index) => (
                    <button 
                          key={index}
                      onClick={() => {
                            item.action();
                        setMenuOpen(false);
                      }}
                          className="w-full text-left px-4 py-2 text-sm text-secondary-dm hover:bg-gray-100 dark:hover:bg-gray-800/40"
                          role="menuitem"
                    >
                          {item.label}
                    </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          }
        />
      
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Lists View */}
          {view === VIEWS.LISTS && (
            <div>
              {listsLoading || sharingLoading ? (
                <LoadingSpinner />
              ) : combinedLists.length > 0 ? (
                combinedLists.map(list => (
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
                          {(() => {
                            const itemCount = Array.isArray(list.items) ? list.items.length : 0;
                            return `${itemCount} items`;
                          })()}
                        </span>
                        <span className="ml-2 text-xs sm:hidden inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-secondary-dm">
                          {Array.isArray(list.items) ? list.items.length : 0}
                        </span>
                      </div>
                    }
                    rightElements={
                      <>
                        {!list.is_received_share && (
                          <>
                            <ActionButton 
                              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingList(list);
                              }}
                            />
                            {!list.is_shared && (
                              <ActionButton 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentList(list);
                                  setShowShareModal(true);
                                }}
                                iconColor="text-blue-500"
                              />
                            )}
                            <ActionButton 
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
                        )}
                      </>
                    }
                    onClick={() => selectList(list)}
                  />
                ))
              ) : (
                <div className="py-6 text-center text-secondary-dm">
                  You don&apos;t have any grocery lists yet. Create your first list below.
                </div>
              )}
                
              <form onSubmit={handleCreateList}>
                <ListRow
                  hover={false}
                  leftElement={<div className="h-6 w-6" />}
                  text={
                    <input
                      type="text"
                      placeholder="New list name..."
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      style={{ fontFamily: 'inherit' }}
                      className="w-full py-2 bg-transparent text-lg font-light font-sans text-secondary-dm placeholder:text-secondary-dm/30 border-b border-transparent focus:border-primary focus:outline-none transition-colors"
                    />
                  }
                  rightElements={
                    <ActionButton
                      icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
                      onClick={handleCreateList}
                      iconColor="text-green-500"
                    />
                  }
                />
              </form>
            </div>
          )}

          {/* List/Master View */}
          {(view === VIEWS.LIST || view === VIEWS.MASTER) && (
            <div>
              {itemsLoading || masterLoading ? (
                <LoadingSpinner />
              ) : view === VIEWS.LIST ? (
                sortedItems.length > 0 ? (
                  sortedItems.map(item => (
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
                        <div className="relative w-full flex items-center gap-2">
                          <div className="flex-none whitespace-nowrap">
                            <span className={item.completed ? 'text-lg text-secondary-dm line-through' : 'text-lg text-secondary-dm'}>
                              {item.name}
                            </span>
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex-1 min-w-0">
                              <SmartTruncatedTags tags={item.tags} />
                            </div>
                          )}
                        </div>
                      }
                      rightElements={
                        <>
                          <ActionButton 
                            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                            onClick={() => setEditingItem(item)}
                          />
                          <ActionButton 
                            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                            onClick={() => deleteItem(item.id)}
                            color="accent"
                            iconColor="text-red-500"
                          />
                        </>
                      }
                    />
                  ))
                ) : (
                  <div className="py-4 px-4 text-center text-xl text-secondary-dm">
                    No items in this list yet. Add your first item below.
                  </div>
                )
              ) : (
                sortedMasterItems.length > 0 ? (
                  sortedMasterItems.map(item => (
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
                        <span className={item.completed ? 'text-lg text-secondary-dm line-through truncate block max-w-64 sm:max-w-none' : 'text-lg text-secondary-dm truncate block max-w-64 sm:max-w-none'}>
                          {item.name}
                        </span>
                      }
                      rightElements={
                        <ActionButton 
                          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                          onClick={() => deleteMasterItem(item.id)}
                          color="accent"
                          iconColor="text-red-500"
                        />
                      }
                    />
                  ))
                ) : (
                  <div className="py-4 px-4 text-center text-xl text-secondary-dm">
                    Your master list is empty. Items you add to any list will appear here.
                  </div>
                )
              )}
              
              <form onSubmit={handleAddItem}>
                <ListRow
                  hover={false}
                  leftElement={<div className="h-6 w-6" />}
                  text={
                    <input
                      ref={newItemInputRef}
                      type="text"
                      placeholder="Add new item..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      style={{ fontFamily: 'inherit' }}
                      className="w-full py-2 bg-transparent text-lg font-light font-sans text-secondary-dm placeholder:text-secondary-dm/30 border-b border-transparent focus:border-primary focus:outline-none transition-colors"
                    />
                  }
                  rightElements={
                    <ActionButton
                      icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
                      onClick={handleAddItem}
                      iconColor="text-green-500"
                    />
                  }
                />
              </form>
            </div>
          )}
        </div>
      </div>
      
      <ListEditingModal
        isOpen={!!editingList}
        listName={editingList?.name || ''}
        onSave={() => {
          if (editingList) {
            updateListName(editingList.id, newListName);
            setEditingList(null);
          }
        }}
        onCancel={() => setEditingList(null)}
        onChange={setNewListName}
      />

      <ListSelectionModal
        isOpen={showListSelection}
        lists={groceryLists}
        onSelect={(listId) => {
          const targetList = groceryLists.find(l => l.id === listId);
          if (targetList) {
            selectList(targetList);
          }
          setShowListSelection(false);
        }}
        onCancel={() => setShowListSelection(false)}
      />

      <ShareListModal
        isOpen={showShareModal}
        listName={currentList?.name || ''}
        isShared={currentList?.is_shared || false}
        onClose={() => setShowShareModal(false)}
        onShare={handleShareList}
      />

      <ItemEditingModal
        isOpen={!!editingItem}
        itemName={editingItem?.name || ''}
        tags={editingItem?.tags || [editingItem?.tag].filter(Boolean) || []}
        allTags={allTags}
        onSave={(updates) => handleUpdateItem(editingItem.id, updates)}
        onCancel={() => setEditingItem(null)}
        onDeleteTag={handleDeleteTag}
      />
    </div>
  );
} 