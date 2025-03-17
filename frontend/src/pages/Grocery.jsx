import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/auth';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';

// Import components
import Notification from '../components/grocery/Notification';
import ListRow from '../components/grocery/ListRow';
import ActionButton from '../components/grocery/ActionButton';
import ListEditingModal from '../components/grocery/ListEditingModal';
import ListSelectionModal from '../components/grocery/ListSelectionModal';
import ShareListModal from '../components/grocery/ShareListModal';
import PendingSharesNotification from '../components/grocery/PendingSharesNotification';
import ItemEditingModal from '../components/grocery/ItemEditingModal';
import TagFilterModal from '../components/grocery/TagFilterModal';
import GroceryView from '../components/grocery/GroceryView';

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
    const savedView = localStorage.getItem('groceryView');
    return savedView || VIEWS.LISTS;
  });
  const [notification, setNotification] = useState(null);
  const [editingList, setEditingList] = useState(null);
  const [showListSelection, setShowListSelection] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPendingShares, setShowPendingShares] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [currentTagFilter, setCurrentTagFilter] = useState(null);
  const [showTagFilterModal, setShowTagFilterModal] = useState(false);

  // First effect: Handle authentication redirect
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      sessionStorage.setItem('loginRedirect', window.location.pathname);
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Second effect: Fetch basic data (lists and shares)
  useEffect(() => {
    if (!user || authLoading) return;
    
    const loadInitialData = async () => {
      // Set initial view from localStorage
      const savedView = localStorage.getItem('groceryView') || VIEWS.LISTS;
      setView(savedView);
      
      // Start fetches in parallel for better performance
      const listsPromise = fetchGroceryLists();
      const sharesPromise = fetchAcceptedShares();
      const tagsPromise = api.getTags().catch(error => {
        console.error('Error fetching tags:', error);
        return [];
      });
      
      // Add master list fetch if needed
      const fetchPromises = [listsPromise, sharesPromise, tagsPromise];
      if (savedView === VIEWS.MASTER) {
        fetchPromises.push(fetchMasterList());
      }
      
      // Wait for all fetches to complete
      const [lists, , tags] = await Promise.all(fetchPromises);
      
      // Set tags
      setAllTags(tags);
      
      // Handle list selection if in list view
      if (savedView === VIEWS.LIST && lists.length > 0) {
        const savedListId = localStorage.getItem('currentListId');
        if (savedListId) {
          const savedList = lists.find(list => list.id === parseInt(savedListId));
          if (savedList) {
            setCurrentList(savedList);
          } else {
            setCurrentList(lists[0]);
          }
        } else {
          setCurrentList(lists[0]);
        }
      }
    };
    
    loadInitialData();
  }, [user, authLoading, fetchGroceryLists, fetchAcceptedShares, fetchMasterList, setCurrentList]);

  // Third effect: Load view-specific data
  useEffect(() => {
    if (!user || authLoading) return;

    if (view === VIEWS.MASTER) {
      fetchMasterList();
    }
  }, [user, authLoading, view, fetchMasterList]);

  // Save view to localStorage
  useEffect(() => {
    localStorage.setItem('groceryView', view);
  }, [view]);

  // Save current list ID to localStorage
  useEffect(() => {
    if (currentList?.id) {
      localStorage.setItem('currentListId', currentList.id.toString());
    } else {
      localStorage.removeItem('currentListId');
    }
  }, [currentList?.id]);

  // Keep new item input focused
  useEffect(() => {
    if (newItemInputRef.current && document.activeElement !== newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [newItem]);

  // Derived state for loading conditions
  const determineLoadingState = useCallback(() => {
    // For lists view, only show loading on initial fetch with no data
    if (view === VIEWS.LISTS) {
      return (listsLoading && groceryLists.length === 0) || 
             (sharingLoading && acceptedShares.length === 0);
    }
    
    // For list view, only show loading when we have no items
    if (view === VIEWS.LIST) {
      return itemsLoading && items.length === 0;
    }
    
    // For master view, only show loading when we have no items
    return masterLoading && (!masterList || !masterList.items || masterList.items.length === 0);
  }, [
    view, 
    listsLoading, groceryLists.length,
    sharingLoading, acceptedShares.length,
    itemsLoading, items.length,
    masterLoading, masterList
  ]);

  // Combine accepted shares with grocery lists
  const combinedLists = useMemo(() => {
    const sharedListsFormatted = acceptedShares.map(share => ({
      id: share.list_id,
      name: share.list_name,
      is_shared: true,
      shared_with_email: share.owner_email,
      items: share.items || [],
      is_received_share: true
    }));

    return [...groceryLists, ...sharedListsFormatted];
  }, [groceryLists, acceptedShares]);

  // Handle list selection
  const selectList = useCallback((list) => {
    console.log('Selecting list:', list.name);
    setCurrentList(list);
    setView(VIEWS.LIST);
  }, [setCurrentList]);

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

  // Menu items for each view
  const getMenuItems = useCallback(() => {
    const baseItems = [
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
      }
    ];

    const listViewItems = [
      {
        label: "Filter by Tag",
        action: () => setShowTagFilterModal(true),
        show: view === VIEWS.LIST && items?.some(item => item.tags?.length > 0)
      },
      { 
        label: "Share Current List", 
        action: () => setShowShareModal(true),
        show: view === VIEWS.LIST && currentList !== null && !currentList.is_shared
      }
    ];

    const masterViewItems = [
      { 
        label: "Add Selected to Current List", 
        action: () => {
          if (!currentList) return;
          const selectedMasterItems = masterList.items.filter(item => item.completed);
          
          if (selectedMasterItems.length === 0) {
            setNotification({
              message: "No items selected to add",
              type: "warning"
            });
            return;
          }
          
          Promise.all(selectedMasterItems.map(async (item) => {
            try {
              await addItem(item.name);
              await addToMasterList(item.name);
              await toggleMasterItem(item.id, false);
            } catch (error) {
              console.error("Error adding item:", error);
            }
          })).then(() => {
            setNotification({
              message: `${selectedMasterItems.length} item(s) added to ${currentList.name}`,
              type: "success"
            });
            fetchItems(currentList.id);
          });
        },
        show: view === VIEWS.MASTER && currentList !== null 
      }
    ];

    const deleteSelectedItems = {
      label: "Delete Selected Items",
      action: () => {
        const selectedItems = view === VIEWS.LIST 
          ? items.filter(item => item.completed)
          : masterList?.items?.filter(item => item.completed);

        if (!selectedItems?.length) {
          setNotification({
            message: "No items selected to delete",
            type: "warning"
          });
          return;
        }

        Promise.all(selectedItems.map(item => 
          view === VIEWS.LIST ? deleteItem(item.id) : deleteMasterItem(item.id)
        )).then(() => {
          setNotification({
            message: `${selectedItems.length} item(s) deleted`,
            type: "success"
          });
        });
      },
      show: (view === VIEWS.LIST && items?.some(item => item.completed)) || 
            (view === VIEWS.MASTER && masterList?.items?.some(item => item.completed))
    };

    return [
      ...baseItems,
      ...listViewItems,
      ...masterViewItems,
      deleteSelectedItems
    ];
  }, [view, currentList, items, masterList, fetchMasterList, fetchItems, addItem, addToMasterList, toggleMasterItem, deleteItem, deleteMasterItem]);

  // Create add item form
  const addItemForm = view === VIEWS.LIST && (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (newItem.trim()) {
        addItem(newItem).then(() => {
          addToMasterList(newItem);
          setNewItem('');
        }).catch(error => {
          setNotification({
            message: error.message || "Failed to add item",
            type: "error"
          });
        });
      }
    }}>
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
            title="Add item"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
            onClick={() => {
              if (newItem.trim()) {
                addItem(newItem).then(() => {
                  addToMasterList(newItem);
                  setNewItem('');
                }).catch(error => {
                  setNotification({
                    message: error.message || "Failed to add item",
                    type: "error"
                  });
                });
              }
            }}
            iconColor="text-green-500"
          />
        }
      />
    </form>
  );

  // Create add list form
  const addListForm = view === VIEWS.LISTS && (
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
            title="Add list"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
            onClick={handleCreateList}
            iconColor="text-green-500"
          />
        }
      />
    </form>
  );

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
        
        {/* Main Content */}
        <GroceryView
          view={view}
          // Lists view props
          combinedLists={combinedLists}
          selectList={selectList}
          setEditingList={setEditingList}
          deleteList={deleteList}
          // List view props
          items={items}
          currentList={currentList}
          toggleItem={toggleItem}
          toggleAllItems={toggleAllItems}
          deleteItem={deleteItem}
          setEditingItem={setEditingItem}
          currentTagFilter={currentTagFilter}
          setCurrentTagFilter={setCurrentTagFilter}
          // Master list props
          masterList={masterList}
          toggleMasterItem={toggleMasterItem}
          toggleAllMasterItems={toggleAllMasterItems}
          deleteMasterItem={deleteMasterItem}
          // Common props
          isLoading={determineLoadingState()}
          menuItems={getMenuItems()}
          addForm={
            view === 'lists' ? addListForm :
            view === 'list' ? addItemForm :
            null
          }
        />
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

      <TagFilterModal
        isOpen={showTagFilterModal}
        onClose={() => setShowTagFilterModal(false)}
        tags={items?.flatMap(item => item.tags || []) || []}
        onSelectTag={setCurrentTagFilter}
      />
    </div>
  );
} 