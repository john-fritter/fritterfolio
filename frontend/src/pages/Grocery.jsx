import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';

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
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showListSelection, setShowListSelection] = useState(false);
  // Add loading states
  const [listsLoading, setListsLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const inputRef = useRef(null);

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

  // Clear bought/completed items
  const clearBoughtItems = async () => {
    if (!window.confirm('Are you sure you want to remove all completed items?')) {
      return;
    }
    
    try {
      const items = view === VIEWS.LIST ? currentList.items : masterList.items;
      const completedItems = items.filter(item => item.completed);
      
      // Delete each completed item
      for (const item of completedItems) {
        if (view === VIEWS.LIST) {
          await api.deleteGroceryItem(item.id);
        } else if (view === VIEWS.MASTER) {
          await api.deleteMasterListItem(item.id);
        }
      }
      
      // Update state
      if (view === VIEWS.LIST) {
        setCurrentList(prev => ({
          ...prev,
          items: prev.items.filter(item => !item.completed)
        }));
      } else if (view === VIEWS.MASTER) {
        setMasterList(prev => ({
          ...prev,
          items: prev.items.filter(item => !item.completed)
        }));
      }
    } catch (error) {
      console.error("Error clearing bought items:", error);
    }
  };

  // Function to add selected items to another list
  const addSelectedItemsToList = async (targetListId) => {
    if (!targetListId || selectedItems.length === 0) return;
    
    try {
      const itemsToAdd = selectedItems.map(index => masterList.items[index]);
      
      // Add each selected item to the target list
      for (const item of itemsToAdd) {
        await api.addGroceryItem(targetListId, item.name);
      }
      
      // Update the target list if it's the current list
      if (currentList && currentList.id === targetListId) {
        fetchListItems(targetListId);
      }
      
      // Reset selection
      setSelectedItems([]);
      setIsMultiSelectMode(false);
      setShowListSelection(false);
    } catch (error) {
      console.error("Error adding items to list:", error);
    }
  };

  // Toggle multi-select mode
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedItems([]);
  };

  // Toggle item selection
  const toggleItemSelection = (index) => {
    if (selectedItems.includes(index)) {
      setSelectedItems(selectedItems.filter(i => i !== index));
    } else {
      setSelectedItems([...selectedItems, index]);
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

  // Add this function to clear the master list
  const clearMasterList = async () => {
    if (!user || !window.confirm('Are you sure you want to clear all items from the master list?')) {
      return;
    }
    
    try {
      // Call the API to clear the master list
      await api.clearMasterList(user.id);
      
      // Update the state to reflect the cleared list
      setMasterList(prev => ({ ...prev, items: [] }));
      
      console.log("Master list cleared successfully");
    } catch (error) {
      console.error("Error clearing master list:", error);
    }
  };

  // Make the spinner more visible with a cleaner style
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
      <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 dark:border-gray-700 border-t-4 border-t-primary dark:border-t-dark-primary"></div>
    </div>
  );

  // Render function for the unified layout
  return (
    <div className="w-full h-full bg-background dark:bg-dark-background p-4">
      {/* Header with title and menu */}
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-dm">
          {view === VIEWS.LIST && currentList ? currentList.name : 
           view === VIEWS.MASTER ? 'Master List' : 'My Grocery Lists'}
        </h1>
        
        {/* Menu Button */}
        <div className="relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {/* Dropdown Menu - unified for all views */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-dark-background ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                {/* Always show these navigation options */}
                <button 
                  onClick={() => { 
                    if (currentList) setView(VIEWS.LIST); 
                    setMenuOpen(false); 
                  }}
                  className={`w-full text-left px-4 py-2 text-sm ${!currentList ? 'text-gray-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  disabled={!currentList}
                >
                  Current List
                </button>
                <button 
                  onClick={() => { setView(VIEWS.LISTS); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  All Lists
                </button>
                <button 
                  onClick={() => { setView(VIEWS.MASTER); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Master List
                </button>
                
                <div className="border-t my-1"></div>
                
                {/* View-specific options */}
                {view === VIEWS.MASTER && (
                  <>
                    <button 
                      onClick={() => { 
                        toggleMultiSelectMode(); 
                        setMenuOpen(false); 
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {isMultiSelectMode ? "Cancel Selection" : "Select Items"}
                    </button>
                    
                    {isMultiSelectMode && selectedItems.length > 0 && (
                      <button 
                        onClick={() => { 
                          setShowListSelection(true);
                          setMenuOpen(false); 
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Add Selected to List
                      </button>
                    )}
                    
                    <button 
                      onClick={() => {
                        clearMasterList();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Clear Master List
                    </button>
                  </>
                )}
                
                {view === VIEWS.LIST && currentList && (
                  <>
                    <button 
                      onClick={() => {
                        clearBoughtItems();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Clear Bought Items
                    </button>
                   </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* List of grocery lists view */}
      {view === VIEWS.LISTS && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {listsLoading ? (
            <LoadingSpinner />
          ) : groceryLists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary-dm mb-4">You don&apos;t have any grocery lists yet.</p>
            </div>
          ) : (
            groceryLists.map(list => (
              <div 
                key={list.id}
                className="py-4 flex items-center justify-between group"
                onClick={() => selectList(list)}
              >
                <div className="flex-1">
                  <h2 className="text-xl font-medium text-primary-dm">{list.name}</h2>
                  <p className="text-sm text-secondary-dm mt-1">
                    {Array.isArray(list.items) 
                      ? `${list.items.length} items • ${list.items.filter(i => i.completed).length} completed` 
                      : "0 items"
                    }
                  </p>
                </div>
                
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingList(list);
                    }}
                    className="text-primary p-1 rounded hover:bg-primary/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteList(list.id);
                    }}
                    className="text-red-500 p-1 rounded hover:bg-red-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
          
          {/* Add new list form - styled like a list item */}
          <div className="py-4">
            <form onSubmit={createNewList} className="flex items-center space-x-3">
              <input
                ref={inputRef}
                type="text"
                placeholder="New list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onFocus={handleInputFocus}
                className="flex-1 p-2 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary"
              />
              
              <button 
                type="submit"
                className="text-green-500 p-1 rounded hover:bg-green-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* List view or Master list view - maintained existing code for these views */}
      {(view === VIEWS.LIST || view === VIEWS.MASTER) && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {/* Items list */}
          {itemsLoading ? (
            <LoadingSpinner />
          ) : view === VIEWS.LIST && currentList ? (
            currentList.items && currentList.items.length > 0 ? (
              currentList.items.map((item, index) => (
                <div 
                  key={index}
                  className="py-3 flex items-center space-x-3"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleItem(index)}
                    className="h-5 w-5"
                  />
                  
                  <span 
                    className={`flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-secondary-dm'}`}
                  >
                    {item.name}
                  </span>
                  
                  <button
                    onClick={() => deleteItem(item.id, index)}
                    className="text-red-500 p-1 rounded hover:bg-red-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-secondary-dm">
                No items in this list yet. Add your first item below.
              </div>
            )
          ) : view === VIEWS.MASTER && (
            masterLoading ? (
              <LoadingSpinner />
            ) : (
              masterList.items && masterList.items.length > 0 ? (
                masterList.items.map((item, index) => (
                  <div 
                    key={index}
                    className="py-3 flex items-center space-x-3"
                  >
                    {/* Checkbox for multi-select or completion */}
                    {isMultiSelectMode ? (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(index)}
                        onChange={() => toggleItemSelection(index)}
                        className="h-5 w-5"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleItem(index)}
                        className="h-5 w-5"
                      />
                    )}
                    
                    <span 
                      className={`flex-1 ${item.completed && !isMultiSelectMode ? 'line-through text-gray-400' : 'text-secondary-dm'}`}
                    >
                      {item.name}
                    </span>
                    
                    <button
                      onClick={() => deleteMasterItem(item.id, index)}
                      className="text-red-500 p-1 rounded hover:bg-red-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-secondary-dm">
                  Your master list is empty. Items you add to any list will appear here.
                </div>
              )
            )
          )}
          
          {/* Add item form */}
          <div className="py-3">
            <form onSubmit={addItem} className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="Add new item..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="flex-1 p-2 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary"
              />
              
              <button 
                type="submit"
                className="text-green-500 p-1 rounded hover:bg-green-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
      
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
                  setIsMultiSelectMode(false);
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