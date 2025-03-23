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

// Constants
const MAX_NAME_LENGTH = 30;

export default function Grocery() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const newItemInputRef = useRef(null);
  
  // Add isInitializing state to track initialization process
  const [isInitializing, setIsInitializing] = useState(true);
  // Add state to track what should be rendered during initialization
  const [initialView, setInitialView] = useState(null);
  // Add refs to prevent infinite fetch loops
  const masterListFetchedRef = useRef(false);
  const listViewItemsFetchedRef = useRef(false);

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
  
  // Ref to track if initial data has been loaded
  const initialLoadRef = useRef(true);

  // Helper function to find a list by ID in both own lists and shared lists
  const findListById = useCallback((listId, ownLists = [], sharedLists = []) => {
    if (!listId) return null;
    
    try {
      const parsedId = parseInt(listId);
      
      // First check own lists
      let targetList = ownLists.find(list => list.id === parsedId);
      
      // Then check shared lists
      if (!targetList && Array.isArray(sharedLists) && sharedLists.length > 0) {
        const sharedMatch = sharedLists.find(share => share.list_id === parsedId);
        if (sharedMatch) {
          targetList = {
            id: sharedMatch.list_id,
            name: sharedMatch.list_name,
            is_shared: true,
            shared_with_email: sharedMatch.owner_email,
            is_received_share: true,
            items: sharedMatch.items || []
          };
        }
      }
      
      return targetList;
    } catch (error) {
      console.error('Error finding list:', error);
      return null;
    }
  }, []);

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
      if (!initialLoadRef.current) return; // Skip if already initialized
      
      // Start initialization - keep the app in loading state
      setIsInitializing(true);      
      // Immediately set initialLoadRef to false to prevent rerunning
      initialLoadRef.current = false;
      
      try {
        // Get saved data from localStorage
        const savedView = localStorage.getItem('groceryView') || VIEWS.LISTS;
        const savedListId = localStorage.getItem('currentListId');
        
        // Set initial view to preserve what we're initializing to
        // This prevents showing lists view during initialization
        setInitialView(savedView);
        
        // Load lists and shares in parallel before trying to restore saved list        
        const [ownLists, sharedLists, tags] = await Promise.all([
          fetchGroceryLists(),
          fetchAcceptedShares(),
          api.getTags().catch(() => [])
        ]);
        
        // Set tags
        setAllTags(tags);
        
        // Define a function to set the correct final state based on saved data
        const finalizeInitialization = (finalView) => {          
          // First set localStorage values to ensure persistence
          // Setting these outside the initialization effect prevents double updates
          localStorage.setItem('groceryView', finalView);
          
          // Safely access currentList.id only if currentList exists
          if (currentList?.id) {
            localStorage.setItem('currentListId', currentList.id.toString());
          }
          
          // Set the view we've determined is correct
          setView(finalView);
          
          // After initialization is complete, reveal the UI
          // This is done last to ensure all other updates have been applied
          setIsInitializing(false);
          setInitialView(null);
        };
        
        // After lists are loaded, try to restore saved list
        if (savedListId && savedView === VIEWS.LIST) {
          
          // Use the helper function to find the list by ID
          const targetList = findListById(savedListId, ownLists, sharedLists);
          
          if (targetList) {
            // Found the saved list - set up list view
            
            // Instead of immediately setting states, first fetch items
            // and THEN batch the state updates to reduce renders
            fetchItems(targetList.id, true)
              .then(() => {
                // Only now set current list and then finalize                
                // Batch our state updates
                // First set the current list
                setCurrentList(targetList);
                
                // Then finalize initialization
                // This avoids the extra render by setting everything at once
                finalizeInitialization(VIEWS.LIST);
              })
              .catch((error) => {
                console.error('Error fetching items:', error);
                setCurrentList(targetList);
                finalizeInitialization(VIEWS.LIST);
              });
          } else {
            // List not found, fall back to lists view            
            if (ownLists.length > 0) {
              setCurrentList(ownLists[0]);
            }
            
            finalizeInitialization(VIEWS.LISTS);
          }
        } else if (savedView === VIEWS.MASTER) {
          // Master view - load master list          
          // Try to restore the saved list if it exists
          const targetList = findListById(savedListId, ownLists, sharedLists);
          
          if (targetList) {
            setCurrentList(targetList);
          } else if (ownLists.length > 0) {
            // Fallback to first list if target not found
            setCurrentList(ownLists[0]);
          }
          
          // Mark that we will be fetching the master list during initialization
          masterListFetchedRef.current = true;
          
          // Fetch master list and then finalize initialization with MASTER view
          fetchMasterList()
            .then(() => {
              finalizeInitialization(VIEWS.MASTER);
            })
            .catch((error) => {
              console.error('Error fetching master list:', error);
              masterListFetchedRef.current = false; // Reset on error
              finalizeInitialization(VIEWS.MASTER);
            });
        } else {
          // Default to lists view          
          // Try to restore the saved list if it exists
          const targetList = findListById(savedListId, ownLists, sharedLists);
          
          if (targetList) {
            setCurrentList(targetList);
          } else if (ownLists.length > 0) {
            // Fallback to first list if target not found
            setCurrentList(ownLists[0]);
          }
          
          finalizeInitialization(VIEWS.LISTS);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        // In case of error, still finish initializing but reset the ref
        setIsInitializing(false);
        setInitialView(null);
        setView(VIEWS.LISTS); // Default to lists view on error
        initialLoadRef.current = true;
      }
    };
    
    loadInitialData();
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, fetchGroceryLists, fetchAcceptedShares, fetchMasterList, fetchItems, findListById]);

  // Third effect: Load view-specific data
  useEffect(() => {
    if (!user || authLoading) return;

    if (view === VIEWS.MASTER) {
      // Always fetch the master list when entering master view
      if (!masterListFetchedRef.current) {
        masterListFetchedRef.current = true;
        fetchMasterList()
          .catch(error => {
            console.error('Error fetching master list:', error);
            masterListFetchedRef.current = false; // Reset on error
          });
      }
    } else if (view === VIEWS.LIST && currentList?.id) {
      const currentListId = currentList.id;
      
      // Only fetch items on view change or when currentList changes
      if (!listViewItemsFetchedRef.current) {
        listViewItemsFetchedRef.current = true;
        
        fetchItems(currentListId, true)
          .catch(error => {
            console.error('Error fetching list items:', error);
            listViewItemsFetchedRef.current = false; // Reset on error
          });
        }
    } else {
      // Reset flags when changing to a different view
      masterListFetchedRef.current = false;
      listViewItemsFetchedRef.current = false;
    }
  }, [user, authLoading, view, fetchMasterList, fetchItems, currentList]);

  // Save view to localStorage
  useEffect(() => {
    // Skip localStorage updates during initialization
    if (isInitializing) return;
    
    localStorage.setItem('groceryView', view);
    
    // Reset fetch flags when view changes to ensure fresh data on next access
    if (view === VIEWS.MASTER) {
      listViewItemsFetchedRef.current = false; // Reset list items flag
    } else if (view === VIEWS.LIST) {
      masterListFetchedRef.current = false; // Reset master list flag
    } else if (view === VIEWS.LISTS) {
      // Reset both flags when going to lists view
      masterListFetchedRef.current = false;
      listViewItemsFetchedRef.current = false;
    }
    
    // If we're in list view but don't have a list, try to fall back to lists view
    // Only do this after initialization is complete
    if (view === VIEWS.LIST && !currentList && !isInitializing) {
      setView(VIEWS.LISTS);
    }
  }, [view, currentList, setView, isInitializing, masterListFetchedRef, listViewItemsFetchedRef]);

  // Save current list ID to localStorage
  useEffect(() => {
    // Skip localStorage updates during initialization to prevent redundant state changes
    if (isInitializing) {
      return;
    }
    
    // Only run if currentList is defined and has changed
    if (currentList?.id) {
      localStorage.setItem('currentListId', currentList.id.toString());
    } else if (currentList === null) {
      // Only remove if explicitly null (not just undefined during initial load)
      localStorage.removeItem('currentListId');
    }
  }, [currentList, isInitializing]);

  // Effect to set editing name when list is selected for editing
  useEffect(() => {
    if (editingList) {
      setEditingListName(editingList.name);
    }
  }, [editingList]);

  // Keep new item input focused
  useEffect(() => {
    if (newItemInputRef.current && document.activeElement !== newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [newItem]);

  // Derived state for loading conditions
  const determineLoadingState = useCallback(() => {
    // Always show loading during initialization
    if (isInitializing) {
      return true;
    }
    
    // For lists view, only show loading on initial fetch with no data
    if (view === VIEWS.LISTS) {
      return (listsLoading && groceryLists.length === 0) || 
             (sharingLoading && acceptedShares.length === 0);
    }
    
    // For list view, consider it loading if we're currently fetching items
    // This prevents flickering by showing a loading state during refetches
    if (view === VIEWS.LIST) {
      return itemsLoading;
    }
    
    // For master view, only show loading when we have no items
    return masterLoading && (!masterList || !masterList.items || masterList.items.length === 0);
  }, [isInitializing, view, listsLoading, groceryLists.length, sharingLoading, acceptedShares.length, itemsLoading, masterLoading, masterList]);

  // Combine accepted shares with grocery lists
  const combinedLists = useMemo(() => {
    // Format shared lists with all necessary properties
    const sharedListsFormatted = acceptedShares.map(share => ({
      id: share.list_id,
      name: share.list_name,
      is_shared: true,
      shared_with_email: share.owner_email,
      items: share.items || [],
      is_received_share: true
    }));

    // Make sure own lists have consistent properties
    const ownListsFormatted = groceryLists.map(list => ({
      ...list,
      is_received_share: false, // explicitly mark as not a received share
      items: Array.isArray(list.items) ? list.items : []
    }));

    return [...ownListsFormatted, ...sharedListsFormatted];
  }, [groceryLists, acceptedShares]);

  // Handle list selection - very important for navigation between views
  const selectList = useCallback((list) => {
    if (!list || !list.id) {
      console.error('Cannot select list: Invalid list data received', list);
      return;
    }
    
    try {
      // Reset fetch flags whenever we explicitly select a list
      masterListFetchedRef.current = false;
      listViewItemsFetchedRef.current = true; // Set to true since we're about to fetch
      
      // Show loading state during transition and set the initial view to LIST
      // This prevents flickering through lists view
      setIsInitializing(true);
      setInitialView(VIEWS.LIST);
      
      // Fetch items first, before changing any state
      // This improves performance by reducing state updates
      fetchItems(list.id, true)
        .then(() => {
          // After items are loaded, batch update all the states          
          // Update localStorage
          localStorage.setItem('currentListId', list.id.toString());
          localStorage.setItem('groceryView', VIEWS.LIST);
          
          // Update app state
          setCurrentList(list);
          setView(VIEWS.LIST);
          
          // End loading state only after everything is updated
          setIsInitializing(false);
          setInitialView(null);
        })
        .catch((error) => {
          console.error('Error fetching items:', error);
          
          // Still update state even if fetch fails
          localStorage.setItem('currentListId', list.id.toString());
          localStorage.setItem('groceryView', VIEWS.LIST);
          
          setCurrentList(list);
          setView(VIEWS.LIST);
          
          setIsInitializing(false);
          setInitialView(null);
        });
    } catch (error) {
      console.error('Error during list selection:', error);
      setIsInitializing(false);
      setInitialView(null);
    }
  }, [setView, setCurrentList, fetchItems, setIsInitializing, setInitialView, masterListFetchedRef, listViewItemsFetchedRef]);

  // Handle list creation
  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    
    // Check for character limit
    if (newListName.trim().length > MAX_NAME_LENGTH) {
      setNotification({
        message: `List name cannot exceed ${MAX_NAME_LENGTH} characters`,
        type: "error"
      });
      return;
    }

    try {
      // Show loading during list creation and set initial view to LIST
      setIsInitializing(true);
      setInitialView(VIEWS.LIST);
      
      const newList = await createList(newListName);
      setNewListName('');
      
      // Update localStorage and state
      localStorage.setItem('currentListId', newList.id.toString());
      localStorage.setItem('groceryView', VIEWS.LIST);
      
      // Set view to LIST
      setView(VIEWS.LIST);
      
      // End loading state
      setIsInitializing(false);
      setInitialView(null);
    } catch {
      setNotification({
        message: "Failed to create list",
        type: "error"
      });
      setIsInitializing(false);
      setInitialView(null);
    }
  };

  // Handle sharing a list
  const handleShareList = async (email) => {
    if (!currentList) return;
    
    try {
      const result = await shareListWithUser(currentList.id, email);
      
      if (result) {
        // Update the current list to mark it as shared
        setCurrentList(prevList => ({ 
          ...prevList, 
          is_shared: true,
          shared_with_email: email 
        }));
        
        // Show success notification
        setNotification({
          message: `List shared with ${email}`,
          type: "success"
        });
        
        // Refresh the lists
        await fetchGroceryLists(true);
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
      const acceptedShares = await acceptShare(shareId);
      
      if (acceptedShares) {
        // Force refresh grocery lists to ensure UI is up to date
        await fetchGroceryLists(true);
        
        setNotification({
          message: "Shared list accepted",
          type: "success"
        });
        
        // If we don't have a current list selected, select the most recently accepted one
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

      // Update the item in the appropriate list based on the view
      if (view === VIEWS.MASTER) {
        await updateMasterItem(itemId, updates);
      } else {
        // First update the item in the current list
        const updatedItem = await updateItem(itemId, updates);

        // Find the corresponding item in the master list by name
        const masterItem = masterList?.items?.find(item => 
          item.name.toLowerCase() === updatedItem.name.toLowerCase()
        );

        // If found in master list, update it there too
        if (masterItem) {
          await updateMasterItem(masterItem.id, updates);
        } else {
          // If not found in master list, add it
          await addToMasterList(updatedItem.name, updatedItem.tags);
        }
      }

      setEditingItem(null);
    } catch {
      setNotification({
        message: "Failed to update item",
        type: "error"
      });
    }
  };

  // Handle list deletion with notification
  const handleDeleteList = useCallback((listId) => {
    if (window.confirm('Are you sure you want to delete this list?')) {
      deleteList(listId)
        .then(() => {
          // Force refresh grocery lists after deletion
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
  }, [deleteList, fetchGroceryLists, setNotification]);

  // Handle sharing a list from lists view
  const handleShareListFromListsView = useCallback((listId) => {
    // Find the list to set it as current list temporarily 
    const listToShare = groceryLists.find(list => list.id === listId);
    
    // Only proceed if the list exists and is not already shared
    if (listToShare && !listToShare.is_shared) {
      setCurrentList(listToShare);
      setShowShareModal(true);
    } else if (listToShare && listToShare.is_shared) {
      // If list is already shared, show message
      setNotification({
        message: "This list is already shared",
        type: "info"
      });
    }
  }, [groceryLists, setCurrentList, setNotification]);

  // Menu items for each view
  const getMenuItems = useCallback(() => {
    // During initialization, don't show any menu items
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
          
          // Reset the master list fetch flag to ensure fresh data
          masterListFetchedRef.current = true; // Set to true since we're about to fetch
          
          // Always fetch fresh data 
          fetchMasterList()
            .then(() => {
              // After successful fetch, switch view
              setView(VIEWS.MASTER);
              setIsInitializing(false);
            })
            .catch(() => {
              console.error('Error fetching master list');
              masterListFetchedRef.current = false; // Reset on error
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
            
            // Set the list items fetch flag to avoid infinite loops
            listViewItemsFetchedRef.current = true;
            
            fetchItems(currentList.id, true)
              .then(() => {
                setView(VIEWS.LIST);
                setIsInitializing(false);
              })
              .catch(() => {
                listViewItemsFetchedRef.current = false; // Reset on error
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
        show: view === VIEWS.LIST && currentList !== null && !currentList.is_shared
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
          // Ensure masterList exists before accessing its items
          if (!masterList?.items) return;
          
          const selectedMasterItems = masterList.items.filter(item => item.completed);
          
          if (selectedMasterItems.length === 0) {
            setNotification({
              message: "No items selected to add",
              type: "warning"
            });
            return;
          }
          
          // Track successfully added items, duplicates, and errors
          let addedItems = 0;
          let duplicateItems = 0;
          let errorItems = 0;
          let atLeastOneProcessed = false;
          
          Promise.all(selectedMasterItems.map(async (item) => {
            try {
              // Check if item already exists in the current list
              const isDuplicate = items.some(existingItem => 
                existingItem.name.toLowerCase() === item.name.toLowerCase()
              );
              
              if (isDuplicate) {
                duplicateItems++;
                atLeastOneProcessed = true;
                return { status: 'duplicate', item };
              }
              
              // Add to the current list
              await addItem(item.name);
              addedItems++;
              atLeastOneProcessed = true;
              
              // Always add to master list and untoggle
              await addToMasterList(item.name);
              await toggleMasterItem(item.id, false);
              
              return { status: 'success', item };
            } catch (error) {
              // Handle different types of errors
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
            // After all operations complete, determine the appropriate notification
            if (addedItems === 0 && errorItems === 0) {
              // Only duplicates - no successful additions and no errors
              setNotification({
                message: `No new items added. All ${duplicateItems} selected items already exist in ${currentList.name}`,
                type: "warning"
              });
            } else if (addedItems > 0 && errorItems === 0) {
              // Some additions succeeded and no errors
              setNotification({
                message: `${addedItems} item(s) added to ${currentList.name}${duplicateItems > 0 ? ` (${duplicateItems} duplicate(s) skipped)` : ''}`,
                type: "success"
              });
            } else if (errorItems > 0) {
              // Some or all additions failed due to server errors
              setNotification({
                message: `${addedItems > 0 ? `${addedItems} item(s) added, but ` : ''}${errorItems} item(s) failed to add due to a server error${duplicateItems > 0 ? ` (${duplicateItems} duplicate(s) skipped)` : ''}`,
                type: "error"
              });
            }
            
            // Refresh the items list if at least one operation was processed
            if (atLeastOneProcessed) {
              fetchItems(currentList.id);
            }
          })
          .catch(error => {
            // This would only happen if the Promise.all itself fails
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
  }, [isInitializing, view, currentList, items, masterList, fetchMasterList, fetchItems, addItem, addToMasterList, toggleMasterItem, deleteItem, deleteMasterItem]);

  // Handler for adding a new item to prevent duplicate master list entries
  const handleAddNewItem = useCallback(async () => {
    if (!newItem.trim()) return;
    
    // Check for character limit
    if (newItem.trim().length > MAX_NAME_LENGTH) {
      setNotification({
        message: `Item name cannot exceed ${MAX_NAME_LENGTH} characters`,
        type: "error"
      });
      return;
    }
    
    // Track if we're in the process of adding to prevent duplicates
    const itemToAdd = newItem.trim();
    setNewItem(''); // Clear input immediately to prevent double submissions
    
    try {
      // First check if the item already exists in the master list to avoid duplicates
      const normalizedName = itemToAdd.toLowerCase();
      // Safely check masterList and its items
      const existsInMasterList = masterList?.items?.some(item => 
        item.name.toLowerCase().trim() === normalizedName
      ) || false;
      
      // Add to current list and also to master list if needed
      await addItem(itemToAdd, existsInMasterList ? null : addToMasterList);
    } catch (error) {
      setNotification({
        message: error.message || "Failed to add item",
        type: "error"
      });
      // Restore the input value if there was an error
      setNewItem(itemToAdd);
    }
  }, [newItem, setNewItem, addItem, addToMasterList, masterList, setNotification]);

  // Create add item form
  const addItemForm = (view === VIEWS.LIST || view === VIEWS.MASTER) && (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleAddNewItem();
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
            maxLength={MAX_NAME_LENGTH}
            style={{ fontFamily: 'inherit' }}
            className="w-full py-2 bg-transparent text-lg font-light font-sans text-secondary-dm placeholder:text-secondary-dm/30 border-b border-transparent focus:border-primary focus:outline-none transition-colors"
          />
        }
        rightElements={
          <ActionButton
            title="Add item"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
            onClick={handleAddNewItem}
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
            maxLength={MAX_NAME_LENGTH}
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

  // Handle list name update
  const handleUpdateListName = async (listId, newName) => {
    try {
      await updateListName(listId, newName);
      // After updating the list name, also refresh shared lists
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

  return (
    <div className="pr-6 md:pr-0 max-w-[calc(100%-24px)] md:max-w-full mx-auto">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
      
      {syncNotification && (
        <Notification 
          message={syncNotification.message} 
          type={syncNotification.type} 
          onClose={clearSyncNotification} 
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
          // During initialization, use initialView if set, otherwise use view
          view={initialView || view}
          // Lists view props
          combinedLists={combinedLists}
          selectList={selectList}
          setEditingList={setEditingList}
          deleteList={handleDeleteList}
          onShareList={handleShareListFromListsView}
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
        listName={editingListName}
        onSave={() => {
          if (editingList) {
            handleUpdateListName(editingList.id, editingListName);
            setEditingList(null);
            setEditingListName('');
          }
        }}
        onCancel={() => {
          setEditingList(null);
          setEditingListName('');
        }}
        onChange={setEditingListName}
      />

      <ListSelectionModal
        isOpen={showListSelection}
        lists={groceryLists}
        onSelect={(listId) => {
          // Find the list using the helper function
          const targetList = findListById(listId, groceryLists, acceptedShares);
          if (targetList) {
            selectList(targetList);
          } else {
            console.error('Could not find list with ID:', listId);
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
        tags={view === VIEWS.LIST 
          ? items?.flatMap(item => item.tags || []) || []
          : masterList?.items?.flatMap(item => item.tags || []) || []
        }
        onSelectTag={setCurrentTagFilter}
      />
    </div>
  );
} 