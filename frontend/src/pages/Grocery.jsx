import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

// Views enum
const VIEWS = {
  LIST: 'list',
  MASTER: 'master',
  LISTS: 'lists'
};

export default function Grocery() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [groceryLists, setGroceryLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [masterList, setMasterList] = useState({ items: [] });
  const [newListName, setNewListName] = useState('');
  const [newItem, setNewItem] = useState('');
  const [view, setView] = useState(VIEWS.LISTS); // Default to lists view
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showListSelection, setShowListSelection] = useState(false);
  // Add loading states
  const [listsLoading, setListsLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const inputRef = useRef(null);
  const newItemInputRef = useRef(null);
  const [notification, setNotification] = useState(null);

  // Move all function declarations before the effects that use them
  
  // Memoize callback functions to avoid dependency loops
  const createUserIfNeeded = useCallback(async (user) => {
    if (!user || !user.id) return;
    
    try {
      await fetch(`${api.API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: user.id,
          email: user.email 
        })
      });
    } catch (error) {
      console.error("Error ensuring user exists:", error);
    }
  }, []);

  // Define fetchListItems before fetchGroceryLists since it's used there
  const fetchListItems = useCallback(async (listId) => {
    if (!listId) return;
    
    try {
      setItemsLoading(true);
      const items = await api.getGroceryItems(listId);
      
      setCurrentList(prev => ({
        ...prev,
        items: items
      }));
    } catch (error) {
      console.error("Error fetching list items:", error);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  // Fetch all grocery lists
  const fetchGroceryLists = useCallback(async () => {
    if (!user) return;
    
    try {
      setListsLoading(true);
      const lists = await api.getGroceryLists();
      
      // Make sure every list has an items array, even if empty
      const listsWithItems = lists.map(list => ({
        ...list,
        items: list.items || [] // Ensure items is always an array
      }));
      
      setGroceryLists(listsWithItems);
      
      // If no current list is selected but lists exist, select the first one
      if (!currentList && listsWithItems.length > 0) {
        setCurrentList(listsWithItems[0]);
        fetchListItems(listsWithItems[0].id);
      }
    } catch (error) {
      console.error("Error fetching grocery lists:", error);
    } finally {
      setListsLoading(false);
    }
  }, [user, currentList, fetchListItems]);

  // Fetch master list items
  const fetchMasterList = useCallback(async () => {
    if (!user) return;
    
    try {
      setMasterLoading(true);
      const masterListData = await api.getMasterList();
      
      // Deduplicate items by name (case-insensitive)
      const seen = new Set();
      const deduplicatedItems = masterListData.items.filter(item => {
        const normalizedName = item.name.toLowerCase().trim();
        if (seen.has(normalizedName)) {
          return false;
        }
        seen.add(normalizedName);
        return true;
      });
      
      setMasterList({
        ...masterListData,
        items: deduplicatedItems
      });
    } catch (error) {
      console.error("Error fetching master list:", error);
    } finally {
      setMasterLoading(false);
    }
  }, [user]);

  // Now that functions are defined, we can use them in useEffect
  
  // Generate a default name for new lists
  useEffect(() => {
    if (groceryLists.length > 0) {
      const existingNames = groceryLists.map(list => list.name);
      let baseName = 'Groceries';
      let suffix = 0;
      let newName = baseName;
      
      while (existingNames.includes(newName)) {
        suffix++;
        newName = `${baseName}-${suffix}`;
      }
      
      setNewListName(newName);
    } else {
      setNewListName('Groceries');
    }
  }, [groceryLists]);

  // Focus and select all text when input gets focus
  const handleInputFocus = (e) => {
    e.target.select();
  };

  // Keep new item input focused when typing to prevent loss of focus
  useEffect(() => {
    if (newItemInputRef.current && document.activeElement !== newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [newItem]);

  // Check for mobile screen size
  useEffect(() => {
    const handleResize = () => {};
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize and fetch data
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      sessionStorage.setItem('loginRedirect', window.location.pathname);
      navigate('/login');
      return;
    }

    createUserIfNeeded(user);
    fetchGroceryLists();
    fetchMasterList();
  }, [user, authLoading, navigate, createUserIfNeeded, fetchGroceryLists, fetchMasterList]);

  // Create a new list
  const createNewList = async (e) => {
    e.preventDefault();
    if (!newListName.trim() || !user) return;
    
    try {
      const newList = await api.createGroceryList(newListName);
      
      setCurrentList({ ...newList, items: [] });
      setGroceryLists(prev => [newList, ...prev]);
      
      // Generate a new default name for the next list
      const existingNames = [...groceryLists, newList].map(list => list.name);
      let baseName = 'Groceries';
      let suffix = 0;
      let nextName = baseName;
      
      while (existingNames.includes(nextName)) {
        suffix++;
        nextName = `${baseName}-${suffix}`;
      }
      
      setNewListName(nextName);
      setView(VIEWS.LIST);
    } catch (error) {
      console.error("Error creating new list:", error);
    }
  };

  // Delete a list
  const deleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this list?')) return;
    
    try {
      await api.deleteGroceryList(listId);
      
      // Update lists
      setGroceryLists(prev => prev.filter(list => list.id !== listId));
      
      // If deleting current list, switch to another list or lists view
      if (currentList && currentList.id === listId) {
        const remainingLists = groceryLists.filter(list => list.id !== listId);
        if (remainingLists.length > 0) {
          setCurrentList(remainingLists[0]);
          fetchListItems(remainingLists[0].id);
        } else {
          setCurrentList(null);
          setView(VIEWS.LISTS);
        }
      }
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  // Edit list name
  const startEditingList = (list) => {
    setEditingList(list);
    setNewListName(list.name);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 100);
  };

  const saveListName = async () => {
    if (!editingList || !newListName.trim()) {
      setEditingList(null);
      return;
    }
    
    try {
      await api.updateGroceryList(editingList.id, { name: newListName });
      
      // Update lists
      setGroceryLists(prev => 
        prev.map(list => 
          list.id === editingList.id ? { ...list, name: newListName } : list
        )
      );
      
      // Update current list if it's the one being edited
      if (currentList && currentList.id === editingList.id) {
        setCurrentList(prev => ({ ...prev, name: newListName }));
      }
      
      setEditingList(null);
    } catch (error) {
      console.error("Error updating list name:", error);
    }
  };

  // Add this function to toggle items as bought/completed
  const toggleItem = async (index) => {
    try {
      const items = view === VIEWS.LIST ? currentList.items : masterList.items;
      const item = items[index];
      const newCompletedValue = !item.completed;
      
      if (view === VIEWS.LIST) {
        // Update item in current list
        await api.updateGroceryItem(item.id, { completed: newCompletedValue });
        
        // Update state
        setCurrentList(prev => ({
          ...prev,
          items: prev.items.map((i, idx) => 
            idx === index ? { ...i, completed: newCompletedValue } : i
          )
        }));
      } else if (view === VIEWS.MASTER) {
        // Update item in master list
        await api.updateMasterListItem(item.id, { completed: newCompletedValue });
        
        // Update state
        setMasterList(prev => ({
          ...prev,
          items: prev.items.map((i, idx) => 
            idx === index ? { ...i, completed: newCompletedValue } : i
          )
        }));
      }
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  // Delete an item from the current list
  const deleteItem = async (itemId, index) => {
    try {
      await api.deleteGroceryItem(itemId);
      
      setCurrentList(prev => ({
        ...prev,
        items: prev.items.filter((_, idx) => idx !== index)
      }));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Delete an item from the master list
  const deleteMasterItem = async (itemId, index) => {
    try {
      await api.deleteMasterListItem(itemId);
      
      setMasterList(prev => ({
        ...prev,
        items: prev.items.filter((_, idx) => idx !== index)
      }));
    } catch (error) {
      console.error("Error deleting master item:", error);
    }
  };

  // Add Item function
  const addItem = async (e) => {
    e?.preventDefault();
    if (!newItem.trim()) return;
    
    try {
      // Add to current list if in list view
      if (view === VIEWS.LIST && currentList) {
        const newItemObj = await api.addGroceryItem(currentList.id, newItem);
        
        setCurrentList(prev => ({
          ...prev,
          items: [...prev.items, newItemObj]
        }));
        
        // Also add to master list
        await addToMasterList(newItem);
      } else if (view === VIEWS.MASTER) {
        // Only add to master list
        await addToMasterList(newItem);
      }
      
      setNewItem('');
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  // Add to master list with deduplication
  const addToMasterList = async (itemName) => {
    if (!user || !itemName.trim()) return;
    
    try {
      // Check if item already exists in master list (case insensitive)
      const normalizedName = itemName.toLowerCase().trim();
      const existingItem = masterList.items.find(item => 
        item.name.toLowerCase().trim() === normalizedName
      );
      
      if (!existingItem) {
        console.log("Adding to master list:", itemName);
        const newMasterItem = await api.addMasterListItem(itemName);
        
        setMasterList(prev => ({
          ...prev,
          items: [...prev.items, newMasterItem]
        }));
      }
      
      return true;
    } catch (error) {
      console.error("Error adding to master list:", error);
      return false;
    }
  };

  // Select a list to view
  const selectList = (list) => {
    setCurrentList(list);
    fetchListItems(list.id);
    setView(VIEWS.LIST); // This explicitly changes the view
  };

  // Make the spinner more visible with a cleaner style
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
      <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 dark:border-gray-700 border-t-4 border-t-primary dark:border-t-dark-primary"></div>
    </div>
  );

  // Add selected items from master list to current list
  const addSelectedItemsToCurrentList = async () => {
    if (!currentList || !masterList.items) return;
    
    try {
      // Get all completed/selected items from master list
      const selectedMasterItems = masterList.items.filter((item, index) => 
        selectedItems.includes(index) || item.completed
      );
      
      if (selectedMasterItems.length === 0) {
        setNotification({
          message: "No items selected to add",
          type: "warning"
        });
      return;
    }
    
      // Add these items to the current list
      for (const item of selectedMasterItems) {
        const nameToAdd = typeof item.name === 'object' ? item.name.name : item.name;
        await api.addGroceryItem(currentList.id, nameToAdd);
      }
      
      // Refresh current list items
      await fetchListItems(currentList.id);
      
      // Success notification
      setNotification({
        message: `${selectedMasterItems.length} item(s) added to ${currentList.name}`,
        type: "success"
      });
      
      // Clear selections/completed states
      const updatedMasterItems = [...masterList.items];
      for (let i = 0; i < updatedMasterItems.length; i++) {
        if (selectedItems.includes(i) || updatedMasterItems[i].completed) {
          // Update item in database
          await api.updateMasterListItem(updatedMasterItems[i].id, { completed: false });
          // Update local state
          updatedMasterItems[i] = { ...updatedMasterItems[i], completed: false };
        }
      }
      
      // Update master list state
      setMasterList({
        ...masterList,
        items: updatedMasterItems
      });
      
      // Clear selected items
      setSelectedItems([]);
      
    } catch (error) {
      console.error("Error adding items to current list:", error);
      setNotification({
        message: "Failed to add items to list",
        type: "error"
      });
    }
  };

  // Toggle all items selection/completion
  const toggleAllItems = (checked) => {
    if (view === VIEWS.MASTER) {
      const allIndices = checked 
        ? masterList.items.map((_, index) => index) 
        : [];
      setSelectedItems(allIndices);
      
      // Also mark all as complete/incomplete
      const updatedItems = masterList.items.map(item => ({
        ...item,
        completed: checked
      }));
      
      // Update in database (can be optimized to batch update)
      updatedItems.forEach(async (item) => {
        try {
          await api.updateMasterListItem(item.id, { completed: checked });
        } catch (error) {
          console.error("Error updating item:", error);
        }
      });
      
      setMasterList({
        ...masterList,
        items: updatedItems
      });
    } else if (view === VIEWS.LIST && currentList) {
      const updatedItems = currentList.items.map(item => ({
        ...item,
        completed: checked
      }));
      
      // Update in database (can be optimized to batch update)
      updatedItems.forEach(async (item) => {
        try {
          await api.updateGroceryItem(item.id, { completed: checked });
    } catch (error) {
          console.error("Error updating item:", error);
        }
      });
      
      setCurrentList({
        ...currentList,
        items: updatedItems
      });
    }
  };

  // Notification component
  const Notification = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-500' : 
                    type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
    
    useEffect(() => {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }, [onClose]);
    
    return (
      <div className={`fixed top-4 right-4 px-4 py-3 rounded-md text-white ${bgColor} shadow-lg z-50 flex items-center`}>
        <span>{message}</span>
          <button 
          onClick={onClose}
          className="ml-3 text-white hover:text-gray-200"
          >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
      </div>
    );
  };

  // Define PropTypes for Notification
  Notification.propTypes = {
    message: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired
  };

  // Define unified row layout component with PropTypes
  const ListRow = ({ leftElement, text, rightElements, onClick, hover = true }) => (
    <div 
      className={`flex items-center min-w-0 px-3 sm:px-4 py-3 gap-2 sm:gap-3 ${hover ? 'hover:bg-gray-50 dark:hover:bg-gray-800/30' : ''} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="w-6 flex-shrink-0">
        {leftElement}
      </div>

      <div className="flex-1 min-w-0">
        {text}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 pr-2 sm:pr-4">
        {rightElements}
      </div>
    </div>
  );

  // Define PropTypes for ListRow
  ListRow.propTypes = {
    leftElement: PropTypes.node,
    text: PropTypes.node.isRequired,
    rightElements: PropTypes.node,
    onClick: PropTypes.func,
    hover: PropTypes.bool
  };

  // Define a standard button component with PropTypes
  const ActionButton = ({ icon, onClick, color = 'primary', iconColor }) => (
                    <button 
      onClick={onClick}
      className={`text-secondary-dm p-1 rounded hover:text-${color}-dm flex-shrink-0 h-8 w-8 flex items-center justify-center`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon}
      </svg>
                    </button>
  );

  // Define PropTypes for ActionButton
  ActionButton.propTypes = {
    icon: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    color: PropTypes.string,
    iconColor: PropTypes.string
  };

  // Function to delete selected items - fixed version
  const deleteSelectedItems = async () => {
    let itemsToDelete = [];
    
    // Figure out which items to delete
    if (selectedItems.length === 0) {
      // If we're not in multi-select mode, get completed items
      itemsToDelete = view === VIEWS.LIST && currentList ? 
        currentList.items
          .map((item, index) => item.completed ? { item, index } : null)
          .filter(item => item !== null) :
        view === VIEWS.MASTER ?
          masterList.items
            .map((item, index) => item.completed ? { item, index } : null)
            .filter(item => item !== null) :
          [];
    } else {
      // We have explicitly selected items - get their details
      itemsToDelete = view === VIEWS.LIST && currentList ?
        selectedItems.map(index => ({ item: currentList.items[index], index })) :
        view === VIEWS.MASTER ?
          selectedItems.map(index => ({ item: masterList.items[index], index })) :
          [];
    }
    
    // Check if we have any items to delete
    if (itemsToDelete.length === 0) {
      setNotification({
        message: "No items selected to delete",
        type: "warning"
      });
      return;
    }
    
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete ${itemsToDelete.length} selected item(s)?`)) {
      return;
    }
    
    try {
      // IMPORTANT: Clear selection state BEFORE starting deletion to avoid selection bugs
      setSelectedItems([]);
      
      // Delete items based on current view - using item IDs instead of indices
      if (view === VIEWS.LIST && currentList) {
        for (const { item } of itemsToDelete) {
          if (item && item.id) {
            await api.deleteGroceryItem(item.id);
          }
        }
        await fetchListItems(currentList.id);
      } else if (view === VIEWS.MASTER) {
        for (const { item } of itemsToDelete) {
          if (item && item.id) {
            await api.deleteMasterListItem(item.id);
          }
        }
        await fetchMasterList();
      }
      
      // Show success notification
      setNotification({
        message: `${itemsToDelete.length} item(s) deleted`,
        type: "success"
      });
      
    } catch (error) {
      console.error("Error deleting items:", error);
      setNotification({
        message: "Failed to delete items",
        type: "error"
      });
    }
  };

  // Define updated menu items with the requested structure
  const menuItems = [
    // First two navigation items (the views that aren't current)
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
          fetchListItems(currentList.id);
          setView(VIEWS.LIST);
        }
      },
      show: view !== VIEWS.LIST && currentList !== null
    },
    // Add Selected to Current List (only in Master view)
    { 
      label: "Add Selected to Current List", 
      action: addSelectedItemsToCurrentList,
      show: view === VIEWS.MASTER && currentList !== null 
    },
    // Delete Selected (only show when not in Lists view)
    {
      label: "Delete Selected",
      action: deleteSelectedItems,
      show: view !== VIEWS.LISTS
    }
  ];

  // Add this function near the top of your component (with your other helper functions)
  const addSelectedItemsToList = async (targetListId) => {
    if (!targetListId || selectedItems.length === 0) return;
    try {
      // Get the selected items from the master list (using their indices)
      const itemsToAdd = selectedItems.map(index => masterList.items[index]);
      
      // Add each selected item to the target list
      for (const item of itemsToAdd) {
        const nameToAdd = typeof item.name === 'object' ? item.name.name : item.name;
        await api.addGroceryItem(targetListId, nameToAdd);
      }
      
      // If the target list is the current one, refresh its items
      if (currentList && currentList.id === targetListId) {
        await fetchListItems(targetListId);
      }
      
      setSelectedItems([]);
      setNotification({ message: `${itemsToAdd.length} item(s) added to list`, type: "success" });
    } catch (error) {
      console.error("Error adding selected items to list:", error);
      setNotification({ message: "Failed to add selected items", type: "error" });
    }
  };

  // Render function for the unified layout
  return (
    <div className="pr-6 md:pr-0 max-w-[calc(100%-24px)] md:max-w-full mx-auto">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      {/* Main container with proper spacing and max-width */}
      <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 flex flex-col h-full min-w-0">
        {/* Header - now inside the container */}
        <ListRow
          leftElement={
            ((view === VIEWS.LIST && currentList?.items?.length > 0) ||
             (view === VIEWS.MASTER && masterList?.items?.length > 0)) ? (
              <input
                type="checkbox"
                checked={
                  view === VIEWS.LIST 
                    ? currentList.items.every(item => item.completed)
                    : view === VIEWS.MASTER 
                      ? masterList.items.every(item => item.completed)
                      : false
                }
                onChange={(e) => toggleAllItems(e.target.checked)}
                className="h-6 w-6 text-primary border-gray-300 rounded focus:ring-primary"
              />
            ) : null
          }
          text={
            <h1 className="text-2xl font-bold text-secondary-dm">
              {view === VIEWS.LIST && currentList ? currentList.name : 
               view === VIEWS.MASTER ? 'Master List' : 'My Grocery Lists'}
            </h1>
          }
          rightElements={
            <div className="relative">
              <ActionButton
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                onClick={() => setMenuOpen(!menuOpen)}
                iconColor="text-blue-500"
              />
              {/* Dropdown Menu using menuItems */}
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
      
        {/* Scrollable content area - now inside the container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Lists view */}
      {view === VIEWS.LISTS && (
            <div>
          {listsLoading ? (
            <LoadingSpinner />
                ) : groceryLists.length > 0 ? (
            groceryLists.map(list => (
                  <ListRow
                key={list.id}
                    text={
                      <div className="flex items-center">
                        <span className="text-secondary-dm">{list.name}</span>
                        <span className="ml-2 text-sm text-secondary-dm opacity-75">
                          {Array.isArray(list.items) ? `${list.items.length} items` : "0 items"}
                        </span>
                </div>
                    }
                    rightElements={<>
                      <ActionButton 
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingList(list);
                    }}
                      />
                      <ActionButton 
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteList(list.id);
                    }}
                        color="accent"
                        iconColor="text-red-500"
                      />
                    </>}
                    onClick={() => selectList(list)}
                  />
                ))
                ) : (
                  <div className="py-6 text-center text-secondary-dm">
                    You don&apos;t have any grocery lists yet. Create your first list below.
                  </div>
                )}
                
                {/* Add new list form - also using ListRow */}
                <form onSubmit={createNewList}>
                  <ListRow
                    hover={false}
                    leftElement={<div className="h-6 w-6" />}
                    text={
              <input
                ref={inputRef}
                type="text"
                placeholder="New list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onFocus={handleInputFocus}
                        className="w-full py-2 bg-transparent text-lg text-secondary-dm placeholder:text-secondary-dm/30 border-b border-transparent focus:border-primary focus:outline-none transition-colors"
                      />
                    }
                    rightElements={
                      <ActionButton
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
                        onClick={(e) => {
                          e.preventDefault();
                          createNewList(e);
                        }}
                        iconColor="text-green-500"
                      />
                    }
                  />
            </form>
        </div>
      )}
      
          {/* List view or Master list view */}
      {(view === VIEWS.LIST || view === VIEWS.MASTER) && (
            <div>
          {/* Items list */}
                {itemsLoading || masterLoading ? (
            <LoadingSpinner />
          ) : view === VIEWS.LIST && currentList ? (
            currentList.items && currentList.items.length > 0 ? (
              currentList.items.map((item, index) => (
                      <ListRow
                  key={index}
                        leftElement={
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleItem(index)}
                            className="h-6 w-6 text-primary border-gray-300 rounded focus:ring-primary flex-shrink-0"
                          />
                        }
                        text={
                          <span className={item.completed ? 'text-secondary-dm' : 'text-secondary-dm'}>
                    {item.name}
                  </span>
                        }
                        rightElements={
                          <ActionButton 
                            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                    onClick={() => deleteItem(item.id, index)}
                            color="accent"
                            iconColor="text-red-500"
                          />
                        }
                      />
              ))
            ) : (
                    <div className="py-4 px-4 text-center text-xl text-secondary-dm">
                No items in this list yet. Add your first item below.
              </div>
            )
          ) : view === VIEWS.MASTER && (
              masterList.items && masterList.items.length > 0 ? (
                masterList.items.map((item, index) => (
                      <ListRow
                    key={index}
                        leftElement={
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleItem(index)}
                            className="h-6 w-6 text-primary border-gray-300 rounded focus:ring-primary flex-shrink-0"
                          />
                        }
                        text={
                          <span className={item.completed ? 'text-secondary-dm' : 'text-secondary-dm'}>
                      {item.name}
                    </span>
                        }
                        rightElements={
                          <ActionButton 
                            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                      onClick={() => deleteMasterItem(item.id, index)}
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
          
          {/* Add item form */}
                <form onSubmit={addItem}>
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
                className="w-full py-2 bg-transparent text-lg text-secondary-dm placeholder:text-secondary-dm/30 border-b border-transparent focus:border-primary focus:outline-none transition-colors"
              />
                    }
                    rightElements={
                      <ActionButton
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
                        onClick={(e) => {
                          e.preventDefault();
                          addItem(e);
                        }}
                        iconColor="text-green-500"
                      />
                    }
                  />
            </form>
        </div>
      )}
        </div>
      </div>
      
      {/* List editing modal */}
      {editingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-background rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-medium text-secondary-dm mb-4">Rename List</h2>
            
            <form onSubmit={(e) => { e.preventDefault(); saveListName(); }}>
              <input
                ref={inputRef}
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full p-2 border rounded mb-4"
                autoFocus
              />
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 border rounded text-secondary-dm hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setEditingList(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* List selection modal */}
      {showListSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-background rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-medium text-secondary-dm mb-4">Select a list to add items to:</h2>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {groceryLists.length === 0 ? (
                <p className="text-center py-4">No lists available. Create a list first.</p>
              ) : (
                groceryLists.map(list => (
                  <button
                    key={list.id}
                    className="w-full text-left p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => addSelectedItemsToList(list.id)}
                  >
                    <span className="text-primary-dm font-medium">{list.name}</span>
                    <span className="text-sm text-secondary-dm block mt-1">
                      {list.items ? `${list.items.length} items` : 'Loading items...'}
                    </span>
                  </button>
                ))
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border rounded text-secondary-dm hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  setShowListSelection(false);
                  setSelectedItems([]);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 