import { useState, useEffect } from 'react';
import { MAX_NAME_LENGTH } from '../utils/validation';

// Import components
import Notification from '../components/Notification';
import ListRow from '../components/grocery/ListRow';
import ActionButton from '../components/grocery/ActionButton';
import ListEditingModal from '../components/grocery/ListEditingModal';
import ShareListModal from '../components/grocery/ShareListModal';
import PendingSharesNotification from '../components/grocery/PendingSharesNotification';
import ItemEditingModal from '../components/grocery/ItemEditingModal';
import TagFilterModal from '../components/grocery/TagFilterModal';
import GroceryView from '../components/grocery/GroceryView';
import DemoModeBanner from '../components/grocery/DemoModeBanner';

// Import hooks
import { useGroceryController } from '../hooks/grocery/useGroceryController';
import { VIEWS } from '../hooks/grocery/useGroceryInitialization';
import { useAuth } from '../hooks/auth';

export default function Grocery() {
  const {
    // Refs
    newItemInputRef,
    
    // State
    view,
    notification,
    editingList,
    editingListName,
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
    
    setNotification,
    setEditingList,
    setEditingListName,
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
    
    initialView
  } = useGroceryController();
  
  // Get the auth context to check if user is in demo mode
  const { user, logout } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Check if the user is in demo mode
  useEffect(() => {
    if (user && user.isDemo) {
      setIsDemoMode(true);
    } else {
      setIsDemoMode(false);
    }
  }, [user]);
  
  // Handle demo mode logout
  const handleExitDemo = async () => {
    await logout();
  };
  
  // Function to handle share attempts in demo mode
  const handleDemoModeShare = () => {
    setNotification({
      message: 'Sharing is disabled in demo mode. Create an account to use this feature.',
      type: 'warning'
    });
    setShowShareModal(false);
  };

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

  return (
    <div className="w-full">
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

      <div className="w-full flex flex-col h-full min-w-0">
        {/* Show demo mode banner if user is in demo mode */}
        {isDemoMode && (
          <DemoModeBanner onExit={handleExitDemo} />
        )}
        
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
          onShareList={isDemoMode ? handleDemoModeShare : handleShareListFromListsView}
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
          menuItems={getMenuItems().map(item => {
            // Modify menu items for demo mode
            if (isDemoMode && item.label === "Share Current List") {
              return {
                ...item,
                action: handleDemoModeShare
              };
            }
            return item;
          })}
          addForm={
            view === 'lists' ? addListForm :
            (view === 'list' || view === 'master') ? addItemForm :
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

      <ShareListModal
        isOpen={showShareModal}
        listName={currentList?.name || ''}
        isShared={currentList?.is_shared || false}
        onClose={() => setShowShareModal(false)}
        onShare={isDemoMode ? handleDemoModeShare : handleShareList}
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