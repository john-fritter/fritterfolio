import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';

// Import validation utils
import { validateItemName, validateTagName, validateListName } from '../../utils/validation';

// Import hooks
import { useAuth } from '../auth';
import { useGroceryLists } from './useGroceryLists';
import { useGroceryItems } from './useGroceryItems';
import { useMasterList } from './useMasterList';
import { useListSharing } from './useListSharing';
import { useGroceryInitialization, VIEWS } from './useGroceryInitialization';

export function useGroceryController() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const newItemInputRef = useRef(null);

  // Local state
  const [view, setView] = useState(() => {
    const savedView = localStorage.getItem('groceryView');
    return savedView || VIEWS.LISTS;
  });
  const [notification, setNotification] = useState(null);
  const [editingList, setEditingList] = useState(null);
  const [editingListName, setEditingListName] = useState('');
  const [showListSelection, setShowListSelection] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPendingShares, setShowPendingShares] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [currentTagFilter, setCurrentTagFilter] = useState(null);
  const [showTagFilterModal, setShowTagFilterModal] = useState(false);

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
    toggleAllMasterItems,
    updateMasterItem
  } = useMasterList(user);

  const {
    pendingShares,
    acceptedShares,
    sharingLoading,
    shareList: shareListWithUser,
    acceptShare,
    rejectShare,
    fetchAcceptedShares,
    syncNotification,
    clearSyncNotification
  } = useListSharing(user);

  // Use our initialization hook
  const {
    isInitializing,
    setIsInitializing,
    initialView,
    setInitialView,
    masterListFetchedRef,
    listViewItemsFetchedRef  
  } = useGroceryInitialization({
    user,
    authLoading,
    fetchGroceryLists,
    fetchAcceptedShares,
    fetchMasterList,
    fetchItems,
    setCurrentList,
    setView,
    currentList,
    view,
    pendingShares
  });

  // First effect: Handle authentication redirect
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store the current path before redirecting
      sessionStorage.setItem('loginRedirect', window.location.pathname);
      
      // Prevent initialization from running
      setIsInitializing(false);
      setInitialView(null);
      
      // Navigate to login
      navigate('/login');
    }
  }, [user, authLoading, navigate, setIsInitializing, setInitialView]);

  // Save view to localStorage
  useEffect(() => {
    if (isInitializing) return;
    
    localStorage.setItem('groceryView', view);
    
    if (view === VIEWS.MASTER) {
      listViewItemsFetchedRef.current = false;
    } else if (view === VIEWS.LIST) {
      masterListFetchedRef.current = false;
    } else if (view === VIEWS.LISTS) {
      masterListFetchedRef.current = false;
      listViewItemsFetchedRef.current = false;
    }
    
    if (view === VIEWS.LIST && !currentList && !isInitializing) {
      setView(VIEWS.LISTS);
    }
  }, [view, currentList, setView, isInitializing, masterListFetchedRef, listViewItemsFetchedRef]);

  // Save current list ID to localStorage
  useEffect(() => {
    if (isInitializing) return;
    
    if (currentList?.id) {
      localStorage.setItem('currentListId', currentList.id.toString());
    } else if (currentList === null) {
      localStorage.removeItem('currentListId');
    }
  }, [currentList, isInitializing]);

  // Effect to set editing name when list is selected for editing
  useEffect(() => {
    if (editingList) {
      setEditingListName(editingList.name);
    }
  }, [editingList]);

  // Add effect to fetch available tags
  useEffect(() => {
    if (!user || authLoading) return;
    
    const fetchAvailableTags = async () => {
      try {
        const tags = await api.getTags();
        setAllTags(tags);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    
    fetchAvailableTags();
  }, [user, authLoading, view, currentList?.id]);

  // Keep new item input focused
  useEffect(() => {
    if (newItemInputRef.current && document.activeElement !== newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [newItem]);

  // Combine accepted shares with grocery lists
  const combinedLists = useMemo(() => {
    const sharedListsFormatted = acceptedShares.map(share => ({
      id: share.list_id,
      name: share.list_name,
      is_shared: true,
      shared_with_email: share.owner_email,
      items: share.items || [],
      is_received_share: true,
      has_pending_share: false
    }));

    const ownListsFormatted = groceryLists.map(list => {
      const hasPendingShare = list.has_pending_share;
      
      return {
        ...list,
        is_received_share: false,
        has_pending_share: hasPendingShare,
        is_shared: list.is_shared || hasPendingShare,
        items: Array.isArray(list.items) ? list.items : []
      };
    });

    return [...ownListsFormatted, ...sharedListsFormatted];
  }, [groceryLists, acceptedShares]);

  // Derived state for loading conditions
  const determineLoadingState = useCallback(() => {
    if (isInitializing) {
      return true;
    }
    
    if (view === VIEWS.LISTS) {
      return (listsLoading && groceryLists.length === 0) || 
             (sharingLoading && acceptedShares.length === 0);
    }
    
    if (view === VIEWS.LIST) {
      return itemsLoading;
    }
    
    return masterLoading && (!masterList || !masterList.items || masterList.items.length === 0);
  }, [isInitializing, view, listsLoading, groceryLists.length, sharingLoading, acceptedShares.length, itemsLoading, masterLoading, masterList]);

  // Handler functions
  const selectList = useCallback((list) => {
    if (!list || !list.id) {
      console.error('Cannot select list: Invalid list data received', list);
      return;
    }

    if (typeof list.id === 'string' && list.id.startsWith('temp-')) {
      console.error('Cannot select list: List has a temporary ID', list);
      setNotification({
        message: "This list is still being created. Please wait a moment and try again.",
        type: "warning"
      });
      return;
    }
    
    try {
      masterListFetchedRef.current = false;
      listViewItemsFetchedRef.current = true;
      
      setIsInitializing(true);
      setInitialView(VIEWS.LIST);
      
      fetchItems(list.id, true)
        .then(() => {
          localStorage.setItem('currentListId', list.id.toString());
          localStorage.setItem('groceryView', VIEWS.LIST);
          
          setCurrentList({
            ...list,
            has_pending_share: list.has_pending_share,
            is_shared: list.is_shared || list.has_pending_share
          });
          setView(VIEWS.LIST);
          
          setIsInitializing(false);
          setInitialView(null);
        })
        .catch((error) => {
          console.error('Error fetching items:', error);
          setNotification({
            message: "Failed to load list items. Please try again.",
            type: "error"
          });
          
          localStorage.setItem('currentListId', list.id.toString());
          localStorage.setItem('groceryView', VIEWS.LIST);
          
          setCurrentList({
            ...list,
            has_pending_share: list.has_pending_share,
            is_shared: list.is_shared || list.has_pending_share
          });
          setView(VIEWS.LIST);
          
          setIsInitializing(false);
          setInitialView(null);
        });
    } catch (error) {
      console.error('Error during list selection:', error);
      setNotification({
        message: "An unexpected error occurred. Please try again.",
        type: "error"
      });
      setIsInitializing(false);
      setInitialView(null);
    }
  }, [setView, setCurrentList, fetchItems, setIsInitializing, setInitialView, masterListFetchedRef, listViewItemsFetchedRef]);

  const handleCreateList = async (e) => {
    e?.preventDefault();
    if (!newListName.trim()) return;
    
    const validation = validateListName(newListName);
    if (!validation.isValid) {
      setNotification({
        message: validation.error,
        type: "error"
      });
      return;
    }

    try {
      setIsInitializing(true);
      setInitialView(VIEWS.LIST);
      
      const newList = await createList(newListName);
      setNewListName('');
      
      localStorage.setItem('currentListId', newList.id.toString());
      localStorage.setItem('groceryView', VIEWS.LIST);
      
      setView(VIEWS.LIST);
      
      setIsInitializing(false);
      setInitialView(null);
    } catch (error) {
      console.error('Error creating list:', error);
      setNotification({
        message: "Failed to create list",
        type: "error"
      });
      setIsInitializing(false);
      setInitialView(null);
    }
  };

  const handleShareList = async (email) => {
    if (!currentList) return false;
    
    try {
      await shareListWithUser(currentList.id, email);
      
      setNotification({
        message: `Share invitation sent to ${email}`,
        type: "success"
      });
      
      const updatedLists = await fetchGroceryLists(true);
      
      const updatedList = updatedLists.find(list => list.id === currentList.id);
      if (updatedList) {
        setCurrentList({
          ...updatedList,
          has_pending_share: true,
          is_shared: true
        });
      }
      
      return true;
    } catch (error) {
      setNotification({
        message: error.message || "Failed to share list",
        type: "error"
      });
      throw error;
    }
  };

  const handleAcceptShare = async (shareId) => {
    try {
      const acceptedShares = await acceptShare(shareId);
      
      if (acceptedShares) {
        await fetchGroceryLists(true);
        
        setNotification({
          message: "Shared list accepted",
          type: "success"
        });
        
        if (!currentList && acceptedShares.length > 0) {
          const mostRecentShare = acceptedShares[0];
          const newListData = {
            id: mostRecentShare.list_id,
            name: mostRecentShare.list_name,
            is_shared: true,
            shared_with_email: mostRecentShare.owner_email,
            is_received_share: true,
            items: mostRecentShare.items || []
          };
          setCurrentList(newListData);
          setView(VIEWS.LIST);
        }
      }
    } catch {
      setNotification({
        message: "Failed to accept shared list",
        type: "error"
      });
    }
  };

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

  const handleUpdateItem = async (itemId, updates) => {
    try {
      console.log("Starting handleUpdateItem with:", { itemId, updates });
      
      if (updates.name) {
        const validation = validateItemName(updates.name);
        if (!validation.isValid) {
          setNotification({
            message: validation.error,
            type: "error"
          });
          return;
        }
      }

      if (updates.tags) {
        for (const tag of updates.tags) {
          const validation = validateTagName(tag.text);
          if (!validation.isValid) {
            setNotification({
              message: validation.error,
              type: "error"
            });
            return;
          }
        }

        setAllTags(prev => {
          const newTags = updates.tags.filter(newTag => 
            !prev.some(existingTag => existingTag.text === newTag.text)
          );
          return [...prev, ...newTags];
        });
      }

      // Close the modal immediately
      setEditingItem(null);

      if (view === VIEWS.MASTER) {
        console.log("Updating master item:", itemId);
        await updateMasterItem(itemId, updates);
      } else {
        console.log("Updating regular item:", itemId);
        const updatedItem = await updateItem(itemId, updates);
        console.log("Regular item updated successfully:", updatedItem);

        // First check if the item has a master_item_id
        if (updatedItem.master_item_id) {
          console.log("Item has master_item_id:", updatedItem.master_item_id);
          
          // Try to update the master item directly
          try {
            await updateMasterItem(updatedItem.master_item_id, updates);
          } catch (error) {
            console.error("Error updating master item:", error);
            // If the master item update fails, try to refresh the master list and try again
            await fetchMasterList();
            await updateMasterItem(updatedItem.master_item_id, updates);
          }
        } else {
          // Find the corresponding master item by name (case-insensitive)
          const masterItem = masterList?.items?.find(item => 
            item.name.toLowerCase() === updatedItem.name.toLowerCase()
          );

          if (masterItem) {
            console.log("Found master item by name:", masterItem);
            await updateMasterItem(masterItem.id, updates);
          } else {
            console.log("Adding item to master list:", updatedItem.name);
            await addToMasterList(updatedItem.name, updatedItem.tags);
          }
        }

        // Refresh the items to ensure we have the latest data
        if (currentList?.id) {
          console.log("Refreshing items for list:", currentList.id);
          await fetchItems(currentList.id, true);
        }
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setNotification({
        message: error.message || "Failed to update item",
        type: "error"
      });
    }
  };

  const handleDeleteList = useCallback((listId) => {
    if (window.confirm('Are you sure you want to delete this list?')) {
      deleteList(listId)
        .then(() => {
          fetchGroceryLists(true)
            .then(() => {
              setNotification({
                message: "List deleted successfully",
                type: "success"
              });
            });
        })
        .catch(() => {
          setNotification({
            message: "Failed to delete the list. Please try again.",
            type: "error"
          });
        });
    }
  }, [deleteList, fetchGroceryLists]);

  const handleShareListFromListsView = useCallback((listId) => {
    const listToShare = groceryLists.find(list => list.id === listId);
    
    if (listToShare && !listToShare.is_shared && !listToShare.has_pending_share) {
      setCurrentList(listToShare);
      setShowShareModal(true);
    } else if (listToShare && listToShare.is_shared) {
      setNotification({
        message: "This list is already shared",
        type: "info"
      });
    } else if (listToShare && listToShare.has_pending_share) {
      setNotification({
        message: "This list has a pending share invitation",
        type: "info"
      });
    }
  }, [groceryLists, setCurrentList]);

  const handleAddNewItem = useCallback(async () => {
    if (!newItem.trim()) return;

    const validation = validateItemName(newItem);
    if (!validation.isValid) {
      setNotification({
        message: validation.error,
        type: "error"
      });
      return;
    }
    
    const itemToAdd = newItem.trim();
    setNewItem('');
    
    try {
      const normalizedName = itemToAdd.toLowerCase();
      const existsInMasterList = masterList?.items?.some(item => 
        item.name.toLowerCase().trim() === normalizedName
      ) || false;
      
      await addItem(itemToAdd, existsInMasterList ? null : addToMasterList);
    } catch (error) {
      setNotification({
        message: error.message || "Failed to add item",
        type: "error"
      });
      setNewItem(itemToAdd);
    }
  }, [newItem, setNewItem, addItem, addToMasterList, masterList, setNotification]);

  const handleUpdateListName = async (listId, newName) => {
    try {
      await updateListName(listId, newName);
      await fetchAcceptedShares();
      setNotification({
        message: "List name updated successfully",
        type: "success"
      });
    } catch {
      setNotification({
        message: "Failed to update list name",
        type: "error"
      });
    }
  };

  const getMenuItems = useCallback(() => {
    if (isInitializing) {
      return [];
    }
    
    const baseItems = [
      { 
        label: "All Lists",
        action: () => setView(VIEWS.LISTS),
        show: view !== VIEWS.LISTS
      },
      { 
        label: "Master List",
        action: () => {
          setIsInitializing(true);
          
          masterListFetchedRef.current = true;
          
          fetchMasterList()
            .then(() => {
              setView(VIEWS.MASTER);
              setIsInitializing(false);
            })
            .catch(() => {
              console.error('Error fetching master list');
              masterListFetchedRef.current = false;
              setIsInitializing(false);
            });
        },
        show: view !== VIEWS.MASTER
      },
      { 
        label: currentList ? `View ${currentList.name}` : "Current List",
        action: () => {
          if (currentList) {
            setIsInitializing(true);
            
            listViewItemsFetchedRef.current = true;
            
            fetchItems(currentList.id, true)
              .then(() => {
                setView(VIEWS.LIST);
                setIsInitializing(false);
              })
              .catch(() => {
                listViewItemsFetchedRef.current = false;
                setIsInitializing(false);
              });
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
        show: view === VIEWS.LIST && currentList !== null && !currentList.is_shared && !currentList.has_pending_share
      }
    ];

    const masterViewItems = [
      { 
        label: "Filter by Tag",
        action: () => setShowTagFilterModal(true),
        show: view === VIEWS.MASTER && masterList?.items?.some(item => item.tags?.length > 0)
      },
      { 
        label: "Add Selected to Current List", 
        action: () => {
          if (!currentList) return;
          if (!masterList?.items) return;
          
          const selectedMasterItems = masterList.items.filter(item => item.completed);
          
          if (selectedMasterItems.length === 0) {
            setNotification({
              message: "No items selected to add",
              type: "warning"
            });
            return;
          }
          
          let addedItems = 0;
          let duplicateItems = 0;
          let errorItems = 0;
          let atLeastOneProcessed = false;
          
          Promise.all(selectedMasterItems.map(async (item) => {
            try {
              const isDuplicate = items.some(existingItem => 
                existingItem.name.toLowerCase() === item.name.toLowerCase()
              );
              
              if (isDuplicate) {
                duplicateItems++;
                atLeastOneProcessed = true;
                return { status: 'duplicate', item };
              }
              
              await addItem(item.name);
              addedItems++;
              atLeastOneProcessed = true;
              
              await addToMasterList(item.name);
              await toggleMasterItem(item.id, false);
              
              return { status: 'success', item };
            } catch (error) {
              if (error.message === 'This item is already in your list') {
                duplicateItems++;
              } else {
                console.error("Error adding item:", error);
                errorItems++;
              }
              return { status: 'error', item, error };
            }
          }))
          .then(() => {
            if (addedItems === 0 && errorItems === 0) {
              setNotification({
                message: `No new items added. All ${duplicateItems} selected items already exist in ${currentList.name}`,
                type: "warning"
              });
            } else if (addedItems > 0 && errorItems === 0) {
              setNotification({
                message: `${addedItems} item(s) added to ${currentList.name}${duplicateItems > 0 ? ` (${duplicateItems} duplicate(s) skipped)` : ''}`,
                type: "success"
              });
            } else if (errorItems > 0) {
              setNotification({
                message: `${addedItems > 0 ? `${addedItems} item(s) added, but ` : ''}${errorItems} item(s) failed to add due to a server error${duplicateItems > 0 ? ` (${duplicateItems} duplicate(s) skipped)` : ''}`,
                type: "error"
              });
            }
            
            if (atLeastOneProcessed) {
              fetchItems(currentList.id);
            }
          })
          .catch(error => {
            console.error("Fatal error in batch processing:", error);
            setNotification({
              message: "An unexpected error occurred. Please try again.",
              type: "error"
            });
          });
        },
        show: view === VIEWS.MASTER && currentList !== null && masterList?.items?.some(item => item.completed)
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
        ))
        .then(() => {
          setNotification({
            message: `${selectedItems.length} item(s) deleted`,
            type: "success"
          });
        })
        .catch(error => {
          console.error("Error deleting items:", error);
          setNotification({
            message: `Error deleting items: ${error.message}`,
            type: "error"
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
  }, [
    isInitializing, view, currentList, items, masterList?.items,
    setView, setIsInitializing, masterListFetchedRef,
    fetchMasterList, listViewItemsFetchedRef, fetchItems,
    setShowTagFilterModal, setShowShareModal, setNotification,
    addItem, addToMasterList, toggleMasterItem, deleteItem,
    deleteMasterItem
  ]);

  return {
    // Refs
    newItemInputRef,
    
    // State
    view,
    notification,
    editingList,
    editingListName,
    showListSelection,
    showShareModal,
    showPendingShares,
    editingItem,
    allTags,
    currentTagFilter,
    showTagFilterModal,
    newListName,
    newItem,
    
    // Data
    items,
    masterList,
    currentList,
    combinedLists,
    pendingShares,
    syncNotification,
    
    // State setters
    setView,
    setNotification,
    setEditingList,
    setEditingListName,
    setShowListSelection,
    setShowShareModal,
    setShowPendingShares,
    setEditingItem,
    setCurrentTagFilter,
    setShowTagFilterModal,
    setNewListName,
    setNewItem,
    
    // Computed values
    determineLoadingState,
    getMenuItems,
    
    // Handlers
    selectList,
    handleCreateList,
    handleShareList,
    handleAcceptShare,
    handleRejectShare,
    handleDeleteTag,
    handleUpdateItem,
    handleDeleteList,
    handleShareListFromListsView,
    handleAddNewItem,
    handleUpdateListName,
    
    // Actions from other hooks
    toggleItem,
    toggleAllItems,
    deleteItem,
    toggleMasterItem,
    toggleAllMasterItems,
    deleteMasterItem,
    clearSyncNotification,
    
    // Initialization state
    isInitializing,
    initialView
  };
}