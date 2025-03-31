import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../../services/api';

// Views enum
export const VIEWS = {
  LIST: 'list',
  MASTER: 'master',
  LISTS: 'lists'
};

export function useGroceryInitialization({
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
}) {
  // Add isInitializing state to track initialization process
  const [isInitializing, setIsInitializing] = useState(true);
  // Add state to track what should be rendered during initialization
  const [initialView, setInitialView] = useState(null);
  // Add refs to prevent infinite fetch loops
  const masterListFetchedRef = useRef(false);
  const listViewItemsFetchedRef = useRef(false);
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

      // If it's one of our own lists, check for pending shares
      if (targetList && !targetList.is_received_share) {
        // Get the pending share status from the original list data if available
        const originalList = ownLists.find(list => list.id === parsedId);
        const hasPendingShare = originalList?.has_pending_share || pendingShares.some(share => share.list_id === targetList.id);
        
        targetList = {
          ...targetList,
          has_pending_share: hasPendingShare,
          is_shared: targetList.is_shared || hasPendingShare
        };
      }
      
      return targetList;
    } catch (error) {
      console.error('Error finding list:', error);
      return null;
    }
  }, [pendingShares]);

  // First effect: Handle basic data loading
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
        const [ownLists, sharedLists] = await Promise.all([
          fetchGroceryLists(),
          fetchAcceptedShares(),
          api.getTags().catch(() => []) // We don't need tags here, but keeping the API call
        ]);
        
        // Define a function to set the correct final state based on saved data
        const finalizeInitialization = (finalView) => {          
          // First set localStorage values to ensure persistence
          localStorage.setItem('groceryView', finalView);
          
          // Safely access currentList.id only if currentList exists
          if (currentList?.id) {
            localStorage.setItem('currentListId', currentList.id.toString());
          }
          
          // Set the view we've determined is correct
          setView(finalView);
          
          // After initialization is complete, reveal the UI
          setIsInitializing(false);
          setInitialView(null);
        };
        
        // After lists are loaded, try to restore saved list
        if (savedListId && savedView === VIEWS.LIST) {
          // Use the helper function to find the list by ID
          const targetList = findListById(savedListId, ownLists, sharedLists);
          
          if (targetList) {
            // Found the saved list - set up list view
            fetchItems(targetList.id, true)
              .then(() => {
                // Set current list and finalize
                setCurrentList(targetList);
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
  }, [user, authLoading, fetchGroceryLists, fetchAcceptedShares, fetchMasterList, fetchItems, findListById, setCurrentList, setView, currentList]);

  // Second effect: Load view-specific data
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

  return {
    isInitializing,
    setIsInitializing,
    initialView,
    setInitialView,
    masterListFetchedRef,
    listViewItemsFetchedRef,
    findListById
  };
} 