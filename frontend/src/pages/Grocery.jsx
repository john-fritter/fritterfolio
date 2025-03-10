import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/auth';
import { useNavigate } from 'react-router-dom';

// Import components
import LoadingSpinner from '../components/grocery/LoadingSpinner';
import Notification from '../components/grocery/Notification';
import ListRow from '../components/grocery/ListRow';
import ActionButton from '../components/grocery/ActionButton';
import ListEditingModal from '../components/grocery/ListEditingModal';
import ListSelectionModal from '../components/grocery/ListSelectionModal';

// Import hooks
import { useGroceryLists } from '../hooks/grocery/useGroceryLists';
import { useGroceryItems } from '../hooks/grocery/useGroceryItems';
import { useMasterList } from '../hooks/grocery/useMasterList';

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
    updateListName
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
    toggleAllItems
  } = useGroceryItems(currentList?.id);

  const {
    masterList,
    masterLoading,
    selectedItems,
    setSelectedItems,
    fetchMasterList,
    addToMasterList,
    deleteMasterItem,
    toggleMasterItem,
    toggleAllMasterItems
  } = useMasterList(user);

  // Local state
  const [view, setView] = useState(VIEWS.LISTS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingList, setEditingList] = useState(null);
  const [showListSelection, setShowListSelection] = useState(false);

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
  }, [user, authLoading, navigate, fetchGroceryLists, fetchMasterList]);

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
        await addItem(newItem);
        await addToMasterList(newItem);
      } else if (view === VIEWS.MASTER) {
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
      const selectedMasterItems = masterList.items.filter((item, i) => 
        selectedItems.includes(i)
      );
      
      if (selectedMasterItems.length === 0) {
        setNotification({
          message: "No items selected to add",
          type: "warning"
        });
      return;
    }
    
      for (const item of selectedMasterItems) {
        await addItem(item.name);
      }
      
      setNotification({
        message: `${selectedMasterItems.length} item(s) added to ${currentList.name}`,
        type: "success"
      });
      
      setSelectedItems([]);
      await fetchItems(currentList.id);
    } catch {
      setNotification({
        message: "Failed to add items to list",
        type: "error"
      });
    }
  };

  // Define menu items
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
      label: "Add Selected to Current List", 
      action: handleAddSelectedToList,
      show: view === VIEWS.MASTER && currentList !== null 
    }
  ];

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
                    rightElements={
                      <>
                      <ActionButton 
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                    onClick={(e) => {
                      e.stopPropagation();
                            setEditingList(list);
                    }}
                      />
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
                        className="w-full py-2 bg-transparent text-lg text-secondary-dm placeholder:text-secondary-dm/30 border-b border-transparent focus:border-primary focus:outline-none transition-colors"
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
      
      {(view === VIEWS.LIST || view === VIEWS.MASTER) && (
            <div>
                {itemsLoading || masterLoading ? (
            <LoadingSpinner />
              ) : view === VIEWS.LIST ? (
                items?.length > 0 ? (
                  items.map(item => (
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
                        <span className={item.completed ? 'text-secondary-dm line-through' : 'text-secondary-dm'}>
                    {item.name}
                  </span>
                        }
                        rightElements={
                          <ActionButton 
                            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
                          onClick={() => deleteItem(item.id)}
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
              ) : (
                masterList.items?.length > 0 ? (
                  masterList.items.map(item => (
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
                        <span className={item.completed ? 'text-secondary-dm line-through' : 'text-secondary-dm'}>
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
                className="w-full py-2 bg-transparent text-lg text-secondary-dm placeholder:text-secondary-dm/30 border-b border-transparent focus:border-primary focus:outline-none transition-colors"
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
    </div>
  );
} 